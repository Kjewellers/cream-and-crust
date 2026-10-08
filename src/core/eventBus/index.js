/**
 * EventBus — Typed, centralized pub/sub system for Cream & Crust.
 *
 * Replaces all raw window.dispatchEvent(new CustomEvent(...)) calls
 * with a strongly-typed, debuggable event system that:
 *   - Provides IntelliSense on all known event names
 *   - Tracks active listeners to detect leaks in DevConsole
 *   - Works in SSR-safe contexts (no `window` dependency)
 *   - Never throws into callers (all errors are caught and logged)
 *
 * Usage:
 *   import { EventBus, EVENTS } from '../core/eventBus';
 *
 *   // Emit:
 *   EventBus.emit(EVENTS.THEME_CHANGED, 'dark');
 *
 *   // Listen (always return the cleanup function):
 *   const unsub = EventBus.on(EVENTS.OPEN_NEW_ORDER, () => { ... });
 *   // In a React component, call unsub() in the useEffect cleanup.
 */

// ─── Typed Event Catalog ────────────────────────────────────────────────────
// Add every new event name here. The type system ensures emitters and
// listeners always agree on the event name.

export const EVENTS = Object.freeze({
  // Theme
  THEME_SET: 'cc:theme:set',             // payload: 'light' | 'dark'
  THEME_CHANGED: 'cc:theme:changed',     // payload: 'light' | 'dark'

  // Navigation triggers (FAB / QuickCreate)
  OPEN_NEW_ORDER: 'cc:open:order',
  OPEN_NEW_CUSTOMER: 'cc:open:customer',
  OPEN_NEW_PRODUCT: 'cc:open:product',
  OPEN_NEW_EXPENSE: 'cc:open:expense',
  OPEN_NEW_INVENTORY: 'cc:open:inventory',
  OPEN_NEW_SHOPPING: 'cc:open:shopping',

  // Bottom Nav
  OPEN_BOTTOM_NAV_CUSTOMISE: 'cc:bottomnav:customise',

  // Haptics
  TRIGGER_HAPTIC: 'cc:haptic',           // payload: 'light' | 'medium' | 'heavy' | 'warning' | 'error' | 'success'

  // AI
  TOGGLE_AI_DRAWER: 'cc:ai:toggle',
  DISPATCH_AI_COMMAND: 'cc:ai:command',  // payload: { command: string, args?: any }

  // Inventory
  LOW_STOCK_ALERT: 'cc:inventory:low-stock', // payload: { item, stock, unit }

  // Auth
  AUTH_READY: 'cc:auth:ready',           // payload: { uid: string | null }
  AUTH_SIGNED_OUT: 'cc:auth:signed-out',

  // Startup
  STARTUP_READY: 'cc:startup:ready',
  STARTUP_STEP_COMPLETE: 'cc:startup:step', // payload: { step: string, status: 'healthy'|'degraded'|'failed' }
});

// ─── Bus Implementation ───────────────────────────────────────────────────────

class EventBusEngine {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    this._emitCount = 0;
  }

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   * Always call the returned function in your cleanup / useEffect return.
   *
   * @param {string} event — use EVENTS.* constants
   * @param {Function} callback
   * @returns {() => void} unsubscribe
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    return () => {
      try {
        this._listeners.get(event)?.delete(callback);
      } catch {
        // Cleanup must never throw
      }
    };
  }

  /**
   * Subscribe to an event once. Automatically unsubscribes after first trigger.
   * @param {string} event
   * @param {Function} callback
   * @returns {() => void} unsubscribe (call if you want to cancel before it fires)
   */
  once(event, callback) {
    const unsub = this.on(event, (payload) => {
      unsub();
      callback(payload);
    });
    return unsub;
  }

  /**
   * Emit an event to all active subscribers.
   * Never throws — errors in listeners are caught and logged.
   *
   * @param {string} event — use EVENTS.* constants
   * @param {any} [payload]
   */
  emit(event, payload) {
    this._emitCount++;
    const callbacks = this._listeners.get(event);
    if (!callbacks || callbacks.size === 0) return;

    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Listener error on "${event}":`, err);
      }
    });
  }

  /**
   * Remove ALL listeners for a specific event.
   * Use sparingly — prefer individual unsubscribe calls.
   * @param {string} event
   */
  off(event) {
    this._listeners.delete(event);
  }

  /**
   * Returns diagnostic info for the DevConsole.
   */
  getStats() {
    const summary = {};
    this._listeners.forEach((set, event) => {
      summary[event] = set.size;
    });
    return {
      totalEmits: this._emitCount,
      activeListeners: summary,
      totalListenerCount: [...this._listeners.values()].reduce((a, s) => a + s.size, 0),
    };
  }
}

// Singleton — import this everywhere
export const EventBus = new EventBusEngine();
