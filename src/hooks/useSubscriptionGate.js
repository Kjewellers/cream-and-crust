/**
 * useSubscriptionGate.js
 *
 * The primary hook for any component that needs to guard a premium action.
 *
 * API:
 *   const { isPro, executeProtectedAction, openPreview, trialDaysRemaining } = useSubscriptionGate();
 *
 * executeProtectedAction({
 *   featureKey: 'AI_INVOICE',
 *   action: 'GENERATE_AI_INVOICE',       // serializable action key
 *   payload: { orderId, customerId },    // serializable payload
 *   onAlreadyPro: () => actualAction(),  // called immediately if subscribed
 * })
 *
 * Decision flow:
 *   isPro  → call onAlreadyPro() directly
 *   !isPro → check cooldown → queue descriptor → open paywall with progressive stage
 */

import { useCallback } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { queueAction } from '../services/PendingActionManager';
import {
  getPaywallEncounterCount,
  isPaywallOnCooldown,
  track,
} from '../services/PremiumAnalytics';

export function useSubscriptionGate() {
  const ctx = useSubscriptionContext();

  /**
   * Guard a premium action.
   *
   * @param {object} options
   * @param {string}   options.featureKey       - Key from PREMIUM_FEATURES
   * @param {string}   options.action           - Serializable action string (for PendingActionManager)
   * @param {object}   [options.payload={}]     - Serializable payload
   * @param {Function} [options.onAlreadyPro]   - Called immediately if user is already subscribed
   * @returns {boolean} true if the action was executed, false if gated
   */
  const executeProtectedAction = useCallback(({
    featureKey,
    action,
    payload = {},
    onAlreadyPro,
  }) => {
    // ── Already subscribed: execute immediately ──
    if (ctx.isPro) {
      onAlreadyPro?.();
      return true;
    }

    // ── Respect "Maybe Later" cooldown ──
    if (isPaywallOnCooldown(featureKey)) {
      // Still in cooldown — show a subtle toast instead of full paywall
      // The component can handle this; we just return false.
      return false;
    }

    // ── Queue the action descriptor for replay after purchase ──
    const encounterCount = getPaywallEncounterCount(featureKey);
    queueAction({ action, payload, featureKey });
    track.paywallShown(featureKey, encounterCount + 1);

    // ── Open global paywall via context ──
    ctx.openPaywall(featureKey, { action, payload, featureKey });
    return false;
  }, [ctx]);

  /**
   * Open the first-tap feature showcase (no paywall).
   * Call this from the feature card's onPress to let users explore freely.
   */
  const openFeaturePreview = useCallback((featureKey) => {
    ctx.openPreview(featureKey);
  }, [ctx]);

  return {
    isPro: ctx.isPro,
    isTrial: ctx.isTrial,
    trialDaysRemaining: ctx.trialDaysRemaining,
    subscriptionLoading: ctx.subscriptionLoading,
    executeProtectedAction,
    openFeaturePreview,
    openPaywall: ctx.openPaywall,
  };
}
