import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/**
 * ErrorIllustrations.jsx
 * Premium vector illustrations for Level 4 (Critical) error states.
 */
export function ErrorIllustrations({ type, size = 120 }) {
  const prefersReducedMotion = useReducedMotion();

  // A generic sophisticated illustration for critical states.
  // In a real production app, these would be rich Lottie or Rive animations.
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle, rgba(181, 96, 106, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
        animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Giant broken gear/system icon */}
        <motion.g
          initial={{ rotate: -15, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <circle cx="60" cy="60" r="30" stroke="rgba(181, 96, 106, 0.8)" strokeWidth="4" />
          <path d="M60 20 v10 M60 90 v10 M20 60 h10 M90 60 h10 M32 32 l7 7 M81 81 l7 7 M32 88 l7 -7 M81 39 l7 -7" stroke="rgba(181, 96, 106, 0.5)" strokeWidth="4" />
          {/* Crack */}
          <path d="M50 40 l10 15 l-5 10 l15 15" stroke="#E15A75" strokeWidth="3" />
        </motion.g>
      </svg>
    </div>
  );
}
