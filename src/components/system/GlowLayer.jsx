import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/**
 * GlowLayer.jsx
 * Ambient, slow-moving gradient glow for Level 3 & 4 error modals.
 * Softens the appearance and provides depth.
 */
export function GlowLayer({ color = 'rgba(181, 96, 106, 0.15)' }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: -40, // bleed outside bounds
        background: `radial-gradient(circle at 50% 0%, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(30px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [0.5, 0.8, 0.5],
        scale: [1, 1.05, 1]
      }}
      transition={{ 
        duration: 8, 
        repeat: Infinity, 
        ease: 'easeInOut' 
      }}
    />
  );
}
