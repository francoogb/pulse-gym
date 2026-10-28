import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_SEGUNDOS, coincide, crearValorSesion } from "@/lib/sesion";
import { leerJson } from "@/lib/validacion";

export async function POST(request) {
  const username = process.env.PULSE_USERNAME;
  const password = process.env.PULSE_PASSWORD;
  if (!username || !password || !process.env.PULSE_SESSION_SECRET) {
    return Response.json({ error: "El acceso no está configurado en el servidor." }, { status: 503 });
  }

  const body = await leerJson(request);
  const usuarioValido = typeof body?.usuario === "string" && coincide(body.usuario, username);
  const claveValida = typeof body?.clave === "string" && coincide(body.clave, password);
  if (!usuarioValido || !claveValida) {
    return Response.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const respuesta = Response.json({ ok: true });
  respuesta.headers.append(
    "Set-Cookie",
    `${COOKIE_SESION}=${crearValorSesion()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACION_SESION_SEGUNDOS}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  );
  return respuesta;
}

export async function DELETE() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return respuesta;
}
