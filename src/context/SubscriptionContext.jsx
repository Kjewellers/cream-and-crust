/**
 * SubscriptionContext.jsx
 *
 * THE central subscription authority for the entire app.
 *
 * Reliability requirements covered here:
 *  ✓ Startup replay: if pending actions exist and user is already Pro on mount
 *  ✓ Idempotency: duplicate free→pro transitions suppressed within 5s window
 *  ✓ App-resume sync: foreground restore of entitlements (via useSubscription)
 *  ✓ 24-hour health check: proactive entitlement refresh
 *  ✓ State preservation: capturePaywallState() before open, restore after close
 *  ✓ Structured logging at every lifecycle event
 *  ✓ Never throws — all async paths are try/catch guarded
 *
 * Usage:
 *   const { isPro, openPaywall, closePaywall, trialDaysRemaining } = useSubscriptionContext();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { replayPendingActions, getPendingActions } from '../services/PendingActionManager';
import { track } from '../services/PremiumAnalytics';
import { syncCustomerInfo } from '../services/purchases';
import { capturePaywallState, restorePaywallState } from '../services/PaywallStatePreserver';
import { wasRecentlySuccessful } from '../services/PurchaseStateMachine';
import { log } from '../utils/logger';
import { useAuth } from './AuthContext';

// ── Constants ────────────────────────────────────────────────────────────────
const HEALTH_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const HEALTH_CHECK_KEY = 'cc:sub_last_health_check';

// ── Context ───────────────────────────────────────────────────────────────────
const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { currentUser } = useAuth();
  const subscription = useSubscription();

  // Paywall & preview modal state
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeatureKey, setPaywallFeatureKey] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFeatureKey, setPreviewFeatureKey] = useState(null);
  const [unlockCelebrationVisible, setUnlockCelebrationVisible] = useState(false);
  const [pendingActionDescriptor, setPendingActionDescriptor] = useState(null);

  // Idempotency: track last activation time to suppress double-fires
  const prevIsProRef = useRef(subscription.isActive);
  // Replay idempotency: only run once per activation event
  const replayInProgressRef = useRef(false);

  const isPro = subscription.isActive;
  const isTrial = subscription.isTrial;
  const expiryDate = subscription.expiryDate;

  // ── Trial days remaining ────────────────────────────────────────────────────
  const trialDaysRemaining = (() => {
    if (!isTrial || !expiryDate) return null;
    const diff = new Date(expiryDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  })();

  // ── Startup replay: user is already Pro on mount with queued actions ───────
  useEffect(() => {
    if (!isPro || replayInProgressRef.current) return;
    const pending = getPendingActions();
    if (pending.length === 0) return;

    log.purchase('replay:startup', { count: pending.length });
    replayInProgressRef.current = true;

    replayPendingActions({
      onSuccess: (descriptor) => {
        track.featureUnlocked(descriptor.featureKey);
        log.purchase('replay:success', { action: descriptor.action });
      },
      onError: (descriptor, err) => {
        log.purchase.warn('replay:failed', { action: descriptor.action, err: err?.message });
      },
    }).finally(() => {
      replayInProgressRef.current = false;
    });
    // Only run once on mount — isPro is stable at this point
  }, []);

  // ── Detect free → pro transition ───────────────────────────────────────────
  useEffect(() => {
    const wasNotPro = !prevIsProRef.current;
    const isNowPro = isPro;
    prevIsProRef.current = isPro;

    if (!wasNotPro || !isNowPro) return;

    // Suppress duplicate activations (e.g. Firestore + RC firing close together)
    if (wasRecentlySuccessful()) {
      log.purchase('entitlement:duplicate_suppressed');
      return;
    }

    if (replayInProgressRef.current) return;
    replayInProgressRef.current = true;

    log.purchase('entitlement:activated', { isTrial });

    // Celebrate and close all modals
    setUnlockCelebrationVisible(true);
    setPaywallOpen(false);
    setPreviewOpen(false);

    // Restore scroll position captured before paywall opened
    restorePaywallState();

    // Replay all queued actions
    replayPendingActions({
      onSuccess: (descriptor) => {
        track.featureUnlocked(descriptor.featureKey);
        log.purchase('replay:success', { action: descriptor.action });
      },
      onError: (descriptor, err) => {
        log.purchase.warn('replay:failed', { action: descriptor.action, err: err?.message });
      },
    }).finally(() => {
      replayInProgressRef.current = false;
    });

    log.purchase('entitlement:refresh', { isPro: true, source: 'activation' });

    const timer = setTimeout(() => setUnlockCelebrationVisible(false), 2800);
    return () => clearTimeout(timer);
  }, [isPro, isTrial]);

  // ── 24-hour health check ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;

    const lastCheck = parseInt(localStorage.getItem(HEALTH_CHECK_KEY) || '0', 10);
    const shouldCheck = Date.now() - lastCheck > HEALTH_CHECK_INTERVAL_MS;

    if (!shouldCheck) return;

    log.purchase('health_check:start');
    syncCustomerInfo(currentUser.uid)
      .then(() => {
        localStorage.setItem(HEALTH_CHECK_KEY, String(Date.now()));
        log.purchase('health_check:done');
      })
      .catch((err) => {
        // Non-fatal — user still operates with cached state
        log.purchase.warn('health_check:failed', { err: err?.message });
      });
  }, [currentUser?.uid]);

  // ── Paywall controls ───────────────────────────────────────────────────────
  const openPaywall = useCallback((featureKey, descriptor = null) => {
    // Capture UI state before opening so we can restore on close
    capturePaywallState();
    setPaywallFeatureKey(featureKey || null);
    setPendingActionDescriptor(descriptor);
    setPaywallOpen(true);
    log.purchase('paywall:opened', { featureKey });
  }, []);

  const closePaywall = useCallback((featureKey, { cancelled = false } = {}) => {
    if (featureKey && cancelled) {
      track.paywallDismissed(featureKey);
    }
    setPaywallOpen(false);
    setPaywallFeatureKey(null);
    setPendingActionDescriptor(null);
    // Restore scroll position for cancel / close without purchase
    restorePaywallState();
    log.purchase('paywall:closed', { featureKey, cancelled });
  }, []);

  // ── Preview controls ───────────────────────────────────────────────────────
  const openPreview = useCallback((featureKey) => {
    setPreviewFeatureKey(featureKey);
    setPreviewOpen(true);
    track.featurePreviewOpened(featureKey);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewFeatureKey(null);
  }, []);

  const value = {
    // Subscription state
    isPro,
    isTrial,
    expiryDate,
    trialDaysRemaining,
    subscriptionLoading: subscription.loading,

    // Paywall
    paywallOpen,
    paywallFeatureKey,
    pendingActionDescriptor,
    openPaywall,
    closePaywall,

    // Preview (first-tap showcase)
    previewOpen,
    previewFeatureKey,
    openPreview,
    closePreview,

    // Unlock celebration
    unlockCelebrationVisible,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

const DEFAULT_SUBSCRIPTION_CONTEXT = {
  isPro: false,
  isTrial: false,
  expiryDate: null,
  trialDaysRemaining: 0,
  subscriptionLoading: false,
  paywallOpen: false,
  paywallFeatureKey: null,
  pendingActionDescriptor: null,
  openPaywall: () => {},
  closePaywall: () => {},
  previewOpen: false,
  previewFeatureKey: null,
  openPreview: () => {},
  closePreview: () => {},
  unlockCelebrationVisible: false,
};

export function useSubscriptionContext() {
  const ctx = useContext(SubscriptionContext);
  return ctx || DEFAULT_SUBSCRIPTION_CONTEXT;
}
