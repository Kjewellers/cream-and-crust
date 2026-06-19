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
          {/* Overlay — solid dark fade, no blur */}
          <motion.div
            key="pbs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9000,
              background: 'rgba(0, 0, 0, 0.65)',
            }}
          />

          {/* Modal */}
          <motion.div
            key="pbs-sheet"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Dialog'}
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              margin: 'auto',
              width: 'calc(100% - 40px)',
              maxWidth: 560,
              height: 'fit-content',
              zIndex: 9001,
              maxHeight,
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFDF9',
              borderRadius: '24px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08)',
              fontFamily: '"Inter", system-ui, sans-serif',
              color: '#2D1B14',
              overflow: 'hidden',
            }}
          >

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
