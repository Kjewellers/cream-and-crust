import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { subscribeToErrors, dismissError } from '../../utils/notificationService';
import { GlassToast } from './GlassToast';
import { FloatingStatusBubble } from './FloatingStatusBubble';
import { AnimatedErrorCard } from './AnimatedErrorCard';
import { ErrorIllustrations } from './ErrorIllustrations';
import { useErrorAnimations, ErrorSprings } from './useErrorAnimations';

/**
 * ErrorPresenter.jsx
 * Replaces the legacy ToastContainer. Subscribes to the global error state
 * and renders the appropriate tier of error UI.
 */
export function ErrorPresenter() {
  const [errors, setErrors] = useState([]);
  const { rootScaleVariants } = useErrorAnimations();

  useEffect(() => {
    return subscribeToErrors((currentErrors) => {
      setErrors(currentErrors);
    });
  }, []);

  // Check if there is any Level 3 or 4 error currently visible
  const hasDimmingError = errors.some((e) => e.level >= 3);

  // Apply the scale down effect to the main app root if a Level 3/4 error is visible
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    
    // We apply classes or styles directly to achieve the cinematic effect on the root
    if (hasDimmingError) {
      root.style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), filter 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
      root.style.transform = 'scale(0.985)';
      root.style.filter = 'blur(4px) brightness(0.85)';
      root.style.borderRadius = '20px';
      root.style.overflow = 'hidden';
    } else {
      root.style.transform = 'scale(1)';
      root.style.filter = 'blur(0px) brightness(1)';
      root.style.borderRadius = '0px';
    }
  }, [hasDimmingError]);

  const renderError = (error) => {
    const handleDismiss = () => dismissError(error.id);
    
    switch (error.level) {
      case 1:
        return <GlassToast key={error.id} error={error} onDismiss={handleDismiss} />;
      case 2:
        return <FloatingStatusBubble key={error.id} error={error} onDismiss={handleDismiss} onRetry={error.onRetry} />;
      case 3:
        return <AnimatedErrorCard key={error.id} error={error} onDismiss={handleDismiss} onRetry={error.onRetry} />;
      case 4:
        return (
          <motion.div
            key={error.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={ErrorSprings.card}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#FDFBF7',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <ErrorIllustrations type={error.category} size={160} />
            <h1 style={{ marginTop: 32, fontSize: 24, fontWeight: 800, color: '#1A1412', textAlign: 'center' }}>
              {error.title || 'Critical Error'}
            </h1>
            <p style={{ marginTop: 12, fontSize: 16, color: '#665C58', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
              {error.message}
            </p>
            <button
              onClick={() => {
                if (error.onPrimary) error.onPrimary();
                handleDismiss();
              }}
              style={{
                marginTop: 40,
                padding: '16px 32px',
                background: 'var(--accent)',
                borderRadius: 24,
                fontSize: 16,
                fontWeight: 700,
                color: '#FFF',
                boxShadow: '0 12px 32px rgba(225, 90, 117, 0.4)',
              }}
            >
              {error.primaryLabel || 'Reload Application'}
            </button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const content = (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 'calc(100vw - 32px)',
        pointerEvents: 'none',
        height: '100%',
      }}
    >
      <AnimatePresence mode="wait">
        {errors.map(renderError)}
      </AnimatePresence>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
