/**
 * errorMessages.js — Centralized error-to-user-friendly-message mapper.
 *
 * Converts raw Firebase, JavaScript, and Capacitor errors into polished,
 * non-technical messages that never expose stack traces or internal details.
 *
 * Usage:
 *   import { friendlyError } from '../utils/errorMessages';
 *   showError(friendlyError(err));
 */

const FIREBASE_AUTH = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
  'auth/network-request-failed': 'Network issue. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups.',
  'auth/invalid-verification-code': 'Incorrect OTP. Please check and try again.',
  'auth/code-expired': 'OTP has expired. Please request a new one.',
  'auth/session-expired': 'Session expired. Please request a new OTP.',
  'auth/invalid-phone-number': 'Invalid phone number. Use format: +91XXXXXXXXXX',
  'auth/missing-phone-number': 'Please enter your phone number.',
  'auth/credential-already-in-use': 'This account is already linked to another user.',
  'auth/invalid-credential': 'Login failed. Please try again.',
  'auth/invalid-app-credential': 'Phone verification couldn\'t start. Please try again.',
  'auth/captcha-check-failed': 'Verification check failed. Please try again.',
  'auth/timeout': 'Request timed out. Check your connection.',
  'auth/requires-recent-login': 'Please log in again to complete this action.',
  'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
};

const FIREBASE_FIRESTORE = {
  'permission-denied': 'You don\'t have permission to do this.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please wait a moment.',
  unavailable: 'Service temporarily unavailable. Please try again.',
  'deadline-exceeded': 'Request timed out. Try again.',
  cancelled: 'Operation was cancelled.',
  'data-loss': 'Something went wrong. Please contact support.',
  internal: 'Something went wrong on our end. Please try again.',
  unauthenticated: 'Please log in to continue.',
};

const JS_PATTERNS = [
  {
    test: /cannot read properties of (undefined|null)/i,
    msg: 'Something went wrong. Please try again.',
  },
  {
    test: /is not a function/i,
    msg: 'Something went wrong. Please refresh and try again.',
  },
  {
    test: /network\s*(error|request\s*failed)/i,
    msg: 'Network issue. Check your connection and try again.',
  },
  {
    test: /failed to fetch/i,
    msg: 'Couldn\'t connect to the server. Check your internet.',
  },
  {
    test: /timeout|timed?\s*out/i,
    msg: 'Request timed out. Please try again.',
  },
  {
    test: /quota|rate.?limit/i,
    msg: 'Too many requests. Please wait a moment.',
  },
  {
    test: /storage.*quota/i,
    msg: 'Device storage is full. Please free up some space.',
  },
  {
    test: /chunk.*failed|loading.*chunk/i,
    msg: 'App update available. Please refresh the page.',
  },
  {
    test: /SHA-1|SHA-256|fingerprint/i,
    msg: 'App verification failed. Please update the app or contact support.',
  },
  {
    test: /play\s*integrity|safety.?net/i,
    msg: 'Device verification failed. Please try again.',
  },
  {
    test: /no\s*credentials?\s*found/i,
    msg: 'Sign-in couldn\'t complete. Please try again.',
  },
  {
    test: /user\s*cancelled/i,
    msg: null, // Don't show anything for user cancellations
  },
];

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Convert any error into a user-friendly message string.
 * Returns null for silent errors (e.g. user cancelled).
 *
 * @param {Error|string|object} error
 * @returns {string|null}
 */
export function friendlyError(error) {
  if (!error) return DEFAULT_MESSAGE;

  // String error
  if (typeof error === 'string') {
    const patternMatch = matchPatterns(error);
    if (patternMatch !== undefined) return patternMatch;
    return error;
  }

  // Firebase error code
  const code = error?.code;
  if (code) {
    if (FIREBASE_AUTH[code]) return FIREBASE_AUTH[code];
    if (FIREBASE_FIRESTORE[code]) return FIREBASE_FIRESTORE[code];
  }

  // Error message
  const msg = error?.message || String(error);
  const patternMatch = matchPatterns(msg);
  if (patternMatch !== undefined) return patternMatch;

  // If the message looks like a dev error (contains technical terms), sanitize it
  if (looksLikeTechnicalError(msg, error)) {
    return DEFAULT_MESSAGE;
  }

  // If the message is already user-readable (short, no stack trace), pass it through
  if (msg.length < 200 && !msg.includes('\n    at ')) {
    return msg;
  }

  return DEFAULT_MESSAGE;
}

function matchPatterns(msg) {
  for (const p of JS_PATTERNS) {
    if (p.test.test(msg)) return p.msg;
  }
  return undefined;
}

function looksLikeTechnicalError(msg, error) {
  const name = error?.name || '';
  if (/TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError/.test(name)) {
    return true;
  }
  return (
    /\bat\s+\S+\s*\(/.test(msg) ||          // stack trace line
    /TypeError|ReferenceError|SyntaxError/.test(msg) ||
    /undefined is not|null is not/.test(msg) ||
    /\bis not defined/i.test(msg) ||
    /\bERR_|\bEINVAL|\bENOENT/.test(msg) ||
    msg.includes('Minified React error')
  );
}
