import database from "@/lib/db";
import { exerciseGroups, exerciseLibrary } from "@/lib/exercise-library";
import { leerJson } from "@/lib/validacion";

const COLORS = new Set(["#26d6c1", "#8b6ee8", "#ff9f43", "#ff715f", "#4b9cff", "#57cc72", "#f06f9d"]);
const DURATIONS = new Set(["30-45 min", "45-60 min", "60-75 min", "75-90 min"]);
const ICONS = new Set(["dumbbell", "strength", "legs", "cardio", "heart"]);
const EXERCISE_GROUPS = new Set([...exerciseGroups.filter((group) => group !== "Todos"), "Otro"]);

function readRoutines() {
  const routines = database.prepare("SELECT * FROM rutinas ORDER BY activa DESC, id DESC").all();
  const readExercises = database.prepare(`
    SELECT id, orden, dia, nombre, grupo, series, repeticiones, peso, descanso
    FROM rutina_ejercicios WHERE rutina_id = ? ORDER BY orden
  `);
  return routines.map((routine) => ({
    id: routine.id,
    name: routine.nombre,
    description: routine.descripcion,
    days: JSON.parse(routine.dias),
    color: routine.color,
    icon: routine.icono,
    duration: routine.duracion,
    active: Boolean(routine.activa),
    exercises: readExercises.all(routine.id).map((exercise) => ({
      id: exercise.id,
      order: exercise.orden,
      day: exercise.dia ?? JSON.parse(routine.dias)[0],
      name: exercise.nombre,
      group: exercise.grupo,
      custom: !exerciseLibrary.some((item) => item.name === exercise.nombre),
      sets: exercise.series,
      reps: exercise.repeticiones,
      weight: exercise.peso,
      rest: exercise.descanso,
    })),
  }));
}

function validText(value, min, max) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function normalizeRoutine(body) {
  if (!body || !validText(body.name, 2, 60) || typeof body.description !== "string" || body.description.length > 240) return null;
  if (!Array.isArray(body.days) || !body.days.length || body.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(body.days).size !== body.days.length) return null;
  if (!COLORS.has(body.color) || !DURATIONS.has(body.duration) || !ICONS.has(body.icon)) return null;
  if (!Array.isArray(body.exercises) || !body.exercises.length || body.exercises.length > 20) return null;

  const exercises = body.exercises.map((item) => {
    const libraryItem = exerciseLibrary.find((exercise) => exercise.name === item?.name);
    if (!libraryItem && (!validText(item?.name, 2, 60) || !EXERCISE_GROUPS.has(item?.group))) return null;
    if (!Number.isInteger(item.day) || !body.days.includes(item.day)) return null;
    if (!Number.isInteger(item.sets) || item.sets < 1 || item.sets > 20) return null;
    if (typeof item.weight !== "number" || !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 1000) return null;
    if (!validText(item.reps, 1, 20) || !Number.isInteger(item.rest) || item.rest < 15 || item.rest > 600) return null;
    return {
      ...(libraryItem ?? { name: item.name.trim(), group: item.group }),
      day: item.day,
      sets: item.sets,
      reps: item.reps.trim(),
      weight: item.weight,
      rest: item.rest,
    };
  });
  if (exercises.some((item) => !item) || new Set(exercises.map((item) => `${item.day}:${item.name}`)).size !== exercises.length) return null;

  return {
    name: body.name.trim(),
    description: body.description.trim(),
    days: [...body.days].sort((a, b) => (a || 7) - (b || 7)),
    color: body.color,
    icon: body.icon,
    duration: body.duration,
    exercises,
  };
}

export async function GET() {
  return Response.json({ routines: readRoutines() });
}

export async function POST(request) {
  const routine = normalizeRoutine(await leerJson(request));
  if (!routine) return Response.json({ error: "Revisa la información y los ejercicios de la rutina." }, { status: 400 });

  const create = database.transaction((data) => {
    const result = database.prepare(`
      INSERT INTO rutinas (nombre, descripcion, dias, color, icono, duracion)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.name, data.description, JSON.stringify(data.days), data.color, data.icon, data.duration);
    const insertExercise = database.prepare(`
      INSERT INTO rutina_ejercicios (rutina_id, orden, dia, nombre, grupo, series, repeticiones, peso, descanso)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    data.exercises.forEach((exercise, index) => {
      insertExercise.run(result.lastInsertRowid, index, exercise.day, exercise.name, exercise.group, exercise.sets, exercise.reps, exercise.weight, exercise.rest);
    });
    return Number(result.lastInsertRowid);
  });
  const id = create(routine);
  const created = readRoutines().find((item) => item.id === id);
  return Response.json({ ok: true, routine: created }, { status: 201 });
}

export async function PUT(request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "La rutina indicada no es válida." }, { status: 400 });
  }
  const routine = normalizeRoutine(await leerJson(request));
  if (!routine) return Response.json({ error: "Revisa la información y los ejercicios de la rutina." }, { status: 400 });

  const update = database.transaction((routineId, data) => {
    const result = database.prepare(`
      UPDATE rutinas
      SET nombre = ?, descripcion = ?, dias = ?, color = ?, icono = ?, duracion = ?
      WHERE id = ?
    `).run(data.name, data.description, JSON.stringify(data.days), data.color, data.icon, data.duration, routineId);
    if (!result.changes) return false;

    database.prepare("DELETE FROM rutina_ejercicios WHERE rutina_id = ?").run(routineId);
    const insertExercise = database.prepare(`
      INSERT INTO rutina_ejercicios (rutina_id, orden, dia, nombre, grupo, series, repeticiones, peso, descanso)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    data.exercises.forEach((exercise, index) => {
      insertExercise.run(routineId, index, exercise.day, exercise.name, exercise.group, exercise.sets, exercise.reps, exercise.weight, exercise.rest);
    });
    return true;
  });

  if (!update(id, routine)) return Response.json({ error: "La rutina ya no existe." }, { status: 404 });
  return Response.json({ ok: true, routine: readRoutines().find((item) => item.id === id) });
}

export async function DELETE(request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "La rutina indicada no es válida." }, { status: 400 });
  }

  const remove = database.transaction((routineId) => {
    database.prepare("DELETE FROM rutina_ejercicios WHERE rutina_id = ?").run(routineId);
    return database.prepare("DELETE FROM rutinas WHERE id = ?").run(routineId).changes;
  });
  const deleted = remove(id);
  if (!deleted) return Response.json({ error: "La rutina ya no existe." }, { status: 404 });

  return Response.json({ ok: true });
}
