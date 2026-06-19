import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, X } from 'lucide-react';

/**
 * PwaUpdateToast — listens to the vite-plugin-pwa service-worker
 * registration. When a new bundle is waiting, it shows a friendly
 * toast offering "Refresh" so the user gets the latest features
 * without having to hard-reload manually.
 *
 * Uses the virtual module `virtual:pwa-register/react` exposed by
 * vite-plugin-pwa. We dynamic-import it so test/non-PWA environments
 * (where the virtual module doesn't exist) just render nothing.
 */
export default function PwaUpdateToast() {
  const [Inner, setInner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('virtual:pwa-register/react')
      .then((mod) => {
        if (cancelled) return;
        const { useRegisterSW } = mod;
        if (typeof useRegisterSW !== 'function') return;
        setInner(() => makeInner(useRegisterSW));
      })
      .catch(() => {
        // Module not available — silently no-op.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Inner) return null;
  return <Inner />;
}

function makeInner(useRegisterSW) {
  return function Inner() {
    const {
      needRefresh: [needRefresh, setNeedRefresh],
      updateServiceWorker,
    } = useRegisterSW({
      onRegisterError(err) {
         
        console.warn('[PwaUpdateToast] SW register error:', err);
      },
    });

    const dismiss = () => setNeedRefresh(false);
    const refresh = () => updateServiceWorker(true);

    return (
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
              zIndex: 10090,
              maxWidth: 'calc(100% - 24px)',
              width: 360,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 18,
              background:
                'linear-gradient(135deg, rgba(255,253,250,0.97) 0%, rgba(255,247,242,0.97) 100%)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(181, 96, 106, 0.18)',
              boxShadow: '0 14px 40px rgba(181, 96, 106, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
              color: '#2D1B14',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background:
                  'linear-gradient(135deg, var(--accent, #B5606A) 0%, var(--accent2, #D4A050) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
              }}
            >
              <Sparkles size={17} strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  color: '#2D1B14',
                }}
              >
                A fresh batch is ready
              </div>
              <div style={{ fontSize: 12, color: '#8C7A6B', marginTop: 1 }}>
                Tap refresh to load the latest version.
              </div>
            </div>
            <button
              type="button"
              onClick={refresh}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--accent, #B5606A), #C87A82)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 12.5,
                boxShadow: '0 4px 12px rgba(181, 96, 106, 0.28)',
              }}
            >
              <RefreshCw size={13} strokeWidth={2.6} /> Refresh
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: '#B5A89E',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };
}
