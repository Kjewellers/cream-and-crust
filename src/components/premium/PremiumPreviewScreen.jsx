/**
 * PremiumPreviewScreen.jsx
 *
 * First-tap feature showcase modal.
 *
 * When a free user taps a premium feature for the first time, this screen:
 *  - Explains what the feature does
 *  - Shows key benefits and bakery-specific examples
 *  - Lets users "Explore Feature" (enter preview mode) or "Maybe Later"
 *  - NEVER immediately asks for payment — builds value first
 *
 * Called from useSubscriptionGate via SubscriptionContext.openPreview().
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, ChevronRight } from 'lucide-react';
import { getFeature } from '../../services/PremiumFeatureRegistry';
import PremiumBadge from './PremiumBadge';
import { useSubscriptionContext } from '../../context/SubscriptionContext';

export default function PremiumPreviewScreen() {
  const { previewOpen, previewFeatureKey, closePreview, openPaywall } = useSubscriptionContext();
  const feature = previewFeatureKey ? getFeature(previewFeatureKey) : null;

  if (typeof document === 'undefined') return null;

  const handleUpgrade = () => {
    closePreview();
    openPaywall(previewFeatureKey);
  };

  const content = (
    <AnimatePresence>
      {previewOpen && feature && (
        <>
          {/* Backdrop */}
          <motion.div
            key="preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closePreview}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.60)',
            }}
          />

          {/* Modal */}
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
              position: 'fixed',
              inset: 0,
              margin: 'auto',
              zIndex: 10001,
              width: 'calc(100% - 32px)',
              maxWidth: 420,
              height: 'fit-content',
              maxHeight: '88dvh',
              background: '#FFFDF9',
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.10)',
              fontFamily: '"Inter", system-ui, sans-serif',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header gradient */}
            <div style={{
              background: 'linear-gradient(160deg, #FFF8F0 0%, #FFF3E8 60%, #FFFDF9 100%)',
              padding: '28px 24px 22px',
              borderBottom: '1px solid rgba(74,59,50,0.07)',
              position: 'relative',
            }}>
              {/* Close */}
              <button
                onClick={closePreview}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 32, height: 32, borderRadius: 10,
                  border: '1px solid rgba(74,59,50,0.10)',
                  background: 'rgba(250,246,240,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#8C7A6B', cursor: 'pointer',
                }}
              >
                <X size={15} strokeWidth={2.4} />
              </button>

              {/* Feature icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                style={{
                  width: 72, height: 72, borderRadius: 22,
                  background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 34,
                  boxShadow: '0 8px 24px rgba(212,160,80,0.30)',
                  marginBottom: 16,
                }}
              >
                {feature.icon}
              </motion.div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#2D1B14', margin: 0, letterSpacing: '-0.02em' }}>
                  {feature.previewScreen?.headline || feature.label}
                </h2>
                <PremiumBadge variant={feature.badgeVariant || 'pro'} size="sm" />
              </div>
              <p style={{ fontSize: 14, color: '#5C4F46', margin: 0, lineHeight: 1.55 }}>
                {feature.previewScreen?.description || feature.paywall?.pitch}
              </p>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', WebkitOverflowScrolling: 'touch' }}>

              {/* Previews list */}
              {feature.previewScreen?.previews?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8C7A6B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                    What you'll get
                  </div>
                  {feature.previewScreen.previews.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.07 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 0',
                        borderBottom: i < feature.previewScreen.previews.length - 1 ? '1px solid rgba(74,59,50,0.06)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 11,
                        background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 14, color: '#3D2B1F', lineHeight: 1.45, fontWeight: 500 }}>{item}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Testimonial */}
              {feature.paywall?.testimonial && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    background: 'linear-gradient(135deg, #FFF8F0, #FFF3E8)',
                    border: '1px solid rgba(212,160,80,0.20)',
                    borderRadius: 16,
                    padding: '14px 16px',
                    marginBottom: 20,
                  }}
                >
                  <p style={{ fontSize: 13, color: '#4A3B32', fontStyle: 'italic', lineHeight: 1.5, margin: '0 0 8px' }}>
                    {feature.paywall.testimonial.text}
                  </p>
                  <p style={{ fontSize: 11.5, color: '#D4A050', fontWeight: 700, margin: 0 }}>
                    — {feature.paywall.testimonial.author}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer CTAs */}
            <div style={{
              padding: '16px 24px',
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid rgba(74,59,50,0.07)',
              display: 'flex', flexDirection: 'column', gap: 10,
              background: '#FFFDF9',
            }}>
              <button
                onClick={handleUpgrade}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #D4A050 0%, #F5D78E 50%, #B8860B 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 16px rgba(212,160,80,0.35)',
                  letterSpacing: '-0.01em',
                }}
              >
                <Sparkles size={16} />
                Start 3-Month Free Trial
                <ChevronRight size={16} />
              </button>
              <button
                onClick={closePreview}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 12,
                  border: '1px solid rgba(74,59,50,0.12)',
                  background: 'transparent',
                  color: '#8C7A6B', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
