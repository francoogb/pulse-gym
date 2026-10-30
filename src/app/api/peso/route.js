import database from "@/lib/db";
import { esFechaValida, esNumeroEnRango, leerJson } from "@/lib/validacion";

function restarDias(fecha, dias) {
  const date = new Date(`${fecha}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - dias);
  return date.toISOString().slice(0, 10);
}

export async function GET(request) {
  const fecha = new URL(request.url).searchParams.get("fecha");
  if (!esFechaValida(fecha)) {
    return Response.json({ error: "La fecha indicada no es válida." }, { status: 400 });
  }

  const historial = database.prepare(`
    SELECT fecha, kg FROM peso_corporal
    WHERE fecha BETWEEN ? AND ? ORDER BY fecha
  `).all(restarDias(fecha, 180), fecha);
  const actual = database.prepare(`
    SELECT fecha, kg FROM peso_corporal WHERE fecha <= ? ORDER BY fecha DESC LIMIT 1
  `).get(fecha);
  const perfil = database.prepare("SELECT estatura_cm FROM perfil WHERE id = 1").get();
  return Response.json({ fecha, peso: actual?.kg ?? null, estatura: perfil?.estatura_cm ?? null, historial });
}

export async function POST(request) {
  const body = await leerJson(request);
  // La estatura es opcional: si no se envía, se conserva la que ya estaba guardada.
  const conEstatura = body?.estatura !== undefined && body?.estatura !== null;
  if (
    !body || !esFechaValida(body.fecha) ||
    !esNumeroEnRango(body.kg, 20, 500) ||
    (conEstatura && !esNumeroEnRango(body.estatura, 100, 250))
  ) {
    return Response.json({ error: "Ingresa un peso entre 20 y 500 kg y, si la indicas, una estatura entre 100 y 250 cm." }, { status: 400 });
  }

  const guardarMedidas = database.transaction(() => {
    database.prepare(`
      INSERT INTO peso_corporal (fecha, kg) VALUES (?, ?)
      ON CONFLICT(fecha) DO UPDATE SET kg = excluded.kg
    `).run(body.fecha, body.kg);
    if (conEstatura) {
      database.prepare(`
        INSERT INTO perfil (id, estatura_cm) VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET estatura_cm = excluded.estatura_cm
      `).run(body.estatura);
    }
  });
  guardarMedidas();

  return Response.json({ ok: true, fecha: body.fecha, kg: body.kg, estatura: conEstatura ? body.estatura : null });
}
