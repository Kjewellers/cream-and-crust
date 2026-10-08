import React from 'react';
import { motion } from 'framer-motion';
import { useErrorAnimations, ErrorSprings } from './useErrorAnimations';
import { MotionIcon } from './MotionIcon';
import { GlowLayer } from './GlowLayer';
import { ParticleLayer } from './ParticleLayer';

/**
 * AnimatedErrorCard.jsx
 * Level 3: Action Required. Premium floating modal with depth and particles.
 */
export function AnimatedErrorCard({ error, onDismiss, onRetry }) {
  const { cardVariants, textItemVariants } = useErrorAnimations();

  return (
    <>
      {/* Dimmed/Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: -1,
        }}
      />
      
      <motion.div
        layout
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'rgba(255, 253, 249, 0.85)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRadius: 32,
          padding: '32px 24px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.8)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'auto',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 'auto',
          marginTop: 'auto', // Center vertically
        }}
        onClick={(e) => e.stopPropagation()} // Prevent dismissing on card click
      >
        <GlowLayer color={error.category === 'payment' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(181, 96, 106, 0.15)'} />
        <ParticleLayer count={12} />

        <motion.div 
          variants={ErrorSprings.stagger} 
          initial="hidden" 
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', zIndex: 2 }}
        >
          <motion.div variants={textItemVariants}>
            <MotionIcon type={error.icon || error.category} size={56} color="var(--accent)" />
          </motion.div>
          
          <motion.div 
            variants={textItemVariants}
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A1412', letterSpacing: '-0.02em' }}>
              {error.title || 'Action Required'}
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: '#665C58', lineHeight: 1.5 }}>
              {error.message}
            </p>
          </motion.div>

          <motion.div 
            variants={textItemVariants} 
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}
          >
            <button
              onClick={() => {
                if (onRetry) onRetry();
                else if (error.onPrimary) error.onPrimary();
                onDismiss();
              }}
              style={{
                width: '100%',
                padding: '14px 0',
                background: 'var(--accent)',
                borderRadius: 20,
                fontSize: 15,
                fontWeight: 700,
                color: '#FFF',
                boxShadow: '0 8px 24px rgba(225, 90, 117, 0.3)',
              }}
            >
              {error.primaryLabel || 'Resolve Issue'}
            </button>
            <button
              onClick={onDismiss}
              style={{
                width: '100%',
                padding: '14px 0',
                background: 'transparent',
                borderRadius: 20,
                fontSize: 15,
                fontWeight: 600,
                color: '#786C67',
              }}
            >
              {error.secondaryLabel || 'Maybe Later'}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
