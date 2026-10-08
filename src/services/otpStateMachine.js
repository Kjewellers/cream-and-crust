/**
 * otpStateMachine.js — Strict OTP flow state machine for Cream & Crust.
 *
 * ──────────────────────────────────────────────────────────────────
 * Valid state graph:
 *
 *   idle
 *     └─[SEND]──→ sending_otp
 *                   ├─[SUCCESS]──→ otp_sent
 *                   │               ├─[VERIFY]──→ verifying_otp
 *                   │               │               ├─[SUCCESS]──→ verified ✅
 *                   │               │               └─[FAIL]────→ otp_sent (retry allowed)
 *                   │               └─[RESEND]──→ sending_otp (if cooldown elapsed)
 *                   └─[FAIL]────→ idle (session cleared)
 *
 * Invalid transitions (structurally blocked — throw, never silently no-op):
 *   idle          → verify        ❌  No session exists
 *   otp_sent      → resend        ❌  If cooldown not elapsed
 *   verifying_otp → verify again  ❌  Already in progress
 *   verified      → any           ❌  Terminal — caller must create new machine
 * ──────────────────────────────────────────────────────────────────
 */

import { log } from '../utils/logger';

export const OTP_STATES = Object.freeze({
  IDLE: 'idle',
  SENDING_OTP: 'sending_otp',
  OTP_SENT: 'otp_sent',
  VERIFYING_OTP: 'verifying_otp',
  VERIFIED: 'verified',
  ERROR: 'error',
});

// Resend cooldown in milliseconds (30 seconds)
const RESEND_COOLDOWN_MS = 30_000;

/**
 * Valid transitions map.
 * Key: current state → Value: set of allowed next states via explicit actions.
 */
const ALLOWED_TRANSITIONS = {
  [OTP_STATES.IDLE]:         new Set([OTP_STATES.SENDING_OTP]),
  [OTP_STATES.SENDING_OTP]:  new Set([OTP_STATES.OTP_SENT, OTP_STATES.ERROR, OTP_STATES.IDLE]),
  [OTP_STATES.OTP_SENT]:     new Set([OTP_STATES.VERIFYING_OTP, OTP_STATES.SENDING_OTP, OTP_STATES.IDLE]),
  [OTP_STATES.VERIFYING_OTP]:new Set([OTP_STATES.VERIFIED, OTP_STATES.OTP_SENT]),
  [OTP_STATES.VERIFIED]:     new Set(), // terminal state
  [OTP_STATES.ERROR]:        new Set([OTP_STATES.IDLE, OTP_STATES.SENDING_OTP]),
};

/**
 * Creates a new OTP state machine instance.
 *
 * The machine is a plain object with:
 *   - state      : current OTP_STATES value
 *   - otpSession : the normalized session from requestPhoneOTP
 *   - phoneNumber: the phone number being verified
 *   - sentAt     : timestamp (ms) when OTP was last sent
 *   - context    : arbitrary extra info (errors, timing, etc.)
 *
 * Transitions are performed via action functions that throw on invalid moves.
 *
 * @param {string} phoneNumber  E.164 phone number to be verified.
 * @returns {OtpMachine}
 */
export function createOtpMachine(phoneNumber) {
  let _state = OTP_STATES.IDLE;
  let _otpSession = null;
  let _phoneNumber = phoneNumber;
  let _sentAt = null;
  let _context = {};
  let _listeners = [];

  function _setState(nextState, ctx = {}) {
    const allowed = ALLOWED_TRANSITIONS[_state];
    if (!allowed || !allowed.has(nextState)) {
      const msg = `[OtpMachine] INVALID TRANSITION: ${_state} → ${nextState}`;
      log.auth.error(msg, 'phoneNumber:', _phoneNumber);
      throw new Error(msg);
    }
    const prevState = _state;
    _state = nextState;
    _context = { ..._context, ...ctx };
    log.auth(`[OtpMachine] ${prevState} → ${nextState}`, JSON.stringify(_context));
    _listeners.forEach(fn => { try { fn({ state: _state, prev: prevState, context: _context }); } catch {} });
  }

  return {
    // ── Getters ──────────────────────────────────────────────────────
    get state() { return _state; },
    get otpSession() { return _otpSession; },
    get phoneNumber() { return _phoneNumber; },
    get sentAt() { return _sentAt; },
    get context() { return _context; },

    /** Snapshot for persistence / debugging */
    snapshot() {
      return {
        state: _state,
        phoneNumber: _phoneNumber,
        sentAt: _sentAt,
        platform: _otpSession?.platform ?? null,
        verificationId: _otpSession?.verificationId ?? null,
        // Never persist the web ConfirmationResult — it is not serializable
        // and it expires with the Firebase session.
        context: _context,
      };
    },

    // ── Actions ──────────────────────────────────────────────────────

    /** Begin OTP send. Call before requestPhoneOTP(). */
    startSend() {
      // Allow resend from otp_sent only if cooldown has elapsed
      if (_state === OTP_STATES.OTP_SENT) {
        const elapsed = _sentAt ? Date.now() - _sentAt : Infinity;
        if (elapsed < RESEND_COOLDOWN_MS) {
          const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
          throw new Error(
            `[OtpMachine] Resend blocked: cooldown active (${remaining}s remaining). ` +
            'Prevent the user from tapping Resend again too quickly.'
          );
        }
      }
      _setState(OTP_STATES.SENDING_OTP, { sendStartedAt: Date.now() });
    },

    /** OTP send succeeded — store the normalized session. */
    onSendSuccess(otpSession) {
      if (!otpSession?.platform) {
        throw new Error('[OtpMachine] onSendSuccess called with invalid otpSession (missing platform)');
      }
      _otpSession = otpSession;
      _sentAt = Date.now();
      _setState(OTP_STATES.OTP_SENT, {
        platform: otpSession.platform,
        sentAt: _sentAt,
        verificationIdPresent: !!otpSession.verificationId,
      });
    },

    /** OTP send failed — return to idle so user can retry. */
    onSendFailure(error) {
      _otpSession = null;
      _sentAt = null;
      _setState(OTP_STATES.IDLE, {
        lastError: error?.message || 'Unknown send error',
        errorCode: error?.code || null,
        failedAt: Date.now(),
      });
    },

    /** Begin OTP verification. Throws if verifyPhoneOTP would fail predictably. */
    startVerify() {
      if (_state !== OTP_STATES.OTP_SENT) {
        throw new Error(
          `[OtpMachine] Cannot verify OTP in state "${_state}". ` +
          'OTP must be sent first (state must be otp_sent).'
        );
      }
      if (!_otpSession) {
        throw new Error('[OtpMachine] startVerify: otpSession is null. Call startSend/onSendSuccess first.');
      }
      if (_otpSession.platform === 'android' &&
          (!_otpSession.verificationId || typeof _otpSession.verificationId !== 'string')) {
        throw new Error(
          '[OtpMachine] startVerify: Android session has no verificationId. ' +
          'The OTP send did not complete correctly.'
        );
      }
      _setState(OTP_STATES.VERIFYING_OTP, { verifyStartedAt: Date.now() });
    },

    /** OTP verify succeeded. Terminal state. */
    onVerifySuccess(uid) {
      _setState(OTP_STATES.VERIFIED, {
        uid,
        verifiedAt: Date.now(),
        totalDurationMs: _sentAt ? Date.now() - _sentAt : null,
      });
    },

    /** OTP verify failed (wrong code etc.) — returns to otp_sent for retry. */
    onVerifyFailure(error) {
      _setState(OTP_STATES.OTP_SENT, {
        lastVerifyError: error?.message || 'Unknown verify error',
        verifyErrorCode: error?.code || null,
        verifyFailedAt: Date.now(),
      });
    },

    /** Reset to idle (user taps "Change Number", session expired, etc.) */
    reset() {
      _state = OTP_STATES.IDLE;
      _otpSession = null;
      _sentAt = null;
      _context = {};
      log.auth('[OtpMachine] Machine reset to idle');
      _listeners.forEach(fn => { try { fn({ state: _state, prev: null, context: {} }); } catch {} });
    },

    /** Subscribe to state changes. Returns unsubscribe function. */
    subscribe(fn) {
      _listeners.push(fn);
      return () => { _listeners = _listeners.filter(l => l !== fn); };
    },
  };
}
