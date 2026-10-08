/**
 * usePurchases.js - React hook for Google Play Billing via RevenueCat with seamless fallback.
 *
 * Exposes:
 *   offering        - current RevenueCat offering (packages to display)
 *   offeringsLoading- true while offerings are loading
 *   purchasing      - true while a purchase/restore is in flight
 *   purchase(pkg, planId) - launch Google Play billing or activate subscription
 *   restore()       - restore previous purchases
 *   isNativeApp     - true on native Android build
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getOfferings,
  initPurchases,
  isNativeAndroidRuntime,
  purchasePackage,
  restorePurchases,
  subscriptionStateFromCustomerInfo,
} from '../services/purchases';
import { showToast, triggerHaptic } from '../components/iOS';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { triggerConfetti } from '../components/DopamineKit';

function buildSubscriptionCache(state, auditField) {
  return {
    subscription: {
      status: 'active',
      productId: state.productId || 'pro_monthly',
      planId: state.planId || 'pro_monthly',
      purchaseDate: state.purchaseDate || new Date().toISOString(),
      expiryDate: state.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      store: state.store || 'google_play',
      entitlementName: state.entitlementName || 'pro',
      source: 'revenuecat_customer_info',
      lastSync: serverTimestamp(),
      [auditField]: serverTimestamp(),
    },
  };
}

export function usePurchases() {
  const { currentUser } = useAuth();
  const [offering, setOffering] = useState(null);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const isNativeApp = isNativeAndroidRuntime();

  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;

    setOfferingsLoading(true);
    initPurchases(currentUser.uid)
      .then(() => getOfferings())
      .then((currentOffering) => {
        if (!cancelled) setOffering(currentOffering);
      })
      .catch((e) => console.warn('[usePurchases] getOfferings:', e.message))
      .finally(() => {
        if (!cancelled) setOfferingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const purchase = useCallback(
    async (pkg, fallbackPlanId = 'pro_monthly') => {
      if (!currentUser?.uid) {
        showToast('Please log in first', 'error');
        return false;
      }

      if (!isNativeApp) {
        showToast('Subscriptions are processed inside the Cream & Crust Android app.', 'info');
        return false;
      }

      if (!pkg) {
        showToast('Subscription plans are temporarily unavailable. Please try again.', 'error');
        return false;
      }

      setPurchasing(true);
      try {
        triggerHaptic('light');

        const customerInfo = await purchasePackage(pkg);
        const subscriptionState = subscriptionStateFromCustomerInfo(customerInfo);

        if (subscriptionState.isActive) {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            buildSubscriptionCache(subscriptionState, 'purchasedAt'),
            { merge: true }
          );
          triggerHaptic('success');
          try { triggerConfetti(); } catch (_) {}
          showToast('🎉 Welcome to Cream & Crust Pro!', 'success');
          return true;
        } else {
          showToast('Purchase completed but entitlement is not active. Please try restoring.', 'warn');
          return false;
        }
      } catch (e) {
        const cancelled = e?.message?.includes('cancel') || e?.message?.includes('cancelled') || e?.code === 'PURCHASE_CANCELLED';
        if (cancelled) {
          showToast('Purchase cancelled', 'info');
          return false;
        }
        showToast(e?.message || 'Purchase failed. Please try again.', 'error');
        triggerHaptic('error');
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [currentUser, isNativeApp]
  );

  const restore = useCallback(async () => {
    if (!currentUser?.uid) {
      showToast('Please log in first', 'error');
      return false;
    }

    if (!isNativeApp) {
      showToast('Restore is available in the Android app.', 'info');
      return false;
    }

    setPurchasing(true);
    try {
      triggerHaptic('light');
      const customerInfo = await restorePurchases();
      const subscriptionState = subscriptionStateFromCustomerInfo(customerInfo);

      if (subscriptionState.isActive) {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          buildSubscriptionCache(subscriptionState, 'restoredAt'),
          { merge: true }
        );
        triggerHaptic('success');
        showToast('Subscription restored! Welcome to Pro', 'success');
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
  }, [currentUser, isNativeApp]);

  return {
    offering,
    offeringsLoading,
    purchasing,
    purchase,
    restore,
    isNativeApp,
  };
}
