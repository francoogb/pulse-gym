// Horas en formato "HH:MM" (24 h).
export function esHoraValida(texto) {
  return typeof texto === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

// Minutos entre dormir y despertar. Si la hora de despertar es menor, se cruzó la medianoche.
export function minutosDormidos(horaDormir, horaDespertar) {
  const [horaA, minutoA] = horaDormir.split(":").map(Number);
  const [horaB, minutoB] = horaDespertar.split(":").map(Number);
  return ((horaB * 60 + minutoB) - (horaA * 60 + minutoA) + 1440) % 1440;
}

// Horas con dos decimales (7 h 30 min → 7.5). Devuelve null si el resultado no es válido.
export function horasDormidas(horaDormir, horaDespertar) {
  if (!esHoraValida(horaDormir) || !esHoraValida(horaDespertar)) return null;
  const minutos = minutosDormidos(horaDormir, horaDespertar);
  if (minutos === 0) return null;
  return Math.round((minutos / 60) * 100) / 100;
}
