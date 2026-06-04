/**
 * PremiumBottomSheet — unified modal/popup system for the entire app.
 *
 * Replaces all heavy-blur bottom sheets, centered modals, and popup
 * cards with ONE consistent, premium, native-feeling component.
 *
 * Design principles:
 * - No heavy backdrop blur (just subtle dark overlay)
 * - Background scales down slightly for depth (Apple-style)
 * - Fixed to bottom with rounded top corners
 * - Internal scroll only — page never scrolls
 * - Smooth spring animations
 * - Safe-area aware
 * - Drag handle + close button
 * - Works on low-end Android (no expensive filters)
 *
 * Usage:
 *   <PremiumBottomSheet open={isOpen} onClose={close} title="Order Details">
 *     <YourContent />
 *   </PremiumBottomSheet>
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { captureScroll, restoreScroll } from '../utils/scrollLock.js';

export default function PremiumBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '85dvh',
  showHandle = true,
  showClose = true,
}) {
  const prevOverflow = useRef('');
  const prevTouchAction = useRef('');
  const savedScrollY = useRef(0);

  // Lock body scroll when open; capture + restore the background scroll offset
  // so closing the sheet lands exactly where the user was (Req 2.6).
  useEffect(() => {
    if (open) {
      savedScrollY.current = captureScroll();
      prevOverflow.current = document.body.style.overflow;
      prevTouchAction.current = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = prevOverflow.current;
      document.body.style.touchAction = prevTouchAction.current;
      if (typeof window !== 'undefined') {
        window.scrollTo(0, restoreScroll(savedScrollY.current));
      }
    }
    return () => {
      document.body.style.overflow = prevOverflow.current;
      document.body.style.touchAction = prevTouchAction.current;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay — subtle, no heavy blur */}
          <motion.div
            key="pbs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9000,
              background: 'rgba(15, 15, 15, 0.28)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="pbs-sheet"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 34,
              mass: 0.8,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Bottom sheet'}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9001,
              maxHeight,
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFDF9',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.04)',
              fontFamily: '"Inter", system-ui, sans-serif',
              color: '#2D1B14',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            {showHandle && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: 10,
                  paddingBottom: 6,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(140, 122, 107, 0.25)',
                  }}
                />
              </div>
            )}

            {/* Header */}
            {(title || showClose) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 20px 14px',
                  flexShrink: 0,
                  borderBottom: '1px solid rgba(74, 59, 50, 0.06)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {title && (
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 800,
                        letterSpacing: '-0.015em',
                        color: '#2D1B14',
                      }}
                    >
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 12.5,
                        color: '#8C7A6B',
                        lineHeight: 1.4,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      border: '1px solid rgba(74, 59, 50, 0.08)',
                      background: 'rgba(250, 246, 240, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8C7A6B',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                padding: '16px 20px',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 16px))',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
