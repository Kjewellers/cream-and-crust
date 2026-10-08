/**
 * purchases.js — Hardened RevenueCat + Google Play Billing Integration
 *
 * Phase 6 Architectural Enhancements:
 * - Non-blocking lazy initialization
 * - Offline Offerings & CustomerInfo caching
 * - Retry with exponential backoff for network resilience
 * - Play Store Billing Error translation to friendly user messages
 * - Entitlement state machine & purchase restoration
 */

import { Capacitor } from '@capacitor/core';
import { log } from '../utils/logger';

const RC_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY;
const ENTITLEMENT_NAMES = ['pro', 'premium'];
const OFFERINGS_CACHE_KEY = 'cc_cached_rc_offerings';
const CUSTOMER_INFO_CACHE_KEY = 'cc_cached_customer_info';

export const isNativeAndroidRuntime = () => {
  try {
    const platform = Capacitor.getPlatform?.();
    if (Capacitor.isNativePlatform?.() && platform === 'android') return true;

    const nativeBridge = typeof window !== 'undefined' ? window.Capacitor : null;
    return nativeBridge?.isNativePlatform?.() === true &&
      nativeBridge?.getPlatform?.() === 'android';
  } catch {
    return false;
  }
};

let _Purchases = null;
let _configuredUid = null;

export const INIT_STATE = Object.freeze({
  UNINITIALIZED: 'UNINITIALIZED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  FAILED: 'FAILED',
});

let _initState = INIT_STATE.UNINITIALIZED;
let _initError = null;

export function getPurchasesInitState() {
  return { state: _initState, error: _initError, configuredUid: _configuredUid };
}

async function getPlugin() {
  if (!isNativeAndroidRuntime()) return null;
  if (_Purchases) return _Purchases;
  try {
    const mod = await import('./billingPlugin');
    _Purchases = mod.BillingPlugin;
    return _Purchases;
  } catch (e) {
    log.purchase.warn('Billing Capacitor plugin not available:', e.message);
    return null;
  }
}

/**
 * Retries an async function with exponential backoff.
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Initialize RevenueCat with user UID. Idempotent & non-blocking.
 */
export async function initPurchases(uid) {
  if (!isNativeAndroidRuntime()) {
    _initState = INIT_STATE.UNINITIALIZED;
    return false;
  }
  if (!RC_API_KEY) {
    _initState = INIT_STATE.FAILED;
    _initError = 'Missing RevenueCat API Key';
    log.purchase.warn('RevenueCat API key missing');
    return false;
  }
  if (!uid) {
    return false;
  }

  if (_configuredUid === uid && _initState === INIT_STATE.READY) {
    return true;
  }

  _initState = INIT_STATE.INITIALIZING;
  _initError = null;

  try {
    const Purchases = await getPlugin();
    if (!Purchases) {
      _initState = INIT_STATE.FAILED;
      _initError = 'Billing Plugin Not Available';
      return false;
    }

    if (_configuredUid && _configuredUid !== uid) {
      await Purchases.login({ appUserId: uid });
      _configuredUid = uid;
      _initState = INIT_STATE.READY;
      log.purchase('RevenueCat user switched:', uid);
      return true;
    }

    await Purchases.initialize({
      apiKey: RC_API_KEY,
      appUserId: uid,
    });

    _configuredUid = uid;
    _initState = INIT_STATE.READY;
    log.purchase('RevenueCat configured for UID:', uid);
    return true;
  } catch (e) {
    _initState = INIT_STATE.FAILED;
    _initError = e.message || 'Initialization Exception';
    log.purchase.warn('RevenueCat init failed:', e.message);
    return false;
  }
}

function parseRevenueCatDate(value, millisValue) {
  if (typeof millisValue === 'number' && millisValue > 0) {
    const date = new Date(millisValue);
    if (!Number.isNaN(date.getTime()) && date.getTime() > 0) return date;
  }
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return null;
  return date;
}

export function getVerifiedEntitlement(customerInfo) {
  const entitlements = customerInfo?.entitlements;
  if (!entitlements) return null;

  const now = Date.now();

  for (const name of ENTITLEMENT_NAMES) {
    const activeEntitlement = entitlements.active?.[name];
    if (activeEntitlement?.isActive === true) {
      const exp = parseRevenueCatDate(
        activeEntitlement.expirationDate,
        activeEntitlement.expirationDateMillis
      );
      if (!exp || exp.getTime() > now) {
        return { name, entitlement: activeEntitlement };
      }
    }

    const entitlement = entitlements.all?.[name];
    if (entitlement?.isActive === true) {
      const exp = parseRevenueCatDate(
        entitlement.expirationDate,
        entitlement.expirationDateMillis
      );
      if (!exp || exp.getTime() > now) {
        return { name, entitlement };
      }
    }
  }
  return null;
}

export function subscriptionStateFromCustomerInfo(customerInfo) {
  const verified = getVerifiedEntitlement(customerInfo);

  if (!verified) {
    return {
      isActive: false,
      planId: null,
      expiryDate: null,
      purchaseDate: null,
      store: null,
      entitlementName: null,
      productId: null,
      periodType: null,
    };
  }

  const { name, entitlement } = verified;
  const expiryDate = parseRevenueCatDate(entitlement.expirationDate, entitlement.expirationDateMillis);

  // If expiry date is in the past (or 1970), subscription is NOT active
  if (expiryDate && expiryDate.getTime() <= Date.now()) {
    return {
      isActive: false,
      planId: null,
      expiryDate: null,
      purchaseDate: null,
      store: null,
      entitlementName: null,
      productId: null,
      periodType: null,
    };
  }

  return {
    isActive: true,
    planId: entitlement.productIdentifier || null,
    expiryDate,
    purchaseDate: parseRevenueCatDate(
      entitlement.latestPurchaseDate || entitlement.originalPurchaseDate,
      entitlement.latestPurchaseDateMillis || entitlement.originalPurchaseDateMillis
    ),
    store: entitlement.store || null,
    entitlementName: name,
    productId: entitlement.productIdentifier || null,
    periodType: entitlement.periodType || null,
  };
}

export async function syncCustomerInfo(uid) {
  const initialized = await initPurchases(uid);
  if (!initialized) return null;
  return getCustomerInfo();
}

/**
 * Get CustomerInfo with cached offline fallback.
 */
export async function getCustomerInfo() {
  const Purchases = await getPlugin();
  if (!Purchases) {
    const cached = localStorage.getItem(CUSTOMER_INFO_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }

  try {
    const customerInfo = await retryWithBackoff(async () => {
      const res = await Purchases.getCustomerInfo();
      return res.customerInfo;
    });

    if (customerInfo) {
      localStorage.setItem(CUSTOMER_INFO_CACHE_KEY, JSON.stringify(customerInfo));
    }
    return customerInfo;
  } catch (err) {
    log.purchase.warn('Failed to fetch live CustomerInfo, using cache:', err.message);
    const cached = localStorage.getItem(CUSTOMER_INFO_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }
}

/**
 * Fetch offerings with exponential backoff & offline fallback caching.
 */
export async function getOfferings() {
  if (!isNativeAndroidRuntime() || !RC_API_KEY) return getCachedOfferings();

  try {
    const Purchases = await getPlugin();
    if (!Purchases) return getCachedOfferings();

    const offerings = await retryWithBackoff(async () => {
      const res = await Purchases.getOfferings();
      return res.current ?? null;
    });

    if (offerings) {
      localStorage.setItem(OFFERINGS_CACHE_KEY, JSON.stringify(offerings));
    }
    return offerings || getCachedOfferings();
  } catch (e) {
    log.purchase.warn('getOfferings live fetch failed, fallback to cache:', e.message);
    return getCachedOfferings();
  }
}

function getCachedOfferings() {
  try {
    const raw = localStorage.getItem(OFFERINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Formats RevenueCat / Google Play errors into user-friendly messages.
 */
export function formatBillingError(error) {
  if (!error) return 'An unknown billing error occurred.';
  const msg = error.message || String(error);

  if (msg.includes('userCancelled') || msg.includes('User cancelled')) {
    return 'Purchase cancelled.';
  }
  if (msg.includes('network') || msg.includes('Network')) {
    return 'Network connection issue. Please check your internet and try again.';
  }
  if (msg.includes('Billing Unavailable') || msg.includes('billingUnavailable')) {
    return 'Google Play Store billing is currently unavailable on this device.';
  }
  if (msg.includes('alreadyOwned') || msg.includes('Already Owned')) {
    return 'You already own this subscription. Try restoring purchases.';
  }
  return msg || 'Google Play Store purchase failed. Please try again.';
}

/**
 * Purchase package with error translation.
 */
export async function purchasePackage(pkg) {
  const Purchases = await getPlugin();
  if (!Purchases) throw new Error('Billing is only available on the Android app.');

  try {
    const { customerInfo, userCancelled, code, message } = await Purchases.purchase({ packageId: pkg.identifier });
    if (userCancelled) {
       const err = new Error('User cancelled purchase');
       err.code = 'PURCHASE_CANCELLED';
       throw err;
    }
    if (customerInfo) {
      localStorage.setItem(CUSTOMER_INFO_CACHE_KEY, JSON.stringify(customerInfo));
    }
    return customerInfo;
  } catch (err) {
    if (err.code === 'PURCHASE_CANCELLED') throw err;
    throw new Error(formatBillingError(err));
  }
}

/**
 * Restore past purchases.
 */
export async function restorePurchases() {
  const Purchases = await getPlugin();
  if (!Purchases) throw new Error('Restore is only available on the Android app.');

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    if (customerInfo) {
      localStorage.setItem(CUSTOMER_INFO_CACHE_KEY, JSON.stringify(customerInfo));
    }
    return customerInfo;
  } catch (err) {
    throw new Error(formatBillingError(err));
  }
}

export function hasProEntitlement(customerInfo) {
  return !!getVerifiedEntitlement(customerInfo);
}

export const isNativeAndroid = isNativeAndroidRuntime();
