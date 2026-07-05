import { CONFIG } from '../../config.js';

/**
 * Detección de movimiento físico real usando el acelerómetro del
 * dispositivo (DeviceMotion API).
 *
 * Por qué existe: el GPS por sí solo no puede distinguir con certeza entre
 * "el usuario se movió un poco" y "el receptor GPS tiene un sesgo/deriva
 * momentánea" (multipath, cambios de geometría satelital, etc.). Ese sesgo
 * no siempre es ruido puramente aleatorio: a veces se comporta como una
 * pequeña "caminata" sostenida durante varios segundos, lo cual ningún
 * filtro basado solo en posición puede descartar con total seguridad.
 *
 * El acelerómetro aporta una señal independiente: caminar, correr o pedalear
 * produce una vibración/oscilación característica (cada paso genera un pico
 * de aceleración) que un teléfono realmente quieto no genera, sin importar
 * lo que diga el GPS en ese momento. Esta clase expone esa señal para que
 * `TrackingController` pueda usarla como un veto adicional: si el GPS sugiere
 * movimiento pero el acelerómetro no detecta ninguna vibración reciente, el
 * punto se descarta.
 *
 * Es un complemento, no un reemplazo del filtrado de GPS: en navegadores o
 * dispositivos donde la API no esté disponible o el permiso sea denegado,
 * `estaEnMovimiento()` devuelve `null` ("sin opinión") y el resto de la app
 * sigue funcionando solo con las reglas de GPS.
 */
export class MotionSensorService {
  constructor({ ventanaMs = CONFIG.motion.ventanaMs, umbralVarianza = CONFIG.motion.umbralVarianza } = {}) {
    this._ventanaMs = ventanaMs;
    this._umbralVarianza = umbralVarianza;
    this._muestras = [];
    this._soportado = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    this._escuchando = false;
    this._handler = this._handler.bind(this);
  }

  estaSoportado() {
    return this._soportado;
  }

  /**
   * En iOS 13+ se debe solicitar permiso explícito (requiere un gesto del
   * usuario, p. ej. el propio botón "Empezar recorrido"). En Android y la
   * mayoría de navegadores de escritorio no hace falta: se resuelve `true`
   * directamente sin pedir nada.
   */
  async solicitarPermiso() {
    if (!this._soportado) return false;

    const RequestPermission = window.DeviceMotionEvent?.requestPermission;
    if (typeof RequestPermission === 'function') {
      try {
        const resultado = await RequestPermission();
        return resultado === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  iniciar() {
    if (!this._soportado || this._escuchando) return;
    this._muestras = [];
    window.addEventListener('devicemotion', this._handler);
    this._escuchando = true;
  }

  detener() {
    if (!this._escuchando) return;
    window.removeEventListener('devicemotion', this._handler);
    this._escuchando = false;
    this._muestras = [];
  }

  estaActivo() {
    return this._soportado && this._escuchando;
  }

  _handler(event) {
    // Se prefiere aceleración lineal (sin gravedad): un giro del teléfono
    // estando quieto no debería contar como "movimiento". Si el navegador
    // no la expone, se usa la aceleración con gravedad como respaldo.
    const acc = event.acceleration && event.acceleration.x != null
      ? event.acceleration
      : event.accelerationIncludingGravity;

    if (!acc || acc.x == null) return;

    const magnitud = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    const ahora = Date.now();
    this._muestras.push({ t: ahora, magnitud });

    const limite = ahora - this._ventanaMs;
    while (this._muestras.length && this._muestras[0].t < limite) {
      this._muestras.shift();
    }
  }

  /**
   * @returns {boolean|null} true si hay vibración/oscilación reciente
   *   compatible con movimiento físico (pasos, pedaleo); false si el
   *   teléfono está evidentemente quieto; null si no hay datos suficientes
   *   o el sensor no está disponible (sin opinión).
   */
  estaEnMovimiento() {
    if (!this.estaActivo() || this._muestras.length < 6) {
      return null;
    }

    const magnitudes = this._muestras.map((m) => m.magnitud);
    const media = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const varianza = magnitudes.reduce((a, b) => a + (b - media) ** 2, 0) / magnitudes.length;

    return varianza > this._umbralVarianza;
  }
}
