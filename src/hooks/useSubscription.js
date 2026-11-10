/**
 * useSubscription - RevenueCat-authoritative subscription status.
 *
 * Premium access is granted only from RevenueCat CustomerInfo. Firestore is a
 * read-only cache for display metadata written after successful validation.
 */
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import {
  isNativeAndroidRuntime,
  subscriptionStateFromCustomerInfo,
  syncCustomerInfo,
  SUBSCRIPTION_REFRESH_EVENT,
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

function formatCachedDisplayState(subscription) {
  const isAllowedSource =
    subscription?.source === 'revenuecat_webhook' ||
    subscription?.source === 'web_subscription' ||
    subscription?.source === 'web' ||
    subscription?.platform === 'web';

  if (!subscription || subscription.status !== 'active' || !isAllowedSource) {
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

  if (!expiryDate) {
    return INACTIVE_STATE;
  }

  const now = Date.now();

  // If expiry date is in the past (e.g. 1970-01-01 or expired date), subscription is EXPIRED
  if (expiryDate && expiryDate.getTime() <= now) {
    return INACTIVE_STATE;
  }

  return {
    isActive: true,
    planId: subscription?.planId || subscription?.productId || 'pro_monthly',
    productId: subscription?.productId || subscription?.planId || 'pro_monthly',
    expiryDate,
    purchaseDate: parseCachedDate(subscription?.purchaseDate),
    store: subscription?.store || (subscription?.platform === 'web' ? 'Web' : null),
    entitlementName: subscription?.entitlementName || 'pro',
    isTrial: Boolean(subscription?.isTrial),
    statusText: expiryDate ? 'Active' : 'No Expiry',
  };
}

export function useSubscription() {
  const { currentUser } = useAuth();
  const isNativeApp = isNativeAndroidRuntime();
  const uid = currentUser?.uid || null;
  const [subscription, setSubscription] = useState({
    ...INACTIVE_STATE,
    loading: true,
  });
  const [subscriptionUid, setSubscriptionUid] = useState(null);

  useEffect(() => {
    if (!uid) {
      setSubscriptionUid(null);
      setSubscription(INACTIVE_STATE);
      return undefined;
    }

    let cancelled = false;
    let appStateListener = null;
    setSubscriptionUid(uid);
    setSubscription({ ...INACTIVE_STATE, loading: true });
    const userRef = doc(db, 'users', uid);

    const syncFromRevenueCat = async () => {
      if (!isNativeApp) {
        setSubscription((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const customerInfo = await withTimeout(
          syncCustomerInfo(uid),
          REVENUECAT_SYNC_TIMEOUT_MS,
          null
        );
        if (cancelled) return;

        const nextState = customerInfo
          ? formatStateFromRevenueCat(customerInfo)
          : { ...INACTIVE_STATE, loading: false };

        setSubscription(nextState);
      } catch (error) {
        console.warn('[useSubscription] RevenueCat sync failed:', error?.message || error);
        if (!cancelled) setSubscription(INACTIVE_STATE);
      }
    };

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (cancelled) return;
        if (!snapshot.exists()) {
          if (!isNativeApp) setSubscription(INACTIVE_STATE);
          return;
        }

        const serverSubscription = snapshot.data()?.subscription;
        const isAllowedSource =
          serverSubscription?.source === 'revenuecat_webhook' ||
          serverSubscription?.source === 'web_subscription' ||
          serverSubscription?.source === 'web' ||
          serverSubscription?.platform === 'web';

        // A missing or legacy client-written cache must never erase a live
        // RevenueCat entitlement on Android. Web relies on web subscriptions or mirrors.
        if (!isAllowedSource) {
          if (!isNativeApp) setSubscription(INACTIVE_STATE);
          return;
        }

        const cached = formatCachedDisplayState(serverSubscription);
        setSubscription((prev) => ({
          ...prev,
          ...cached,
          loading: isNativeApp ? prev.loading : false,
        }));
      },
      (error) => {
        console.warn('[useSubscription] Cache read failed:', error?.message || error);
        if (!cancelled) setSubscription((prev) => ({ ...prev, loading: false }));
      }
    );

    syncFromRevenueCat();

    const refreshAfterPurchase = () => syncFromRevenueCat();
    if (typeof window !== 'undefined') {
      window.addEventListener(SUBSCRIPTION_REFRESH_EVENT, refreshAfterPurchase);
    }

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
      if (typeof window !== 'undefined') {
        window.removeEventListener(SUBSCRIPTION_REFRESH_EVENT, refreshAfterPurchase);
      }
      appStateListener?.remove?.();
    };
  }, [uid, isNativeApp]);

  if (subscriptionUid !== uid) {
    return {
      ...INACTIVE_STATE,
      loading: Boolean(uid),
    };
  }

  return subscription;
}
