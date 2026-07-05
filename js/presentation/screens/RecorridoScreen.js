import { el, formatHora } from '../utils/dom.js';
import { AppState } from '../state/AppState.js';
import { TrackingController } from '../../application/TrackingController.js';
import { MapService } from '../../infrastructure/map/MapService.js';
import { CronometroService } from '../../infrastructure/timer/CronometroService.js';
import { RitmoCalculator } from '../../domain/usecases/RitmoCalculator.js';

export function renderRecorrido(container, router) {
  const mapaDiv = el('div', { class: 'mapa', id: 'mapa-recorrido' });

  const banner = el('div', { class: 'banner banner--oculto' });

  const statPrincipal = (id, label, valor, unidad = '') =>
    el('div', { class: 'stat' }, [
      el('div', { class: 'stat__valor', id, text: valor }),
      el('div', { class: 'stat__label', text: `${label}${unidad ? ` (${unidad})` : ''}` }),
    ]);

  const panelPrincipal = el('div', { class: 'panel-stats' }, [
    statPrincipal('stat-tiempo', 'Tiempo', '00:00'),
    statPrincipal('stat-distancia', 'Distancia', '0.00', 'km'),
    statPrincipal('stat-ritmo', 'Ritmo', '--:--', 'min/km'),
    statPrincipal('stat-velocidad', 'Velocidad', '0.0', 'km/h'),
    statPrincipal('stat-calorias', 'Calorías', '0', 'kcal'),
  ]);

  const panelSecundario = el('div', { class: 'panel-secundario' }, [
    el('span', { id: 'stat-ritmo-prom', text: 'Ritmo prom.: --:--' }),
    el('span', { id: 'stat-vel-prom', text: 'Vel. prom.: 0.0 km/h' }),
    el('span', { id: 'stat-hora-inicio', text: 'Inicio: --:--' }),
    el('span', { id: 'stat-puntos', text: 'Puntos GPS: 0' }),
  ]);

  const btnPausar = el('button', { class: 'btn btn--control', text: 'Pausar' });
  const btnReanudar = el('button', { class: 'btn btn--control btn--oculto', text: 'Reanudar' });
  const btnFinalizar = el('button', { class: 'btn btn--peligro', text: 'Finalizar' });

  const controles = el('div', { class: 'controles' }, [btnPausar, btnReanudar, btnFinalizar]);

  const vista = el('div', { class: 'screen screen--recorrido' }, [
    mapaDiv,
    banner,
    el('div', { class: 'panel-inferior' }, [panelPrincipal, panelSecundario, controles]),
  ]);

  container.appendChild(vista);

  const mapService = new MapService();
  const controller = new TrackingController({ cronometroService: new CronometroService() });
  AppState.recorridoEnCurso = controller;

  function mostrarBanner(texto, tipo = 'info') {
    banner.textContent = texto;
    banner.className = `banner banner--${tipo}`;
  }
  function ocultarBanner() {
    banner.className = 'banner banner--oculto';
  }

  function actualizarUI(stats) {
    container.querySelector('#stat-tiempo').textContent = CronometroService.formatear(stats.tiempoMs);
    container.querySelector('#stat-distancia').textContent = (stats.distanciaMetros / 1000).toFixed(2);
    container.querySelector('#stat-ritmo').textContent = RitmoCalculator.formatearRitmo(stats.ritmoPromedioSegPorKm);
    container.querySelector('#stat-velocidad').textContent = RitmoCalculator.formatearVelocidad(stats.velocidadInstantaneaKmh);
    container.querySelector('#stat-calorias').textContent = String(stats.calorias);

    container.querySelector('#stat-ritmo-prom').textContent = `Ritmo prom.: ${RitmoCalculator.formatearRitmo(stats.ritmoPromedioSegPorKm)}`;
    container.querySelector('#stat-vel-prom').textContent = `Vel. prom.: ${RitmoCalculator.formatearVelocidad(stats.velocidadPromedioKmh)} km/h`;
    container.querySelector('#stat-hora-inicio').textContent = `Inicio: ${formatHora(stats.horaInicio)}`;
    container.querySelector('#stat-puntos').textContent = `Puntos GPS: ${stats.cantidadPuntos}`;
  }

  controller.on('onEstadisticas', actualizarUI);
  controller.on('onPunto', (coordenada) => {
    // Punto CONFIRMADO como movimiento real: se dibuja en la polilínea y suma distancia.
    ocultarBanner();
    mapService.agregarPunto(coordenada.lat, coordenada.lng);
  });
  controller.on('onPosicionCruda', (coordenada) => {
    // Feedback inmediato de cada fix crudo (aunque aún no esté confirmado),
    // para que el marcador no se sienta "congelado" mientras se confirma el movimiento.
    mapService.moverMarcadorSinRuta(coordenada.lat, coordenada.lng);
  });
  controller.on('onError', ({ error, esRecuperable }) => {
    mostrarBanner(error.message, esRecuperable ? 'advertencia' : 'error');
  });

  let iniciado = false;

  async function arrancar() {
    try {
      mostrarBanner('Solicitando ubicación...', 'info');
      const primera = await controller.solicitarPermisoUbicacion();
      ocultarBanner();

      mapService.inicializar(mapaDiv, [primera.lat, primera.lng]);
      mapService.agregarPunto(primera.lat, primera.lng, { centrar: true });

      controller.iniciar({ tipoActividad: AppState.tipoActividad, pesoKg: AppState.pesoKg });
      iniciado = true;
    } catch (error) {
      mostrarBanner(error.message, 'error');
    }
  }

  arrancar();

  btnPausar.addEventListener('click', () => {
    controller.pausar();
    btnPausar.classList.add('btn--oculto');
    btnReanudar.classList.remove('btn--oculto');
    mostrarBanner('Recorrido en pausa', 'info');
  });

  btnReanudar.addEventListener('click', () => {
    controller.reanudar();
    btnReanudar.classList.add('btn--oculto');
    btnPausar.classList.remove('btn--oculto');
    ocultarBanner();
  });

  btnFinalizar.addEventListener('click', () => {
    if (!iniciado) return;
    const confirmado = confirm('¿Finalizar el recorrido?');
    if (!confirmado) return;

    const recorrido = controller.finalizar();
    AppState.ultimoRecorridoFinalizado = recorrido;
    AppState.recorridoEnCurso = null;
    router.navegar('/resumen');
  });

  // Función de limpieza: se ejecuta al salir de la pantalla por cualquier vía.
  return () => {
    controller.pausar();
    mapService.destruir();
  };
}
