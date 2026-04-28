const NodeCache = require('node-cache');

class CacheService {
  /**
   * @param {object} options
   * @param {number} [options.ttl=300]        TTL en segundos
   * @param {string} [options.namespace='']   Prefijo opcional para todas las claves
   */
  constructor({ ttl = 300, namespace = '' } = {}) {
    this._cache = new NodeCache({ stdTTL: ttl, useClones: false });
    this._namespace = namespace ? `${namespace}:` : '';
  }

  _key(key) {
    return `${this._namespace}${key}`;
  }

  /** @returns {*} valor cacheado, o undefined si no existe */
  get(key) {
    return this._cache.get(this._key(key));
  }

  /**
   * @param {string}  key
   * @param {*}       value
   * @param {number}  [ttl]  Sobreescribe el TTL por defecto para esta clave
   */
  set(key, value, ttl) {
    if (ttl !== undefined) {
      this._cache.set(this._key(key), value, ttl);
    } else {
      this._cache.set(this._key(key), value);
    }
  }

  /**
   * @param {string | string[]} keys  Una clave o array de claves a eliminar
   */
  del(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    this._cache.del(list.map((k) => this._key(k)));
  }

  /** Elimina todas las claves del namespace */
  flush() {
    this._cache.flushAll();
  }

  /** @returns {string[]} claves activas (sin el prefijo de namespace) */
  keys() {
    const prefix = this._namespace;
    return this._cache
      .keys()
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }
}

module.exports = CacheService;