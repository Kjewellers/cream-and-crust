import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * NativeModal — Centered dialog modal directly in document.body.
 * Features crisp dark scrim without heavy blur, complete body scroll lock,
 * and a prominent, working close cross button.
 */
export default function NativeModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 520,
  showClose = true,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const origOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origPosition = document.body.style.position;
    const origTop = document.body.style.top;
    const origWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.top = origTop;
      document.body.style.width = origWidth;
      try { window.scrollTo(0, scrollY); } catch (_) {}
    };
  }, [open, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            pointerEvents: 'auto',
          }}
        >
          {/* Backdrop Scrim - Crisp darkening without heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.48)',
              touchAction: 'none',
              zIndex: 1,
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth,
              background: 'var(--surface-elevated, #FFF)',
              color: 'var(--text, #1C1917)',
              borderRadius: 24,
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'min(90dvh, 740px)',
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            {(title || (showClose && onClose)) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 24px 14px',
                  borderBottom: '1px solid var(--hairline, rgba(0,0,0,0.08))',
                  flexShrink: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  {title && (
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: 'var(--text, #1C1917)',
                      }}
                    >
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: '0.82rem',
                        color: 'var(--text3, #8C7A6B)',
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                {showClose && onClose && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    style={{
                      background: 'var(--surface-sunken, rgba(0,0,0,0.06))',
                      border: 'none',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text, #1C1917)',
                      flexShrink: 0,
                      transition: 'background 0.15s ease, transform 0.15s ease',
                    }}
                    onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                    onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    aria-label="Close"
                  >
                    <X size={18} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            )}

            <div
              style={{
                padding: '20px 24px 28px',
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
