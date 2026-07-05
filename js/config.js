// Configuración global de la aplicación.
// Constantes centralizadas para facilitar ajustes sin tocar la lógica de negocio.

export const CONFIG = {
  // --- GPS ---
  gps: {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
    // Precisión mínima aceptable (metros). Puntos con peor precisión se descartan.
    maxAccuracyMeters: 25,
    // Distancia mínima entre puntos consecutivos para considerarlos un movimiento real (metros).
    minDistanceMeters: 2,
    // Velocidad máxima plausible según actividad (m/s), para descartar saltos de GPS.
    maxSpeedMps: {
      caminar: 4,      // ~14.4 km/h
      correr: 8,       // ~28.8 km/h
      bicicleta: 20,   // ~72 km/h
    },
  },

  // --- Calorías (MET - Metabolic Equivalent of Task) ---
  met: {
    caminar: 3.8,
    correr: 9.8,
    bicicleta: 7.5,
  },

  pesoDefaultKg: 70,

  // --- Mapa (Leaflet + OpenStreetMap, no requiere API key) ---
  map: {
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    defaultZoom: 17,
    maxZoom: 19,
    // Coordenada de respaldo si aún no hay ubicación (se recentra al primer fix).
    fallbackCenter: [4.710989, -74.072092],
  },

  // --- Persistencia ---
  db: {
    name: 'recorridos-db',
    version: 1,
    storeName: 'recorridos',
  },

  storageKeys: {
    peso: 'recorridos:pesoKg',
  },
};
