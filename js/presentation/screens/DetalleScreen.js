import { el, formatFecha, formatHora, formatDistanciaKm } from '../utils/dom.js';
import { AppState } from '../state/AppState.js';
import { RecorridoRepository } from '../../data/repositories/RecorridoRepository.js';
import { MapService } from '../../infrastructure/map/MapService.js';
import { CronometroService } from '../../infrastructure/timer/CronometroService.js';
import { RitmoCalculator } from '../../domain/usecases/RitmoCalculator.js';

export async function renderDetalle(container, router) {
  const id = AppState.recorridoSeleccionadoId;
  if (!id) {
    router.navegar('/historial');
    return;
  }

  const repo = new RecorridoRepository();
  const recorrido = await repo.obtenerPorId(id);

  if (!recorrido) {
    router.navegar('/historial');
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
    dato('Puntos GPS', String(recorrido.coordenadas.length)),
  ]);

  const btnCoordenadas = el('button', { class: 'btn btn--secundario', text: 'Ver coordenadas GPS' });
  const listaCoordenadas = el('div', { class: 'lista-coordenadas lista-coordenadas--oculta' });

  btnCoordenadas.addEventListener('click', () => {
    const oculta = listaCoordenadas.classList.toggle('lista-coordenadas--oculta');
    btnCoordenadas.textContent = oculta ? 'Ver coordenadas GPS' : 'Ocultar coordenadas GPS';
    if (!oculta && listaCoordenadas.childElementCount === 0) {
      recorrido.coordenadas.forEach((c, i) => {
        listaCoordenadas.appendChild(
          el('div', {
            class: 'coordenada-item',
            text: `#${i + 1} — ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)} (${formatHora(c.timestamp)})`,
          })
        );
      });
    }
  });

  const vista = el('div', { class: 'screen screen--detalle' }, [
    el('div', { class: 'encabezado-historial' }, [
      el('button', { class: 'btn-volver', text: '← Volver', onClick: () => router.navegar('/historial') }),
      el('h2', { class: 'titulo-pantalla', text: 'Detalle del recorrido' }),
    ]),
    mapaDiv,
    grid,
    btnCoordenadas,
    listaCoordenadas,
  ]);

  container.appendChild(vista);

  const mapService = new MapService();
  mapService.inicializar(mapaDiv);
  mapService.dibujarRecorridoCompleto(recorrido.coordenadas);

  return () => mapService.destruir();
}
