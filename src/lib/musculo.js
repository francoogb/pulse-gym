// Energía aproximada de 1 kg de tejido corporal (grasa y músculo mezclados).
const KCAL_POR_KG = 7700;
// Mínimos para confiar en las estimaciones.
export const MIN_DIAS_COMIDA = 4;
const MIN_DIAS_PESO = 14;
// Series semanales por grupo muscular que suelen bastar para crecer.
const SERIES_MINIMAS = 10;

const redondear = (valor, decimales = 0) => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

const dias = (fecha) => new Date(`${fecha}T00:00:00Z`).getTime() / 86400000;

// Tendencia del peso en kg por semana (regresión lineal). Null si hay poco registro.
export function tendenciaPesoKgSemana(historial) {
  if (historial.length < 2) return null;
  const puntos = historial.map((registro) => ({ x: dias(registro.fecha), y: registro.kg }));
  const spanDias = puntos[puntos.length - 1].x - puntos[0].x;
  if (spanDias < MIN_DIAS_PESO) return null;

  const mediaX = puntos.reduce((suma, punto) => suma + punto.x, 0) / puntos.length;
  const mediaY = puntos.reduce((suma, punto) => suma + punto.y, 0) / puntos.length;
  const numerador = puntos.reduce((suma, punto) => suma + (punto.x - mediaX) * (punto.y - mediaY), 0);
  const denominador = puntos.reduce((suma, punto) => suma + (punto.x - mediaX) ** 2, 0);
  return redondear((numerador / denominador) * 7, 2);
}

// Convierte los datos del usuario en un plan: proteína, calorías, ritmo de subida y avisos.
export function analizarMusculo({ pesoKg, consumoKcal, consumoProteina, diasConComidas, tendenciaKgSemana, suenoPromedio, seriesPorGrupo }) {
  const proteina = pesoKg ? [Math.round(pesoKg * 1.6), Math.round(pesoKg * 2)] : null;
  const subidaSemana = pesoKg ? [redondear(pesoKg * 0.0025, 2), redondear(pesoKg * 0.005, 2)] : null;
  const datosSuficientes = diasConComidas >= MIN_DIAS_COMIDA && tendenciaKgSemana !== null && consumoKcal !== null;

  // Mantenimiento real: lo que comes menos lo que tu peso indica que se acumula.
  const mantenimiento = datosSuficientes ? Math.round(consumoKcal - (tendenciaKgSemana * KCAL_POR_KG) / 7) : null;
  const metaKcal = mantenimiento !== null ? [mantenimiento + 250, mantenimiento + 350] : null;

  let ajuste = null;
  if (subidaSemana && tendenciaKgSemana !== null) {
    if (tendenciaKgSemana < subidaSemana[0]) ajuste = "Sube unas 200 kcal al día: tu peso sube más lento que la meta.";
    else if (tendenciaKgSemana > subidaSemana[1]) ajuste = "Baja unas 200 kcal al día: subes más rápido de lo ideal y podría ser grasa.";
    else ajuste = "Vas en buen ritmo: mantén tus calorías.";
  }

  const avisos = [];
  if (!datosSuficientes) {
    avisos.push(`Registra comidas en al menos ${MIN_DIAS_COMIDA} días y tu peso durante ${MIN_DIAS_PESO} días para calcular tu mantenimiento real.`);
  }
  if (proteina && consumoProteina !== null && diasConComidas >= MIN_DIAS_COMIDA && consumoProteina < proteina[0]) {
    avisos.push(`Te faltan unos ${Math.round(proteina[0] - consumoProteina)} g de proteína al día (promedio de ${diasConComidas} días con comidas).`);
  }
  if (suenoPromedio !== null && suenoPromedio < 7) {
    avisos.push(`Duermes unas ${redondear(suenoPromedio, 1)} h en promedio. Apunta a 7–9 h para recuperar músculo.`);
  }
  for (const [grupo, series] of Object.entries(seriesPorGrupo)) {
    if (series < SERIES_MINIMAS) avisos.push(`${grupo}: ${series} series esta semana. La referencia es ${SERIES_MINIMAS} o más.`);
  }

  return {
    proteina,
    subidaSemana,
    mantenimiento,
    metaKcal,
    tendenciaKgSemana,
    ajuste,
    consumoKcal: consumoKcal === null ? null : Math.round(consumoKcal),
    consumoProteina: consumoProteina === null ? null : Math.round(consumoProteina),
    diasConComidas,
    avisos,
  };
}
