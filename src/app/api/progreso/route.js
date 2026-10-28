import database from "@/lib/db";
import { esFechaValida } from "@/lib/validacion";

const DIAS_SEMANA = 7;
const DIAS_FUERZA = 90;

// Resta días a una fecha YYYY-MM-DD sin depender de la zona horaria.
function restarDias(fecha, dias) {
  const date = new Date(`${fecha}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - dias);
  return date.toISOString().slice(0, 10);
}

function diaSemana(fecha) {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

function calcularRacha(fecha, diasGym, fechasEntreno) {
  if (!diasGym.size || !fechasEntreno.size) return 0;

  let cursor = fecha;
  if (diasGym.has(diaSemana(cursor)) && !fechasEntreno.has(cursor)) {
    cursor = restarDias(cursor, 1);
  }

  let racha = 0;
  for (let revisados = 0; revisados < 3660; revisados += 1) {
    if (diasGym.has(diaSemana(cursor))) {
      if (!fechasEntreno.has(cursor)) break;
      racha += 1;
    }
    cursor = restarDias(cursor, 1);
  }
  return racha;
}

// "8–10" → 10 (usa la repetición más alta del rango). "12" → 12.
function repeticionesMaximas(texto) {
  const numeros = String(texto).match(/\d+/g);
  return numeros ? Number(numeros[numeros.length - 1]) : 0;
}

export async function GET(request) {
  const fecha = new URL(request.url).searchParams.get("fecha");
  if (!esFechaValida(fecha)) {
    return Response.json({ error: "La fecha indicada no es válida." }, { status: 400 });
  }

  const dias = Array.from({ length: DIAS_SEMANA }, (_, index) => restarDias(fecha, DIAS_SEMANA - 1 - index));
  const inicioSemana = dias[0];

  const nutricion = database.prepare(`
    SELECT fecha, SUM(calorias) AS calorias, SUM(proteina) AS proteina
    FROM comidas
    WHERE fecha BETWEEN ? AND ?
    GROUP BY fecha
  `).all(inicioSemana, fecha);

  const entrenos = database.prepare(`
    SELECT DISTINCT fecha FROM series WHERE fecha BETWEEN ? AND ?
  `).all(inicioSemana, fecha).map((fila) => fila.fecha);

  const routineDays = new Set(database.prepare("SELECT dias FROM rutinas").all().flatMap((item) => {
    try { return JSON.parse(item.dias); } catch { return []; }
  }));
  const plan = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, active: routineDays.has(day) }));
  const diasGym = new Set(plan.filter((item) => item.active).map((item) => item.day));
  const fechasEntreno = new Set(database.prepare(`
    SELECT DISTINCT fecha FROM series WHERE fecha <= ? ORDER BY fecha DESC
  `).all(fecha).map((fila) => fila.fecha));
  const racha = calcularRacha(fecha, diasGym, fechasEntreno);

  const sueno = database.prepare(`
    SELECT fecha, horas FROM sueno WHERE fecha BETWEEN ? AND ?
  `).all(inicioSemana, fecha);

  const nutricionPorDia = new Map(nutricion.map((fila) => [fila.fecha, fila]));
  const suenoPorDia = new Map(sueno.map((fila) => [fila.fecha, fila.horas]));

  const semana = dias.map((dia) => ({
    fecha: dia,
    calorias: Math.round(nutricionPorDia.get(dia)?.calorias ?? 0),
    proteina: Math.round((nutricionPorDia.get(dia)?.proteina ?? 0) * 10) / 10,
    entrenó: entrenos.includes(dia),
    sueno: suenoPorDia.get(dia) ?? null,
  }));

  // 1RM estimado (Epley) por ejercicio: el mejor valor de cada día.
  const fuerzaInicio = restarDias(fecha, DIAS_FUERZA);
  const series = database.prepare(`
    SELECT fecha, ejercicio, peso, repeticiones
    FROM series
    WHERE fecha BETWEEN ? AND ?
    ORDER BY fecha
  `).all(fuerzaInicio, fecha);

  const fuerza = {};
  for (const serie of series) {
    const reps = repeticionesMaximas(serie.repeticiones);
    if (!reps) continue;
    const rm = Math.round(serie.peso * (1 + reps / 30) * 10) / 10;
    const historial = (fuerza[serie.ejercicio] ??= []);
    const ultimo = historial[historial.length - 1];
    if (ultimo && ultimo.fecha === serie.fecha) {
      ultimo.rm = Math.max(ultimo.rm, rm);
    } else {
      historial.push({ fecha: serie.fecha, rm });
    }
  }

  return Response.json({ fecha, semana, fuerza, plan, racha });
}
