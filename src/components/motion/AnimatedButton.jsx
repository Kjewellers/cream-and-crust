import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { SPRINGS } from '../../motion/springs.js';
import { haptics } from '../../motion/haptics.js';
import { sounds } from '../../motion/soundSystem.js';

/**
 * AnimatedButton — Handcrafted physical button with morph states.
 * States: 'idle' | 'loading' | 'success' | 'error'
 */
export default function AnimatedButton({
  children,
  onClick,
  state = 'idle',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  disabled = false,
  style = {},
  className = '',
  sound = 'woodenClick',
  haptic = 'soft',
  ...rest
}) {
  const handleClick = (e) => {
    if (disabled || state === 'loading') return;

    // Trigger physical feedback
    if (haptic === 'soft') haptics.softTick();
    else if (haptic === 'medium') haptics.mediumTick();

    if (sound === 'woodenClick') sounds.woodenClick();
    else if (sound === 'paper') sounds.softPaperTap();

    if (onClick) onClick(e);
  };

  // Variant styling presets
  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, var(--accent, #B5606A) 0%, #9A4C56 100%)',
      color: '#FFF',
      border: 'none',
      boxShadow: '0 6px 16px rgba(181, 96, 106, 0.25)',
    },
    secondary: {
      background: 'var(--card, #fff)',
      color: 'var(--text, #1C1917)',
      border: '1px solid var(--border-md, rgba(0,0,0,0.12))',
    },
    outline: {
      background: 'transparent',
      color: 'var(--accent, #B5606A)',
      border: '1.5px solid var(--accent, #B5606A)',
    },
    danger: {
      background: '#EF4444',
      color: '#FFF',
      border: 'none',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={SPRINGS.snappy}
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      style={{
        padding: '12px 22px',
        borderRadius: 14,
        fontWeight: 700,
        fontSize: 14.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        willChange: 'transform',
        userSelect: 'none',
        ...currentVariant,
        ...style,
      }}
      className={className}
      {...rest}
    >
      {state === 'loading' ? (
        <Loader2 size={18} className="animate-spin" />
      ) : state === 'success' ? (
        <>
          <Check size={18} strokeWidth={2.5} /> Success
        </>
      ) : state === 'error' ? (
        <>
          <AlertCircle size={18} /> Error
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
