/**
 * ListenerRegistry.js
 * Enterprise Listener Registry & Leak Detector
 *
 * Tracks every active Firestore listener across the application to prevent:
 * - Duplicate listeners
 * - Forgotten unmount cleanups
 * - Memory leaks
 * - Unnecessary network & read charges
 *
 * Exposes active listeners for DevConsole observability.
 */

class ListenerRegistryEngine {
  constructor() {
    /** @type {Map<string, { id: string, name: string, uid: string, params: object, unsubscribe: Function, registeredAt: string }>} */
    this._listeners = new Map();
    this._listenerCount = 0;
  }

  /**
   * Register a Firestore listener.
   * Returns a wrapped unsubscribe function that automatically unregisters itself.
   *
   * @param {string} name - Collection or context name (e.g. 'orders', 'business')
   * @param {Function} unsubscribeFn - Raw unsubscribe function returned by onSnapshot
   * @param {object} metadata - Extra details (uid, query params)
   * @returns {Function} wrapped unsubscribe function
   */
  register(name, unsubscribeFn, metadata = {}) {
    if (typeof unsubscribeFn !== 'function') {
      return () => {};
    }

    this._listenerCount++;
    const id = `lst_${this._listenerCount}_${Date.now()}`;
    const uid = metadata.uid || 'global';

    // Duplicate detection check
    const existingDuplicate = Array.from(this._listeners.values()).find(
      (l) => l.name === name && l.uid === uid && JSON.stringify(l.params) === JSON.stringify(metadata.params || {})
    );

    if (existingDuplicate) {
      console.warn(
        `[ListenerRegistry Warning] Duplicate listener detected for '${name}' (UID: ${uid})! Active ID: ${existingDuplicate.id}`
      );
    }

    const entry = {
      id,
      name,
      uid,
      params: metadata.params || {},
      unsubscribe: unsubscribeFn,
      registeredAt: new Date().toISOString(),
    };

    this._listeners.set(id, entry);
    console.log(`[ListenerRegistry] Registered '${name}' (ID: ${id}) | Total active: ${this._listeners.size}`);

    // Wrapped unsubscribe
    return () => {
      this.unregister(id);
    };
  }

  /**
   * Unregister and clean up a specific listener by ID.
   */
  unregister(id) {
    const entry = this._listeners.get(id);
    if (entry) {
      try {
        entry.unsubscribe();
      } catch (err) {
        console.error(`[ListenerRegistry] Error calling unsubscribe for ${id}:`, err);
      }
      this._listeners.delete(id);
      console.log(`[ListenerRegistry] Unregistered '${entry.name}' (ID: ${id}) | Remaining active: ${this._listeners.size}`);
    }
  }

  /**
   * Get list of currently active listeners (for DevConsole).
   */
  getActiveListeners() {
    return Array.from(this._listeners.values()).map(({ id, name, uid, params, registeredAt }) => ({
      id,
      name,
      uid,
      params,
      registeredAt,
    }));
  }

  /**
   * Total count of active listeners.
   */
  get count() {
    return this._listeners.size;
  }

  /**
   * Emergency teardown of all active listeners.
   */
  cleanupAll() {
    console.warn(`[ListenerRegistry] Cleaning up all ${this._listeners.size} active listeners…`);
    this._listeners.forEach((entry) => {
      try { entry.unsubscribe(); } catch (_) {}
    });
    this._listeners.clear();
  }
}

export const ListenerRegistry = new ListenerRegistryEngine();
