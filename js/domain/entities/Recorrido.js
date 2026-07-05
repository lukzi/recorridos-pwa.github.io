/**
 * Entidad de dominio: Recorrido.
 * Representa un recorrido completo (caminata, carrera o ciclismo).
 */

export const EstadoRecorrido = Object.freeze({
  EN_CURSO: 'en_curso',
  PAUSADO: 'pausado',
  FINALIZADO: 'finalizado',
  GUARDADO: 'guardado',
});

export const TipoActividad = Object.freeze({
  CAMINAR: 'caminar',
  CORRER: 'correr',
  BICICLETA: 'bicicleta',
});

export class Recorrido {
  constructor({
    id = null,
    tipoActividad = TipoActividad.CORRER,
    fecha = null,
    horaInicio = null,
    horaFin = null,
    tiempoTotalMs = 0,
    distanciaMetros = 0,
    calorias = 0,
    ritmoPromedioSegPorKm = 0,
    velocidadPromedioKmh = 0,
    coordenadas = [],
    estado = EstadoRecorrido.EN_CURSO,
    pesoKg = 70,
  } = {}) {
    this.id = id;
    this.tipoActividad = tipoActividad;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.tiempoTotalMs = tiempoTotalMs;
    this.distanciaMetros = distanciaMetros;
    this.calorias = calorias;
    this.ritmoPromedioSegPorKm = ritmoPromedioSegPorKm;
    this.velocidadPromedioKmh = velocidadPromedioKmh;
    this.coordenadas = coordenadas;
    this.estado = estado;
    this.pesoKg = pesoKg;
  }

  toPlainObject() {
    return {
      id: this.id,
      tipoActividad: this.tipoActividad,
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      tiempoTotalMs: this.tiempoTotalMs,
      distanciaMetros: this.distanciaMetros,
      calorias: this.calorias,
      ritmoPromedioSegPorKm: this.ritmoPromedioSegPorKm,
      velocidadPromedioKmh: this.velocidadPromedioKmh,
      coordenadas: this.coordenadas.map((c) => (c.toPlainObject ? c.toPlainObject() : c)),
      estado: this.estado,
      pesoKg: this.pesoKg,
    };
  }

  static fromPlainObject(obj) {
    return new Recorrido(obj);
  }
}
