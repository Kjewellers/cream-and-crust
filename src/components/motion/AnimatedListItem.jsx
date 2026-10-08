import React from 'react';
import { motion } from 'framer-motion';
import { listItemVariants } from '../../motion/animations.js';

/**
 * AnimatedListItem — Staggered list item component with smooth entrance & exit.
 */
export default function AnimatedListItem({ children, style = {}, className = '', ...rest }) {
  return (
    <motion.div
      variants={listItemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      layout
      style={{
        willChange: 'transform, opacity',
        ...style,
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
