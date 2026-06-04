/**
 * PremiumBadge — gold "PRO" badge shown on the Profile page for subscribers.
 * Compact, elegant, and animated with a subtle shimmer.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';

export default function PremiumBadge({ label = 'PRO', size = 'md' }) {
  const sizes = {
    sm: { padding: '2px 8px', fontSize: 10, iconSize: 10, gap: 4 },
    md: { padding: '4px 12px', fontSize: 11.5, iconSize: 13, gap: 5 },
    lg: { padding: '6px 16px', fontSize: 13, iconSize: 15, gap: 6 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        borderRadius: 99,
        background: 'linear-gradient(135deg, #D4A050 0%, #F5D78E 50%, #B8860B 100%)',
        color: '#fff',
        fontWeight: 900,
        fontSize: s.fontSize,
        letterSpacing: '0.06em',
        boxShadow: '0 2px 8px rgba(212,160,80,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer effect */}
      <motion.span
        animate={{ x: [-40, 60] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 20,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          transform: 'skewX(-20deg)',
        }}
      />
      <Crown size={s.iconSize} fill="#fff" />
      {label}
    </motion.span>
  );
}
