/**
 * PremiumBadge.jsx
 *
 * Subtle, reusable badge for Premium features.
 * Never huge banners — always small, elegant indicators.
 *
 * Variants:
 *   pro    → 👑 PRO   (gold gradient)
 *   ai     → ✨ AI    (purple shimmer)
 *   plus   → ⭐ PLUS  (rose)
 */
import React from 'react';
import { motion } from 'framer-motion';

const VARIANTS = {
  pro: {
    icon: '👑',
    label: 'PRO',
    bg: 'linear-gradient(135deg, #D4A050 0%, #F5D78E 55%, #B8860B 100%)',
    color: '#fff',
    shadow: '0 1px 6px rgba(212,160,80,0.40)',
  },
  ai: {
    icon: '✨',
    label: 'AI',
    bg: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 55%, #5B21B6 100%)',
    color: '#fff',
    shadow: '0 1px 6px rgba(124,58,237,0.35)',
  },
  plus: {
    icon: '⭐',
    label: 'PLUS',
    bg: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 55%, #BE123C 100%)',
    color: '#fff',
    shadow: '0 1px 6px rgba(244,63,94,0.35)',
  },
};

const SIZES = {
  xs: { padding: '1px 6px', fontSize: 9, gap: 2 },
  sm: { padding: '2px 7px', fontSize: 10, gap: 3 },
  md: { padding: '3px 9px', fontSize: 11, gap: 4 },
  lg: { padding: '5px 12px', fontSize: 12.5, gap: 5 },
};

export default function PremiumBadge({
  variant = 'pro',
  size = 'sm',
  label,
  style,
}) {
  const v = VARIANTS[variant] || VARIANTS.pro;
  const s = SIZES[size] || SIZES.sm;
  const displayLabel = label || v.label;

  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        borderRadius: 99,
        background: v.bg,
        color: v.color,
        fontWeight: 800,
        fontSize: s.fontSize,
        letterSpacing: '0.07em',
        boxShadow: v.shadow,
        textTransform: 'uppercase',
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Shimmer sweep */}
      <motion.span
        animate={{ x: [-30, 70] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          width: 18,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
      />
      <span style={{ fontSize: s.fontSize + 1 }}>{v.icon}</span>
      {displayLabel}
    </motion.span>
  );
}
