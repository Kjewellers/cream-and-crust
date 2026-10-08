/**
 * BiometricLock.jsx — Biometric Protection Lock Screen
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../motion/HapticEngine';

export default function BiometricLock({ isLocked, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isLocked) return null;

  const handleUnlockAttempt = () => {
    triggerHaptic('selection');
    onUnlock?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0E0C0B',
          color: '#FFFDF9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(212, 160, 80, 0.15)',
            border: '1.5px solid rgba(212, 160, 80, 0.4)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 20,
          }}
        >
          <Lock size={32} color="#D4A050" />
        </motion.div>

        <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>
          Cream & Crust Protected
        </h2>
        <p style={{ margin: '0 0 32px', fontSize: '0.88rem', color: '#9E8E84' }}>
          Authenticate to access revenue & customer data
        </p>

        <button
          type="button"
          onClick={handleUnlockAttempt}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 28px',
            borderRadius: 99,
            background: 'linear-gradient(135deg, #D4A050 0%, #B8860B 100%)',
            border: 'none',
            color: '#0E0C0B',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(212, 160, 80, 0.3)',
          }}
        >
          <Fingerprint size={20} />
          <span>Unlock with Biometrics</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
