import database from "@/lib/db";
import { leerJson } from "@/lib/validacion";

// Orden del ciclo: las rutinas en el orden en que se crearon.
function rutinasEnOrden() {
  return database.prepare("SELECT id FROM rutinas ORDER BY id ASC").all().map((fila) => fila.id);
}

// La próxima rutina; si no hay una guardada o ya no existe, empieza por la primera.
function siguienteActual(ids) {
  const guardada = database.prepare("SELECT rutina_siguiente_id AS id FROM ciclo WHERE id = 1").get()?.id;
  if (guardada && ids.includes(guardada)) return guardada;
  return ids[0] ?? null;
}

export async function GET() {
  return Response.json({ siguienteId: siguienteActual(rutinasEnOrden()) });
}

// completada: avanza a la rutina siguiente del ciclo. siguienteId: elige la próxima a mano.
export async function POST(request) {
  const body = await leerJson(request);
  const ids = rutinasEnOrden();
  let siguienteId = null;

  if (Number.isSafeInteger(body?.completada)) {
    const posicion = ids.indexOf(body.completada);
    if (posicion === -1) return Response.json({ error: "La rutina indicada ya no existe." }, { status: 404 });
    siguienteId = ids[(posicion + 1) % ids.length];
  } else if (Number.isSafeInteger(body?.siguienteId)) {
    if (!ids.includes(body.siguienteId)) return Response.json({ error: "La rutina indicada ya no existe." }, { status: 404 });
    siguienteId = body.siguienteId;
  } else {
    return Response.json({ error: "Indica la rutina completada o la siguiente." }, { status: 400 });
  }

  database.prepare(`
    INSERT INTO ciclo (id, rutina_siguiente_id) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET rutina_siguiente_id = excluded.rutina_siguiente_id
  `).run(siguienteId);

  return Response.json({ siguienteId });
}
