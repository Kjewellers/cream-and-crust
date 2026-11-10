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

  // Lock body scroll when any overlay is active
  useEffect(() => {
    if (overlays.length > 0) {
      const origOverflow = document.body.style.getPropertyValue('overflow');
      const origTouchAction = document.body.style.getPropertyValue('touch-action');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('touch-action', 'none', 'important');
      
      return () => {
        if (origOverflow) document.body.style.setProperty('overflow', origOverflow);
        else document.body.style.removeProperty('overflow');
        
        if (origTouchAction) document.body.style.setProperty('touch-action', origTouchAction);
        else document.body.style.removeProperty('touch-action');
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

  let component = null;
  if (type === 'sheet') {
    component = <GlobalSheet {...overlay} onClose={onClose} />;
  } else if (type === 'modal') {
    component = <GlobalModal {...overlay} onClose={onClose} />;
  } else if (type === 'drawer') {
    component = <GlobalDrawer {...overlay} onClose={onClose} />;
  }

  if (!component) return null;
  return <OverlayErrorBoundary onClose={onClose}>{component}</OverlayErrorBoundary>;
}

// ── Global Sheet Implementation ──────────────────────────────
function GlobalSheet({ id, title, subtitle, content, showClose = true, onClose, maxHeight = '90dvh' }) {
  const closingRef = useRef(false);
  const dragControls = useDragControls();

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="cc-sheet-wrapper"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          touchAction: 'none',
        }}
      />
      <motion.div
        initial={{ y: '100%', opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.25 }}
        onDragEnd={(e, info) => {
          if (info.velocity.y > 200 || info.offset.y > 100) handleClose();
        }}
        className="cc-sheet-card"
        style={{ maxHeight }}
      >
        {/* Grab Handle Header - Draggable */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 12,
            paddingBottom: 6,
            touchAction: 'none',
            cursor: 'grab',
          }}
        >
          <div style={{ width: 44, height: 5, borderRadius: 3, background: 'var(--text-muted, #ccc)', opacity: 0.6 }} />
        </div>

        {(title || showClose) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px', flexShrink: 0, borderBottom: '1px solid var(--hairline)' }}>
            <div>
              {title && <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{title}</h2>}
              {subtitle && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text2)' }}>{subtitle}</p>}
            </div>
            {showClose && (
              <button
                onClick={handleClose}
                style={{
                  background: 'var(--surface-sunken)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text)', flexShrink: 0,
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px 24px', WebkitOverflowScrolling: 'touch' }}>
          {content}
        </div>
      </motion.div>
    </div>
  );
}

// ── Global Modal Implementation ──────────────────────────────
function GlobalModal({ id, title, subtitle, content, showClose = true, onClose, maxWidth = 480 }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="cc-modal-wrapper"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="cc-modal-card"
        style={{ maxWidth }}
      >
        {(title || showClose) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
            <div>
              {title && <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>}
              {subtitle && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text3)' }}>{subtitle}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'var(--surface-sunken)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--text2)', padding: 0,
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: '20px', flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
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
      transition={{ duration: 0.25 }}
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
        }}
      />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        onDragEnd={(e, info) => {
          if (info.velocity.x < -150 || info.offset.x < -60) onClose();
        }}
        className="cc-drawer-card"
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px 4px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--surface-sunken)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
            }}
          >
            <X size={16} />
          </button>
        </div>
        {content}
      </motion.div>
    </motion.div>
  );
}
