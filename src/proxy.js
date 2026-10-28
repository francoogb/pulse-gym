import { NextResponse } from "next/server";
import { COOKIE_SESION, coincide, sesionValida } from "@/lib/sesion";

// Rutas que no piden sesión: la pantalla de acceso, sus datos y los archivos del navegador.
const RUTAS_PUBLICAS = new Set(["/acceso", "/api/acceso", "/offline", "/sw.js", "/manifest.webmanifest", "/favicon.ico"]);

function esPublica(pathname) {
  return RUTAS_PUBLICAS.has(pathname) || pathname.startsWith("/_next/") || /^\/bulldog-[^/]+$/.test(pathname);
}

// Respaldo para herramientas que envían Basic Auth (por ejemplo curl). El navegador usa la cookie.
function credencialesBasicasValidas(request) {
  const match = (request.headers.get("authorization") ?? "").match(/^Basic\s+(.+)$/i);
  if (!match) return false;

  try {
    const binary = atob(match[1]);
    const decoded = new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return (
      coincide(decoded.slice(0, separator), process.env.PULSE_USERNAME) &&
      coincide(decoded.slice(separator + 1), process.env.PULSE_PASSWORD)
    );
  } catch {
    return false;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Fail closed: never serve the app unprotected if the configuration is missing.
  if (!process.env.PULSE_USERNAME || !process.env.PULSE_PASSWORD || !process.env.PULSE_SESSION_SECRET) {
    return new NextResponse("Configura PULSE_USERNAME, PULSE_PASSWORD y PULSE_SESSION_SECRET para iniciar Pulse.", {
      status: 503,
    });
  }

  if (esPublica(pathname)) return NextResponse.next();

  const autenticado =
    sesionValida(request.cookies.get(COOKIE_SESION)?.value) || credencialesBasicasValidas(request);

  if (!autenticado) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
    }
    const destino = new URL("/acceso", request.url);
    destino.searchParams.set("desde", pathname);
    return NextResponse.redirect(destino);
  }

  // Bloquea escrituras desde otros sitios. Los clientes no navegador pueden omitir Origin.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== request.nextUrl.host) {
          return new NextResponse("Origen no permitido.", { status: 403 });
        }
      } catch {
        return new NextResponse("Origen no permitido.", { status: 403 });
      }
    }
  }

  return NextResponse.next();
}
