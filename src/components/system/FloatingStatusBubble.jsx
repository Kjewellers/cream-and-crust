import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useErrorAnimations, ErrorSprings } from './useErrorAnimations';
import { MotionIcon } from './MotionIcon';

/**
 * FloatingStatusBubble.jsx
 * Level 2: Recoverable Errors. Floating glass notification.
 */
export function FloatingStatusBubble({ error, onDismiss, onRetry }) {
  const { bubbleVariants, textItemVariants } = useErrorAnimations();

  // Auto-dismiss if there's no retry action needed
  useEffect(() => {
    if (!error.duration || onRetry) return;
    const timer = setTimeout(onDismiss, error.duration);
    return () => clearTimeout(timer);
  }, [error.duration, onDismiss, onRetry]);

  return (
    <motion.div
      layout
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        width: '100%',
        maxWidth: 320,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: '16px 20px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'auto',
        marginBottom: 12,
      }}
    >
      <motion.div 
        variants={ErrorSprings.stagger} 
        initial="hidden" 
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}
      >
        <motion.div variants={textItemVariants}>
          <MotionIcon type={error.icon || error.category} size={36} color="var(--accent)" />
        </motion.div>
        
        <motion.div 
          variants={textItemVariants}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2D1B14', marginBottom: 4 }}>
            {error.title || 'Attention'}
          </div>
          <div style={{ fontSize: 13.5, color: '#786C67', lineHeight: 1.4 }}>
            {error.message}
          </div>
        </motion.div>

        {(onRetry || error.primaryAction) && (
          <motion.div 
            variants={textItemVariants} 
            style={{ width: '100%', display: 'flex', gap: 8, marginTop: 4 }}
          >
            <button
              onClick={onDismiss}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'rgba(74, 59, 50, 0.06)',
                borderRadius: 16,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#4A3B32',
              }}
            >
              {error.secondaryLabel || 'Dismiss'}
            </button>
            <button
              onClick={() => {
                if (onRetry) onRetry();
                else if (error.onPrimary) error.onPrimary();
                onDismiss();
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'var(--accent)',
                borderRadius: 16,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#FFF',
              }}
            >
              {error.primaryLabel || 'Retry'}
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
