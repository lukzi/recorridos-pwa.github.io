import { CONFIG } from '../../config.js';

/**
 * Estima calorías quemadas usando el método MET (Metabolic Equivalent of Task):
 *   calorias = MET * peso(kg) * tiempo(horas)
 *
 * El valor MET se ajusta ligeramente según la intensidad real (velocidad
 * promedio) dentro de un rango razonable para cada actividad, para que el
 * resultado no dependa únicamente de una constante fija.
 *
 * El tiempo total se separa en "activo" y "quieto" (según lo que reporte
 * el acelerómetro vía `MotionSensorService`): mientras no hay evidencia de
 * movimiento físico real se usa un MET de reposo en vez del MET de la
 * actividad, para que las calorías no sigan subiendo al mismo ritmo si
 * el usuario está parado. Si no hay sensor de movimiento disponible, todo
 * el tiempo se trata como "activo" (comportamiento equivalente al cálculo
 * simple anterior).
 */
export class CaloriasCalculator {
  static estimar({ tipoActividad, tiempoActivoMs = 0, tiempoQuietoMs = 0, distanciaMetros, pesoKg }) {
    const horasActivo = tiempoActivoMs / 3600000;
    const horasQuieto = tiempoQuietoMs / 3600000;
    if (horasActivo <= 0 && horasQuieto <= 0) return 0;

    const peso = pesoKg || CONFIG.pesoDefaultKg;
    const metBase = CONFIG.met[tipoActividad] ?? CONFIG.met.correr;
    const velocidadKmh = distanciaMetros / 1000 / (horasActivo || 1);
    const metActividad = CaloriasCalculator._ajustarMetPorIntensidad(tipoActividad, metBase, velocidadKmh);
    const metReposo = CONFIG.met.reposo;

    const calorias = metActividad * peso * horasActivo + metReposo * peso * horasQuieto;
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
