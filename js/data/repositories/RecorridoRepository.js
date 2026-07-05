import { IndexedDBDataSource } from '../datasources/IndexedDBDataSource.js';
import { Recorrido } from '../../domain/entities/Recorrido.js';

/**
 * Repositorio de Recorridos. Es la única puerta de entrada/salida de datos
 * de persistencia para el resto de la aplicación (application/presentation).
 * Traduce entre entidades de dominio y objetos planos de la fuente de datos.
 */
export class RecorridoRepository {
  constructor(dataSource = new IndexedDBDataSource()) {
    this._dataSource = dataSource;
  }

  async guardar(recorrido) {
    const plano = recorrido.toPlainObject();
    await this._dataSource.agregar(plano);
    return recorrido;
  }

  async obtenerHistorial() {
    const planos = await this._dataSource.obtenerTodos();
    return planos
      .map((p) => Recorrido.fromPlainObject(p))
      .sort((a, b) => (b.horaInicio || 0) - (a.horaInicio || 0));
  }

  async obtenerPorId(id) {
    const plano = await this._dataSource.obtenerPorId(id);
    return plano ? Recorrido.fromPlainObject(plano) : null;
  }

  async eliminar(id) {
    return this._dataSource.eliminar(id);
  }
}
