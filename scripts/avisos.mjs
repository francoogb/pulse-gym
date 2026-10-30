// Envía recordatorios push según tus registros de hoy.
// Uso: node scripts/avisos.mjs            → envía los avisos que correspondan
//      node scripts/avisos.mjs --simular  → solo muestra qué enviaría
// Pensado para el Programador de tareas de Windows (cada hora).
import { existsSync } from "node:fs";
import path from "node:path";
import webpush from "web-push";
import database from "../src/lib/db.js";

const simular = process.argv.includes("--simular");

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const publicKey = process.env.PULSE_VAPID_PUBLIC_KEY;
const privateKey = process.env.PULSE_VAPID_PRIVATE_KEY;
const subject = process.env.PULSE_VAPID_SUBJECT || "mailto:pulse@localhost";
if (!publicKey || !privateKey) {
  console.error("Faltan PULSE_VAPID_PUBLIC_KEY o PULSE_VAPID_PRIVATE_KEY en .env.local.");
  process.exit(1);
}
webpush.setVapidDetails(subject, publicKey, privateKey);

// Fecha local YYYY-MM-DD (no UTC) para que coincida con lo que registras en la app.
const ahora = new Date();
const hoy = [
  ahora.getFullYear(),
  String(ahora.getMonth() + 1).padStart(2, "0"),
  String(ahora.getDate()).padStart(2, "0"),
].join("-");
const hora = ahora.getHours();
const diaSemana = ahora.getDay();

const yaEnviado = database.prepare("SELECT 1 FROM avisos_enviados WHERE fecha = ? AND tipo = ?");
const marcarEnviado = database.prepare("INSERT OR IGNORE INTO avisos_enviados (fecha, tipo) VALUES (?, ?)");

function diaDeGym() {
  return Boolean(database.prepare("SELECT activo FROM plan_semanal WHERE dia = ?").get(diaSemana)?.activo);
}

function tieneSesionHoy() {
  return Boolean(database.prepare("SELECT 1 FROM series WHERE fecha = ? LIMIT 1").get(hoy));
}

function tieneComidasHoy() {
  return Boolean(database.prepare("SELECT 1 FROM comidas WHERE fecha = ? LIMIT 1").get(hoy));
}

function tieneSuenoHoy() {
  return Boolean(database.prepare("SELECT 1 FROM sueno WHERE fecha = ? LIMIT 1").get(hoy));
}

function restarDias(fecha, cuantos) {
  const date = new Date(`${fecha}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - cuantos);
  return date.toISOString().slice(0, 10);
}

// 1RM estimado (Epley) del mejor set de un ejercicio en un día.
function mejorRM(fecha, ejercicio) {
  let mejor = 0;
  for (const fila of database.prepare("SELECT peso, repeticiones FROM series WHERE fecha = ? AND ejercicio = ?").all(fecha, ejercicio)) {
    const repes = String(fila.repeticiones).split(/[\s,/-]+/).map(Number).filter(Number.isFinite);
    if (!repes.length || !(fila.peso > 0)) continue;
    mejor = Math.max(mejor, fila.peso * (1 + Math.max(...repes) / 30));
  }
  return mejor ? Math.round(mejor * 10) / 10 : null;
}

// Cambio de fuerza de cada ejercicio de hoy frente a su sesión anterior.
function cambiosFuerzaHoy() {
  const ejercicios = database.prepare("SELECT DISTINCT ejercicio FROM series WHERE fecha = ?").all(hoy).map((fila) => fila.ejercicio);
  const cambios = [];
  for (const ejercicio of ejercicios) {
    const actual = mejorRM(hoy, ejercicio);
    const anterior = database.prepare("SELECT MAX(fecha) AS fecha FROM series WHERE ejercicio = ? AND fecha < ?").get(ejercicio, hoy)?.fecha;
    const previo = anterior ? mejorRM(anterior, ejercicio) : null;
    if (actual && previo) cambios.push({ ejercicio, diferencia: Math.round((actual - previo) * 10) / 10 });
  }
  return cambios;
}

function textoAnalisisEntreno() {
  const cambios = cambiosFuerzaHoy();
  const subieron = cambios.filter((c) => c.diferencia > 0).sort((a, b) => b.diferencia - a.diferencia);
  const bajaron = cambios.filter((c) => c.diferencia < 0);
  const partes = [];
  if (subieron.length) partes.push(`Subiste fuerza en ${subieron.length}: ${subieron[0].ejercicio} (+${subieron[0].diferencia} kg de 1RM).`);
  if (bajaron.length) partes.push(`Bajó en ${bajaron.length}; revisa descanso y sueño.`);
  return partes.join(" ");
}

// Resumen de la semana: días entrenados, variación de peso y sueño promedio.
function textoResumenSemanal() {
  const desde = restarDias(hoy, 6);
  const programados = database.prepare("SELECT COUNT(*) AS n FROM plan_semanal WHERE activo = 1").get().n;
  const entrenados = database.prepare("SELECT COUNT(DISTINCT fecha) AS n FROM series WHERE fecha BETWEEN ? AND ?").get(desde, hoy).n;
  const pesos = database.prepare("SELECT kg FROM peso_corporal WHERE fecha BETWEEN ? AND ? ORDER BY fecha").all(desde, hoy).map((fila) => fila.kg);
  const sueno = database.prepare("SELECT AVG(horas) AS promedio FROM sueno WHERE fecha BETWEEN ? AND ?").get(desde, hoy).promedio;
  const partes = [`Entrenaste ${entrenados} de ${programados} días programados.`];
  if (pesos.length >= 2) {
    const diferencia = Math.round((pesos.at(-1) - pesos[0]) * 10) / 10;
    partes.push(`Peso: ${diferencia > 0 ? "+" : ""}${diferencia} kg esta semana.`);
  }
  if (sueno !== null) partes.push(`Sueño: ${Math.round(sueno * 10) / 10} h en promedio.`);
  return partes.join(" ");
}

// Reglas: cada tipo se envía como máximo una vez al día.
const reglas = [
  {
    tipo: "entreno",
    aplica: () => hora >= 17 && diaDeGym() && !tieneSesionHoy(),
    aviso: { titulo: "Hoy toca entrenar", cuerpo: "Abre tu rutina y registra la sesión.", url: "/entrenamiento" },
  },
  {
    tipo: "sueno",
    aplica: () => hora >= 10 && !tieneSuenoHoy(),
    aviso: { titulo: "¿Cuánto dormiste?", cuerpo: "Registra tus horas de sueño de anoche.", url: "/" },
  },
  {
    tipo: "comida",
    aplica: () => hora >= 21 && !tieneComidasHoy(),
    aviso: { titulo: "Registra tu cena", cuerpo: "Aún no tienes comidas registradas hoy.", url: "/nutricion" },
  },
  {
    tipo: "analisis-entreno",
    aplica: () => hora >= 20 && tieneSesionHoy() && cambiosFuerzaHoy().length > 0,
    aviso: () => ({ titulo: "Así va tu fuerza hoy", cuerpo: textoAnalisisEntreno() || "Sesión registrada.", url: "/notificaciones" }),
  },
  {
    tipo: "resumen-semanal",
    aplica: () => diaSemana === 0 && hora >= 20,
    aviso: () => ({ titulo: "Tu semana en BullTrack", cuerpo: textoResumenSemanal(), url: "/notificaciones" }),
  },
];

const avisosAEnviar = reglas.filter((regla) => !yaEnviado.get(hoy, regla.tipo) && regla.aplica());

if (!avisosAEnviar.length) {
  console.log(`[${hoy} ${hora}:00] Nada que avisar.`);
  process.exit(0);
}

const suscripciones = database.prepare("SELECT endpoint, p256dh, auth FROM push_suscripciones").all();
const quitar = database.prepare("DELETE FROM push_suscripciones WHERE endpoint = ?");

for (const regla of avisosAEnviar) {
  // Los análisis se calculan al momento de enviar; los recordatorios son fijos.
  const aviso = typeof regla.aviso === "function" ? regla.aviso() : regla.aviso;
  if (simular) {
    console.log(`[simulación] ${regla.tipo}: "${aviso.titulo}" — ${aviso.cuerpo} (a ${suscripciones.length} dispositivo(s))`);
    continue;
  }

  let enviados = 0;
  for (const suscripcion of suscripciones) {
    try {
      await webpush.sendNotification(
        { endpoint: suscripcion.endpoint, keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth } },
        JSON.stringify(aviso),
        { TTL: 60 * 60 },
      );
      enviados += 1;
    } catch (error) {
      // 404 y 410 significan que el navegador canceló la suscripción.
      if (error.statusCode === 404 || error.statusCode === 410) quitar.run(suscripcion.endpoint);
      else console.error(`Error enviando ${regla.tipo}:`, error.statusCode ?? error.message);
    }
  }

  // Si no había dispositivos, no marcamos el aviso: se intentará en la siguiente ejecución.
  if (suscripciones.length) marcarEnviado.run(hoy, regla.tipo);
  console.log(`${regla.tipo}: enviado a ${enviados} de ${suscripciones.length} dispositivo(s).`);
}

if (simular) console.log("Simulación: no se envió nada ni se marcó como enviado.");
console.log(`Base de datos: ${path.resolve(database.name)}`);
