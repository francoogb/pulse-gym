import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_SESION = "pulse_sesion";
export const DURACION_SESION_SEGUNDOS = 30 * 24 * 60 * 60;

function firmar(expira) {
  return createHmac("sha256", process.env.PULSE_SESSION_SECRET).update(String(expira)).digest("hex");
}

// Valor de la cookie: "<expiración en ms>.<firma HMAC>". Sin el secreto no se puede falsificar.
export function crearValorSesion() {
  const expira = Date.now() + DURACION_SESION_SEGUNDOS * 1000;
  return `${expira}.${firmar(expira)}`;
}

export function sesionValida(valor) {
  if (!valor || !process.env.PULSE_SESSION_SECRET) return false;

  const [expiraTexto, firma] = valor.split(".");
  const expira = Number(expiraTexto);
  if (!Number.isFinite(expira) || expira < Date.now() || !firma) return false;

  const esperada = Buffer.from(firmar(expira));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function coincide(texto, referencia) {
  const a = Buffer.from(String(texto));
  const b = Buffer.from(String(referencia));
  return a.length === b.length && timingSafeEqual(a, b);
}
