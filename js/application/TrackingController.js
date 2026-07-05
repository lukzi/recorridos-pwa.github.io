import { GeolocationService } from '../infrastructure/gps/GeolocationService.js';
import { CronometroService } from '../infrastructure/timer/CronometroService.js';
import { GpsFilter } from '../domain/usecases/GpsFilter.js';
import { HaversineCalculator } from '../domain/usecases/HaversineCalculator.js';
import { RitmoCalculator } from '../domain/usecases/RitmoCalculator.js';
import { CaloriasCalculator } from '../domain/usecases/CaloriasCalculator.js';
import { SuavizadorPosicion } from '../domain/usecases/SuavizadorPosicion.js';
import { Recorrido, EstadoRecorrido } from '../domain/entities/Recorrido.js';

/**
 * Caso de uso / orquestador principal: coordina GPS, cronómetro y cálculos
 * de dominio durante un recorrido activo. La UI (presentation) solo
 * consume el estado que este controlador expone y reacciona a sus eventos;
 * no conoce detalles de geolocalización, IndexedDB ni Leaflet.
 */
export class TrackingController {
  constructor({ geolocationService = new GeolocationService(), cronometroService = new CronometroService() } = {}) {
    this._geo = geolocationService;
    this._cronometro = cronometroService;

    this._coordenadas = [];
    this._distanciaMetros = 0;
    this._tipoActividad = 'correr';
    this._pesoKg = 70;
    this._horaInicio = null;
    this._puntosDescartados = 0;
    this._suavizador = new SuavizadorPosicion(5);

    this._listeners = {
      onPunto: [],
      onPosicionCruda: [],
      onError: [],
      onTick: [],
      onEstadisticas: [],
    };
  }

  on(evento, callback) {
    this._listeners[evento]?.push(callback);
  }

  _emit(evento, payload) {
    this._listeners[evento]?.forEach((cb) => cb(payload));
  }

  async solicitarPermisoUbicacion() {
    return this._geo.solicitarPermiso();
  }

  iniciar({ tipoActividad = 'correr', pesoKg = 70 } = {}) {
    this._tipoActividad = tipoActividad;
    this._pesoKg = pesoKg;
    this._coordenadas = [];
    this._distanciaMetros = 0;
    this._puntosDescartados = 0;
    this._suavizador.reiniciar();
    this._horaInicio = Date.now();

    this._cronometro.iniciar((ms) => {
      this._emit('onTick', ms);
      this._emit('onEstadisticas', this._calcularEstadisticas());
    });

    this._geo.iniciarSeguimiento(
      (coordenada) => this._procesarPunto(coordenada),
      (error, esRecuperable) => this._emit('onError', { error, esRecuperable })
    );
  }

  pausar() {
    this._cronometro.pausar();
    this._geo.detenerSeguimiento();
  }

  reanudar() {
    this._cronometro.reanudar();
    this._geo.iniciarSeguimiento(
      (coordenada) => this._procesarPunto(coordenada),
      (error, esRecuperable) => this._emit('onError', { error, esRecuperable })
    );
  }

  finalizar() {
    const tiempoTotalMs = this._cronometro.detener();
    this._geo.detenerSeguimiento();

    const estadisticas = this._calcularEstadisticas(tiempoTotalMs);
    const horaFin = Date.now();

    const recorrido = new Recorrido({
      id: `rec_${this._horaInicio}_${Math.random().toString(36).slice(2, 8)}`,
      tipoActividad: this._tipoActividad,
      fecha: new Date(this._horaInicio).toISOString().slice(0, 10),
      horaInicio: this._horaInicio,
      horaFin,
      tiempoTotalMs,
      distanciaMetros: this._distanciaMetros,
      calorias: estadisticas.calorias,
      ritmoPromedioSegPorKm: estadisticas.ritmoPromedioSegPorKm,
      velocidadPromedioKmh: estadisticas.velocidadPromedioKmh,
      coordenadas: [...this._coordenadas],
      estado: EstadoRecorrido.FINALIZADO,
      pesoKg: this._pesoKg,
    });

    return recorrido;
  }

  /**
   * Procesa cada fix crudo del GPS en dos etapas:
   *
   *   1. Suavizado: el punto crudo pasa por un promedio móvil de las
   *      últimas 5 lecturas (`SuavizadorPosicion`). Esto reduce el ruido
   *      del receptor GPS antes de tomar cualquier decisión — un único
   *      salto de varios metros estando quieto influye poco en un promedio
   *      de 5 muestras, mientras que un movimiento real sostenido sí se
   *      refleja (con un pequeño retraso de arranque de ~5 lecturas).
   *   2. Filtrado de dominio: el punto ya suavizado se compara contra el
   *      último punto aceptado usando `GpsFilter` (precisión, velocidad
   *      plausible, umbral de ruido dinámico según la precisión del GPS).
   *
   * Sin el suavizado, comparar fixes crudos consecutivos permite que el
   * ruido aleatorio del GPS se acumule como si fuera desplazamiento real
   * (el efecto de "caminar en círculos" estando parado).
   */
  _procesarPunto(coordenadaCruda) {
    // Feedback inmediato de posición cruda (para el marcador en el mapa),
    // independiente de si el punto termina formando parte del recorrido.
    this._emit('onPosicionCruda', coordenadaCruda);

    const suavizada = this._suavizador.procesar(coordenadaCruda);
    if (!suavizada) {
      // Aún acumulando las primeras lecturas para poder promediar.
      this._emit('onEstadisticas', this._calcularEstadisticas());
      return;
    }

    const ancla = this._coordenadas[this._coordenadas.length - 1] || null;

    if (!ancla) {
      this._coordenadas.push(suavizada);
      this._emit('onPunto', suavizada);
      this._emit('onEstadisticas', this._calcularEstadisticas());
      return;
    }

    const evaluacion = GpsFilter.evaluar(ancla, suavizada, this._tipoActividad);

    if (!evaluacion.aceptado) {
      this._puntosDescartados++;
      this._emit('onEstadisticas', this._calcularEstadisticas());
      return;
    }

    this._distanciaMetros += evaluacion.distanciaMetros;
    this._coordenadas.push(suavizada);
    this._emit('onPunto', suavizada);
    this._emit('onEstadisticas', this._calcularEstadisticas());
  }

  _calcularEstadisticas(tiempoTotalMsOverride) {
    const tiempoMs = tiempoTotalMsOverride ?? this._cronometro.tiempoTranscurridoMs();
    const velocidadPromedioKmh = RitmoCalculator.velocidadKmh(this._distanciaMetros, tiempoMs);
    const ritmoPromedioSegPorKm = RitmoCalculator.ritmoSegPorKm(this._distanciaMetros, tiempoMs);

    // Velocidad instantánea: se basa en el último tramo recorrido (últimos 2 puntos).
    let velocidadInstantaneaKmh = 0;
    const n = this._coordenadas.length;
    if (n >= 2) {
      const p1 = this._coordenadas[n - 2];
      const p2 = this._coordenadas[n - 1];
      const d = HaversineCalculator.distanciaMetros(p1, p2);
      const dt = p2.timestamp - p1.timestamp;
      velocidadInstantaneaKmh = RitmoCalculator.velocidadKmh(d, dt);
    }

    const calorias = CaloriasCalculator.estimar({
      tipoActividad: this._tipoActividad,
      tiempoMs,
      distanciaMetros: this._distanciaMetros,
      pesoKg: this._pesoKg,
    });

    return {
      tiempoMs,
      distanciaMetros: this._distanciaMetros,
      velocidadInstantaneaKmh,
      velocidadPromedioKmh,
      ritmoPromedioSegPorKm,
      calorias,
      cantidadPuntos: n,
      horaInicio: this._horaInicio,
    };
  }
}
