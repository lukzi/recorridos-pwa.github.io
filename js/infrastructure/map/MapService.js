import { CONFIG } from '../../config.js';

/**
 * Encapsula toda la interacción con Leaflet (biblioteca de mapas basada en
 * OpenStreetMap, sin necesidad de API key). El resto de la aplicación no
 * conoce Leaflet directamente: solo llama a los métodos de este servicio,
 * lo que permitiría sustituirlo por otro proveedor de mapas sin tocar el
 * resto de las capas.
 */
export class MapService {
  constructor() {
    this._map = null;
    this._polyline = null;
    this._marcadorActual = null;
    this._puntos = [];
  }

  /**
   * @param {HTMLElement} contenedor
   * @param {[number, number]} [centroInicial]
   */
  inicializar(contenedor, centroInicial) {
    const centro = centroInicial || CONFIG.map.fallbackCenter;

    this._map = L.map(contenedor, {
      zoomControl: true,
      attributionControl: true,
    }).setView(centro, CONFIG.map.defaultZoom);

    L.tileLayer(CONFIG.map.tileUrl, {
      maxZoom: CONFIG.map.maxZoom,
      attribution: CONFIG.map.attribution,
    }).addTo(this._map);

    this._polyline = L.polyline([], { color: '#1b8a5a', weight: 5, opacity: 0.9 }).addTo(this._map);

    // Fuerza a Leaflet a recalcular dimensiones tras insertarse en el DOM.
    setTimeout(() => this._map.invalidateSize(), 100);
  }

  /** Agrega un punto al recorrido y actualiza la polilínea + marcador. */
  agregarPunto(lat, lng, { centrar = true } = {}) {
    if (!this._map) return;
    const punto = [lat, lng];
    this._puntos.push(punto);
    this._polyline.setLatLngs(this._puntos);

    if (!this._marcadorActual) {
      this._marcadorActual = L.circleMarker(punto, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#1b8a5a',
        fillOpacity: 1,
      }).addTo(this._map);
    } else {
      this._marcadorActual.setLatLng(punto);
    }

    if (centrar) {
      this._map.panTo(punto, { animate: true });
    }
  }

  centrarEn(lat, lng, zoom) {
    if (!this._map) return;
    this._map.setView([lat, lng], zoom || this._map.getZoom());
  }

  /** Ajusta el zoom/centro para que se vea el recorrido completo. */
  ajustarVistaARecorrido() {
    if (!this._map || this._puntos.length === 0) return;
    this._map.fitBounds(this._polyline.getBounds(), { padding: [30, 30] });
  }

  /** Dibuja un recorrido completo ya finalizado (pantalla de resumen/historial). */
  dibujarRecorridoCompleto(coordenadas) {
    if (!this._map) return;
    const puntos = coordenadas.map((c) => [c.lat, c.lng]);
    this._puntos = puntos;
    this._polyline.setLatLngs(puntos);
    if (puntos.length > 0) {
      this._map.fitBounds(this._polyline.getBounds(), { padding: [30, 30] });
    }
  }

  destruir() {
    if (this._map) {
      this._map.remove();
      this._map = null;
      this._polyline = null;
      this._marcadorActual = null;
      this._puntos = [];
    }
  }
}
