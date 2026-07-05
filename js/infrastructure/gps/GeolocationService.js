import { CONFIG } from '../../config.js';
import { Coordenada } from '../../domain/entities/Coordenada.js';

/**
 * Envuelve la Geolocation API del navegador.
 * Responsabilidades:
 *  - Solicitar permisos.
 *  - Seguimiento continuo (watchPosition) con manejo de errores.
 *  - Reintentos automáticos ante pérdida temporal de señal.
 *  - Notificar a los suscriptores solo con coordenadas crudas (el filtrado
 *    de puntos erróneos es responsabilidad del dominio, no de este servicio).
 */
export class GeolocationService {
  constructor() {
    this._watchId = null;
    this._onPosition = null;
    this._onError = null;
    this._reintentos = 0;
    this._maxReintentos = 5;
  }

  isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Solicita permiso obteniendo una posición puntual.
   * Devuelve una Promise que se resuelve con la primera Coordenada o
   * rechaza con un error legible.
   */
  solicitarPermiso() {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Este dispositivo/navegador no soporta geolocalización.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(Coordenada.fromGeolocationPosition(position)),
        (error) => reject(this._mapError(error)),
        { enableHighAccuracy: true, timeout: CONFIG.gps.timeout, maximumAge: 0 }
      );
    });
  }

  /**
   * Inicia el seguimiento continuo.
   * @param {(coordenada: Coordenada) => void} onPosition
   * @param {(error: Error, esRecuperable: boolean) => void} onError
   */
  iniciarSeguimiento(onPosition, onError) {
    if (!this.isSupported()) {
      onError(new Error('Geolocalización no soportada.'), false);
      return;
    }

    this._onPosition = onPosition;
    this._onError = onError;
    this._reintentos = 0;

    this._watchId = navigator.geolocation.watchPosition(
      (position) => {
        this._reintentos = 0;
        this._onPosition(Coordenada.fromGeolocationPosition(position));
      },
      (error) => this._manejarError(error),
      {
        enableHighAccuracy: CONFIG.gps.enableHighAccuracy,
        maximumAge: CONFIG.gps.maximumAge,
        timeout: CONFIG.gps.timeout,
      }
    );
  }

  detenerSeguimiento() {
    if (this._watchId != null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
  }

  _manejarError(error) {
    const esTimeout = error.code === error.TIMEOUT;
    const esRecuperable = esTimeout || error.code === error.POSITION_UNAVAILABLE;

    if (esRecuperable && this._reintentos < this._maxReintentos) {
      this._reintentos++;
      // Reintento automático: la señal GPS puede recuperarse en pocos segundos
      // (túneles, edificios, arranque en frío del receptor).
      setTimeout(() => {
        if (this._watchId != null) {
          this.detenerSeguimiento();
          this.iniciarSeguimiento(this._onPosition, this._onError);
        }
      }, 2000 * this._reintentos);
    }

    this._onError?.(this._mapError(error), esRecuperable);
  }

  _mapError(error) {
    const mensajes = {
      1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.',
      2: 'Ubicación no disponible en este momento. Reintentando...',
      3: 'Tiempo de espera agotado buscando señal GPS. Reintentando...',
    };
    return new Error(mensajes[error.code] || 'Error desconocido de geolocalización.');
  }
}
