import database from "@/lib/db";
import { esFechaValida, leerJson } from "@/lib/validacion";

export async function POST(request) {
  const body = await leerJson(request);
  if (!body || !esFechaValida(body.fecha) || !Number.isInteger(body.vasos) || body.vasos < 0 || body.vasos > 20) {
    return Response.json({ error: "La cantidad de agua no es válida." }, { status: 400 });
  }

  database.prepare(`
    INSERT INTO habitos (fecha, vasos) VALUES (?, ?)
    ON CONFLICT(fecha) DO UPDATE SET vasos = excluded.vasos
  `).run(body.fecha, body.vasos);

  return Response.json({ ok: true, vasos: body.vasos });
}
