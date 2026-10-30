import database from "@/lib/db";
import { exercises, SESSION_ID } from "@/lib/plan";
import { esFechaValida, esNumeroEnRango, leerJson } from "@/lib/validacion";

function normalizarEjercicio(item) {
  const name = typeof item === "string" ? item : item?.name;
  const savedExercise = typeof name === "string" ? database.prepare(`
    SELECT nombre, series, repeticiones, peso
    FROM rutina_ejercicios WHERE nombre = ? ORDER BY id DESC LIMIT 1
  `).get(name) : null;
  const plan = exercises.find((exercise) => exercise.name === name) ?? (savedExercise ? {
    name: savedExercise.nombre,
    sets: savedExercise.series,
    reps: savedExercise.repeticiones,
    weightValue: savedExercise.peso,
  } : null);
  if (!plan) return null;
  if (typeof item === "string") return {
    ...plan,
    actualSets: plan.sets,
    actualReps: plan.reps,
    actualWeight: plan.weightValue,
    actualBaseWeight: plan.weightValue,
    actualExtraWeight: 0,
    actualNotes: "",
  };

  const actualSets = item.sets;
  const actualBaseWeight = item.baseWeight;
  const actualExtraWeight = item.extraWeight;
  const actualNotes = typeof item.notes === "string" ? item.notes.trim() : "";
  const actualReps = typeof item.reps === "string" ? item.reps.trim() : "";
  let reps = actualReps.split(/[\s,/]+/).filter(Boolean).map(Number);
  if (reps.length === 1 && actualSets > 1) reps = Array(actualSets).fill(reps[0]);
  if (
    !Number.isInteger(actualSets) || actualSets < 1 || actualSets > 20 ||
    !esNumeroEnRango(actualBaseWeight, 0, 500) ||
    !esNumeroEnRango(actualExtraWeight, 0, 100) ||
    actualNotes.length > 500 ||
    reps.length !== actualSets || reps.some((rep) => !Number.isInteger(rep) || rep < 1 || rep > 100)
  ) return null;
  const actualWeight = Math.round((actualBaseWeight + actualExtraWeight) * 100) / 100;
  return { ...plan, actualSets, actualReps: reps.join("/"), actualWeight, actualBaseWeight, actualExtraWeight, actualNotes };
}

export async function POST(request) {
  const body = await leerJson(request);
  if (!body || !esFechaValida(body.fecha) || !Array.isArray(body.ejercicios)) {
    return Response.json({ error: "Los datos de la sesión no son válidos." }, { status: 400 });
  }

  const seleccionados = body.ejercicios.map(normalizarEjercicio);
  if (!seleccionados.length || seleccionados.some((exercise) => !exercise) || new Set(seleccionados.map((exercise) => exercise.name)).size !== seleccionados.length) {
    return Response.json({ error: "Completa series, repeticiones y peso para cada ejercicio seleccionado." }, { status: 400 });
  }

  const guardarSesion = database.transaction((fecha, lista) => {
    database.prepare("DELETE FROM series WHERE fecha = ? AND sesion = ?").run(fecha, SESSION_ID);
    const insertar = database.prepare(`
      INSERT INTO series (fecha, sesion, ejercicio, series, repeticiones, peso, peso_base, peso_extra, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const exercise of lista) {
      insertar.run(fecha, SESSION_ID, exercise.name, exercise.actualSets, exercise.actualReps, exercise.actualWeight, exercise.actualBaseWeight, exercise.actualExtraWeight, exercise.actualNotes);
    }
  });

  guardarSesion(body.fecha, seleccionados);
  return Response.json({ ok: true, guardados: seleccionados.length });
}
