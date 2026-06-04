/**
 * analytics.js — usage + error monitoring wrapper around Firebase Analytics.
 *
 * Forwards only an allowlisted set of event names with PII-stripped payloads.
 * Customer name/phone/email/address/message content are never recorded.
 * Analytics init is lazy and guarded so a missing/unsupported environment
 * (tests, SSR, unsupported browsers) never throws into the UI.
 *
 * Requirements: 14.1-14.5 (event tracking), 14.6 (error logging, truncated),
 * 14.7 (allowlisted non-empty names), 14.8 (no PII).
 */

/** The only event names that may be recorded (Req 14.7). */
export const EVENTS = Object.freeze({
  SCREEN_OPEN: 'screen_open',
  ORDER_CREATE: 'order_create',
  WHATSAPP_SEND: 'whatsapp_send',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  ACTION_FAILED: 'action_failed',
  APP_ERROR: 'app_error',
  // ── Production SaaS funnel events ──────────────────────────────────
  PAYMENT_DONE: 'payment_done',
  RECIPE_SAVED: 'recipe_saved',
  MENU_VIEWED: 'menu_viewed',
  PORTFOLIO_SHARED: 'portfolio_shared',
  SESSION_STARTED: 'session_started',
  SUBSCRIPTION_STARTED: 'subscription_started',
  FIRST_ORDER: 'first_order',
  SIGNUP: 'signup',
});

const EVENT_VALUES = new Set(Object.values(EVENTS));

/** Keys treated as customer PII and stripped from every payload (Req 14.8). */
export const PII_KEYS = Object.freeze([
  'name',
  'customerName',
  'customer',
  'phone',
  'whatsapp',
  'email',
  'address',
  'deliveryAddress',
  'pickupAddress',
  'message',
  'notes',
]);

const MAX_MESSAGE_LEN = 1000;
const MAX_STRING_LEN = 1000;

/**
 * Recursively remove PII keys and truncate long strings from a payload.
 * Pure — does not mutate the input. Never throws.
 */
export function sanitizePayload(payload) {
  if (payload == null || typeof payload !== 'object') return {};
  const out = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload)) {
    if (PII_KEYS.includes(key)) continue;
    if (value && typeof value === 'object') {
      out[key] = sanitizePayload(value);
    } else if (typeof value === 'string') {
      out[key] = value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) : value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ── Lazy, guarded Firebase Analytics handle ───────────────────────────────
let _analytics = null;
let _initTried = false;

async function getAnalyticsSafe() {
  if (_analytics || _initTried) return _analytics;
  _initTried = true;
  try {
    const { isSupported, getAnalytics } = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) return null;
    // The Firebase app is already initialized by firebase.js (imported for
    // side effects). Reach it via getApp() rather than a named export.
    await import('./firebase.js');
    const { getApp } = await import('firebase/app');
    _analytics = getAnalytics(getApp());
  } catch {
    _analytics = null;
  }
  return _analytics;
}

/**
 * Record an allowlisted event with a sanitized payload. No-ops (returns false)
 * for unknown/empty event names so out-of-set names never produce an event
 * (Req 14.1-14.5, 14.7, 14.8). Never throws into the UI.
 *
 * @returns {boolean} whether the event was accepted for recording
 */
export function track(eventName, payload = {}) {
  if (typeof eventName !== 'string' || eventName.length === 0) return false;
  if (!EVENT_VALUES.has(eventName)) return false;

  const safe = sanitizePayload(payload);
  // Fire-and-forget; analytics must never block or break the caller.
  getAnalyticsSafe()
    .then((analytics) => {
      if (!analytics) return;
      return import('firebase/analytics').then(({ logEvent }) => {
        try {
          logEvent(analytics, eventName, safe);
        } catch {
          /* swallow — analytics is best-effort */
        }
      });
    })
    .catch(() => {
      /* swallow */
    });
  return true;
}

/**
 * Record an error event with the message truncated to 1000 chars and no PII
 * (Req 14.6). Never throws.
 */
export function logError(message, extra = {}) {
  const msg = String(message == null ? '' : message).slice(0, MAX_MESSAGE_LEN);
  return track(EVENTS.APP_ERROR, { ...sanitizePayload(extra), message: msg });
}

/** Convenience helpers for common events. */
export const trackScreen = (screen) => track(EVENTS.SCREEN_OPEN, { screen: String(screen || '') });
export const trackOrderCreate = (payload = {}) => track(EVENTS.ORDER_CREATE, payload);
export const trackWhatsAppSend = (context = 'order') => track(EVENTS.WHATSAPP_SEND, { context });
export const trackOnboardingComplete = (skipped = false) =>
  track(EVENTS.ONBOARDING_COMPLETE, { skipped: Boolean(skipped) });
export const trackActionFailed = (action, code) =>
  track(EVENTS.ACTION_FAILED, {
    action: String(action || ''),
    code: code == null ? '' : String(code),
  });

// ── Production SaaS funnel helpers ────────────────────────────────────────
export const trackPaymentDone = (method = 'unknown') =>
  track(EVENTS.PAYMENT_DONE, { method: String(method) });
export const trackRecipeSaved = () => track(EVENTS.RECIPE_SAVED, {});
export const trackMenuViewed = (menuId) =>
  track(EVENTS.MENU_VIEWED, { menuId: String(menuId || '') });
export const trackPortfolioShared = (channel = 'link') =>
  track(EVENTS.PORTFOLIO_SHARED, { channel: String(channel) });
export const trackSessionStarted = () => track(EVENTS.SESSION_STARTED, {});
export const trackSubscriptionStarted = (plan = 'unknown') =>
  track(EVENTS.SUBSCRIPTION_STARTED, { plan: String(plan) });
export const trackFirstOrder = () => track(EVENTS.FIRST_ORDER, {});
export const trackSignup = (method = 'email') =>
  track(EVENTS.SIGNUP, { method: String(method) });
