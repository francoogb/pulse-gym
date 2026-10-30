import database from "@/lib/db";
import { analizarMusculo, tendenciaPesoKgSemana } from "@/lib/musculo";
import { esFechaValida } from "@/lib/validacion";

function restarDias(fecha, cuantos) {
  const date = new Date(`${fecha}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - cuantos);
  return date.toISOString().slice(0, 10);
}

// Plan para ganar músculo con los datos reales de la última semana y el peso del último mes.
export async function GET(request) {
  const fecha = new URL(request.url).searchParams.get("fecha");
  if (!esFechaValida(fecha)) {
    return Response.json({ error: "La fecha indicada no es válida." }, { status: 400 });
  }

  const desde7 = restarDias(fecha, 6);
  const comidas = database.prepare(`
    SELECT fecha, SUM(calorias) AS kcal, SUM(proteina) AS proteina
    FROM comidas WHERE fecha BETWEEN ? AND ? GROUP BY fecha
  `).all(desde7, fecha);
  const diasConComidas = comidas.length;
  const consumoKcal = diasConComidas ? comidas.reduce((suma, dia) => suma + dia.kcal, 0) / diasConComidas : null;
  const consumoProteina = diasConComidas ? comidas.reduce((suma, dia) => suma + dia.proteina, 0) / diasConComidas : null;

  const sueno = database.prepare("SELECT AVG(horas) AS promedio FROM sueno WHERE fecha BETWEEN ? AND ?").get(desde7, fecha);

  const historial = database.prepare(`
    SELECT fecha, kg FROM peso_corporal WHERE fecha BETWEEN ? AND ? ORDER BY fecha
  `).all(restarDias(fecha, 27), fecha);

  // Series de la semana por grupo muscular. Los grupos salen de las rutinas, aunque no tengan series.
  const grupos = database.prepare("SELECT DISTINCT grupo FROM rutina_ejercicios").all().map((fila) => fila.grupo);
  const seriesPorGrupo = Object.fromEntries(grupos.map((grupo) => [grupo, 0]));
  const series = database.prepare(`
    SELECT s.series AS series,
      (SELECT r.grupo FROM rutina_ejercicios r WHERE r.nombre = s.ejercicio ORDER BY r.id DESC LIMIT 1) AS grupo
    FROM series s WHERE s.fecha BETWEEN ? AND ?
  `).all(desde7, fecha);
  for (const fila of series) {
    const grupo = fila.grupo ?? "otros";
    seriesPorGrupo[grupo] = (seriesPorGrupo[grupo] ?? 0) + fila.series;
  }

  const pesoActual = historial.at(-1)?.kg ?? null;
  const plan = analizarMusculo({
    pesoKg: pesoActual,
    consumoKcal,
    consumoProteina,
    diasConComidas,
    tendenciaKgSemana: tendenciaPesoKgSemana(historial),
    suenoPromedio: sueno?.promedio ?? null,
    seriesPorGrupo,
  });

  return Response.json({ fecha, ...plan });
}
