/**
 * useSubscription — real-time subscription status from Firestore.
 *
 * Listens to users/{uid}.subscription via onSnapshot so the UI updates
 * instantly when RevenueCat's webhook writes a new status.
 *
 * Handles BOTH data formats:
 *   - RevenueCat webhook:  { status: 'active', expiryDate: Timestamp }
 *   - Firestore trial:     { trialStart, trialEnd, plan: 'trial' }
 *   - Legacy activateSubscription: { subscribedAt, expiresAt }
 */
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export function useSubscription() {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState({
    isActive: false,
    planId: null,
    expiryDate: null,
    isTrial: false,
    loading: true,
  });

  useEffect(() => {
    if (!currentUser) {
      setSubscription({ isActive: false, planId: null, expiryDate: null, isTrial: false, loading: false });
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const sub = data.subscription || {};
        const now = new Date();

        // ── Format 1: RevenueCat webhook / usePurchases provisional write ──
        // { status: 'active', expiryDate: Timestamp|Date, planId, store }
        if (sub.status) {
          const expiry = sub.expiryDate?.toDate
            ? sub.expiryDate.toDate()
            : sub.expiryDate
              ? new Date(sub.expiryDate)
              : null;

          const isActive = sub.status === 'active' && (!expiry || expiry > now);

          setSubscription({
            isActive: !!isActive,
            planId: sub.planId || null,
            expiryDate: expiry,
            isTrial: false,
            loading: false,
          });
          return;
        }

        // ── Format 2: Firestore trial (startFreeTrial) ──
        // { trialStart, trialEnd, plan: 'trial' }
        if (sub.trialStart && !sub.subscribedAt) {
          const trialEnd = new Date(sub.trialEnd || sub.trialStart);
          if (!sub.trialEnd) {
            trialEnd.setDate(trialEnd.getDate() + 90); // 3 months
          }
          const isTrial = now < trialEnd;

          setSubscription({
            isActive: isTrial,
            planId: 'trial',
            expiryDate: trialEnd,
            isTrial: true,
            loading: false,
          });
          return;
        }

        // ── Format 3: Legacy activateSubscription ──
        // { subscribedAt, expiresAt }
        if (sub.subscribedAt) {
          const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
          const isActive = expiresAt ? now < expiresAt : true;

          setSubscription({
            isActive: !!isActive,
            planId: 'pro',
            expiryDate: expiresAt,
            isTrial: false,
            loading: false,
          });
          return;
        }

        // No subscription data at all
        setSubscription({
          isActive: false,
          planId: null,
          expiryDate: null,
          isTrial: false,
          loading: false,
        });
      } else {
        setSubscription(prev => ({ ...prev, loading: false }));
      }
    }, (error) => {
      console.error("Failed to fetch subscription status", error);
      setSubscription(prev => ({ ...prev, loading: false }));
    });

    return () => unsubscribe();
  }, [currentUser]);

  return subscription;
}
