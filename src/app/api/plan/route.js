import database from "@/lib/db";
import { leerJson } from "@/lib/validacion";

function leerPlan() {
  return database.prepare("SELECT dia, activo FROM plan_semanal ORDER BY CASE dia WHEN 0 THEN 7 ELSE dia END").all().map((item) => ({
    day: item.dia,
    active: Boolean(item.activo),
  }));
}

export async function GET() {
  return Response.json({ plan: leerPlan() });
}

export async function PUT(request) {
  const body = await leerJson(request);
  if (!body || !Array.isArray(body.plan) || body.plan.length !== 7) {
    return Response.json({ error: "El plan semanal no es válido." }, { status: 400 });
  }

  const dias = body.plan.map((item) => item?.day);
  const planValido = body.plan.every((item) => (
    Number.isInteger(item?.day) && item.day >= 0 && item.day <= 6 && typeof item.active === "boolean"
  ));
  if (!planValido || new Set(dias).size !== 7) {
    return Response.json({ error: "El plan debe incluir los siete días de la semana." }, { status: 400 });
  }

  const guardar = database.transaction((plan) => {
    const actualizar = database.prepare(`
      INSERT INTO plan_semanal (dia, activo) VALUES (?, ?)
      ON CONFLICT(dia) DO UPDATE SET activo = excluded.activo
    `);
    for (const item of plan) actualizar.run(item.day, item.active ? 1 : 0);
  });
  guardar(body.plan);

  return Response.json({ ok: true, plan: leerPlan() });
}
