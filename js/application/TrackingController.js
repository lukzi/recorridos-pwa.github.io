import { GeolocationService } from '../infrastructure/gps/GeolocationService.js';
import { CronometroService } from '../infrastructure/timer/CronometroService.js';
import { MotionSensorService } from '../infrastructure/motion/MotionSensorService.js';
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
  constructor({
    geolocationService = new GeolocationService(),
    cronometroService = new CronometroService(),
    motionSensorService = new MotionSensorService(),
  } = {}) {
    this._geo = geolocationService;
    this._cronometro = cronometroService;
    this._motion = motionSensorService;

    this._coordenadas = [];
    this._distanciaMetros = 0;
    this._tipoActividad = 'correr';
    this._pesoKg = 70;
    this._horaInicio = null;
    this._puntosDescartados = 0;
    this._suavizador = new SuavizadorPosicion(5);
    this._msActivo = 0;
    this._msQuieto = 0;

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

  /**
   * Permiso del acelerómetro (obligatorio en iOS 13+, no-op en el resto).
   * Si se deniega o no está soportado, la app sigue funcionando solo con
   * las reglas de GPS (ver MotionSensorService).
   */
  async solicitarPermisoMovimiento() {
    return this._motion.solicitarPermiso();
  }

  iniciar({ tipoActividad = 'correr', pesoKg = 70 } = {}) {
    this._tipoActividad = tipoActividad;
    this._pesoKg = pesoKg;
    this._coordenadas = [];
    this._distanciaMetros = 0;
    this._puntosDescartados = 0;
    this._msActivo = 0;
    this._msQuieto = 0;
    this._ultimoTickMs = Date.now();
    this._suavizador.reiniciar();
    this._horaInicio = Date.now();

    this._motion.iniciar();

    this._cronometro.iniciar((ms) => {
      this._acumularTiempoPorEstado();
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
    this._motion.detener();
  }

  reanudar() {
    this._ultimoTickMs = Date.now();
    this._cronometro.reanudar();
    this._motion.iniciar();
    this._geo.iniciarSeguimiento(
      (coordenada) => this._procesarPunto(coordenada),
      (error, esRecuperable) => this._emit('onError', { error, esRecuperable })
    );
  }

  finalizar() {
    const tiempoTotalMs = this._cronometro.detener();
    this._geo.detenerSeguimiento();
    this._motion.detener();

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
   * Acumula el tiempo transcurrido desde el último tick en el "bolsillo"
   * activo o quieto, según lo que reporte el acelerómetro en este instante.
   * Si el sensor no está disponible (`null`), todo el tiempo se cuenta como
   * activo — igual que el comportamiento original antes de esta mejora.
   */
  _acumularTiempoPorEstado() {
    const ahora = Date.now();
    const ultimoTick = this._ultimoTickMs ?? ahora;
    const deltaMs = Math.max(0, ahora - ultimoTick);
    this._ultimoTickMs = ahora;

    const enMovimiento = this._motion.estaEnMovimiento();
    if (enMovimiento === false) {
      this._msQuieto += deltaMs;
    } else {
      this._msActivo += deltaMs;
    }
  }

  /**
   * Procesa cada fix crudo del GPS en tres etapas:
   *
   *   1. Suavizado: el punto crudo pasa por un promedio móvil de las
   *      últimas 5 lecturas (`SuavizadorPosicion`), para reducir el ruido
   *      propio del receptor GPS antes de tomar cualquier decisión.
   *   2. Filtrado de GPS: el punto suavizado se compara contra el último
   *      punto aceptado usando `GpsFilter` (precisión, velocidad plausible,
   *      umbral de ruido dinámico según la precisión reportada).
   *   3. Veto por acelerómetro: aunque el GPS sugiera movimiento, si el
   *      acelerómetro no detecta ninguna vibración/oscilación reciente
   *      (`MotionSensorService.estaEnMovimiento() === false`), el punto se
   *      descarta igualmente. Esto es necesario porque la deriva del GPS
   *      no siempre es ruido aleatorio puro: a veces se comporta como un
   *      pequeño desplazamiento sostenido durante varios segundos (por
   *      multipath o cambios de geometría satelital), algo que ningún
   *      filtro basado solo en posición puede descartar con certeza. El
   *      acelerómetro aporta una señal físicamente independiente: caminar,
   *      correr o pedalear generan vibración; un teléfono quieto no.
   *
   * Si el acelerómetro no está disponible o no da opinión (`null`), este
   * paso se omite y el punto se acepta según el resultado del GPS, igual
   * que en la versión anterior.
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

    if (this._motion.estaEnMovimiento() === false) {
      // El GPS sugiere movimiento, pero el acelerómetro confirma que el
      // teléfono está quieto: se descarta como deriva/ruido de GPS.
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
      tiempoActivoMs: this._msActivo,
      tiempoQuietoMs: this._msQuieto,
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
      sensorMovimientoDisponible: this._motion.estaActivo(),
      enMovimiento: this._motion.estaEnMovimiento(),
    };
  }
}
