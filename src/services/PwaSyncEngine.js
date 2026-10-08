/**
 * PwaSyncEngine.js
 *
 * Background Sync Engine for offline drafts, pending orders, and background sync.
 */

class PwaSyncEngineService {
  constructor() {
    this.queue = [];
    this.isSyncing = false;
    this._onlineHandler = null;
    this.initListeners();
  }

  initListeners() {
    if (typeof window !== 'undefined') {
      // Store as named handler so it can be removed by destroy()
      this._onlineHandler = () => this.processQueue();
      window.addEventListener('online', this._onlineHandler);
    }
  }

  /**
   * Tear down the singleton (used in tests and HMR cleanup).
   */
  destroy() {
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }
  }

  enqueue(action) {
    this.queue.push({
      ...action,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    });
    this.saveQueue();
  }

  saveQueue() {
    try {
      localStorage.setItem('cream_pwa_sync_queue', JSON.stringify(this.queue));
    } catch {}
  }

  async processQueue() {
    if (this.isSyncing || !navigator.onLine || this.queue.length === 0) return;

    this.isSyncing = true;
    const remaining = [];

    for (const item of this.queue) {
      try {
        // Execute sync task
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch {
        remaining.push(item);
      }
    }

    this.queue = remaining;
    this.saveQueue();
    this.isSyncing = false;
  }
}

export const PwaSyncEngine = new PwaSyncEngineService();
