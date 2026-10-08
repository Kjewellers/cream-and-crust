import React from 'react';
import { motion } from 'framer-motion';
import { SPRINGS } from '../../motion/springs.js';
import { haptics } from '../../motion/haptics.js';

/**
 * AnimatedCard — Tactile lift card component with spring physics.
 */
export default function AnimatedCard({
  children,
  onClick,
  style = {},
  className = '',
  hapticOnTouch = true,
  ...rest
}) {
  const handleTouch = () => {
    if (hapticOnTouch && onClick) {
      haptics.softTick();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={SPRINGS.cardTouch}
      onClick={onClick}
      onPointerDown={handleTouch}
      style={{
        background: 'var(--card, #fff)',
        borderRadius: 20,
        border: '1px solid var(--border, rgba(0,0,0,0.06))',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        willChange: 'transform',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
