import React from 'react';
import { motion } from 'framer-motion';
import { checkmarkVariants } from '../../motion/animations.js';

/**
 * SuccessCheckmark — SVG checkmark path draw animation with soft glow.
 */
export default function SuccessCheckmark({ size = 48, color = '#B5606A' }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Soft Glow Halos */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.2, 1], opacity: [0, 0.4, 0.2] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: -6,
          borderRadius: '50%',
          background: color,
          filter: 'blur(8px)',
        }}
      />

      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
        <motion.path
          d="M14 24L21 31L34 17"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={checkmarkVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </div>
  );
}
