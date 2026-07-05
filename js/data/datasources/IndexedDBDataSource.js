import { CONFIG } from '../../config.js';

/**
 * Fuente de datos de bajo nivel sobre IndexedDB.
 * No conoce entidades de dominio: trabaja con objetos planos.
 */
export class IndexedDBDataSource {
  constructor() {
    this._dbPromise = null;
  }

  _abrirDB() {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.db.name, CONFIG.db.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(CONFIG.db.storeName)) {
          const store = db.createObjectStore(CONFIG.db.storeName, {
            keyPath: 'id',
          });
          store.createIndex('fecha', 'fecha', { unique: false });
          store.createIndex('estado', 'estado', { unique: false });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    return this._dbPromise;
  }

  async agregar(objetoPlano) {
    const db = await this._abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.db.storeName, 'readwrite');
      const store = tx.objectStore(CONFIG.db.storeName);
      const request = store.put(objetoPlano);
      request.onsuccess = () => resolve(objetoPlano);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async obtenerTodos() {
    const db = await this._abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.db.storeName, 'readonly');
      const store = tx.objectStore(CONFIG.db.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async obtenerPorId(id) {
    const db = await this._abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.db.storeName, 'readonly');
      const store = tx.objectStore(CONFIG.db.storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async eliminar(id) {
    const db = await this._abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.db.storeName, 'readwrite');
      const store = tx.objectStore(CONFIG.db.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }
}
