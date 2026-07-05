import { CONFIG } from '../../config.js';

/**
 * Estima calorías quemadas usando el método MET (Metabolic Equivalent of Task):
 *   calorias = MET * peso(kg) * tiempo(horas)
 *
 * El valor MET se ajusta ligeramente según la intensidad real (velocidad
 * promedio) dentro de un rango razonable para cada actividad, para que el
 * resultado no dependa únicamente de una constante fija.
 */
export class CaloriasCalculator {
  static estimar({ tipoActividad, tiempoMs, distanciaMetros, pesoKg }) {
    const horas = tiempoMs / 3600000;
    if (horas <= 0) return 0;

    const metBase = CONFIG.met[tipoActividad] ?? CONFIG.met.correr;
    const velocidadKmh = distanciaMetros / 1000 / (horas || 1);
    const met = CaloriasCalculator._ajustarMetPorIntensidad(tipoActividad, metBase, velocidadKmh);

    const calorias = met * (pesoKg || CONFIG.pesoDefaultKg) * horas;
    return Math.max(0, Math.round(calorias));
  }

  static _ajustarMetPorIntensidad(tipoActividad, metBase, velocidadKmh) {
    // Pequeño ajuste: a mayor velocidad sostenida, mayor esfuerzo relativo.
    switch (tipoActividad) {
      case 'caminar':
        if (velocidadKmh > 6.5) return metBase + 1.5;
        if (velocidadKmh < 3) return metBase - 0.8;
        return metBase;
      case 'correr':
        if (velocidadKmh > 11) return metBase + 2.5;
        if (velocidadKmh < 7) return metBase - 1.5;
        return metBase;
      case 'bicicleta':
        if (velocidadKmh > 25) return metBase + 3;
        if (velocidadKmh < 15) return metBase - 1.5;
        return metBase;
      default:
        return metBase;
    }
  }
}
