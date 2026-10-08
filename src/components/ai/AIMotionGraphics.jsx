/**
 * AIMotionGraphics.jsx
 *
 * 60 FPS Motion Graphics Components for Cream AI.
 * Advanced shimmering thinking waves, ambient orb pulses, and entrance physics.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/** Glowing Metallic Ambient Orb Indicator */
export function AIOrbPulse({ active = false }) {
  return (
    <div style={{ relative: 'relative', width: 32, height: 32, display: 'grid', placeItems: 'center' }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 163, 127, 0.4) 0%, rgba(16, 163, 127, 0) 70%)',
        }}
        animate={{
          scale: active ? [1, 1.4, 1] : 1,
          opacity: active ? [0.4, 0.9, 0.4] : 0.4,
        }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: 'easeInOut',
        }}
      />
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#10A37F',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Sparkles size={14} color="#FFF" />
      </div>
    </div>
  );
}

/** 60 FPS Shimmering Thinking Wave Bars */
export function AIThinkingWave() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            background: '#10A37F',
          }}
          animate={{
            scaleY: [0.3, 1, 0.3],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 0.9,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
