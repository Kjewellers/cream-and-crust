/**
 * SkeletonLoader.jsx — Progressive Shimmer Skeleton Component
 * Replaces generic loading spinners with smooth, 60 FPS skeleton blocks.
 */
import React from 'react';
import { motion } from 'framer-motion';

export default function SkeletonLoader({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  style,
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(74, 59, 50, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.4,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}
