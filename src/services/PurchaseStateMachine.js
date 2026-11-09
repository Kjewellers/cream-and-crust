/**
 * PurchaseStateMachine.js
 *
 * Canonical purchase state machine for all RevenueCat / Google Play Billing
 * interactions. Replaces ad-hoc loading/error booleans in PremiumPaywall.
 *
 * States:
 *   IDLE           → nothing happening
 *   LOADING        → fetching offerings from RevenueCat
 *   PURCHASING     → Google Play billing sheet is open
 *   VERIFYING      → waiting for entitlement confirmation
 *   SUCCESS        → entitlement active, replay pending actions
 *   CANCELLED      → user dismissed the Play sheet (NOT an error)
 *   PENDING        → Google Play purchase is pending (bank approval etc.)
 *   FAILED         → purchase failed for a known reason
 *   OFFLINE        → no network connection detected
 *   RC_UNAVAILABLE → RevenueCat or Google Play is temporarily unreachable
 *
 * Usage (inside PremiumPaywall):
 *   const machine = usePurchaseStateMachine();
 *   await machine.execute({ featureKey, selectedPlan });
 *   // machine.state is now SUCCESS / CANCELLED / PENDING / FAILED / ...
 */

import { log } from '../utils/logger';

// ── State enum ────────────────────────────────────────────────────────────────
export const PurchaseState = Object.freeze({
  IDLE:           'IDLE',
  LOADING:        'LOADING',
  PURCHASING:     'PURCHASING',
  VERIFYING:      'VERIFYING',
  SUCCESS:        'SUCCESS',
  CANCELLED:      'CANCELLED',
  PENDING:        'PENDING',
  FAILED:         'FAILED',
  OFFLINE:        'OFFLINE',
  RC_UNAVAILABLE: 'RC_UNAVAILABLE',
});

// ── Loading timeout (15 s) — prevents frozen spinners ────────────────────────
const PURCHASE_TIMEOUT_MS = 15_000;

// ── Idempotency lock — prevents duplicate unlock animations ──────────────────
let _lastSuccessTimestamp = 0;
const IDEMPOTENCY_WINDOW_MS = 5_000;

export function wasRecentlySuccessful() {
  return Date.now() - _lastSuccessTimestamp < IDEMPOTENCY_WINDOW_MS;
}

function markSuccess() {
  _lastSuccessTimestamp = Date.now();
}

// ── Error classifier ─────────────────────────────────────────────────────────
/**
 * Maps RevenueCat / Google Play error signals to a PurchaseState.
 * Never exposes raw error messages to the UI.
 *
 * @param {Error|object} err
 * @returns {{ state: PurchaseState, friendlyMessage: string }}
 */
export function classifyError(err) {
  const rawMsg = err?.message || (err?.code !== undefined && err?.code !== null ? String(err.code) : '');
  const msg = String(rawMsg).toLowerCase();
  const code = typeof err?.underlyingErrorMessage === 'string' ? err.underlyingErrorMessage.toLowerCase() : '';

  // ── User cancellation (NEVER show as error) ──
  if (
    msg.includes('cancel') ||
    msg.includes('usercancel') ||
    msg.includes('user_cancel') ||
    msg.includes('dismiss') ||
    err?.userCancelled === true ||
    err?.code === 1 ||
    err?.code === 'user_cancelled' ||
    msg.includes('paymentcancelled')
  ) {
    return { state: PurchaseState.CANCELLED, friendlyMessage: '' };
  }

  // ── Pending purchase (bank approval, cash payment etc.) ──
  if (
    msg.includes('pending') ||
    msg.includes('purchase_pending') ||
    code.includes('pending')
  ) {
    return {
      state: PurchaseState.PENDING,
      friendlyMessage: 'Your purchase is being processed. Premium will unlock automatically once confirmed.',
    };
  }

  // ── Network / offline ──
  if (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('no internet') ||
    msg.includes('offline') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return {
      state: PurchaseState.OFFLINE,
      friendlyMessage: 'No internet connection. Check your network and try again.',
    };
  }

  // ── RevenueCat / Play Store unreachable ──
  if (
    msg.includes('store') ||
    msg.includes('billing') ||
    msg.includes('service') ||
    msg.includes('unavailable') ||
    msg.includes('revenuecat') ||
    msg.includes('no packages') ||
    msg.includes('no offering')
  ) {
    return {
      state: PurchaseState.RC_UNAVAILABLE,
      friendlyMessage: 'Google Play is temporarily unavailable. Please try again.',
    };
  }

  // ── Catch-all failure ──
  return {
    state: PurchaseState.FAILED,
    friendlyMessage: 'Something went wrong with the purchase. Please try again or restore purchases.',
  };
}

// ── Restore error classifier ─────────────────────────────────────────────────
export function classifyRestoreError(err) {
  const msg = (err?.message || '').toLowerCase();

  if (msg.includes('network') || msg.includes('timeout') || !navigator.onLine) {
    return {
      state: PurchaseState.OFFLINE,
      friendlyMessage: 'No internet connection. Connect to a network and try again.',
    };
  }
  if (msg.includes('nothing') || msg.includes('no purchase') || msg.includes('no active')) {
    return {
      state: PurchaseState.FAILED,
      friendlyMessage: 'No previous purchases found for this account.',
    };
  }
  return {
    state: PurchaseState.FAILED,
    friendlyMessage: 'Restore failed. Please try again or contact support.',
  };
}

// ── Main executor ────────────────────────────────────────────────────────────
/**
 * Execute the full purchase flow with timeout guard, error classification,
 * and structured logging. Returns a result object — never throws.
 *
 * @param {object} options
 * @param {string}   options.selectedPlan   - 'monthly' | 'yearly'
 * @param {string}   options.featureKey     - from PremiumFeatureRegistry
 * @param {Function} options.onStateChange  - (state, meta) => void
 * @returns {Promise<{ state: PurchaseState, friendlyMessage?: string, productId?: string }>}
 */
export async function executePurchase({ userId, selectedPlan, featureKey, onStateChange }) {
  const setState = (state, meta = {}) => {
    log.purchase(`flow:${state.toLowerCase()}`, { featureKey, ...meta });
    onStateChange?.(state, meta);
  };

  // Guard: network check before opening Play
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState(PurchaseState.OFFLINE);
    return { state: PurchaseState.OFFLINE, friendlyMessage: 'No internet connection. Check your network and try again.' };
  }

  setState(PurchaseState.LOADING);

  // Dynamically import to avoid bundling RC on web
  let getOfferings, purchasePackage, initPurchases, isNativeAndroidRuntime;
  let findPackageForPlan, subscriptionStateFromCustomerInfo;
  try {
    const mod = await import('./purchases');
    getOfferings = mod.getOfferings;
    purchasePackage = mod.purchasePackage;
    initPurchases = mod.initPurchases;
    isNativeAndroidRuntime = mod.isNativeAndroidRuntime;
    findPackageForPlan = mod.findPackageForPlan;
    subscriptionStateFromCustomerInfo = mod.subscriptionStateFromCustomerInfo;
  } catch {
    setState(PurchaseState.RC_UNAVAILABLE);
    return { state: PurchaseState.RC_UNAVAILABLE, friendlyMessage: 'Google Play is unavailable on this device.' };
  }

  if (typeof isNativeAndroidRuntime === 'function' && !isNativeAndroidRuntime()) {
    setState(PurchaseState.RC_UNAVAILABLE, { reason: 'unsupported_platform' });
    return {
      state: PurchaseState.RC_UNAVAILABLE,
      friendlyMessage: 'Subscriptions are available in the Cream & Crust Android app.',
    };
  }

  if (userId && typeof initPurchases === 'function') {
    try {
      const initialized = await Promise.race([
        initPurchases(userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PURCHASE_TIMEOUT_MS)),
      ]);
      if (!initialized) throw new Error('RevenueCat is not ready for this account.');
    } catch (err) {
      const result = classifyError(err);
      setState(result.state, { reason: 'billing_initialization' });
      return {
        ...result,
        friendlyMessage: 'The secure billing service is not ready. Please try again in a moment.',
      };
    }
  }

  // Timeout-guarded offering fetch
  let offering;
  try {
    const offeringPromise = getOfferings();
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), PURCHASE_TIMEOUT_MS)
    );
    offering = await Promise.race([offeringPromise, timeout]);
  } catch (err) {
    const result = classifyError(err);
    setState(result.state, { reason: 'offerings_fetch' });
    return result;
  }

  const packages = offering?.availablePackages || [];
  if (packages.length === 0) {
    log.purchase('flow:no_packages', { featureKey });
    setState(PurchaseState.RC_UNAVAILABLE, { reason: 'REVENUECAT_OFFERINGS_EMPTY' });
    return {
      state: PurchaseState.RC_UNAVAILABLE,
      friendlyMessage: 'Subscription plans are temporarily unavailable. Please try again.',
    };
  }

  const pkg =
    (typeof findPackageForPlan === 'function' ? findPackageForPlan(offering, selectedPlan) : null) ||
    packages.find((p) =>
      selectedPlan === 'yearly'
        ? (p.packageType === 'ANNUAL' || (p.identifier && p.identifier.includes('annual')))
        : (p.packageType === 'MONTHLY' || (p.identifier && p.identifier.includes('monthly')))
    ) ||
    packages[0];

  if (!pkg) {
    setState(PurchaseState.RC_UNAVAILABLE, { reason: `plan_not_configured:${selectedPlan}` });
    return {
      state: PurchaseState.RC_UNAVAILABLE,
      friendlyMessage: `The ${selectedPlan === 'yearly' ? 'annual' : 'monthly'} plan is not available right now. Please choose another plan or try again later.`,
    };
  }

  log.purchase('flow:offerings_ok', { packageCount: packages.length, packageType: pkg?.packageType });
  setState(PurchaseState.PURCHASING, { packageType: pkg?.packageType });

  // Timeout-guarded purchase
  try {
    const purchasePromise = purchasePackage(pkg);
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), PURCHASE_TIMEOUT_MS)
    );
    const customerInfo = await Promise.race([purchasePromise, timeout]);
    const verifiedSubscription =
      typeof subscriptionStateFromCustomerInfo === 'function'
        ? subscriptionStateFromCustomerInfo(customerInfo)
        : null;
    const hasActiveEntitlement =
      Boolean(verifiedSubscription?.isActive) ||
      Boolean(customerInfo?.entitlements?.active && Object.keys(customerInfo.entitlements.active).length > 0);

    if (customerInfo && !hasActiveEntitlement) {
      setState(PurchaseState.PENDING, { reason: 'entitlement_not_yet_active' });
      return {
        state: PurchaseState.PENDING,
        friendlyMessage: 'Google Play received your purchase. We are waiting for Pro access to be confirmed. Restore purchases or try again shortly.',
      };
    }

    // Idempotency: don't double-fire unlock
    if (wasRecentlySuccessful()) {
      log.purchase('flow:duplicate_suppressed', { featureKey });
      return { state: PurchaseState.SUCCESS };
    }

    markSuccess();
    const productId = pkg?.product?.identifier || pkg?.product?.productIdentifier || null;
    setState(PurchaseState.SUCCESS, { productId });
    return { state: PurchaseState.SUCCESS, productId, customerInfo };

  } catch (err) {
    const result = classifyError(err);
    log.purchase('flow:purchase_error', { err: err?.message, state: result.state });
    setState(result.state, { reason: err?.message });
    return result;
  }
}

/**
 * Execute restore purchases with full error classification.
 *
 * @param {object} options
 * @param {Function} options.onStateChange  - (state, meta) => void
 * @returns {Promise<{ state: PurchaseState, friendlyMessage?: string }>}
 */
export async function executeRestore({ onStateChange } = {}) {
  const setState = (state, meta = {}) => {
    log.purchase(`restore:${state.toLowerCase()}`, meta);
    onStateChange?.(state, meta);
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState(PurchaseState.OFFLINE);
    return { state: PurchaseState.OFFLINE, friendlyMessage: 'No internet connection. Connect to restore purchases.' };
  }

  log.purchase('restore:start');
  setState(PurchaseState.LOADING);

  let restorePurchases;
  try {
    const mod = await import('./purchases');
    restorePurchases = mod.restorePurchases;
  } catch {
    setState(PurchaseState.RC_UNAVAILABLE);
    return { state: PurchaseState.RC_UNAVAILABLE, friendlyMessage: 'Restore is only available in the Android app.' };
  }

  try {
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), PURCHASE_TIMEOUT_MS)
    );
    await Promise.race([restorePurchases(), timeout]);
    log.purchase('restore:success');
    setState(PurchaseState.SUCCESS);
    return { state: PurchaseState.SUCCESS };
  } catch (err) {
    const result = classifyRestoreError(err);
    log.purchase.warn('restore:failed', { err: err?.message?.slice(0, 80) });
    setState(result.state, { reason: err?.message?.slice(0, 80) });
    return result;
  }
}
