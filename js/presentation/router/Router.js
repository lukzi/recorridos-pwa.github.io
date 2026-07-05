/**
 * Router muy simple basado en location.hash.
 * Cada ruta registra una función render(container) que puede devolver
 * una función de limpieza (destroy), invocada al salir de la ruta
 * (por ejemplo para detener el GPS o destruir el mapa de Leaflet).
 */
export class Router {
  constructor(container) {
    this._container = container;
    this._rutas = new Map();
    this._destroyActual = null;
    this._rutaDefault = '/';

    window.addEventListener('hashchange', () => this._resolver());
  }

  registrar(ruta, renderFn) {
    this._rutas.set(ruta, renderFn);
    return this;
  }

  definirRutaDefault(ruta) {
    this._rutaDefault = ruta;
    return this;
  }

  iniciar() {
    if (!location.hash) {
      location.hash = `#${this._rutaDefault}`;
    } else {
      this._resolver();
    }
  }

  navegar(ruta) {
    if (location.hash === `#${ruta}`) {
      this._resolver(); // permite re-renderizar la misma ruta si hace falta
    } else {
      location.hash = `#${ruta}`;
    }
  }

  async _resolver() {
    const ruta = location.hash.replace('#', '') || this._rutaDefault;
    const renderFn = this._rutas.get(ruta) || this._rutas.get(this._rutaDefault);

    if (typeof this._destroyActual === 'function') {
      try {
        this._destroyActual();
      } catch (e) {
        console.warn('Error al limpiar pantalla anterior:', e);
      }
      this._destroyActual = null;
    }

    this._container.innerHTML = '';
    const posibleDestroy = await renderFn(this._container, this);
    if (typeof posibleDestroy === 'function') {
      this._destroyActual = posibleDestroy;
    }
  }
}
