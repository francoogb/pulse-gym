export function esFechaValida(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const parsed = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
}

export function esNumeroEnRango(valor, minimo, maximo) {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= minimo && valor <= maximo;
}

export async function leerJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
