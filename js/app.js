import { Router } from './presentation/router/Router.js';
import { renderInicio } from './presentation/screens/InicioScreen.js';
import { renderRecorrido } from './presentation/screens/RecorridoScreen.js';
import { renderResumen } from './presentation/screens/ResumenScreen.js';
import { renderHistorial } from './presentation/screens/HistorialScreen.js';
import { renderDetalle } from './presentation/screens/DetalleScreen.js';

const app = document.getElementById('app');

const router = new Router(app);
router
  .registrar('/', renderInicio)
  .registrar('/recorrido', renderRecorrido)
  .registrar('/resumen', renderResumen)
  .registrar('/historial', renderHistorial)
  .registrar('/detalle', renderDetalle)
  .definirRutaDefault('/')
  .iniciar();

// Registro del Service Worker para soporte offline e instalación como PWA.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('No se pudo registrar el Service Worker:', err);
    });
  });
}

// Prompt de instalación (Android/Chrome): guarda el evento para dispararlo
// desde un botón si en el futuro se agrega un CTA de "Instalar app".
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__deferredInstallPrompt = event;
});
