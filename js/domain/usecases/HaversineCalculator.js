/**
 * Calcula distancias entre coordenadas GPS usando la fórmula de Haversine,
 * que estima con precisión la distancia sobre la superficie terrestre
 * (asumida como esfera) entre dos puntos lat/lng.
 */
const RADIO_TIERRA_M = 6371000; // metros

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export class HaversineCalculator {
  /**
   * Distancia en metros entre dos puntos {lat, lng}.
   */
  static distanciaMetros(p1, p2) {
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return RADIO_TIERRA_M * c;
  }

  /**
   * Distancia total acumulada de una lista ordenada de coordenadas.
   */
  static distanciaTotalMetros(coordenadas) {
    let total = 0;
    for (let i = 1; i < coordenadas.length; i++) {
      total += HaversineCalculator.distanciaMetros(coordenadas[i - 1], coordenadas[i]);
    }
    return total;
  }
}
