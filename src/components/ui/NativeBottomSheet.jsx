import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * NativeBottomSheet — Enterprise mobile sheet / desktop modal dialog.
 * Direct body portal with Instagram/Airbnb-grade crisp dark scrim,
 * complete background scroll freezing, touch event isolation, and 
 * an always-working, prominent cross button.
 */
export default function NativeBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 600,
  maxHeight = '88dvh',
}) {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll (Instagram / Airbnb standard)
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
          className="cc-overlay-backdrop-root"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            display: 'flex',
            alignItems: isDesktop ? 'center' : 'flex-end',
            justifyContent: 'center',
            padding: isDesktop ? '24px' : '0',
            pointerEvents: 'auto',
          }}
        >
          {/* Backdrop Scrim - Crisp darkening without blinding heavy blur */}
          <motion.div
            key="backdrop"
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

          {/* Modal / Sheet Card */}
          <motion.div
            key="card"
            initial={isDesktop ? { opacity: 0, scale: 0.95, y: 15 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95, y: 15 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth,
              maxHeight,
              background: 'var(--surface-elevated, #FFF)',
              color: 'var(--text, #1C1917)',
              borderRadius: isDesktop ? 24 : '24px 24px 0 0',
              boxShadow: isDesktop
                ? '0 24px 64px rgba(0, 0, 0, 0.22)'
                : '0 -10px 40px rgba(0, 0, 0, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: isDesktop ? 0 : 'max(env(safe-area-inset-bottom, 16px), 16px)',
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            {/* Mobile Drag Pill */}
            {!isDesktop && (
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: 10,
                  paddingBottom: 4,
                  touchAction: 'none',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 4.5,
                    borderRadius: 3,
                    background: 'var(--text-muted, #B0A8A0)',
                    opacity: 0.5,
                  }}
                />
              </div>
            )}

            {/* Header: Title + Prominent Cross Button */}
            {(title || onClose) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isDesktop ? '18px 24px 14px' : '10px 20px 12px',
                  borderBottom: '1px solid var(--hairline, rgba(0,0,0,0.08))',
                  flexShrink: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  {title && (
                    <h2
                      style={{
                        margin: 0,
                        fontSize: isDesktop ? '1.25rem' : '1.15rem',
                        fontWeight: 800,
                        color: 'var(--text, #1C1917)',
                        lineHeight: 1.25,
                      }}
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: '0.82rem',
                        color: 'var(--text2, #6B6B6B)',
                        lineHeight: 1.3,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                {onClose && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    aria-label="Close"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--surface-sunken, rgba(0, 0, 0, 0.06))',
                      border: 'none',
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
                  >
                    <X size={18} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Content Container */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: isDesktop ? '20px 24px 28px' : '16px 20px 24px',
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
