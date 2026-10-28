import database from "@/lib/db";
import { SESSION_ID } from "@/lib/plan";
import { esFechaValida } from "@/lib/validacion";

export async function GET(request) {
  const fecha = new URL(request.url).searchParams.get("fecha");
  if (!esFechaValida(fecha)) {
    return Response.json({ error: "La fecha indicada no es válida." }, { status: 400 });
  }

  const comidas = database.prepare(`
    SELECT id, nombre, tipo, cantidad, unidad, calorias, proteina, carbos, grasas
    FROM comidas
    WHERE fecha = ?
    ORDER BY id DESC
  `).all(fecha).map((comida) => ({
    id: comida.id,
    name: comida.nombre,
    type: comida.tipo,
    amount: comida.cantidad,
    unit: comida.unidad,
    calories: comida.calorias,
    protein: comida.proteina,
    carbs: comida.carbos,
    fat: comida.grasas,
  }));

  const totales = database.prepare(`
    SELECT
      COALESCE(SUM(calorias), 0) AS calorias,
      COALESCE(SUM(proteina), 0) AS proteina,
      COALESCE(SUM(carbos), 0) AS carbos,
      COALESCE(SUM(grasas), 0) AS grasas
    FROM comidas
    WHERE fecha = ?
  `).get(fecha);

  const ejercicios = database.prepare(`
    SELECT ejercicio, series, repeticiones, peso FROM series WHERE fecha = ? AND sesion = ? ORDER BY id
  `).all(fecha, SESSION_ID);

  const habito = database.prepare("SELECT vasos FROM habitos WHERE fecha = ?").get(fecha);
  const sueno = database.prepare("SELECT horas FROM sueno WHERE fecha = ?").get(fecha);

  return Response.json({
    fecha,
    comidas,
    totales: {
      calories: totales.calorias,
      protein: totales.proteina,
      carbs: totales.carbos,
      fat: totales.grasas,
    },
    entrenamiento: {
      completados: ejercicios.map((ejercicio) => ejercicio.ejercicio),
      detalles: Object.fromEntries(ejercicios.map((ejercicio) => [ejercicio.ejercicio, { sets: ejercicio.series, reps: ejercicio.repeticiones, weight: ejercicio.peso }]))
    },
    vasos: habito?.vasos ?? 0,
    sueno: sueno?.horas ?? null,
  });
}

