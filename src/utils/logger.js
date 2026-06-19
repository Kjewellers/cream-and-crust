/**
 * logger.js — Production-safe centralized logger for Cream & Crust.
 *
 * Uses `console.warn` for important operational logs so they survive the
 * esbuild `pure` stripping that removes console.log/debug/info in production.
 *
 * Maintains a ring buffer of the last 100 entries in memory. Call
 * `dumpLogs()` to retrieve them (useful for remote debugging).
 *
 * Usage:
 *   import { log } from '../utils/logger';
 *   log.auth('signInWithGoogle: popup succeeded, uid:', user.uid);
 *   log.share('nativeShareFile: sharing', fileName);
 */

const MAX_BUFFER = 100;
const _buffer = [];

function _log(tag, level, ...args) {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `[CC:${tag}]`;
  const entry = { ts, tag, level, message: args.map(String).join(' ') };

  // Ring buffer
  _buffer.push(entry);
  if (_buffer.length > MAX_BUFFER) _buffer.shift();

  // console.warn survives esbuild pure stripping of console.log
  if (level === 'error') {
    console.error(prefix, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, ...args);
  } else {
    // Use console.warn for "info" level too so it survives prod builds
    console.warn(prefix, ...args);
  }
}

function createTagLogger(tag) {
  const fn = (...args) => _log(tag, 'info', ...args);
  fn.warn = (...args) => _log(tag, 'warn', ...args);
  fn.error = (...args) => _log(tag, 'error', ...args);
  return fn;
}

export const log = {
  auth: createTagLogger('Auth'),
  share: createTagLogger('Share'),
  invoice: createTagLogger('Invoice'),
  whatsapp: createTagLogger('WhatsApp'),
  permission: createTagLogger('Permission'),
  menu: createTagLogger('Menu'),
  cache: createTagLogger('Cache'),
  startup: createTagLogger('Startup'),
  boundary: createTagLogger('Boundary'),
  dashboard: createTagLogger('Dashboard'),
};

/**
 * Retrieve the in-memory log buffer. Useful for attaching to bug reports
 * or dumping to Firestore for remote debugging.
 */
export function dumpLogs() {
  return [..._buffer];
}

/**
 * Write the current log buffer to Firestore `debug_logs` collection.
 * Fire-and-forget — never blocks the caller.
 */
export async function flushLogsToFirestore(uid) {
  try {
    const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
      import('../services/firebase.js'),
      import('firebase/firestore'),
    ]);
    await addDoc(collection(db, 'debug_logs'), {
      uid: uid || null,
      entries: _buffer.slice(-50),
      timestamp: serverTimestamp(),
      userAgent: navigator?.userAgent?.slice(0, 200) || 'unknown',
    });
  } catch {
    // Never throw from the logger
  }
}
