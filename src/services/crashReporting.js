/**
 * crashReporting.js — Production crash logger for Cream & Crust.
 *
 * Every unhandled error (React render crash, global JS error, unhandled
 * promise rejection) is captured here and written to the `crash_reports`
 * Firestore collection in real-time.
 *
 * This lets the dev/AI immediately query the latest crash reports and fix
 * them without any third-party tool like Sentry.
 *
 * Fields stored (NO PII — only technical context):
 *   - message    : error message (truncated to 500 chars)
 *   - stack      : stack trace (truncated to 2000 chars)
 *   - type       : 'react_boundary' | 'global_error' | 'unhandled_rejection'
 *   - url        : current page URL (pathname only, no query params)
 *   - userAgent  : browser/device info
 *   - timestamp  : Firestore server timestamp
 *   - uid        : logged-in user UID (never name/email/phone)
 *   - appVersion : from package.json version string in env
 */

const MAX_MSG = 500;
const MAX_STACK = 2000;

/** Strip query params and hash so no PII leaks through search params. */
function safePathname() {
  try {
    return window.location?.pathname || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Write a crash report to Firestore.
 * Completely fire-and-forget — this function NEVER throws into the caller.
 *
 * @param {Error|null} error
 * @param {{ type?: string, componentStack?: string, uid?: string }} context
 */
export async function logCrashToFirestore(error, context = {}) {
  try {
    // Dynamic imports so this doesn't slow down the initial bundle.
    const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
      import('./firebase.js'),
      import('firebase/firestore'),
    ]);

    const message = String(error?.message || 'Unknown error').slice(0, MAX_MSG);
    const rawStack = error?.stack || context?.componentStack || '';
    const stack = String(rawStack).slice(0, MAX_STACK);

    await addDoc(collection(db, 'crash_reports'), {
      message,
      stack,
      type: context.type || 'unknown',
      url: safePathname(),
      userAgent: navigator?.userAgent?.slice(0, 300) || 'unknown',
      timestamp: serverTimestamp(),
      uid: context.uid || null,
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      resolved: false,
    });
  } catch {
    // Crash reporter itself must never throw — silently fail.
  }
}

/**
 * Attach global listeners to catch JS errors and unhandled promise
 * rejections that happen OUTSIDE React's component tree.
 *
 * Call this once in main.jsx.
 *
 * @param {() => string | null} getUid — function returning current user UID
 */
export function attachGlobalCrashListeners(getUid) {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    // Ignore cross-origin script errors (message === 'Script error.')
    if (!event.error && event.message === 'Script error.') return;

    logCrashToFirestore(event.error || new Error(event.message || 'Global error'), {
      type: 'global_error',
      uid: getUid?.() ?? null,
      componentStack: `at ${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason ?? 'Unhandled promise rejection'));

    logCrashToFirestore(error, {
      type: 'unhandled_rejection',
      uid: getUid?.() ?? null,
    });
  });
}
