import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/**
 * ParticleLayer.jsx
 * Renders tiny, slow-floating glass particles for Level 3 modals.
 * Self-cleans and pauses when page visibility is lost to save battery.
 */
export function ParticleLayer({ count = 8 }) {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  // Pause animations when app goes to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Generate particles once
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2, // 2px to 6px
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * 10 + 15, // 15s to 25s
      delay: Math.random() * 2,
    }));
  }, [count]);

  if (prefersReducedMotion || !isVisible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.4)',
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.2)',
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [-20, -100], // Float up
            x: [0, Math.random() * 30 - 15] // Gentle drift
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
}
