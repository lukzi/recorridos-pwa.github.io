/**
 * Cálculos de ritmo y velocidad.
 */
export class RitmoCalculator {
  /** Velocidad instantánea en km/h a partir de metros y milisegundos. */
  static velocidadKmh(metros, ms) {
    if (ms <= 0) return 0;
    const horas = ms / 3600000;
    const km = metros / 1000;
    return horas > 0 ? km / horas : 0;
  }

  /** Ritmo en segundos por kilómetro a partir de metros y milisegundos. */
  static ritmoSegPorKm(metros, ms) {
    if (metros <= 0) return 0;
    const km = metros / 1000;
    const segundos = ms / 1000;
    return segundos / km;
  }

  /** Formatea segundos/km como "m:ss min/km". */
  static formatearRitmo(segPorKm) {
    if (!isFinite(segPorKm) || segPorKm <= 0) return '--:--';
    const minutos = Math.floor(segPorKm / 60);
    const segundos = Math.round(segPorKm % 60);
    const segStr = segundos < 10 ? `0${segundos}` : `${segundos}`;
    return `${minutos}:${segStr}`;
  }

  static formatearVelocidad(kmh) {
    if (!isFinite(kmh)) return '0.0';
    return kmh.toFixed(1);
  }
}
