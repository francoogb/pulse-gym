import database from "@/lib/db";
import { leerJson } from "@/lib/validacion";

function esSuscripcionValida(suscripcion) {
  return (
    suscripcion &&
    typeof suscripcion.endpoint === "string" &&
    suscripcion.endpoint.startsWith("https://") &&
    suscripcion.endpoint.length <= 2048 &&
    typeof suscripcion.keys?.p256dh === "string" &&
    typeof suscripcion.keys?.auth === "string"
  );
}

export async function POST(request) {
  const body = await leerJson(request);
  if (!esSuscripcionValida(body)) {
    return Response.json({ error: "La suscripción de notificaciones no es válida." }, { status: 400 });
  }

  database.prepare(`
    INSERT INTO push_suscripciones (endpoint, p256dh, auth) VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
  `).run(body.endpoint, body.keys.p256dh, body.keys.auth);

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request) {
  const body = await leerJson(request);
  if (typeof body?.endpoint !== "string") {
    return Response.json({ error: "Falta el endpoint de la suscripción." }, { status: 400 });
  }

  database.prepare("DELETE FROM push_suscripciones WHERE endpoint = ?").run(body.endpoint);
  return Response.json({ ok: true });
}
