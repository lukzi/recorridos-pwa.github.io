/**
 * Entidad de dominio: Coordenada GPS.
 * Representa un punto capturado durante el recorrido.
 */
export class Coordenada {
  /**
   * @param {number} lat
   * @param {number} lng
   * @param {number} timestamp epoch ms
   * @param {number|null} accuracy metros
   * @param {number|null} speed m/s (reportada por el navegador, puede ser null)
   * @param {number|null} altitude
   */
  constructor(lat, lng, timestamp, accuracy = null, speed = null, altitude = null) {
    this.lat = lat;
    this.lng = lng;
    this.timestamp = timestamp;
    this.accuracy = accuracy;
    this.speed = speed;
    this.altitude = altitude;
  }

  static fromGeolocationPosition(position) {
    const { latitude, longitude, accuracy, speed, altitude } = position.coords;
    return new Coordenada(latitude, longitude, position.timestamp, accuracy, speed, altitude);
  }

  toPlainObject() {
    return {
      lat: this.lat,
      lng: this.lng,
      timestamp: this.timestamp,
      accuracy: this.accuracy,
      speed: this.speed,
      altitude: this.altitude,
    };
  }

  static fromPlainObject(obj) {
    return new Coordenada(obj.lat, obj.lng, obj.timestamp, obj.accuracy, obj.speed, obj.altitude);
  }
}
