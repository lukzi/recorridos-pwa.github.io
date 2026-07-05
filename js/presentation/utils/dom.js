/** Utilidades mínimas de DOM para mantener las pantallas legibles sin un framework. */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function formatFecha(fechaISO) {
  if (!fechaISO) return '--';
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

export function formatHora(timestampMs) {
  if (!timestampMs) return '--:--';
  const d = new Date(timestampMs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDistanciaKm(metros) {
  return (metros / 1000).toFixed(2);
}
