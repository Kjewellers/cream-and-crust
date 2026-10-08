import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionIcon } from './MotionIcon';

/**
 * NetworkStatusBanner.jsx
 * Persistent but non-intrusive banner indicating offline status.
 */
export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // We expect this to run in browser
    if (typeof window === 'undefined') return;
    
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            top: 'env(safe-area-inset-top, 0px)',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 16px',
            zIndex: 99999, // Above everything
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(250, 240, 240, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(205, 92, 92, 0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <MotionIcon type="offline" size={16} color="#C0504D" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4A1C1C' }}>
              Waiting for connection...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
