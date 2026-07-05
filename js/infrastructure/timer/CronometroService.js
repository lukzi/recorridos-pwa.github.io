/**
 * Cronómetro del recorrido. Controla tiempo transcurrido real (excluyendo
 * pausas) y notifica a un listener cada segundo para refrescar la UI.
 */
export class CronometroService {
  constructor() {
    this._inicio = null;
    this._acumuladoMs = 0;
    this._intervalo = null;
    this._enCurso = false;
    this._onTick = null;
  }

  iniciar(onTick) {
    this._inicio = Date.now();
    this._acumuladoMs = 0;
    this._enCurso = true;
    this._onTick = onTick;
    this._lanzarIntervalo();
  }

  pausar() {
    if (!this._enCurso) return;
    this._acumuladoMs += Date.now() - this._inicio;
    this._enCurso = false;
    clearInterval(this._intervalo);
  }

  reanudar() {
    if (this._enCurso) return;
    this._inicio = Date.now();
    this._enCurso = true;
    this._lanzarIntervalo();
  }

  detener() {
    if (this._enCurso) {
      this._acumuladoMs += Date.now() - this._inicio;
      this._enCurso = false;
    }
    clearInterval(this._intervalo);
    return this.tiempoTranscurridoMs();
  }

  tiempoTranscurridoMs() {
    if (this._enCurso) {
      return this._acumuladoMs + (Date.now() - this._inicio);
    }
    return this._acumuladoMs;
  }

  estaEnCurso() {
    return this._enCurso;
  }

  _lanzarIntervalo() {
    clearInterval(this._intervalo);
    this._intervalo = setInterval(() => {
      this._onTick?.(this.tiempoTranscurridoMs());
    }, 1000);
  }

  static formatear(ms) {
    const totalSeg = Math.floor(ms / 1000);
    const h = Math.floor(totalSeg / 3600);
    const m = Math.floor((totalSeg % 3600) / 60);
    const s = totalSeg % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}
