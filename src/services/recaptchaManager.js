/**
 * recaptchaManager.js — Singleton RecaptchaVerifier
 *
 * WHY THIS EXISTS:
 * Firebase's RecaptchaVerifier must be created exactly once per DOM element.
 * Creating multiple verifiers (or re-creating after clear()) on the same element
 * causes "reCAPTCHA has already been rendered in this element". Doing this
 * repeatedly from React components (especially with StrictMode double-mounts)
 * burns through Google's rate limits, causing "Too many attempts" on Android
 * WebViews where trust scores are lower.
 *
 * ARCHITECTURE:
 * - One global verifier instance (window.recaptchaVerifier) to survive HMR
 * - Bound to a persistent <div id="recaptcha-root"> in index.html (outside React)
 * - getVerifier() returns the singleton, creating it lazily on first call
 * - resetVerifier() destroys the old one and creates a fresh one (for after
 *   successful OTP send, since the verifier token is consumed)
 * - No React useEffect, no useRef, no component lifecycle involvement
 */

import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from './firebase';

const CONTAINER_ID = 'recaptcha-root';

/**
 * Get or create the singleton RecaptchaVerifier.
 * Safe to call multiple times — returns the same instance.
 *
 * @returns {Promise<RecaptchaVerifier>}
 */
export async function getVerifier() {
  if (window.recaptchaVerifier && window.isRecaptchaRendered) {
    console.log('[RecaptchaManager] Reusing existing verifier');
    return window.recaptchaVerifier;
  }

  // If there's a stale instance that wasn't rendered, destroy it first
  if (window.recaptchaVerifier) {
    console.log('[RecaptchaManager] Destroying stale unrendered verifier');
    destroyVerifier();
  }

  console.log('[RecaptchaManager] Creating new verifier');

  // Clear the container of any leftover reCAPTCHA iframes from previous instances
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = '';
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, CONTAINER_ID, {
    size: 'invisible',
  });

  try {
    await window.recaptchaVerifier.render();
    window.isRecaptchaRendered = true;
    console.log('[RecaptchaManager] Verifier rendered successfully');
  } catch (err) {
    console.error('[RecaptchaManager] Render failed:', err?.message);
    // If render fails, destroy and let the caller handle the error
    destroyVerifier();
    throw err;
  }

  return window.recaptchaVerifier;
}

/**
 * Destroy the current verifier instance completely.
 * Clears the DOM container of any reCAPTCHA iframes.
 */
function destroyVerifier() {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      // clear() can throw if already cleared — safe to ignore
      console.log('[RecaptchaManager] clear() threw (non-fatal):', e?.message);
    }
    window.recaptchaVerifier = null;
  }
  window.isRecaptchaRendered = false;

  // Remove any lingering reCAPTCHA DOM artifacts
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * Reset the verifier for reuse (e.g. after a successful OTP send or on failure).
 *
 * After signInWithPhoneNumber() consumes the verifier's token, the same instance
 * cannot be reused. This function destroys the old one so that the next
 * getVerifier() call creates a fresh instance.
 *
 * IMPORTANT: This does NOT eagerly create a new verifier. It only cleans up.
 * The next getVerifier() call will lazily create one — this avoids unnecessary
 * reCAPTCHA API calls that burn rate limits.
 */
export function resetVerifier() {
  console.log('[RecaptchaManager] Resetting verifier for next use');
  destroyVerifier();
}
