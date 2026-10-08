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
 *
 * ⚠️  ANDROID / CAPACITOR RULE:
 * getVerifier() MUST NEVER be called on Android. The Capacitor WebView
 * domain (capacitor://localhost or https://localhost) is NOT in Firebase's
 * authorized domains list, so reCAPTCHA can never resolve → app hangs forever.
 * Use the native FirebaseAuthentication plugin for phone auth on Android.
 */

import { RecaptchaVerifier } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';
// Note: auth is imported dynamically inside getVerifier() to avoid
// module-load-time race conditions where firebase.js may not yet be initialized.

const CONTAINER_ID = 'recaptcha-root';

function isNativeCapacitorRuntime() {
  try {
    const platform = Capacitor.getPlatform?.();
    if (Capacitor.isNativePlatform?.() || platform === 'android' || platform === 'ios') {
      return true;
    }

    const nativeBridge = typeof window !== 'undefined' ? window.Capacitor : null;
    const bridgePlatform = nativeBridge?.getPlatform?.();
    return nativeBridge?.isNativePlatform?.() === true ||
      bridgePlatform === 'android' ||
      bridgePlatform === 'ios';
  } catch {
    return false;
  }
}

/**
 * Get or create the singleton RecaptchaVerifier.
 * Safe to call multiple times — returns the same instance.
 *
 * THROWS immediately on Android — reCAPTCHA must never run in Capacitor WebView.
 *
 * @returns {Promise<RecaptchaVerifier>}
 */
export async function getVerifier() {
  // ── ANDROID GUARD: reCAPTCHA cannot work in Capacitor WebView ──────
  // The WebView domain (capacitor://localhost or https://localhost) is never
  // in Firebase's authorized domains, so the invisible reCAPTCHA challenge
  // can never complete. Calling this on Android = guaranteed hang.
  if (isNativeCapacitorRuntime()) {
    throw new Error(
      '[RecaptchaManager] reCAPTCHA must NOT be used on Android/iOS. ' +
      'Use FirebaseAuthentication.signInWithPhoneNumber() for native phone auth.'
    );
  }

  if (window.recaptchaVerifier && window.isRecaptchaRendered) {
    log.recaptcha('Reusing existing verifier');
    return window.recaptchaVerifier;
  }

  // If there's a stale instance that wasn't rendered, destroy it first
  if (window.recaptchaVerifier) {
    log.recaptcha('Destroying stale unrendered verifier');
    destroyVerifier();
  }

  // ── Guard: auth must be initialized ──────────────────────────────
  // If firebase.js threw during initialization, `auth` will be undefined.
  // Constructing RecaptchaVerifier with undefined auth crashes immediately.
  const { auth } = await import('./firebase');
  if (!auth) {
    throw new Error(
      '[RecaptchaManager] Firebase auth is not initialized. ' +
      'Check firebase.js — the module may have thrown during startup.'
    );
  }

  // ── Guard: container must exist in the DOM ────────────────────────
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    throw new Error(
      `[RecaptchaManager] DOM element #${CONTAINER_ID} not found. ` +
      'Add <div id="recaptcha-root"></div> to index.html.'
    );
  }

  log.recaptcha('Creating new verifier');

  // Clear the container of any leftover reCAPTCHA iframes from previous instances
  container.innerHTML = '';

  window.recaptchaVerifier = new RecaptchaVerifier(auth, CONTAINER_ID, {
    size: 'invisible',
    callback: () => {
      log.recaptcha('reCAPTCHA solved');
    },
    'expired-callback': () => {
      log.recaptcha.warn('reCAPTCHA token expired — resetting');
      destroyVerifier();
    },
  });

  try {
    // Render with a hard timeout so it never hangs silently
    const widgetId = await Promise.race([
      window.recaptchaVerifier.render(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('[RecaptchaManager] render() timed out after 10s')),
          10000
        )
      ),
    ]);
    window.recaptchaWidgetId = widgetId;
    window.isRecaptchaRendered = true;
    log.recaptcha('Verifier rendered successfully');
  } catch (err) {
    log.recaptcha.error('Render failed:', err?.message);
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
      if (typeof window.grecaptcha !== 'undefined' && window.recaptchaWidgetId !== undefined) {
        window.grecaptcha.reset(window.recaptchaWidgetId);
      }
      window.recaptchaVerifier.clear();
    } catch (e) {
      // clear() can throw if already cleared — safe to ignore
      log.recaptcha('clear() threw (non-fatal):', e?.message);
    }
    window.recaptchaVerifier = null;
  }
  window.recaptchaWidgetId = undefined;
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
 *
 * On Android this is a no-op since reCAPTCHA is never used.
 */
export function resetVerifier() {
  if (isNativeCapacitorRuntime()) return; // no-op on Android/iOS
  log.recaptcha('Resetting verifier for next use');
  destroyVerifier();
}
