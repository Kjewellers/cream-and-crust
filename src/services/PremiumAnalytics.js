/**
 * PremiumAnalytics.js
 *
 * Central event logger for the premium subscription funnel.
 * Tracks every meaningful interaction so product decisions can be data-driven.
 *
 * Events fired:
 *   feature_preview_opened   User enters a soft-locked premium screen
 *   paywall_shown            Paywall modal appears
 *   paywall_dismissed        User taps "Maybe Later"
 *   trial_started            3-month trial begins
 *   purchase_completed       Subscription payment confirmed
 *   purchase_cancelled       User exits paywall without buying
 *   restore_succeeded        Past purchase restored
 *   feature_unlocked         Premium action auto-executed after purchase
 *
 * Usage counter (per-feature, localStorage):
 *   { previewed: 4, blocked: 2, unlocked: 1 }
 */

import { log } from '../utils/logger';

const USAGE_KEY = 'cc:feature_usage';

// ── Usage Counter ─────────────────────────────────────────────────────────────

function loadUsage() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsage(data) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Increment a counter for a feature.
 * @param {string} featureKey
 * @param {'previewed'|'blocked'|'unlocked'} counter
 */
export function incrementUsage(featureKey, counter) {
  const data = loadUsage();
  if (!data[featureKey]) data[featureKey] = { previewed: 0, blocked: 0, unlocked: 0 };
  data[featureKey][counter] = (data[featureKey][counter] || 0) + 1;
  saveUsage(data);
}

/**
 * Get usage counts for a feature.
 * @param {string} featureKey
 * @returns {{ previewed: number, blocked: number, unlocked: number }}
 */
export function getUsage(featureKey) {
  const data = loadUsage();
  return data[featureKey] || { previewed: 0, blocked: 0, unlocked: 0 };
}

/**
 * Get the number of times the paywall has been triggered for a feature.
 * Used to drive the progressive paywall sequence.
 * @param {string} featureKey
 */
export function getPaywallEncounterCount(featureKey) {
  return getUsage(featureKey).blocked || 0;
}

/**
 * Reset usage counters (e.g. after subscription activation).
 * @param {string} [featureKey] - if omitted, resets ALL features
 */
export function resetUsage(featureKey) {
  if (featureKey) {
    const data = loadUsage();
    delete data[featureKey];
    saveUsage(data);
  } else {
    localStorage.removeItem(USAGE_KEY);
  }
}

// ── Paywall Cooldown ──────────────────────────────────────────────────────────

const COOLDOWN_KEY = 'cc:paywall_cooldown';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if the paywall is in cooldown for a feature (user said "Maybe Later").
 * @param {string} featureKey
 */
export function isPaywallOnCooldown(featureKey) {
  try {
    const data = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}');
    const ts = data[featureKey];
    if (!ts) return false;
    return Date.now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Set a 24-hour cooldown for a feature (after "Maybe Later" is tapped).
 * @param {string} featureKey
 */
export function setPaywallCooldown(featureKey) {
  try {
    const data = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}');
    data[featureKey] = Date.now();
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Clear the cooldown (e.g. on explicit re-trigger by user).
 * @param {string} featureKey
 */
export function clearPaywallCooldown(featureKey) {
  try {
    const data = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}');
    delete data[featureKey];
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
  } catch {}
}

// ── Analytics Event Logging ───────────────────────────────────────────────────

/**
 * Fire an analytics event. Uses Firebase Analytics if available,
 * with a structured console log as fallback for development.
 *
 * @param {string} eventName
 * @param {object} [params]
 */
export async function trackPremiumEvent(eventName, params = {}) {
  const payload = {
    ...params,
    timestamp: new Date().toISOString(),
  };

  log.analytics?.(`[Premium] ${eventName}`, payload);

  // Fire to Firebase Analytics (non-blocking)
  try {
    const { logEvent, getAnalytics } = await import('firebase/analytics');
    const analytics = getAnalytics();
    logEvent(analytics, eventName, payload);
  } catch {
    // Analytics not configured — no-op
  }
}

// ── Convenience event helpers ─────────────────────────────────────────────────

export const track = {
  featurePreviewOpened: (featureKey) => {
    incrementUsage(featureKey, 'previewed');
    return trackPremiumEvent('feature_preview_opened', { feature: featureKey });
  },
  paywallShown: (featureKey, encounter) => {
    incrementUsage(featureKey, 'blocked');
    return trackPremiumEvent('paywall_shown', { feature: featureKey, encounter });
  },
  paywallDismissed: (featureKey) => {
    setPaywallCooldown(featureKey);
    return trackPremiumEvent('paywall_dismissed', { feature: featureKey });
  },
  trialStarted: (featureKey) =>
    trackPremiumEvent('trial_started', { feature: featureKey }),
  purchaseCompleted: (productId, featureKey) =>
    trackPremiumEvent('purchase_completed', { productId, feature: featureKey }),
  purchaseCancelled: (featureKey) =>
    trackPremiumEvent('purchase_cancelled', { feature: featureKey }),
  restoreSucceeded: () =>
    trackPremiumEvent('restore_succeeded'),
  featureUnlocked: (featureKey) => {
    incrementUsage(featureKey, 'unlocked');
    return trackPremiumEvent('feature_unlocked', { feature: featureKey });
  },
};
