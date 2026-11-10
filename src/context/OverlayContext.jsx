import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

export const OverlayContext = createContext(null);

const DEFAULT_OVERLAY_CONTEXT = {
  isFallback: true,
  overlays: [],
  openOverlay: () => '',
  closeOverlay: () => {},
  closeAll: () => {},
  openSheet: () => '',
  openModal: () => '',
  openDrawer: () => '',
};

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  return ctx || DEFAULT_OVERLAY_CONTEXT;
}

// Global stack manager
let globalOverlayId = 0;

export function OverlayProvider({ children }) {
  const [overlays, setOverlays] = useState([]);

  // Lock body scroll when any overlay is active (Instagram / Airbnb standard)
  useEffect(() => {
    if (overlays.length > 0) {
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

      return () => {
        document.documentElement.style.overflow = origHtmlOverflow;
        document.body.style.overflow = origOverflow;
        document.body.style.position = origPosition;
        document.body.style.top = origTop;
        document.body.style.width = origWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [overlays.length]);

  // Handle ESC key to close top overlay
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && overlays.length > 0) {
        const topOverlay = overlays[overlays.length - 1];
        if (topOverlay.dismissible !== false) {
          closeOverlay(topOverlay.id);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [overlays]);

  const openOverlay = useCallback((config) => {
    const id = config.id || `overlay-${++globalOverlayId}`;
    setOverlays((prev) => {
      // Prevent duplicates if ID is explicitly provided
      if (prev.find(o => o.id === id)) {
        return prev.map(o => o.id === id ? { ...config, id } : o);
      }
      return [...prev, { ...config, id }];
    });
    return id;
  }, []);

  const closeOverlay = useCallback((id) => {
    setOverlays((prev) => prev.filter(o => o.id !== id));
  }, []);

  const closeAll = useCallback(() => {
    setOverlays([]);
  }, []);

  // Helpers for convenience
  const openSheet = useCallback((config) => openOverlay({ ...config, type: 'sheet' }), [openOverlay]);
  const openModal = useCallback((config) => openOverlay({ ...config, type: 'modal' }), [openOverlay]);
  const openDrawer = useCallback((config) => openOverlay({ ...config, type: 'drawer' }), [openOverlay]);

  return (
    <OverlayContext.Provider value={{ overlays, openOverlay, closeOverlay, closeAll, openSheet, openModal, openDrawer }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div 
          id="global-overlay-root" 
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100000 }}
        >
          <AnimatePresence>
            {overlays.map((overlay, index) => (
              <OverlayRenderer 
                key={overlay.id} 
                overlay={overlay} 
                onClose={() => closeOverlay(overlay.id)}
                isTop={index === overlays.length - 1}
              />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </OverlayContext.Provider>
  );
}

// ── Renderer Switcher ──────────────────────────────────────
class OverlayErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[OverlayErrorBoundary] Failed rendering overlay:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ padding: 24, textAlign: 'center', background: 'var(--surface-elevated, #FFF)', borderRadius: 16, maxWidth: 320, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <p style={{ fontWeight: 700, margin: '0 0 12px', color: 'var(--text, #333)' }}>Unable to display content</p>
            <button 
              onClick={this.props.onClose} 
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent, #B5606A)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function OverlayRenderer({ overlay, onClose, isTop }) {
  const { type } = overlay;

  const handleClose = useCallback(() => {
    if (typeof overlay.onClose === 'function') {
      try { overlay.onClose(); } catch (err) { console.error(err); }
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [overlay, onClose]);

  let component = null;
  if (type === 'sheet') {
    component = <GlobalSheet {...overlay} onClose={handleClose} />;
  } else if (type === 'modal') {
    component = <GlobalModal {...overlay} onClose={handleClose} />;
  } else if (type === 'drawer') {
    component = <GlobalDrawer {...overlay} onClose={handleClose} />;
  }

  if (!component) return null;
  return <OverlayErrorBoundary onClose={handleClose}>{component}</OverlayErrorBoundary>;
}

// ── Global Sheet Implementation ──────────────────────────────
function GlobalSheet({ id, title, subtitle, content, showClose = true, onClose, maxHeight = '88dvh' }) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="cc-sheet-wrapper"
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
      {/* Crisp dark scrim backdrop - NO heavy blur that blurs out the app */}
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
        initial={isDesktop ? { opacity: 0, scale: 0.95, y: 15 } : { y: '100%' }}
        animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={isDesktop ? { opacity: 0, scale: 0.95, y: 15 } : { y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="cc-sheet-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          maxHeight,
          background: 'var(--surface-elevated, #FFF)',
          color: 'var(--text, #1C1917)',
          borderRadius: isDesktop ? 24 : '24px 24px 0 0',
          boxShadow: isDesktop ? '0 24px 64px rgba(0, 0, 0, 0.22)' : '0 -10px 40px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: isDesktop ? 0 : 'max(env(safe-area-inset-bottom, 16px), 16px)',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {/* Mobile Grab Handle Bar */}
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
            <div style={{ width: 38, height: 4.5, borderRadius: 3, background: 'var(--text-muted, #B0A8A0)', opacity: 0.5 }} />
          </div>
        )}

        {(title || showClose) && (
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
              {title && <h2 style={{ margin: 0, fontSize: isDesktop ? '1.25rem' : '1.15rem', fontWeight: 800, color: 'var(--text, #1C1917)' }}>{title}</h2>}
              {subtitle && <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text2, #6B6B6B)' }}>{subtitle}</p>}
            </div>
            {showClose && (
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
          {content}
        </div>
      </motion.div>
    </div>
  );
}

// ── Global Modal Implementation ──────────────────────────────
function GlobalModal({ id, title, subtitle, content, showClose = true, onClose, maxWidth = 520 }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="cc-modal-wrapper"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        pointerEvents: 'auto',
      }}
    >
      {/* Crisp dark scrim backdrop - NO heavy blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.48)',
          touchAction: 'none',
          zIndex: 1,
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="cc-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          background: 'var(--surface-elevated, #FFF)',
          color: 'var(--text, #1C1917)',
          borderRadius: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(90dvh, 740px)',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {(title || showClose) && (
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
              {title && <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text, #1C1917)' }}>{title}</h3>}
              {subtitle && <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text3, #8C7A6B)' }}>{subtitle}</p>}
            </div>
            {showClose && (
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
          {content}
        </div>
      </motion.div>
    </div>
  );
}

// ── Global Drawer Implementation ──────────────────────────────
function GlobalDrawer({ id, content, onClose }) {
  return (
    <motion.div
      role="navigation"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
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
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="cc-drawer-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '300px',
          maxWidth: '85vw',
          height: '100dvh',
          background: 'var(--surface-elevated, #FFF)',
          boxShadow: '18px 0 60px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'env(safe-area-inset-top, 16px) 0 env(safe-area-inset-bottom, 16px) 0',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px 4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close navigation"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--surface-sunken, rgba(0,0,0,0.06))',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text, #1C1917)',
            }}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {content}
        </div>
      </motion.div>
    </motion.div>
  );
}
