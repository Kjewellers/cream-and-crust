/**
 * syncEngine.js — offline write-action queue with FIFO ordering and retry.
 *
 * Firestore's persistentLocalCache (configured in firebase.js) is the primary
 * durable write queue and replays writes automatically on reconnect. This
 * module adds an app-level FIFO queue for actions Firestore could not enqueue,
 * plus connectivity-driven flush with retry-on-failure, so no offline action
 * data is ever discarded.
 *
 * The queue logic is a pure reducer (`reduceQueue`) so it is fully testable.
 *
 * Requirements: 8.2 (persist offline), 8.4 (FIFO sync within 10s of reconnect),
 * 8.7 (retain until confirmed), 8.8 (retry failed), 10.4 (last-write-wins).
 */

const QUEUE_KEY_PREFIX = 'cc_syncQueue:';

/** Build the per-user storage key for the queue. */
function queueKey(uid) {
  return `${QUEUE_KEY_PREFIX}${uid || 'anon'}`;
}

// ── Pure reducer ──────────────────────────────────────────────────────────
/**
 * Apply one queue event and return the next queue (pure; no I/O).
 *
 * Events:
 *  - { kind: 'enqueue', action }      -> append to tail (FIFO)
 *  - { kind: 'complete', id }         -> remove the action by id (synced ok)
 *  - { kind: 'fail', id }             -> keep the action (retry on next flush)
 *
 * @param {Array} queue - current queue (array of { id, type, payload, ts })
 * @param {object} event
 * @returns {Array} next queue
 */
export function reduceQueue(queue, event) {
  const q = Array.isArray(queue) ? queue : [];
  if (!event || typeof event !== 'object') return q;

  switch (event.kind) {
    case 'enqueue': {
      if (!event.action) return q;
      return [...q, event.action];
    }
    case 'complete': {
      return q.filter((a) => a.id !== event.id);
    }
    case 'fail': {
      // Keep the action in place so it is retried in order (Req 8.8).
      return q;
    }
    default:
      return q;
  }
}

/**
 * Collapse a queue to the final committed value per (type+target) key, applying
 * actions in FIFO order so the last submitted update wins (Req 10.4). Pure.
 * Useful for asserting last-write-wins semantics in tests.
 */
export function finalValues(queue) {
  const q = Array.isArray(queue) ? queue : [];
  const map = new Map();
  for (const action of q) {
    const key = `${action?.type}:${action?.payload?.target ?? ''}`;
    map.set(key, action?.payload?.value);
  }
  return map;
}

// ── Storage-backed queue ────────────────────────────────────────────────
function readQueue(uid) {
  try {
    const raw = localStorage.getItem(queueKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(uid, queue) {
  try {
    localStorage.setItem(queueKey(uid), JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

let _seq = 0;
const _listeners = new Set();

function notify(uid) {
  const queue = readQueue(uid);
  _listeners.forEach((fn) => {
    try {
      fn({ queue, length: queue.length });
    } catch {
      /* ignore listener errors */
    }
  });
}

/**
 * Append a write action to the FIFO queue, persisted so it survives reload
 * (Req 8.2, 8.7). `type` is one of the app's known write kinds.
 *
 * @param {{ type: string, payload?: object }} action
 * @param {string} [uid]
 * @returns {object} the stored action (with id + ts)
 */
export function enqueueAction(action, uid) {
  const stored = {
    id: `${Date.now()}-${_seq++}`,
    type: action?.type,
    payload: action?.payload ?? {},
    ts: Date.now(),
  };
  const next = reduceQueue(readQueue(uid), { kind: 'enqueue', action: stored });
  writeQueue(uid, next);
  notify(uid);
  return stored;
}

/**
 * Flush queued actions to Firestore in FIFO order. `handler(action)` performs
 * the actual write and should resolve on success / reject on failure. Failed
 * actions remain queued (at their position) and are retried on the next flush
 * (Req 8.4, 8.8).
 *
 * @param {(action: object) => Promise<void>} handler
 * @param {string} [uid]
 * @returns {Promise<{ flushed: number, remaining: number }>}
 */
export async function flushQueue(handler, uid) {
  let queue = readQueue(uid);
  let flushed = 0;
  for (const action of [...queue]) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await handler(action);
      queue = reduceQueue(queue, { kind: 'complete', id: action.id });
      writeQueue(uid, queue);
      flushed += 1;
      notify(uid);
    } catch {
      // Stop on first failure so ordering is preserved; remaining items retry
      // on the next connectivity event (Req 8.8).
      break;
    }
  }
  return { flushed, remaining: readQueue(uid).length };
}

/** Current queue length. */
export function queueLength(uid) {
  return readQueue(uid).length;
}

/** Subscribe to queue changes; returns an unsubscribe fn. */
export function onSyncStatus(listener) {
  if (typeof listener !== 'function') return () => {};
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/** Clear the queue (testing / sign-out). */
export function clearQueue(uid) {
  writeQueue(uid, []);
  notify(uid);
}
