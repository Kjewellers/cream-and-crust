/**
 * purchases.js — RevenueCat + Google Play Billing integration.
 *
 * On native Android (Capacitor): uses the real @revenuecat/purchases-capacitor plugin.
 * On web / PWA: silently no-ops so the rest of the app works unchanged.
 *
 * Flow:
 *   1. initPurchases(uid) — call once after the user logs in (AuthContext).
 *   2. getOfferings()     — fetch available plans from RevenueCat.
 *   3. purchasePackage(pkg) — launch the native Google Play billing sheet.
 *   4. restorePurchases()   — sync past purchases (required by Play Store policy).
 *
 * After a successful purchase, RevenueCat fires a webhook to our Firebase Cloud
 * Function which writes the entitlement to Firestore. The useSubscription hook
 * picks that up via onSnapshot and updates the UI instantly.
 */

import { Capacitor } from '@capacitor/core';

// RevenueCat public API key — set VITE_REVENUECAT_API_KEY in .env
// (get it from app.revenuecat.com → Project → API Keys → Public)
const RC_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY;

const isNative = Capacitor.isNativePlatform();

/**
 * Lazily import the Capacitor plugin only on native.
 * On web this import is never executed so no bundle bloat.
 */
let _Purchases = null;
async function getPlugin() {
  if (!isNative) return null;
  if (_Purchases) return _Purchases;
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    _Purchases = mod.Purchases;
    return _Purchases;
  } catch (e) {
    console.warn('[purchases] Plugin not available:', e.message);
    return null;
  }
}

/**
 * Initialize RevenueCat with the logged-in user's Firebase UID.
 * Call this once in AuthContext after the user is confirmed.
 *
 * @param {string} uid — Firebase Auth UID
 */
export async function initPurchases(uid) {
  if (!isNative || !RC_API_KEY) return;
  try {
    const Purchases = await getPlugin();
    if (!Purchases) return;

    await Purchases.configure({
      apiKey: RC_API_KEY,
      appUserID: uid, // tie RevenueCat identity to Firebase UID
    });

    console.log('[purchases] RevenueCat initialized for user:', uid);
  } catch (e) {
    console.warn('[purchases] init failed:', e.message);
  }
}

/**
 * Fetch the current offering from RevenueCat.
 * Returns the "default" offering with its packages, or null on web.
 *
 * @returns {Promise<import('@revenuecat/purchases-capacitor').PurchasesOffering|null>}
 */
export async function getOfferings() {
  if (!isNative || !RC_API_KEY) return null;
  try {
    const Purchases = await getPlugin();
    if (!Purchases) return null;

    const { offerings } = await Purchases.getOfferings();
    return offerings?.current ?? null;
  } catch (e) {
    console.warn('[purchases] getOfferings failed:', e.message);
    return null;
  }
}

/**
 * Purchase a specific package. Launches the native Google Play billing sheet.
 * Throws on cancellation or failure so the caller can show an error.
 *
 * @param {import('@revenuecat/purchases-capacitor').PurchasesPackage} pkg
 * @returns {Promise<import('@revenuecat/purchases-capacitor').CustomerInfo>}
 */
export async function purchasePackage(pkg) {
  const Purchases = await getPlugin();
  if (!Purchases) throw new Error('Billing is only available on the Android app.');

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return customerInfo;
}

/**
 * Restore past purchases. Required by Google Play Store policy.
 * Should be accessible from the subscription screen.
 *
 * @returns {Promise<import('@revenuecat/purchases-capacitor').CustomerInfo>}
 */
export async function restorePurchases() {
  const Purchases = await getPlugin();
  if (!Purchases) throw new Error('Restore is only available on the Android app.');

  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}

/**
 * Check if a customerInfo object has an active "pro" entitlement.
 * Convenience helper used by the webhook Cloud Function response.
 *
 * @param {import('@revenuecat/purchases-capacitor').CustomerInfo} customerInfo
 * @returns {boolean}
 */
export function hasProEntitlement(customerInfo) {
  return !!customerInfo?.entitlements?.active?.['pro'];
}

/**
 * Returns true if we're running inside the native Android app.
 * Used by UI components to show/hide billing-specific elements.
 */
export const isNativeAndroid = isNative && Capacitor.getPlatform() === 'android';
