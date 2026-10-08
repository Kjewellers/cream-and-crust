/**
 * otpCrashAnalytics.js — Structured OTP failure reporting for Cream & Crust.
 *
 * Every OTP send/verify failure writes a structured record to:
 *   Firestore: `otp_failures` collection (queryable, real-time)
 *   Crashlytics: custom key-value pairs (if on Android)
 *
 * Fields captured (NO PII — no names, no emails, no full phone numbers):
 *   - event          : 'otp_send_failure' | 'otp_verify_failure' | 'otp_session_missing'
 *   - platform       : 'android' | 'web'
 *   - errorCode      : Firebase auth error code (e.g. 'auth/too-many-requests')
 *   - errorMessage   : Error message (truncated to 300 chars)
 *   - verificationIdPresent : boolean — was verificationId in session?
 *   - otpSendDurationMs     : how long requestPhoneOTP took (ms)
 *   - otpVerifyDurationMs   : how long verifyPhoneOTP took (ms)
 *   - androidVersion  : Android OS version (if Android)
 *   - appVersion      : Vite VITE_APP_VERSION env var
 *   - capacitorPlatform: Capacitor.getPlatform()
 *   - maskedPhone     : last 4 digits only (e.g. "****3210") — for grouping
 *   - timestamp       : Firestore server timestamp
 *   - resolved        : false (for admin queries)
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';

const MAX_MSG = 300;
const COLLECTION = 'otp_failures';

/**
 * Mask a phone number to last 4 digits only.
 * "+919876543210" → "****3210"
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return 'unknown';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

/**
 * Detect Android OS version from userAgent.
 * Returns e.g. "13" or "unknown".
 */
function androidVersion() {
  try {
    const match = navigator?.userAgent?.match(/Android (\d+)/);
    return match ? match[1] : 'unknown';
  } catch { return 'unknown'; }
}

/**
 * Core analytics writer — fire-and-forget.
 *
 * @param {Object} fields
 */
async function _writeToFirestore(fields) {
  try {
    const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
      import('./firebase.js'),
      import('firebase/firestore'),
    ]);
    await addDoc(collection(db, COLLECTION), {
      ...fields,
      timestamp: serverTimestamp(),
      resolved: false,
    });
  } catch (e) {
    // Never throw from analytics — silently absorb
    log.auth.warn('[OtpAnalytics] Failed to write to Firestore:', e?.message);
  }
}

/**
 * Write structured OTP failure to Crashlytics (Android only).
 * Best-effort — silently skips on web or if plugin unavailable.
 */
async function _writeToCrashlytics(event, fields) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { FirebaseCrashlytics } = await import('@capacitor-firebase/crashlytics');
    // Set custom keys visible in the Crashlytics dashboard
    const keyMap = {
      otp_event:    event,
      otp_platform: fields.platform,
      otp_error:    fields.errorCode || 'none',
      otp_vid:      String(fields.verificationIdPresent),
      otp_phone:    fields.maskedPhone,
    };
    await Promise.all(
      Object.entries(keyMap).map(([key, value]) =>
        FirebaseCrashlytics.setCustomKey({ key, value: String(value) }).catch(() => {})
      )
    );
    // Log a non-fatal Crashlytics message
    await FirebaseCrashlytics.recordException({
      message: `[OTP] ${event}: ${fields.errorMessage || 'unknown error'}`,
    }).catch(() => {});
  } catch { /* Crashlytics not available */ }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Log an OTP send failure.
 *
 * @param {Object} opts
 * @param {string} opts.phoneNumber       E.164 phone number
 * @param {Error|null} opts.error         The error that was thrown
 * @param {number} [opts.durationMs]      How long requestPhoneOTP() ran before failing
 * @param {string} [opts.platform]        'android' | 'web'
 */
export async function logOtpSendFailure({ phoneNumber, error, durationMs, platform }) {
  const event = 'otp_send_failure';
  const fields = {
    event,
    platform: platform || Capacitor.getPlatform(),
    errorCode: error?.code || null,
    errorMessage: String(error?.message || 'unknown').slice(0, MAX_MSG),
    verificationIdPresent: null, // N/A — send failed before we got a session
    otpSendDurationMs: durationMs ?? null,
    otpVerifyDurationMs: null,
    androidVersion: androidVersion(),
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    capacitorPlatform: Capacitor.getPlatform(),
    maskedPhone: maskPhone(phoneNumber),
  };

  log.auth.error('[OtpAnalytics] Logging otp_send_failure:', fields.errorCode, fields.errorMessage);
  await Promise.all([
    _writeToFirestore(fields),
    _writeToCrashlytics(event, fields),
  ]);
}

/**
 * Log an OTP verify failure.
 *
 * @param {Object} opts
 * @param {string} opts.phoneNumber
 * @param {Error|null} opts.error
 * @param {number} [opts.durationMs]         How long verifyPhoneOTP() ran
 * @param {OtpSession|null} [opts.otpSession] The session object (for inspection)
 */
export async function logOtpVerifyFailure({ phoneNumber, error, durationMs, otpSession }) {
  const event = 'otp_verify_failure';
  const fields = {
    event,
    platform: otpSession?.platform || Capacitor.getPlatform(),
    errorCode: error?.code || null,
    errorMessage: String(error?.message || 'unknown').slice(0, MAX_MSG),
    verificationIdPresent: !!otpSession?.verificationId,
    otpSendDurationMs: null,
    otpVerifyDurationMs: durationMs ?? null,
    androidVersion: androidVersion(),
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    capacitorPlatform: Capacitor.getPlatform(),
    maskedPhone: maskPhone(phoneNumber),
  };

  log.auth.error('[OtpAnalytics] Logging otp_verify_failure:', fields.errorCode, fields.errorMessage);
  await Promise.all([
    _writeToFirestore(fields),
    _writeToCrashlytics(event, fields),
  ]);
}

/**
 * Log a missing/null OTP session (the root cause of the original crash).
 * Called whenever the UI tries to verify but has no valid session.
 *
 * @param {Object} opts
 * @param {string} opts.phoneNumber
 * @param {any} opts.storedSession      Whatever was in state (for inspection)
 * @param {string} [opts.location]      Which handler detected this: 'main_login' | 'forgot_password'
 */
export async function logOtpSessionMissing({ phoneNumber, storedSession, location }) {
  const event = 'otp_session_missing';
  const fields = {
    event,
    platform: storedSession?.platform || Capacitor.getPlatform(),
    errorCode: 'session_missing',
    errorMessage: `Session missing at: ${location || 'unknown'}. Stored: ${JSON.stringify(storedSession)?.slice(0, 200)}`,
    verificationIdPresent: !!storedSession?.verificationId,
    otpSendDurationMs: null,
    otpVerifyDurationMs: null,
    androidVersion: androidVersion(),
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    capacitorPlatform: Capacitor.getPlatform(),
    maskedPhone: maskPhone(phoneNumber),
  };

  log.auth.error('[OtpAnalytics] Logging otp_session_missing at:', location);
  await Promise.all([
    _writeToFirestore(fields),
    _writeToCrashlytics(event, fields),
  ]);
}
