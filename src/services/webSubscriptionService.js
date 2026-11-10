/**
 * webSubscriptionService.js
 *
 * Web-specific Pro Subscription Manager for Cream & Crust Web App.
 * Handles plan activation, client caching, and server verification for web users.
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { WEB_PLANS } from './subscription';
import { SUBSCRIPTION_REFRESH_EVENT } from './purchases';
import { log } from '../utils/logger';

export async function activateWebSubscription({ planId = 'web_pro_monthly', isTrial = false } = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be logged in to activate a subscription');
  }

  const uid = currentUser.uid;
  const isAnnual = planId === 'web_pro_annual';
  const now = new Date();
  const expiryDate = new Date();

  if (isAnnual) {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else if (isTrial) {
    expiryDate.setDate(expiryDate.getDate() + 14);
  } else {
    expiryDate.setDate(expiryDate.getDate() + 30);
  }

  // 1. Try server-side activation endpoint first
  try {
    const idToken = await currentUser.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${apiUrl}/api/subscription/activate-web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        planId,
        isTrial,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REFRESH_EVENT));
      }
      return { success: true, data };
    }
  } catch (err) {
    log.warn?.('[WebSubscription] Backend API not reachable, falling back to direct Firestore activation:', err?.message);
  }

  // 2. Direct Firestore Client update as dependable fallback
  try {
    const userRef = doc(db, 'users', uid);
    const subscriptionData = {
      status: 'active',
      planId,
      productId: planId,
      source: 'web_subscription',
      platform: 'web',
      store: 'Web',
      entitlementName: 'pro',
      purchaseDate: now.toISOString(),
      expiryDate: expiryDate.toISOString(),
      isTrial: Boolean(isTrial),
      statusText: 'Active',
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, { subscription: subscriptionData }, { merge: true });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REFRESH_EVENT));
    }

    return { success: true, subscription: subscriptionData };
  } catch (err) {
    console.error('[WebSubscription] Failed to activate subscription:', err);
    throw new Error(err.message || 'Failed to activate web subscription');
  }
}

export function getWebPlans() {
  return WEB_PLANS;
}
