import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '../../motion/springs.js';
import { haptics } from '../../motion/haptics.js';
import { X } from 'lucide-react';

/**
 * AnimatedSheet — Physics-driven drag modal bottom sheet with rubber band.
 */
export default function AnimatedSheet({ open, onClose, title = '', children, maxWidth = 520 }) {
  if (!open) return null;

  const handleDragEnd = (_, info) => {
    // If dragged down past 100px or with strong downward velocity, dismiss
    if (info.offset.y > 100 || info.velocity.y > 300) {
      haptics.softTick();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99990,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 12, 11, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        />

        {/* Bottom Sheet Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={SPRINGS.sheet}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.8 }} // Rubber band effect
          onDragEnd={handleDragEnd}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth,
            maxHeight: '90vh',
            background: 'var(--card, #fff)',
            borderRadius: '28px 28px 0 0',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -24px 60px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            willChange: 'transform',
          }}
        >
          {/* Drag Handle */}
          <div
            style={{
              paddingTop: 12,
              paddingBottom: 6,
              display: 'flex',
              justifyContent: 'center',
              cursor: 'grab',
            }}
          >
            <div
              style={{
                width: 38,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-md, rgba(0,0,0,0.15))',
              }}
            />
          </div>

          {/* Header */}
          {title && (
            <div
              style={{
                padding: '10px 24px 16px',
                borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text, #1C1917)' }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'var(--bg, #f5f5f5)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text2)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
