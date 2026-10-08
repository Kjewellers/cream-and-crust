/**
 * PremiumFeatureCard.jsx
 *
 * Wraps any premium feature with:
 *  - A visible PremiumBadge (always shown — never hidden)
 *  - Interactive preview (soft lock — user can explore)
 *  - On execute: calls useSubscriptionGate().executeProtectedAction()
 *
 * Usage:
 *  <PremiumFeatureCard
 *    featureKey="AI_INVOICE"
 *    action="GENERATE_AI_INVOICE"
 *    payload={{ orderId }}
 *    onExecute={() => actualAIInvoiceGeneration()}
 *    label="Generate AI Invoice"
 *  >
 *    <YourFeaturePreviewContent />
 *  </PremiumFeatureCard>
 */
import React from 'react';
import { motion } from 'framer-motion';
import { getFeature } from '../../services/PremiumFeatureRegistry';
import PremiumBadge from './PremiumBadge';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';

export default function PremiumFeatureCard({
  featureKey,
  action,
  payload = {},
  onExecute,           // called immediately if user is subscribed
  label,
  children,
  style,
  hideIfPro = false,   // if true, renders children directly when subscribed
}) {
  const { isPro, executeProtectedAction, openFeaturePreview } = useSubscriptionGate();
  const feature = getFeature(featureKey);

  // Pro users: render children directly
  if (isPro && hideIfPro) {
    return <>{children}</>;
  }

  const handleExecute = () => {
    executeProtectedAction({
      featureKey,
      action,
      payload,
      onAlreadyPro: onExecute,
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1.5px solid rgba(212,160,80,0.18)',
        background: '#FFFDF9',
        ...style,
      }}
    >
      {/* Premium badge — always visible */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 2,
      }}>
        <PremiumBadge variant={feature.badgeVariant || 'pro'} size="sm" />
      </div>

      {/* Feature content (preview — always shown) */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* Action footer */}
      {(onExecute || action) && (
        <div style={{
          display: 'flex', gap: 8, padding: '12px 16px',
          borderTop: '1px solid rgba(74,59,50,0.07)',
          background: 'linear-gradient(to right, #FFF8F0, #FFFDF9)',
        }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleExecute}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              border: isPro ? 'none' : '1.5px solid rgba(212,160,80,0.35)',
              background: isPro
                ? 'linear-gradient(135deg, #D4A050, #F5D78E)'
                : 'linear-gradient(135deg, rgba(212,160,80,0.15), rgba(245,215,142,0.15))',
              color: isPro ? '#fff' : '#D4A050',
              fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: isPro ? '0 2px 10px rgba(212,160,80,0.25)' : 'none',
            }}
          >
            {feature.icon} {label || feature.shortLabel}
            {!isPro && <span style={{ fontSize: 10, opacity: 0.7 }}>· Pro</span>}
          </motion.button>

          {!isPro && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => openFeaturePreview(featureKey)}
              style={{
                padding: '10px 14px', borderRadius: 12,
                border: '1.5px solid rgba(74,59,50,0.12)',
                background: '#FAF7F4', color: '#8C7A6B',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
            >
              Learn more
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}
