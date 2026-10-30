import database from "@/lib/db";
import { esFechaValida } from "@/lib/validacion";

// Última vez que se hizo cada ejercicio antes de la fecha indicada.
export async function GET(request) {
  const fecha = new URL(request.url).searchParams.get("fecha");
  if (!esFechaValida(fecha)) {
    return Response.json({ error: "La fecha indicada no es válida." }, { status: 400 });
  }

  const filas = database.prepare(`
    SELECT s.ejercicio, s.fecha, s.series, s.repeticiones, s.peso
    FROM series s
    INNER JOIN (
      SELECT ejercicio, MAX(fecha) AS fecha FROM series WHERE fecha < ? GROUP BY ejercicio
    ) ultimo ON s.ejercicio = ultimo.ejercicio AND s.fecha = ultimo.fecha
  `).all(fecha);

  const ultimas = Object.fromEntries(filas.map((fila) => [fila.ejercicio, {
    fecha: fila.fecha,
    series: fila.series,
    repeticiones: fila.repeticiones,
    peso: fila.peso,
  }]));

  return Response.json({ ultimas });
}
