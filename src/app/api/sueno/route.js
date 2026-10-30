import database from "@/lib/db";
import { horasDormidas } from "@/lib/sueno";
import { esFechaValida, esNumeroEnRango, leerJson } from "@/lib/validacion";

// Recibe la hora de dormir y la de despertar; las horas se calculan aquí, no en el navegador.
// Se mantiene también el formato antiguo (solo horas) para no romper a clientes existentes.
export async function POST(request) {
  const body = await leerJson(request);
  if (!body || !esFechaValida(body.fecha)) {
    return Response.json({ error: "La fecha indicada no es válida." }, { status: 400 });
  }

  const conHorario = body.horaDormir !== undefined || body.horaDespertar !== undefined;
  const horas = conHorario ? horasDormidas(body.horaDormir, body.horaDespertar) : body.horas;
  if (!esNumeroEnRango(horas, 0.01, 24)) {
    return Response.json({ error: "Revisa las horas: deben ser distintas y no pasar de 24 h." }, { status: 400 });
  }

  database.prepare(`
    INSERT INTO sueno (fecha, horas, hora_dormir, hora_despertar) VALUES (?, ?, ?, ?)
    ON CONFLICT(fecha) DO UPDATE SET horas = excluded.horas, hora_dormir = excluded.hora_dormir, hora_despertar = excluded.hora_despertar
  `).run(body.fecha, horas, conHorario ? body.horaDormir : null, conHorario ? body.horaDespertar : null);

  return Response.json({ ok: true, horas });
}
