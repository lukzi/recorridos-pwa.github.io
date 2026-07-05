import { el } from '../utils/dom.js';
import { AppState } from '../state/AppState.js';

/**
 * Pantalla de inicio: logo, nombre de la app y botón "Empezar recorrido".
 * También permite elegir tipo de actividad y peso (para el cálculo de calorías).
 */
export function renderInicio(container, router) {
  const tipos = [
    { valor: 'caminar', label: '🚶 Caminar' },
    { valor: 'correr', label: '🏃 Correr' },
    { valor: 'bicicleta', label: '🚴 Bicicleta' },
  ];

  const selectorTipo = el('div', { class: 'selector-tipo' },
    tipos.map((t) =>
      el('button', {
        class: `chip ${AppState.tipoActividad === t.valor ? 'chip--activo' : ''}`,
        text: t.label,
        onClick: () => {
          AppState.setTipoActividad(t.valor);
          container.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip--activo'));
          botonesChip[t.valor].classList.add('chip--activo');
        },
      })
    )
  );

  const botonesChip = {};
  tipos.forEach((t, i) => (botonesChip[t.valor] = selectorTipo.children[i]));

  const inputPeso = el('input', {
    type: 'number',
    min: '25',
    max: '250',
    value: String(AppState.pesoKg),
    class: 'input-peso',
    onInput: (e) => {
      const v = Number(e.target.value);
      if (v > 0) AppState.setPeso(v);
    },
  });

  const vista = el('div', { class: 'screen screen--inicio' }, [
    el('div', { class: 'inicio__hero' }, [
      el('div', { class: 'logo', text: '📍' }),
      el('h1', { class: 'app-title', text: 'Recorridos GPS' }),
      el('p', { class: 'app-subtitle', text: 'Camina, corre o pedalea. Nosotros medimos el resto.' }),
    ]),
    el('div', { class: 'inicio__opciones' }, [
      el('label', { class: 'label-campo', text: 'Actividad' }),
      selectorTipo,
      el('label', { class: 'label-campo', text: 'Tu peso (kg) — para estimar calorías' }),
      inputPeso,
    ]),
    el('button', {
      class: 'btn btn--primario btn--grande',
      text: 'Empezar recorrido',
      onClick: () => router.navegar('/recorrido'),
    }),
    el('button', {
      class: 'btn btn--secundario',
      text: 'Ver historial',
      onClick: () => router.navegar('/historial'),
    }),
  ]);

  container.appendChild(vista);
}
