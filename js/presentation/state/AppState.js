/**
 * Estado compartido en memoria entre pantallas (no persistente).
 * Evita acoplar las pantallas entre sí: cada una lee/escribe aquí lo
 * mínimo necesario para la navegación (p.ej. qué recorrido mostrar).
 */
class AppStateStore {
  constructor() {
    this.recorridoEnCurso = null; // TrackingController activo
    this.ultimoRecorridoFinalizado = null; // Recorrido (entidad) recién terminado, aún no guardado
    this.recorridoSeleccionadoId = null; // id para pantalla de Detalle
    this.pesoKg = Number(localStorage.getItem('recorridos:pesoKg')) || 70;
    this.tipoActividad = localStorage.getItem('recorridos:tipoActividad') || 'correr';
  }

  setPeso(pesoKg) {
    this.pesoKg = pesoKg;
    localStorage.setItem('recorridos:pesoKg', String(pesoKg));
  }

  setTipoActividad(tipo) {
    this.tipoActividad = tipo;
    localStorage.setItem('recorridos:tipoActividad', tipo);
  }
}

export const AppState = new AppStateStore();
