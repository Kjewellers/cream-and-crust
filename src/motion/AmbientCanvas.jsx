/**
 * AmbientCanvas.jsx — Handcrafted Luxury Ambient UI Surface
 * Very soft gradient drift that automatically pauses on scroll, battery saver, or reduced motion.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useMotionConfig } from './useMotion';

export default function AmbientCanvas() {
  const { allowAmbient } = useMotionConfig();

  if (!allowAmbient) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <motion.div
        animate={{
          x: [-30, 30, -30],
          y: [-20, 20, -20],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{
          repeat: Infinity,
          duration: 18,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 160, 80, 0.15) 0%, rgba(212, 160, 80, 0) 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}
