/**
 * UnlockCelebration.jsx
 *
 * Post-purchase full-screen celebration overlay.
 * Plays for ~2.5 seconds then fades out automatically.
 *
 * Shows:
 *   ✨ "Premium Unlocked!" headline
 *   Confetti burst particles
 *   Feature name that was being unlocked
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Stable particle list — generated once at module load, never changes
const CONFETTI_COLORS = [
  '#D4A050', '#F5D78E', '#7C3AED', '#A78BFA',
  '#F43F5E', '#FB7185', '#10B981', '#FCD34D',
  '#60A5FA', '#F97316',
];

function generateParticles(count = 60) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 260,
    y: -20,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotation: (Math.random() - 0.5) * 720,
    scale: 0.8 + Math.random() * 0.8,
    delay: Math.random() * 0.4,
  }));
}

// Generated once — never re-generated, ref not needed
const PARTICLES = generateParticles(60);
function Particle({ x, y, color, rotation, scale, delay }) {
  return (
    <motion.div
      initial={{ opacity: 1, x, y: 0, rotate: 0, scale: 0 }}
      animate={{
        opacity: [1, 1, 0],
        x: x + (Math.random() - 0.5) * 120,
        y: y + 200 + Math.random() * 120,
        rotate: rotation,
        scale: [0, scale, scale * 0.6],
      }}
      transition={{ duration: 1.8, delay, ease: [0.2, 0, 0.4, 1] }}
      style={{
        position: 'absolute',
        width: 8 + Math.random() * 6,
        height: 8 + Math.random() * 6,
        borderRadius: Math.random() > 0.5 ? '50%' : 2,
        background: color,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function UnlockCelebration({ visible, featureLabel }) {

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="unlock-celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}
        >
          {/* Confetti burst centred on the crown icon */}
          <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)' }}>
            {PARTICLES.map((p) => (
              <Particle key={p.id} {...p} />
            ))}
          </div>

          {/* Crown icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 1.3, 1], rotate: [-30, 12, 0] }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 96, height: 96,
              borderRadius: 48,
              background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
              boxShadow: '0 0 60px rgba(212,160,80,0.6), 0 0 120px rgba(212,160,80,0.25)',
              marginBottom: 28,
            }}
          >
            👑
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ textAlign: 'center', padding: '0 32px' }}
          >
            <div style={{
              fontSize: 28, fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginBottom: 10,
              textShadow: '0 2px 20px rgba(212,160,80,0.5)',
            }}>
              ✨ Premium Unlocked!
            </div>
            {featureLabel && (
              <div style={{
                fontSize: 15, color: 'rgba(255,255,255,0.72)',
                fontWeight: 500,
              }}>
                {featureLabel} is ready for you
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              style={{
                marginTop: 20,
                display: 'inline-block',
                background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                padding: '8px 20px',
                borderRadius: 99,
                letterSpacing: '0.04em',
              }}
            >
              Continuing automatically…
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
