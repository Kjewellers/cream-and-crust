import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserRole, logoutUser } from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'customer'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          
          // Failsafe: Hardcoded Admin Email
          if (user.email === 'admin@creamandcrust.com') {
            setUserRole('admin');
          } else {
            setUserRole('customer'); // Default
            const role = await getUserRole(user.uid);
            setUserRole(role);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
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

  const logout = async () => {
    await logoutUser();
  };

  const value = {
    currentUser,
    userRole,
    isAdmin: userRole === 'admin',
    isCustomer: userRole === 'customer',
    logout,
    refreshRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
