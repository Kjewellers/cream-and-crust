/**
 * PendingActionManager.js
 *
 * Stores SERIALIZABLE action descriptors (not closures) in localStorage so
 * premium actions survive app restarts, purchase flows, and device switches.
 *
 * Flow:
 *   1. User taps a premium action → SubscriptionGate calls queue(descriptor).
 *   2. Paywall opens. User subscribes or restores.
 *   3. EntitlementListener detects activation → calls replay() → dispatches
 *      all queued actions via the registered ActionDispatcher.
 *
 * Action descriptor shape:
 *   {
 *     id:        string (uuid),
 *     action:    keyof ActionDispatcherMap,
 *     payload:   object (serializable),
 *     featureKey: keyof PREMIUM_FEATURES,
 *     queuedAt:  ISO string,
 *   }
 */

const STORAGE_KEY = 'cc:pending_premium_actions';
const MAX_AGE_MS  = 24 * 60 * 60 * 1000; // 24 hours — stale descriptors are discarded

// ── Registry of action handlers ──────────────────────────────────────────────
// Components register their action handlers here at mount time.
// This avoids coupling PendingActionManager to any specific page.
const _dispatchers = {};

/**
 * Register a handler for a given action key.
 * Call this in the component/service that can execute the action.
 *
 * @param {string} actionKey  - e.g. 'GENERATE_AI_INVOICE'
 * @param {Function} handler  - async (payload) => void
 * @returns {Function} deregister function (call in useEffect cleanup)
 */
export function registerActionHandler(actionKey, handler) {
  _dispatchers[actionKey] = handler;
  return () => {
    delete _dispatchers[actionKey];
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    // Purge stale items
    const cutoff = Date.now() - MAX_AGE_MS;
    return items.filter((d) => new Date(d.queuedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveAll(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full — silently ignore
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Queue a premium action descriptor for later replay.
 *
 * @param {{ action: string, payload?: object, featureKey?: string }} descriptor
 * @returns {string} id of the queued descriptor
 */
export function queueAction({ action, payload = {}, featureKey = '' }) {
  const items = loadAll();
  const descriptor = {
    id: generateId(),
    action,
    payload,
    featureKey,
    queuedAt: new Date().toISOString(),
  };
  items.push(descriptor);
  saveAll(items);
  return descriptor.id;
}

/**
 * Remove a specific queued action by id.
 * @param {string} id
 */
export function dequeueAction(id) {
  const items = loadAll().filter((d) => d.id !== id);
  saveAll(items);
}

/**
 * Get all pending action descriptors.
 * @returns {Array}
 */
export function getPendingActions() {
  return loadAll();
}

/**
 * Clear ALL pending actions (e.g. after successful replay or user sign-out).
 */
export function clearPendingActions() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Replay all queued actions by dispatching them to registered handlers.
 * Actions without a registered handler are skipped and kept for retry.
 *
 * @param {object} [options]
 * @param {(descriptor: object) => void} [options.onSuccess]
 * @param {(descriptor: object, error: Error) => void} [options.onError]
 */
export async function replayPendingActions({ onSuccess, onError } = {}) {
  const items = loadAll();
  if (items.length === 0) return;

  const unresolved = [];

  for (const descriptor of items) {
    const handler = _dispatchers[descriptor.action];

    if (!handler) {
      // Handler not yet mounted — keep for retry
      unresolved.push(descriptor);
      continue;
    }

    try {
      await handler(descriptor.payload, descriptor);
      onSuccess?.(descriptor);
    } catch (err) {
      console.warn('[PendingActionManager] Action failed:', descriptor.action, err?.message);
      onError?.(descriptor, err);
      // Keep failed actions so user can retry manually
      unresolved.push(descriptor);
    }
  }

  saveAll(unresolved);
}

/**
 * Check if there are any pending actions for a specific feature.
 * @param {string} featureKey
 * @returns {boolean}
 */
export function hasPendingActionsForFeature(featureKey) {
  return loadAll().some((d) => d.featureKey === featureKey);
}
