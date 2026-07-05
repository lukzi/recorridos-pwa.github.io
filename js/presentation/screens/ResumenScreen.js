import { el, formatFecha, formatHora, formatDistanciaKm } from '../utils/dom.js';
import { AppState } from '../state/AppState.js';
import { MapService } from '../../infrastructure/map/MapService.js';
import { CronometroService } from '../../infrastructure/timer/CronometroService.js';
import { RitmoCalculator } from '../../domain/usecases/RitmoCalculator.js';
import { RecorridoRepository } from '../../data/repositories/RecorridoRepository.js';
import { EstadoRecorrido } from '../../domain/entities/Recorrido.js';

export function renderResumen(container, router) {
  const recorrido = AppState.ultimoRecorridoFinalizado;

  if (!recorrido) {
    router.navegar('/');
    return;
  }

  const mapaDiv = el('div', { class: 'mapa mapa--resumen' });

  const dato = (label, valor) =>
    el('div', { class: 'dato' }, [
      el('div', { class: 'dato__valor', text: valor }),
      el('div', { class: 'dato__label', text: label }),
    ]);

  const grid = el('div', { class: 'grid-resumen' }, [
    dato('Distancia total', `${formatDistanciaKm(recorrido.distanciaMetros)} km`),
    dato('Tiempo', CronometroService.formatear(recorrido.tiempoTotalMs)),
    dato('Ritmo promedio', `${RitmoCalculator.formatearRitmo(recorrido.ritmoPromedioSegPorKm)} min/km`),
    dato('Velocidad promedio', `${RitmoCalculator.formatearVelocidad(recorrido.velocidadPromedioKmh)} km/h`),
    dato('Calorías', `${recorrido.calorias} kcal`),
    dato('Fecha', formatFecha(recorrido.fecha)),
    dato('Hora inicio', formatHora(recorrido.horaInicio)),
    dato('Hora fin', formatHora(recorrido.horaFin)),
  ]);

  const btnGuardar = el('button', { class: 'btn btn--primario btn--grande', text: 'Guardar recorrido' });
  const btnDescartar = el('button', { class: 'btn btn--secundario', text: 'Descartar' });

  const vista = el('div', { class: 'screen screen--resumen' }, [
    el('h2', { class: 'titulo-pantalla', text: '¡Recorrido finalizado!' }),
    mapaDiv,
    grid,
    el('div', { class: 'acciones-resumen' }, [btnGuardar, btnDescartar]),
  ]);

  container.appendChild(vista);

  const mapService = new MapService();
  mapService.inicializar(mapaDiv);
  mapService.dibujarRecorridoCompleto(recorrido.coordenadas);

  const repo = new RecorridoRepository();

  btnGuardar.addEventListener('click', async () => {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    try {
      recorrido.estado = EstadoRecorrido.GUARDADO;
      await repo.guardar(recorrido);
      AppState.ultimoRecorridoFinalizado = null;
      router.navegar('/historial');
    } catch (error) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar recorrido';
      alert('No se pudo guardar el recorrido: ' + error.message);
    }
  });

  btnDescartar.addEventListener('click', () => {
    const confirmado = confirm('¿Descartar este recorrido sin guardarlo?');
    if (!confirmado) return;
    AppState.ultimoRecorridoFinalizado = null;
    router.navegar('/');
  });

  return () => mapService.destruir();
}
