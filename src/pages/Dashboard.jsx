import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardClassic from './DashboardClassic';
import DashboardModern from './DashboardModern';

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  // Settings driven theme (Classic by default on start):
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboardTheme') || 'classic');

  useEffect(() => {
    if (!currentUser) return;
    
    // Listen for theme changes from Settings
    const handleStorage = () => {
      const stored = localStorage.getItem('dashboardTheme');
      if (stored) setTheme(stored);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dashboardThemeChanged', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dashboardThemeChanged', handleStorage);
    };
  }, [currentUser]);

  return theme === 'modern' ? <DashboardModern /> : <DashboardClassic />;
}
