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
];

const avisosAEnviar = reglas.filter((regla) => !yaEnviado.get(hoy, regla.tipo) && regla.aplica());

if (!avisosAEnviar.length) {
  console.log(`[${hoy} ${hora}:00] Nada que avisar.`);
  process.exit(0);
}

const suscripciones = database.prepare("SELECT endpoint, p256dh, auth FROM push_suscripciones").all();
const quitar = database.prepare("DELETE FROM push_suscripciones WHERE endpoint = ?");

for (const regla of avisosAEnviar) {
  if (simular) {
    console.log(`[simulación] ${regla.tipo}: "${regla.aviso.titulo}" a ${suscripciones.length} dispositivo(s)`);
    continue;
  }

  let enviados = 0;
  for (const suscripcion of suscripciones) {
    try {
      await webpush.sendNotification(
        { endpoint: suscripcion.endpoint, keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth } },
        JSON.stringify(regla.aviso),
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
