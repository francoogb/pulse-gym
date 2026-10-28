import database from "@/lib/db";

export async function GET(request) {
  const mes = new URL(request.url).searchParams.get("mes");
  if (typeof mes !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    return Response.json({ error: "El mes indicado no es válido." }, { status: 400 });
  }

  const [year, month] = mes.split("-").map(Number);
  if (year < 2000 || year > 2100) {
    return Response.json({ error: "El mes indicado está fuera del rango permitido." }, { status: 400 });
  }

  const inicio = `${mes}-01`;
  const fin = `${mes}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
  const registros = database.prepare(`
    SELECT fecha, MAX(entreno) AS entreno, MAX(comida) AS comida, MAX(sueno) AS sueno, MAX(peso) AS peso
    FROM (
      SELECT fecha, 1 AS entreno, 0 AS comida, 0 AS sueno, 0 AS peso FROM series WHERE fecha BETWEEN ? AND ?
      UNION ALL
      SELECT fecha, 0, 1, 0, 0 FROM comidas WHERE fecha BETWEEN ? AND ?
      UNION ALL
      SELECT fecha, 0, 0, 1, 0 FROM sueno WHERE fecha BETWEEN ? AND ?
      UNION ALL
      SELECT fecha, 0, 0, 0, 1 FROM peso_corporal WHERE fecha BETWEEN ? AND ?
    )
    GROUP BY fecha
    ORDER BY fecha
  `).all(inicio, fin, inicio, fin, inicio, fin, inicio, fin);

  const routines = database.prepare("SELECT nombre, dias FROM rutinas ORDER BY activa DESC, id DESC").all().map((routine) => {
    try { return { name: routine.nombre, days: JSON.parse(routine.dias) }; } catch { return { name: routine.nombre, days: [] }; }
  });
  const recordsByDate = new Map(registros.map((item) => [item.fecha, item]));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dias = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const fecha = `${mes}-${String(day).padStart(2, "0")}`;
    const weekDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const scheduledRoutines = routines.filter((routine) => routine.days.includes(weekDay)).map((routine) => routine.name);
    const record = recordsByDate.get(fecha);
    if (record || scheduledRoutines.length) {
      dias.push({
        fecha,
        entreno: record?.entreno ?? 0,
        comida: record?.comida ?? 0,
        sueno: record?.sueno ?? 0,
        peso: record?.peso ?? 0,
        planificado: scheduledRoutines.length > 0,
        rutinas: scheduledRoutines,
      });
    }
  }

  return Response.json({ mes, dias });
}


