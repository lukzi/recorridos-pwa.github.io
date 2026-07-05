// Service Worker - Recorridos GPS
// Estrategia: cache-first para el "app shell" (HTML/CSS/JS/iconos) y
// network-first para las teselas del mapa (OpenStreetMap), que además
// se cachean de forma oportunista para permitir revisar el mapa offline
// en zonas ya visitadas.

const CACHE_VERSION = 'recorridos-v1';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const TILES_CACHE = `tiles-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/domain/entities/Coordenada.js',
  './js/domain/entities/Recorrido.js',
  './js/domain/usecases/HaversineCalculator.js',
  './js/domain/usecases/RitmoCalculator.js',
  './js/domain/usecases/CaloriasCalculator.js',
  './js/domain/usecases/GpsFilter.js',
  './js/data/datasources/IndexedDBDataSource.js',
  './js/data/repositories/RecorridoRepository.js',
  './js/infrastructure/gps/GeolocationService.js',
  './js/infrastructure/map/MapService.js',
  './js/infrastructure/timer/CronometroService.js',
  './js/application/TrackingController.js',
  './js/presentation/router/Router.js',
  './js/presentation/utils/dom.js',
  './js/presentation/screens/InicioScreen.js',
  './js/presentation/screens/RecorridoScreen.js',
  './js/presentation/screens/ResumenScreen.js',
  './js/presentation/screens/HistorialScreen.js',
  './js/presentation/screens/DetalleScreen.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== TILES_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isTileRequest(url) {
  return /tile\.openstreetmap\.org|\{s\}\.tile|tile\.osm/.test(url);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  // Teselas del mapa: network-first, con fallback y cache oportunista.
  if (isTileRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(TILES_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell y demás recursos propios: cache-first.
  if (url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => caches.match('./index.html'))
        );
      })
    );
  }
});
