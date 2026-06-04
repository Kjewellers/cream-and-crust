import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserRole, logoutUser, getOnboardingStatus, completeOnboarding } from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cc_currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [userRole, setUserRole] = useState(() => localStorage.getItem('cc_userRole') || null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [business, setBusiness] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [hasSeenTourV1, setHasSeenTourV1] = useState(true);
  const [loading, setLoading] = useState(true);

  // Track which UID we most recently fetched data for — used to detect
  // account switches so we can purge stale state immediately.
  const lastLoadedUid = useRef(null);

  useEffect(() => {
    // ── Timeout helper ─────────────────────────────────────────────────────────
    // Wrap a promise with a max-wait timeout so a hung Firestore read
    // (App Check rejection, no network) never freezes the splash screen.
    // Reduced to 4s because reads now run in PARALLEL, not sequentially.
    const withTimeout = (promise, ms = 4000, fallback) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    console.log('[AuthContext] Attaching onAuthStateChanged listener');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const t0 = Date.now();
      console.log('[AuthContext] onAuthStateChanged fired:', user ? `uid=${user.uid}` : 'null (signed out)');

      try {
        const onPublicRoute =
          typeof window !== 'undefined' &&
          (window.location?.pathname?.startsWith('/menu/') ||
            window.location?.pathname?.startsWith('/order/'));

        // ── Anonymous user cleanup ─────────────────────────────────────────────
        if (user?.isAnonymous && !onPublicRoute) {
          console.log('[AuthContext] Cleaning up anonymous user');
          try { await user.delete?.(); } catch (_) { /* ignore */ }
          localStorage.removeItem('cc_currentUser');
          localStorage.removeItem('cc_userRole');
          setCurrentUser(null);
          setUserRole(null);
          setBusiness(null);
          setUserDetails(null);
          setOnboardingCompleted(true);
          setLoading(false);
          return;
        }

        if (user) {
          // ── Account-switch detection ───────────────────────────────────────────
          // If a DIFFERENT user than the previously cached one just signed in,
          // purge all state atoms immediately so no stale data is shown.
          if (lastLoadedUid.current && lastLoadedUid.current !== user.uid) {
            console.warn('[AuthContext] Account switch detected! Purging stale state.',
              'old:', lastLoadedUid.current, '→ new:', user.uid);
            setBusiness(null);
            setUserDetails(null);
            setUserRole(null);
          }
          lastLoadedUid.current = user.uid;

          setCurrentUser(user);
          localStorage.setItem(
            'cc_currentUser',
            JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            })
          );

          // ── Parallel Firestore reads ───────────────────────────────────────────
          // OLD: 4 sequential awaits with 6s each = up to 24s splash screen hang
          // NEW: all 4 fire simultaneously — total wait = max(r1, r2, r3, r4) ≈ 4s
          console.log('[AuthContext] Starting parallel Firestore reads for uid:', user.uid);
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');

          const [roleResult, uDoc, bizDoc, onboardingResult] = await Promise.all([
            withTimeout(getUserRole(user.uid), 4000, 'admin'),
            withTimeout(getDoc(doc(db, 'users', user.uid)), 4000, { exists: () => false }),
            withTimeout(getDoc(doc(db, 'business', user.uid)), 4000, { exists: () => false }),
            withTimeout(getOnboardingStatus(user.uid), 4000, true),
          ]);

          console.log('[AuthContext] Parallel reads done in', Date.now() - t0, 'ms — role:', roleResult);

          setUserRole(roleResult);
          localStorage.setItem('cc_userRole', roleResult);

          if (uDoc.exists()) setUserDetails(uDoc.data());

          if (bizDoc.exists()) {
            setBusiness({ id: bizDoc.id, ...bizDoc.data() });
          } else {
            setBusiness({ id: user.uid, name: '', logo: '' });
          }

          setOnboardingCompleted(onboardingResult);

          const userData = uDoc.exists() ? uDoc.data() : {};
          setHasSeenTourV1(userData?.hasSeenTourV1 || userData?.onboardingComplete || false);

          // Fire-and-forget — never block auth loading
          import('../services/analytics.js').then(({ trackSessionStarted, trackSignup }) => {
            trackSessionStarted();
            const isNewUser = user.metadata?.creationTime === user.metadata?.lastSignInTime;
            if (isNewUser) trackSignup(user.providerData?.[0]?.providerId || 'email');
          }).catch(() => {});

          import('../services/purchases.js').then(({ initPurchases }) => {
            initPurchases(user.uid);
          }).catch(() => {});

        } else {
          // ── Signed-out ────────────────────────────────────────────────────────
          console.log('[AuthContext] Signed out — clearing all state');
          lastLoadedUid.current = null;
          localStorage.removeItem('cc_currentUser');
          localStorage.removeItem('cc_userRole');
          setCurrentUser(null);
          setUserRole(null);
          setOnboardingCompleted(true);
          setBusiness(null);
          setUserDetails(null);
        }
      } catch (error) {
        console.error('[AuthContext] onAuthStateChanged error:', error);
        // Graceful degradation — show app in limited state rather than hanging
        if (user) {
          setCurrentUser(user);
          setUserRole('admin');
          setOnboardingCompleted(true);
        }
      } finally {
        const elapsed = Date.now() - t0;
        console.log('[AuthContext] setLoading(false) — total init time:', elapsed, 'ms');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ── Real-time Business Sync ──────────────────────────────────────────────
  // Keep the business state perfectly in sync across all tabs and components
  // (Dashboard, Invoice, WhatsApp, Profile) instantly when updated.
  useEffect(() => {
    if (!currentUser || userRole === 'customer') return;
    
    let unsubBiz = () => {};
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      import('../services/firebase').then(({ db }) => {
        unsubBiz = onSnapshot(doc(db, 'business', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setBusiness({ id: docSnap.id, ...docSnap.data() });
          } else {
            setBusiness({ id: currentUser.uid, name: '', logo: '' });
          }
        });
      });
    });

    return () => unsubBiz();
  }, [currentUser, userRole]);

  const refreshRole = async () => {
    if (currentUser) {
      const role = await getUserRole(currentUser.uid);
      setUserRole(role);
    }
  };

  const logout = async () => {
    console.log('[AuthContext] logout() called');
    // Optimistically clear React state for instant UI response (no flicker)
    setCurrentUser(null);
    setUserRole(null);
    setBusiness(null);
    setUserDetails(null);
    setOnboardingCompleted(true);
    lastLoadedUid.current = null;
    // Full async cleanup (storage + IndexedDB + Firebase signOut)
    await logoutUser();
  };

  const finishOnboarding = async () => {
    try {
      if (currentUser) {
        const { showToast } = await import('../components/iOS');
        await completeOnboarding(currentUser.uid);
        setOnboardingCompleted(true);
        showToast('Onboarding completed!', 'success');
      }
    } catch (error) {
      console.error('Finish onboarding error:', error);
    }
  };

  const finishTour = async () => {
    try {
      if (currentUser) {
        const { completeTourV1 } = await import('../services/auth');
        await completeTourV1(currentUser.uid);

        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');
        await updateDoc(doc(db, 'users', currentUser.uid), { onboardingComplete: true });

        setHasSeenTourV1(true);
      }
    } catch (error) {
      console.error('Finish tour error:', error);
    }
  };

  const value = {
    currentUser,
    userRole,
    onboardingCompleted,
    business,
    userDetails,
    isAdmin: userRole === 'admin',
    isCustomer: userRole === 'customer',
    loading,
    logout,
    refreshRole,
    finishOnboarding,
    hasSeenTourV1,
    finishTour,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
