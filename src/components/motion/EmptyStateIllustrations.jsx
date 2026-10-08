import React from 'react';
import { motion } from 'framer-motion';

/**
 * EmptyStateIllustrations — Bakery-themed ambient empty states.
 */
export function FloatingCupcake({ emoji = '🧁', title = 'No items found', description = '' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{
          y: [0, -12, 0],
          rotate: [0, 3, -3, 0],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          fontSize: 64,
          marginBottom: 16,
          filter: 'drop-shadow(0 12px 24px rgba(181, 96, 106, 0.2))',
          userSelect: 'none',
        }}
      >
        {emoji}
      </motion.div>

      <h3
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text, #1C1917)',
          margin: '0 0 6px',
        }}
      >
        {title}
      </h3>

      {description && (
        <p style={{ fontSize: 13.5, color: 'var(--text2, #6B6B6B)', maxWidth: 320, lineHeight: 1.5, margin: 0 }}>
          {description}
        </p>
      )}
    </div>
  );
}

export default FloatingCupcake;
