import React from 'react';
import { motion } from 'framer-motion';
import { shakeVariants } from '../../motion/animations.js';

/**
 * ErrorShake — Gentle physical error shake wrapper with warm red glow.
 */
export default function ErrorShake({ children, trigger = false, style = {}, className = '', ...rest }) {
  return (
    <motion.div
      variants={shakeVariants}
      animate={trigger ? 'shake' : undefined}
      style={{
        willChange: 'transform',
        ...style,
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
