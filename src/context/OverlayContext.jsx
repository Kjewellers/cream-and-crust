import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export const OverlayContext = createContext(null);

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within an OverlayProvider');
  return ctx;
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
    <OverlayContext.Provider value={{ openOverlay, closeOverlay, closeAll, openSheet, openModal, openDrawer }}>
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
function OverlayRenderer({ overlay, onClose, isTop }) {
  const { type, content, title, subtitle, showClose = true, dismissible = true, customProps = {} } = overlay;

  if (type === 'sheet') {
    return <GlobalSheet {...overlay} onClose={onClose} />;
  }
  if (type === 'modal') {
    return <GlobalModal {...overlay} onClose={onClose} />;
  }
  if (type === 'drawer') {
    return <GlobalDrawer {...overlay} onClose={onClose} />;
  }
  return null;
}

// ── Global Sheet Implementation ──────────────────────────────
function GlobalSheet({ id, title, subtitle, content, showClose = true, onClose, maxHeight = '90dvh' }) {
  const closingRef = useRef(false);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
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
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.2 }}
        onDragEnd={(e, info) => {
          if (info.velocity.y > 200 || info.offset.y > 100) handleClose();
        }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          maxHeight,
          background: 'var(--surface-elevated, #FFF)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, touchAction: 'none' }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--text-muted, #ccc)', opacity: 0.6 }} />
        </div>

        {(title || showClose) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', flexShrink: 0 }}>
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

        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 20px 20px' }}>
          {content}
        </div>
      </motion.div>
    </div>
  );
}

// ── Global Modal Implementation ──────────────────────────────
function GlobalModal({ id, title, subtitle, content, showClose = true, onClose, maxWidth = 420 }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)', touchAction: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        style={{
          position: 'relative', width: '90%', maxWidth,
          background: 'var(--surface-elevated, #FFF)', borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90dvh',
        }}
      >
        {(title || showClose) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 20px 10px', flexShrink: 0 }}>
            <div>
              {title && <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>}
              {subtitle && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text3)' }}>{subtitle}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--text2)', padding: 4, margin: '-4px',
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div style={{ padding: title ? '10px 20px 20px' : '20px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {content}
        </div>
      </motion.div>
    </div>
  );
}

// ── Global Drawer Implementation ──────────────────────────────
function GlobalDrawer({ id, content, onClose }) {
  return (
    <div
      role="navigation"
      aria-modal="true"
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
        }}
      />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={(e, info) => {
          if (info.velocity.x < -200 || info.offset.x < -80) onClose();
        }}
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: '280px', maxWidth: '85vw', height: '100dvh',
          background: 'var(--surface-elevated)',
          boxShadow: '18px 0 60px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
          padding: 'env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0',
          overscrollBehavior: 'contain', touchAction: 'pan-y',
        }}
      >
        {content}
      </motion.div>
    </div>
  );
}
