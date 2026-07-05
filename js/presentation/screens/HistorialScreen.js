import { el, formatFecha, formatDistanciaKm } from '../utils/dom.js';
import { RecorridoRepository } from '../../data/repositories/RecorridoRepository.js';
import { CronometroService } from '../../infrastructure/timer/CronometroService.js';
import { AppState } from '../state/AppState.js';

const ICONOS = { caminar: '🚶', correr: '🏃', bicicleta: '🚴' };

export async function renderHistorial(container, router) {
  const encabezado = el('div', { class: 'encabezado-historial' }, [
    el('button', { class: 'btn-volver', text: '← Volver', onClick: () => router.navegar('/') }),
    el('h2', { class: 'titulo-pantalla', text: 'Historial de recorridos' }),
  ]);

  const lista = el('div', { class: 'lista-historial' });
  const vacio = el('p', { class: 'texto-vacio', text: 'Cargando...' });

  const vista = el('div', { class: 'screen screen--historial' }, [encabezado, lista]);
  container.appendChild(vista);
  lista.appendChild(vacio);

  const repo = new RecorridoRepository();
  const recorridos = await repo.obtenerHistorial();

  lista.innerHTML = '';

  if (recorridos.length === 0) {
    lista.appendChild(el('p', { class: 'texto-vacio', text: 'Aún no tienes recorridos guardados.' }));
    return;
  }

  recorridos.forEach((r) => {
    const tarjeta = el('div', { class: 'tarjeta-recorrido' }, [
      el('div', { class: 'tarjeta__icono', text: ICONOS[r.tipoActividad] || '📍' }),
      el('div', { class: 'tarjeta__info' }, [
        el('div', { class: 'tarjeta__fecha', text: formatFecha(r.fecha) }),
        el('div', { class: 'tarjeta__stats' }, [
          el('span', { text: `${formatDistanciaKm(r.distanciaMetros)} km` }),
          el('span', { text: CronometroService.formatear(r.tiempoTotalMs) }),
          el('span', { text: `${r.calorias} kcal` }),
        ]),
      ]),
      el('button', {
        class: 'btn-detalle',
        text: 'Ver',
        onClick: () => {
          AppState.recorridoSeleccionadoId = r.id;
          router.navegar('/detalle');
        },
      }),
    ]);
    lista.appendChild(tarjeta);
  });
}
