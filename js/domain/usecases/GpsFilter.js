import { HaversineCalculator } from './HaversineCalculator.js';
import { CONFIG } from '../../config.js';

/**
 * Filtra puntos GPS erroneos o ruidosos antes de aceptarlos como parte
 * del recorrido. Reglas aplicadas:
 *   1. Descarta puntos con precision (accuracy) peor que el umbral configurado.
 *   2. Descarta puntos que impliquen una velocidad implausible respecto al
 *      punto anterior (saltos de GPS / rebotes de senal).
 *   3. Descarta puntos si el propio GPS reporta velocidad casi nula (quieto).
 *   4. Ignora puntos que no representen un desplazamiento real, usando un
 *      umbral dinamico basado en la precision (accuracy) reportada, para
 *      evitar que el "jitter" del GPS acumule distancia estando quieto.
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

    // Senal mas confiable que la posicion cruda: si el propio chip GPS
    // reporta velocidad casi nula en ambos puntos, el usuario esta quieto
    // aunque la posicion "salte" un poco por ruido.
    const velocidadQuieta =
      anterior.speed != null &&
      nueva.speed != null &&
      anterior.speed < CONFIG.gps.velocidadMinConfiableMps &&
      nueva.speed < CONFIG.gps.velocidadMinConfiableMps;

    if (velocidadQuieta) {
      return { aceptado: false, motivo: 'quieto_segun_gps', distanciaMetros };
    }

    const velocidadMps = distanciaMetros / (deltaMs / 1000);
    const maxVelocidad = CONFIG.gps.maxSpeedMps[tipoActividad] ?? CONFIG.gps.maxSpeedMps.correr;

    if (velocidadMps > maxVelocidad) {
      return { aceptado: false, motivo: 'salto_gps', distanciaMetros };
    }

    // Umbral dinamico: dos lecturas dentro de su margen de error combinado
    // (accuracy) no implican movimiento real, solo ruido del receptor GPS.
    // Se usa el mayor entre un piso fijo y la precision promedio reportada.
    const precisionAnterior = anterior.accuracy ?? CONFIG.gps.minDistanceMeters;
    const precisionNueva = nueva.accuracy ?? CONFIG.gps.minDistanceMeters;
    const precisionPromedio = (precisionAnterior + precisionNueva) / 2;
    const umbralMovimiento = Math.max(
      CONFIG.gps.minDistanceMeters,
      precisionPromedio * CONFIG.gps.factorPrecision
    );

    if (distanciaMetros < umbralMovimiento) {
      return { aceptado: false, motivo: 'ruido_gps', distanciaMetros };
    }

    return { aceptado: true, distanciaMetros };
  }
}
