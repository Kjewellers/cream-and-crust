import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import DashboardClassic from './DashboardClassic';
import DashboardModern from './DashboardModern';

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  // Settings driven theme:
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboardTheme') || 'classic');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // Listen for theme changes from Settings
    const handleStorage = () => {
      const stored = localStorage.getItem('dashboardTheme');
      if (stored) setTheme(stored);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dashboardThemeChanged', handleStorage);
    
    // Check 2-day prompt
    const prompted = localStorage.getItem('dashboardThemePrompted');
    if (!prompted && currentUser.metadata?.creationTime) {
      const created = new Date(currentUser.metadata.creationTime).getTime();
      const now = Date.now();
      const twoDays = 2 * 24 * 60 * 60 * 1000;
      
      if (now - created > twoDays && theme !== 'modern') {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dashboardThemeChanged', handleStorage);
    };
  }, [currentUser, theme]);

  const handleAcceptNew = () => {
    setTheme('modern');
    localStorage.setItem('dashboardTheme', 'modern');
    localStorage.setItem('dashboardThemePrompted', 'true');
    setShowPrompt(false);
  };

  const handleKeepClassic = () => {
    localStorage.setItem('dashboardThemePrompted', 'true');
    setShowPrompt(false);
  };

  return (
    <>
      {theme === 'modern' ? <DashboardModern /> : <DashboardClassic />}

      {/* Modern Dashboard Promo Modal */}
      <AnimatePresence>
        {showPrompt && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            zIndex: 99999, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: 24
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ 
                width: '100%', 
                maxWidth: 400,
                background: 'var(--bg)', 
                borderRadius: 24, 
                padding: 32,
                boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ background: 'rgba(219, 39, 119, 0.1)', padding: 18, borderRadius: '50%' }}>
                  <Sparkles size={36} color="#DB2777" />
                </div>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 12 }}>
                Experience the New Dashboard
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: '0.95rem', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>
                We've redesigned the bakery dashboard to be faster, more beautiful, and easier to use. Try out the new Atelier theme today!
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleAcceptNew}
                  className="btn btn-primary"
                  style={{ width: '100%', height: 56, borderRadius: 16, fontSize: '1.05rem', fontWeight: 800 }}
                >
                  Try New Look ✨
                </button>
                <button
                  onClick={handleKeepClassic}
                  style={{ width: '100%', height: 56, borderRadius: 16, fontSize: '1rem', fontWeight: 700, background: 'var(--bg2)', color: 'var(--text)', border: 'none' }}
                >
                  Keep Classic
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
