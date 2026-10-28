import database from "@/lib/db";
import { esFechaValida, esNumeroEnRango, leerJson } from "@/lib/validacion";

export async function POST(request) {
  const body = await leerJson(request);
  if (!body || !esFechaValida(body.fecha) || !esNumeroEnRango(body.horas, 0, 24)) {
    return Response.json({ error: "Las horas de sueño no son válidas." }, { status: 400 });
  }

  database.prepare(`
    INSERT INTO sueno (fecha, horas) VALUES (?, ?)
    ON CONFLICT(fecha) DO UPDATE SET horas = excluded.horas
  `).run(body.fecha, body.horas);

  return Response.json({ ok: true, horas: body.horas });
}
