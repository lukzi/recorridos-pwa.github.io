import { HaversineCalculator } from './HaversineCalculator.js';
import { CONFIG } from '../../config.js';

/**
 * Filtra puntos GPS erróneos o ruidosos antes de aceptarlos como parte
 * del recorrido. Reglas aplicadas:
 *   1. Descarta puntos con precisión (accuracy) peor que el umbral configurado.
 *   2. Descarta puntos que impliquen una velocidad implausible respecto al
 *      punto anterior (saltos de GPS / rebotes de señal).
 *   3. Ignora puntos que no representen un desplazamiento real mínimo
 *      (evita que el "jitter" del GPS acumule distancia estando quieto).
 */
export class GpsFilter {
  /**
   * @param {Coordenada|null} anterior
   * @param {Coordenada} nueva
   * @param {string} tipoActividad
   * @returns {{aceptado: boolean, motivo?: string, distanciaMetros?: number}}
   */
  static evaluar(anterior, nueva, tipoActividad = 'correr') {
    if (nueva.accuracy != null && nueva.accuracy > CONFIG.gps.maxAccuracyMeters) {
      return { aceptado: false, motivo: 'baja_precision' };
    }

    if (!anterior) {
      return { aceptado: true, distanciaMetros: 0 };
    }

    const distanciaMetros = HaversineCalculator.distanciaMetros(anterior, nueva);
    const deltaMs = nueva.timestamp - anterior.timestamp;

    if (deltaMs <= 0) {
      return { aceptado: false, motivo: 'timestamp_invalido' };
    }

    const velocidadMps = distanciaMetros / (deltaMs / 1000);
    const maxVelocidad = CONFIG.gps.maxSpeedMps[tipoActividad] ?? CONFIG.gps.maxSpeedMps.correr;

    if (velocidadMps > maxVelocidad) {
      return { aceptado: false, motivo: 'salto_gps', distanciaMetros };
    }

    if (distanciaMetros < CONFIG.gps.minDistanceMeters) {
      return { aceptado: false, motivo: 'sin_movimiento_real', distanciaMetros };
    }

    return { aceptado: true, distanciaMetros };
  }
}
