// Número de repeticiones objetivo: el valor más alto del rango de la rutina ("8-12" → 12).
export function repsObjetivo(texto) {
  const numeros = String(texto ?? "").match(/\d+/g);
  return numeros ? Number(numeros[numeros.length - 1]) : 0;
}

// Sugerencia para la próxima sesión según lo que hiciste la última vez.
export function sugerirProgresion(ultima, texto, incremento = 2.5) {
  if (!ultima) return null;
  const meta = repsObjetivo(texto);
  const repeticiones = String(ultima.repeticiones ?? "").match(/\d+/g)?.map(Number) ?? [];
  const peso = Number(ultima.peso) || 0;
  if (!meta || !repeticiones.length) return null;

  const formato = (valor) => String(Math.round(valor * 100) / 100).replace(".", ",");
  if (repeticiones.every((rep) => rep >= meta)) {
    return { subir: true, texto: `Sube a ${formato(peso + incremento)} kg` };
  }
  return { subir: false, texto: `Mantén ${formato(peso)} kg y apunta a ${meta} reps en todas las series` };
}
