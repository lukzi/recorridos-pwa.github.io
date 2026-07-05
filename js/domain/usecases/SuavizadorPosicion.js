import { Coordenada } from '../entities/Coordenada.js';

/**
 * Suaviza el flujo de posiciones GPS crudas mediante un promedio móvil de
 * las últimas N lecturas (filtro paso-bajo simple).
 *
 * Por qué existe: un único fix de GPS puede "saltar" varios metros por
 * ruido del receptor, incluso estando completamente quieto. Comparar cada
 * fix crudo contra el anterior (como hacía la primera versión) permite que
 * esos saltos aleatorios se acumulen como si fueran desplazamiento real
 * (efecto "caminando en círculos" estando parado). Promediar varias
 * lecturas reduce la varianza del ruido en un factor ~N: el punto
 * suavizado se mueve mucho menos que cualquier lectura individual cuando
 * el usuario está quieto, pero sigue reflejando con fidelidad razonable un
 * movimiento real sostenido (con un pequeño retraso de arranque de N
 * lecturas, aceptable frente al beneficio de eliminar el ruido).
 */
export class SuavizadorPosicion {
  constructor(tamanoVentana = 5) {
    this._tamanoVentana = tamanoVentana;
    this._buffer = [];
  }

  /**
   * @param {Coordenada} coordenadaCruda
   * @returns {Coordenada|null} posición suavizada, o null mientras se
   *   completa la ventana inicial (aún no hay suficientes muestras).
   */
  procesar(coordenadaCruda) {
    this._buffer.push(coordenadaCruda);
    if (this._buffer.length > this._tamanoVentana) {
      this._buffer.shift();
    }
    if (this._buffer.length < this._tamanoVentana) {
      return null;
    }
    return this._promediar();
  }

  reiniciar() {
    this._buffer = [];
  }

  _promediar() {
    const n = this._buffer.length;
    let lat = 0;
    let lng = 0;
    let accuracySum = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (const c of this._buffer) {
      lat += c.lat;
      lng += c.lng;
      accuracySum += c.accuracy ?? 0;
      if (c.speed != null) {
        speedSum += c.speed;
        speedCount++;
      }
    }

    const ultimo = this._buffer[n - 1];
    return new Coordenada(
      lat / n,
      lng / n,
      ultimo.timestamp,
      accuracySum / n,
      speedCount > 0 ? speedSum / speedCount : null,
      ultimo.altitude ?? null
    );
  }
}
