import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSubscription() {
      if (!currentUser) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // Admins are always on a lifetime free plan
      if (isAdmin) {
        setSubscription({
          plan: 'lifetime',
          status: 'active',
          trialEnds: null,
          isFreeTrial: false,
          features: ['all']
        });
        setLoading(false);
        return;
      }

      try {
        const subRef = doc(db, "subscriptions", currentUser.uid);
        const subSnap = await getDoc(subRef);

        if (subSnap.exists()) {
          const data = subSnap.data();
          const now = new Date();
          const trialEnds = data.trialEnds?.toDate ? data.trialEnds.toDate() : new Date(data.trialEnds);
          const isTrialActive = trialEnds && now < trialEnds;
          
          const daysRemaining = trialEnds ? Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)) : 0;

          setSubscription({
            ...data,
            trialEnds,
            isTrialActive,
            daysRemaining: Math.max(0, daysRemaining),
            isExpired: data.status === 'expired' || (!isTrialActive && data.plan === 'trial')
          });
        } else {
          // Initialize 7-day free trial for new users (Strict requirement)
          const trialEnds = new Date();
          trialEnds.setDate(trialEnds.getDate() + 7);

          const newSub = {
            plan: 'trial',
            status: 'active',
            trialEnds: trialEnds,
            createdAt: serverTimestamp(),
            isFreeTrial: true
          };

          await setDoc(subRef, newSub);
          setSubscription({ ...newSub, isTrialActive: true, isExpired: false, daysRemaining: 7 });
        }
      } catch (error) {
        console.error("Subscription check error:", error);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [currentUser, isAdmin]);

  const value = {
    subscription,
    loading,
    isPro: subscription?.plan === 'pro' || isAdmin,
    isTrial: subscription?.plan === 'trial' && subscription?.isTrialActive,
    isExpired: !isAdmin && subscription?.isExpired,
    daysRemaining: subscription?.daysRemaining || 0,
    // Access is blocked if the trial has expired and the user hasn't upgraded to pro
    isBlocked: !isAdmin && subscription?.plan === 'trial' && subscription?.isExpired
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);

