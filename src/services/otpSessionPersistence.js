/**
 * otpSessionPersistence.js — OTP session persistence across Android
 * background/rotation events for Cream & Crust.
 *
 * ──────────────────────────────────────────────────────────────────
 * Why this exists
 * ──────────────────────────────────────────────────────────────────
 * On Android, when the app goes to background and returns (or the
 * screen rotates), React re-renders from scratch. Without persistence,
 * `confirmationResult` state is lost and the user must re-request OTP.
 *
 * Storage strategy:
 *   1. Capacitor Preferences (@capacitor/preferences) — native key-value
 *      store backed by Android SharedPreferences. Survives rotation.
 *   2. localStorage — fallback for web and when Capacitor is not native.
 *
 * What is stored:
 *   - phoneNumber   : string — number being verified
 *   - platform      : 'android' | 'web'
 *   - verificationId: string | null — present on Android only
 *   - sentAt        : number (epoch ms) — when OTP was sent
 *   - expiresAt     : number (epoch ms) — sentAt + 10 minutes
 *
 * What is NOT stored:
 *   - confirmationResult (Firebase web object — non-serializable, expires)
 *   - otpCode (never persist user-typed codes)
 *
 * Security notes:
 *   - verificationId is not a secret; it is meaningless without the
 *     corresponding OTP SMS code.
 *   - All persisted data is cleared on session expiry, successful verify,
 *     or explicit user reset.
 * ──────────────────────────────────────────────────────────────────
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';

const STORAGE_KEY = 'cc_otp_session';
const OTP_TTL_MS  = 10 * 60 * 1000; // 10 minutes

// ── Low-level storage adapters ────────────────────────────────────────────

async function _nativeSet(key, value) {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value: JSON.stringify(value) });
}

async function _nativeGet(key) {
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
}

async function _nativeRemove(key) {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key });
}

function _webSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
}

function _webGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _webRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Persist the normalized OTP session after a successful OTP send.
 * Only serializable fields are stored (never the Firebase ConfirmationResult).
 *
 * @param {string} phoneNumber
 * @param {OtpSession} otpSession  Normalized session from requestPhoneOTP()
 */
export async function saveOtpSession(phoneNumber, otpSession) {
  const now = Date.now();
  const record = {
    phoneNumber,
    platform: otpSession.platform,
    verificationId: otpSession.verificationId ?? null, // null on web
    sentAt: now,
    expiresAt: now + OTP_TTL_MS,
  };

  log.auth('[OtpPersistence] Saving session — platform:', record.platform, '| verificationId:', !!record.verificationId);

  try {
    if (Capacitor.isNativePlatform()) {
      await _nativeSet(STORAGE_KEY, record);
    } else {
      _webSet(STORAGE_KEY, record);
    }
  } catch (e) {
    log.auth.warn('[OtpPersistence] Failed to save session:', e?.message);
    // Non-fatal — fall through. The in-memory session still works.
  }
}

/**
 * Load a previously saved OTP session.
 * Returns null if nothing is stored or the session has expired.
 *
 * ⚠️  On Web: the Firebase ConfirmationResult cannot be restored from storage.
 *    This function returns the raw record, but the caller MUST check
 *    `record.platform === 'web'` and prompt the user to re-request OTP
 *    (since there's no way to reconstruct the web confirmation object).
 *
 * On Android: verificationId IS serializable and can be used directly
 * to construct a PhoneAuthCredential after restoration.
 *
 * @returns {Promise<SavedOtpRecord | null>}
 */
export async function loadOtpSession() {
  try {
    let record;
    if (Capacitor.isNativePlatform()) {
      record = await _nativeGet(STORAGE_KEY);
    } else {
      record = _webGet(STORAGE_KEY);
    }

    if (!record) return null;

    const now = Date.now();
    if (now > record.expiresAt) {
      log.auth('[OtpPersistence] Stored session expired — clearing');
      await clearOtpSession();
      return null;
    }

    const remainingMs = record.expiresAt - now;
    log.auth(
      '[OtpPersistence] Restored session — platform:', record.platform,
      '| verificationId present:', !!record.verificationId,
      `| expires in ${Math.round(remainingMs / 1000)}s`
    );

    return record;
  } catch (e) {
    log.auth.warn('[OtpPersistence] Failed to load session:', e?.message);
    return null;
  }
}

/**
 * Clear the stored OTP session.
 * Call on: successful verification, user taps "Change Number", logout.
 */
export async function clearOtpSession() {
  try {
    if (Capacitor.isNativePlatform()) {
      await _nativeRemove(STORAGE_KEY);
    } else {
      _webRemove(STORAGE_KEY);
    }
    log.auth('[OtpPersistence] Session cleared');
  } catch (e) {
    log.auth.warn('[OtpPersistence] Failed to clear session:', e?.message);
  }
}

/**
 * Check if a valid (non-expired) OTP session exists in storage.
 *
 * @returns {Promise<boolean>}
 */
export async function hasValidOtpSession() {
  const record = await loadOtpSession();
  return !!record;
}

/**
 * Reconstruct a normalized OtpSession from a persisted record.
 * For Android: the verificationId is available — returns full session.
 * For Web: returns null (web sessions cannot be reconstructed).
 *
 * @param {SavedOtpRecord} record
 * @returns {OtpSession | null}
 */
export function reconstructOtpSession(record) {
  if (!record) return null;

  if (record.platform === 'android') {
    if (!record.verificationId) {
      log.auth.warn('[OtpPersistence] Cannot reconstruct Android session — verificationId missing');
      return null;
    }
    return {
      success: true,
      platform: 'android',
      verificationId: record.verificationId,
      confirmationResult: null,
    };
  }

  // Web: ConfirmationResult is gone after page reload. Return null.
  // Caller must re-request OTP.
  log.auth('[OtpPersistence] Web session cannot be reconstructed — caller must re-request OTP');
  return null;
}
