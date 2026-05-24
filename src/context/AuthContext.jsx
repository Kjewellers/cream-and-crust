import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [onboardingCompleted, setOnboardingCompleted] = useState(true); // Default to true to prevent flickering
  const [business, setBusiness] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [hasSeenTourV1, setHasSeenTourV1] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('cc_currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }));
          
          const role = await getUserRole(user.uid);
          setUserRole(role);
          localStorage.setItem('cc_userRole', role);
          
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');
          
          const uDoc = await getDoc(doc(db, "users", user.uid));
          if (uDoc.exists()) setUserDetails(uDoc.data());

          const bizRef = doc(db, "business", user.uid);
          const bizDoc = await getDoc(bizRef);
          if (bizDoc.exists()) setBusiness({ id: bizDoc.id, ...bizDoc.data() });
          else setBusiness({ id: user.uid, name: 'Cream & Crust', logo: '🧁' });

          const completed = await getOnboardingStatus(user.uid);
          setOnboardingCompleted(completed);

          const userData = uDoc.data();
          setHasSeenTourV1(userData?.hasSeenTourV1 || userData?.onboardingComplete || false);
        } else {
          // If we had a stored session, don't clear it immediately on startup network check
          // to give it a smooth local dev transition.
          const savedUser = localStorage.getItem('cc_currentUser');
          if (!savedUser) {
            setCurrentUser(null);
            setUserRole(null);
            setOnboardingCompleted(true);
          }
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const refreshRole = async () => {
    if (currentUser) {
      const role = await getUserRole(currentUser.uid);
      setUserRole(role);
    }
  };

  const mockLogin = () => {
    const user = {
      uid: 'mock-user-123',
      email: 'admin@creamandcrust.com',
      displayName: 'Dev Admin'
    };
    setCurrentUser(user);
    setUserRole('admin');
    localStorage.setItem('cc_currentUser', JSON.stringify(user));
    localStorage.setItem('cc_userRole', 'admin');
  };

  const logout = async () => {
    localStorage.removeItem('cc_currentUser');
    localStorage.removeItem('cc_userRole');
    setCurrentUser(null);
    setUserRole(null);
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
      console.error("Finish onboarding error:", error);
    }
  };

  const finishTour = async () => {
    try {
      if (currentUser) {
        const { completeTourV1 } = await import('../services/auth');
        await completeTourV1(currentUser.uid);
        
        // Also set onboardingComplete flag as requested by user
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');
        await updateDoc(doc(db, "users", currentUser.uid), { onboardingComplete: true });
        
        setHasSeenTourV1(true);
      }
    } catch (error) {
      console.error("Finish tour error:", error);
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
    logout,
    refreshRole,
    finishOnboarding,
    hasSeenTourV1,
    finishTour,
    mockLogin // Added for testing
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
