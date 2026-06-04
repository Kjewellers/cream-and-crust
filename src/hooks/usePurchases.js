/**
 * usePurchases.js — React hook for Google Play Billing via RevenueCat.
 *
 * Exposes:
 *   offering      — the current RevenueCat offering (packages to display)
 *   purchasing    — true while a purchase/restore is in flight
 *   purchase(pkg) — launch the Google Play billing sheet
 *   restore()     — restore previous purchases
 *   isNativeApp   — true only on the native Android build
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isNativeAndroid,
} from '../services/purchases';
import { showToast, triggerHaptic } from '../components/iOS';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export function usePurchases() {
  const { currentUser } = useAuth();
  const [offering, setOffering] = useState(null);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch offerings once on mount (native only — no-ops on web)
  useEffect(() => {
    if (!isNativeAndroid) return;
    setOfferingsLoading(true);
    getOfferings()
      .then(setOffering)
      .catch((e) => console.warn('[usePurchases] getOfferings:', e.message))
      .finally(() => setOfferingsLoading(false));
  }, []);

  /**
   * Launch Google Play billing sheet for the given package.
   * On success, writes a provisional entitlement to Firestore immediately
   * (the RevenueCat webhook will overwrite it with the authoritative value).
   */
  const purchase = useCallback(
    async (pkg) => {
      if (!currentUser?.uid) {
        showToast('Please log in first', 'error');
        return false;
      }
      setPurchasing(true);
      try {
        triggerHaptic('light');
        const customerInfo = await purchasePackage(pkg);
        const isActive = !!customerInfo?.entitlements?.active?.['pro'];

        if (isActive) {
          // Write provisional subscription to Firestore.
          // RevenueCat webhook (Cloud Function) will overwrite this with the
          // authoritative server-side record within a few seconds.
          const expiryMs = customerInfo.entitlements.active['pro'].expirationDate;
          await updateDoc(doc(db, 'users', currentUser.uid), {
            subscription: {
              status: 'active',
              planId: pkg.identifier,
              expiryDate: expiryMs ? new Date(expiryMs) : null,
              purchasedAt: serverTimestamp(),
              source: 'google_play',
            },
          });
          triggerHaptic('success');
          showToast('Welcome to Pro! 🎉', 'success');
          return true;
        } else {
          showToast('Purchase completed but entitlement not found. Restoring...', 'info');
          return false;
        }
      } catch (e) {
        const cancelled =
          e?.message?.includes('cancel') ||
          e?.code === '1' ||
          e?.underlyingErrorMessage?.includes('cancel');
        if (!cancelled) {
          showToast(e?.message || 'Purchase failed. Please try again.', 'error');
          triggerHaptic('error');
        }
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [currentUser]
  );

  /**
   * Restore previous purchases (required by Play Store policy).
   */
  const restore = useCallback(async () => {
    if (!currentUser?.uid) return false;
    setPurchasing(true);
    try {
      triggerHaptic('light');
      const customerInfo = await restorePurchases();
      const isActive = !!customerInfo?.entitlements?.active?.['pro'];

      if (isActive) {
        const expiryMs = customerInfo.entitlements.active['pro'].expirationDate;
        await updateDoc(doc(db, 'users', currentUser.uid), {
          subscription: {
            status: 'active',
            planId: 'pro_monthly',
            expiryDate: expiryMs ? new Date(expiryMs) : null,
            restoredAt: serverTimestamp(),
            source: 'google_play_restore',
          },
        });
        triggerHaptic('success');
        showToast('Subscription restored! Welcome back 🎉', 'success');
        return true;
      } else {
        showToast('No active subscription found to restore.', 'info');
        return false;
      }
    } catch (e) {
      showToast(e?.message || 'Restore failed. Please try again.', 'error');
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [currentUser]);

  return {
    offering,
    offeringsLoading,
    purchasing,
    purchase,
    restore,
    isNativeApp: isNativeAndroid,
  };
}
