import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useErrorAnimations } from './useErrorAnimations';
import { MotionIcon } from './MotionIcon';

/**
 * GlassToast.jsx
 * Level 1: Tiny Errors. Non-intrusive, fast, and elegant.
 */
export function GlassToast({ error, onDismiss }) {
  const { toastVariants } = useErrorAnimations();

  // Auto-dismiss after duration
  useEffect(() => {
    if (!error.duration) return;
    const timer = setTimeout(onDismiss, error.duration);
    return () => clearTimeout(timer);
  }, [error.duration, onDismiss]);

  const getStyle = () => {
    switch (error.category) {
      case 'success':
        return { bg: '#f0fdf4', color: '#1A3C28', iconColor: '#2D8F54' };
      case 'info':
        return { bg: '#eff6ff', color: '#1A2744', iconColor: '#4A7AC7' };
      default: // default is level 1 minor error/warning
        return { bg: '#fef2f2', color: '#4A1C1C', iconColor: '#C0504D' };
    }
  };

  const style = getStyle();

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onDismiss}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -30 || info.velocity.y < -200) {
          onDismiss();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: style.bg,
        border: `1px solid rgba(0, 0, 0, 0.08)`,
        borderRadius: 24,
        padding: '10px 16px 10px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        pointerEvents: 'auto',
        marginBottom: 8,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <MotionIcon type={error.icon || error.category} size={20} color={style.iconColor} />
      </div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: style.color,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        {error.message}
      </div>
    </motion.div>
  );
}
