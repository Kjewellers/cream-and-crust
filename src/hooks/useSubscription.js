/**
 * useSubscription - RevenueCat-authoritative subscription status.
 *
 * Premium access is granted only from RevenueCat CustomerInfo. Firestore is a
 * read-only cache for display metadata written after successful validation.
 */
import { useState, useEffect } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import {
  isNativeAndroidRuntime,
  subscriptionStateFromCustomerInfo,
  syncCustomerInfo,
} from '../services/purchases';

const INACTIVE_STATE = {
  isActive: false,
  planId: null,
  productId: null,
  expiryDate: null,
  purchaseDate: null,
  store: null,
  entitlementName: null,
  isTrial: false,
  statusText: 'Not Subscribed',
  loading: false,
};
const REVENUECAT_SYNC_TIMEOUT_MS = 8000;

function withTimeout(promise, timeoutMs, fallbackValue) {
  let timerId;
  const timeout = new Promise((resolve) => {
    timerId = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timerId);
  });
}

function parseCachedDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && value <= 0) return null;

  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return null;
  return date;
}

function formatStateFromRevenueCat(customerInfo) {
  const state = subscriptionStateFromCustomerInfo(customerInfo);

  if (!state.isActive) {
    return INACTIVE_STATE;
  }

  // If expiry date is in the past (e.g. 1970-01-01), user is NOT subscribed
  if (state.expiryDate && state.expiryDate.getTime() <= Date.now()) {
    return INACTIVE_STATE;
  }

  return {
    ...state,
    isTrial: state.periodType === 'TRIAL',
    statusText: state.expiryDate ? 'Active' : 'No Expiry',
    loading: false,
  };
}

function formatCacheForFirestore(state) {
  return {
    subscription: {
      status: state.isActive ? 'active' : 'not_subscribed',
      productId: state.productId,
      planId: state.planId,
      purchaseDate: state.purchaseDate,
      expiryDate: state.expiryDate,
      store: state.store,
      entitlementName: state.entitlementName,
      source: 'revenuecat_customer_info',
      lastSync: serverTimestamp(),
    },
  };
}

function formatCachedDisplayState(subscription, userRef = null) {
  if (!subscription || subscription.status !== 'active' || subscription.source === 'direct_activation') {
    return INACTIVE_STATE;
  }

  let expiryDate = null;
  const rawExp = subscription.expiryDate;
  if (rawExp) {
    const d = rawExp?.toDate ? rawExp.toDate() : new Date(rawExp);
    if (!Number.isNaN(d.getTime())) {
      expiryDate = d;
    }
  }

  const now = Date.now();

  // If expiry date is in the past (e.g. 1970-01-01 or expired date), subscription is EXPIRED
  if (expiryDate && expiryDate.getTime() <= now) {
    if (userRef) {
      setDoc(userRef, { subscription: { status: 'not_subscribed', lastSync: serverTimestamp() } }, { merge: true }).catch(() => {});
    }
    return INACTIVE_STATE;
  }

  return {
    isActive: true,
    planId: subscription?.planId || subscription?.productId || 'pro_monthly',
    productId: subscription?.productId || subscription?.planId || 'pro_monthly',
    expiryDate,
    purchaseDate: parseCachedDate(subscription?.purchaseDate),
    store: subscription?.store || null,
    entitlementName: subscription?.entitlementName || 'pro',
    statusText: expiryDate ? 'Active' : 'No Expiry',
  };
}

export function useSubscription() {
  const { currentUser } = useAuth();
  const isNativeApp = isNativeAndroidRuntime();
  const [subscription, setSubscription] = useState({
    ...INACTIVE_STATE,
    loading: true,
  });

  useEffect(() => {
    if (!currentUser?.uid) {
      setSubscription(INACTIVE_STATE);
      return undefined;
    }

    let cancelled = false;
    let appStateListener = null;
    const userRef = doc(db, 'users', currentUser.uid);

    const syncFromRevenueCat = async () => {
      if (!isNativeApp) {
        setSubscription((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const customerInfo = await withTimeout(
          syncCustomerInfo(currentUser.uid),
          REVENUECAT_SYNC_TIMEOUT_MS,
          null
        );
        if (cancelled) return;

        const nextState = customerInfo
          ? formatStateFromRevenueCat(customerInfo)
          : { ...INACTIVE_STATE, loading: false };

        setSubscription(nextState);
        if (customerInfo) {
          await setDoc(userRef, formatCacheForFirestore(nextState), { merge: true });
        }
      } catch (error) {
        console.warn('[useSubscription] RevenueCat sync failed:', error?.message || error);
        if (!cancelled) setSubscription(INACTIVE_STATE);
      }
    };

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const cached = formatCachedDisplayState(snapshot.data()?.subscription || {}, userRef);
        setSubscription((prev) => ({
          ...prev,
          ...cached,
          loading: isNativeApp ? prev.loading : false,
        }));
      },
      (error) => {
        console.warn('[useSubscription] Cache read failed:', error?.message || error);
        setSubscription((prev) => ({ ...prev, loading: false }));
      }
    );

    syncFromRevenueCat();

    if (isNativeApp) {
      import('@capacitor/app')
        .then(({ App: CapacitorApp }) =>
          CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) syncFromRevenueCat();
          })
        )
        .then((listener) => {
          appStateListener = listener;
        })
        .catch((error) => {
          console.warn('[useSubscription] App listener failed:', error?.message || error);
        });
    }

    return () => {
      cancelled = true;
      unsubscribe();
      appStateListener?.remove?.();
    };
  }, [currentUser?.uid, isNativeApp]);

  return subscription;
}
