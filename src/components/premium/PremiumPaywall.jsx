/**
 * PremiumPaywall.jsx
 *
 * World-class subscription screen — driven by PurchaseStateMachine.
 *
 * Every purchase outcome is handled without crash:
 *  ✓ SUCCESS        — entitlement detected by SubscriptionContext → celebration
 *  ✓ CANCELLED      — silent close, scroll restored, no error shown
 *  ✓ PENDING        — amber banner, app stays fully usable
 *  ✓ FAILED         — friendly message + Retry + Restore + Continue Free
 *  ✓ OFFLINE        — "No internet" message
 *  ✓ RC_UNAVAILABLE — "Google Play unavailable" message
 *  ✓ 15s timeout    — spinner auto-recovers, never freezes
 *
 * Progressive design (3 stages driven by encounter count):
 *  Stage 1: Benefits showcase — no pressure
 *  Stage 2: Testimonials from real bakery owners
 *  Stage 3+: Free Trial CTA front-and-centre
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Crown, Zap,
  RotateCcw, Shield, Star, ChevronRight,
  WifiOff, AlertTriangle, Clock,
} from 'lucide-react';
import { useSubscriptionContext } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { getFeature } from '../../services/PremiumFeatureRegistry';
import { getPaywallEncounterCount, track } from '../../services/PremiumAnalytics';
import { isNativeAndroidRuntime } from '../../services/purchases';
import { PLAN, ANNUAL_PLAN } from '../../services/subscription';
import {
  PurchaseState,
  executePurchase,
  executeRestore,
} from '../../services/PurchaseStateMachine';

// ── Plan data (derived from centralized config) ───────────────────────────────────────────
const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: `${PLAN.currency}${PLAN.price}`,
    period: `/${PLAN.period}`,
    subtext: 'Billed monthly',
    popular: false,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: `${ANNUAL_PLAN.currency}${ANNUAL_PLAN.price.toLocaleString('en-IN')}`,
    period: `/${ANNUAL_PLAN.period}`,
    subtext: `Save ${ANNUAL_PLAN.currency}${ANNUAL_PLAN.savings} · ${ANNUAL_PLAN.currency}${ANNUAL_PLAN.monthlyEquivalent}/month`,
    popular: true,
  },
];

// Free vs Pro comparison
const COMPARISON = [
  { feature: 'Orders & Customers', free: true, pro: true },
  { feature: 'Basic Invoices', free: true, pro: true },
  { feature: 'Basic Inventory', free: true, pro: true },
  { feature: 'Basic Reports', free: true, pro: true },
  { feature: 'AI Invoice Generator', free: false, pro: true },
  { feature: 'Advanced Analytics', free: false, pro: true },
  { feature: 'Export Report PDFs', free: false, pro: true },
  { feature: 'Premium Invoice Themes', free: false, pro: true },
  { feature: 'Smart Inventory Forecasting', free: false, pro: true },
  { feature: 'Bulk Import & Export', free: false, pro: true },
];

const TESTIMONIALS = [
  {
    text: '"Premium paid for itself in the first week. The AI invoices alone save me an hour every day."',
    author: 'Priya M.', bakery: 'Sugar & Spice Bakery, Pune', rating: 5,
  },
  {
    text: '"The analytics showed me Sunday cakes bring 40% of my revenue. I doubled capacity and it worked."',
    author: 'Rajan K.', bakery: 'Sweet Moments, Bengaluru', rating: 5,
  },
  {
    text: '"My customers keep commenting on how professional my invoices look now. Worth every rupee."',
    author: 'Meera S.', bakery: 'Flour Power Bakery, Delhi', rating: 5,
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function StarRating({ count = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={11} fill="#F59E0B" color="#F59E0B" />
      ))}
    </div>
  );
}

function PlanCard({ plan, selected, onSelect, disabled }) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={() => !disabled && onSelect(plan.id)}
      style={{
        flex: 1,
        padding: '14px 12px',
        borderRadius: 16,
        border: selected ? '2px solid #D4A050' : '1.5px solid rgba(74,59,50,0.14)',
        background: selected ? 'linear-gradient(135deg, #FFF8F0, #FFF3E8)' : '#FFFDF9',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'center',
        position: 'relative',
        transition: 'all 0.18s ease',
        boxShadow: selected ? '0 4px 16px rgba(212,160,80,0.18)' : 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {plan.popular && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
          color: '#fff', fontSize: 9.5, fontWeight: 800,
          padding: '3px 10px', borderRadius: 99, letterSpacing: '0.06em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Best Value
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8C7A6B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {plan.label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#2D1B14', letterSpacing: '-0.02em' }}>
        {plan.price}
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8C7A6B' }}>{plan.period}</span>
      </div>
      <div style={{ fontSize: 11, color: '#D4A050', fontWeight: 600, marginTop: 3 }}>
        {plan.subtext}
      </div>
    </motion.button>
  );
}

// ── State-specific banners ────────────────────────────────────────────────────
function StateBanner({ purchaseState, friendlyMessage, onRetry, onContinueFree }) {
  if (!purchaseState || purchaseState === PurchaseState.IDLE) return null;

  const configs = {
    [PurchaseState.PENDING]: {
      bg: '#FFFBEB', border: 'rgba(245,158,11,0.30)', color: '#92400E',
      icon: <Clock size={14} />,
      text: friendlyMessage || 'Your purchase is being processed. Premium will unlock automatically once confirmed.',
      actions: null,
    },
    [PurchaseState.OFFLINE]: {
      bg: '#F8FAFC', border: 'rgba(100,116,139,0.25)', color: '#475569',
      icon: <WifiOff size={14} />,
      text: friendlyMessage || 'No internet connection. Check your network and try again.',
      actions: (
        <button onClick={onRetry} style={actionBtnStyle('#475569')}>Retry</button>
      ),
    },
    [PurchaseState.RC_UNAVAILABLE]: {
      bg: '#FFF7ED', border: 'rgba(234,88,12,0.22)', color: '#9A3412',
      icon: <AlertTriangle size={14} />,
      text: friendlyMessage || 'Google Play is temporarily unavailable. Please try again.',
      actions: (
        <button onClick={onRetry} style={actionBtnStyle('#9A3412')}>Try Again</button>
      ),
    },
    [PurchaseState.FAILED]: {
      bg: '#FFF1F2', border: 'rgba(244,63,94,0.22)', color: '#BE123C',
      icon: <AlertTriangle size={14} />,
      text: friendlyMessage || 'Something went wrong. Please try again.',
      actions: (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={onRetry} style={actionBtnStyle('#BE123C')}>Retry</button>
          <button onClick={onContinueFree} style={actionBtnStyle('#8C7A6B')}>Continue Free</button>
        </div>
      ),
    },
  };

  const cfg = configs[purchaseState];
  if (!cfg) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={{
        padding: '10px 14px', borderRadius: 10, marginBottom: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        fontSize: 12.5, color: cfg.color, lineHeight: 1.45,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <span style={{ marginTop: 1, flexShrink: 0 }}>{cfg.icon}</span>
        <span>{cfg.text}</span>
      </div>
      {cfg.actions}
    </motion.div>
  );
}

function actionBtnStyle(color) {
  return {
    background: 'none', border: `1px solid ${color}`,
    color, fontSize: 12, fontWeight: 700,
    padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PremiumPaywall() {
  const { paywallOpen, paywallFeatureKey, closePaywall } = useSubscriptionContext();
  const { currentUser } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [purchaseState, setPurchaseState] = useState(PurchaseState.IDLE);
  const [friendlyMessage, setFriendlyMessage] = useState('');
  const [stage, setStage] = useState(1);
  const [showComparison, setShowComparison] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const feature = paywallFeatureKey ? getFeature(paywallFeatureKey) : null;
  const isNative = isNativeAndroidRuntime();

  const isLoading = purchaseState === PurchaseState.LOADING ||
                    purchaseState === PurchaseState.PURCHASING ||
                    purchaseState === PurchaseState.VERIFYING;

  // Reset state when paywall opens
  useEffect(() => {
    if (!paywallOpen || !paywallFeatureKey) return;
    const count = getPaywallEncounterCount(paywallFeatureKey);
    setStage(Math.max(1, count >= 3 ? 3 : count));
    setPurchaseState(PurchaseState.IDLE);
    setFriendlyMessage('');
    setShowComparison(false);
  }, [paywallOpen, paywallFeatureKey]);

  const handleClose = useCallback(() => {
    if (isLoading) return; // Don't close while purchase is in-flight
    closePaywall(paywallFeatureKey, { cancelled: true });
    setPurchaseState(PurchaseState.IDLE);
  }, [closePaywall, isLoading, paywallFeatureKey]);

  const handlePurchase = useCallback(async () => {
    if (isLoading) return;

    track.purchaseStarted(paywallFeatureKey, selectedPlan);
    setFriendlyMessage('');

    const result = await executePurchase({
      userId: currentUser?.uid,
      selectedPlan,
      featureKey: paywallFeatureKey,
      onStateChange: (state) => {
        setPurchaseState(state);
      },
    });

    if (result.state === PurchaseState.CANCELLED) {
      // Silent close — not an error
      track.purchaseCancelled(paywallFeatureKey);
      closePaywall(paywallFeatureKey, { cancelled: true });
      setPurchaseState(PurchaseState.IDLE);
      return;
    }

    if (result.state === PurchaseState.SUCCESS) {
      // SubscriptionContext detects entitlement change → closes paywall + celebration
      track.purchaseCompleted(result.productId, paywallFeatureKey);
      return; // Don't reset state — context will close the paywall
    }

    // All failure states: show banner, keep paywall open
    setFriendlyMessage(result.friendlyMessage || '');
    setPurchaseState(result.state);
  }, [isLoading, isNative, paywallFeatureKey, selectedPlan, closePaywall]);

  const handleRetry = useCallback(() => {
    setPurchaseState(PurchaseState.IDLE);
    setFriendlyMessage('');
  }, []);

  const handleRestore = useCallback(async () => {
    if (restoring) return;

    if (!isNative) {
      setFriendlyMessage('Restore is only available in the Android app.');
      setPurchaseState(PurchaseState.FAILED);
      return;
    }

    setRestoring(true);
    setFriendlyMessage('');
    setPurchaseState(PurchaseState.LOADING);

    const result = await executeRestore({
      onStateChange: (state) => setPurchaseState(state),
    });

    setRestoring(false);

    if (result.state === PurchaseState.SUCCESS) {
      track.restoreSucceeded();
      // Entitlement listener detects change → closes paywall
      return;
    }

    setFriendlyMessage(result.friendlyMessage || '');
    setPurchaseState(result.state);
  }, [restoring, isNative]);

  // ── Stage content ───────────────────────────────────────────────────────────
  const renderStageContent = () => {
    const benefits = feature?.paywall?.benefits || [];
    const testimonialIndex = (stage - 2) % TESTIMONIALS.length;

    if (stage >= 2 && TESTIMONIALS[testimonialIndex]) {
      const t = TESTIMONIALS[testimonialIndex];
      return (
        <motion.div
          key={`stage-${stage}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, #FFF8F0, #FFF3E8)',
            border: '1px solid rgba(212,160,80,0.22)',
            borderRadius: 16, padding: '16px 18px', marginBottom: 16,
          }}
        >
          <StarRating count={t.rating} />
          <p style={{ fontSize: 13.5, color: '#4A3B32', fontStyle: 'italic', lineHeight: 1.55, margin: '8px 0 10px' }}>
            {t.text}
          </p>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>{t.author}</span>
            <span style={{ fontSize: 12, color: '#8C7A6B' }}> · {t.bakery}</span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key="stage-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {benefits.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '9px 0',
            borderBottom: i < benefits.length - 1 ? '1px solid rgba(74,59,50,0.06)' : 'none',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 11,
              background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
            }}>
              <Check size={12} color="#fff" strokeWidth={3} />
            </div>
            <span style={{ fontSize: 13.5, color: '#3D2B1F', lineHeight: 1.45, fontWeight: 500 }}>{b}</span>
          </div>
        ))}
      </motion.div>
    );
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {paywallOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="paywall-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={!isLoading ? handleClose : undefined}
            style={{ position: 'fixed', inset: 0, zIndex: 10100, background: 'rgba(0,0,0,0.65)' }}
          />

          {/* Sheet */}
          <motion.div
            key="paywall-sheet"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 10101,
              maxHeight: '92dvh',
              background: '#FFFDF9',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -16px 64px rgba(0,0,0,0.18)',
              fontFamily: '"Inter", system-ui, sans-serif',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(74,59,50,0.18)' }} />
            </div>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '14px 22px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26,
                  boxShadow: '0 4px 16px rgba(212,160,80,0.30)',
                }}>
                  {feature?.icon || '👑'}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#2D1B14', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {feature?.paywall?.title || 'Unlock Premium'}
                  </div>
                  {stage === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        marginTop: 5,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#fff', fontSize: 11, fontWeight: 800,
                        padding: '3px 10px', borderRadius: 99, letterSpacing: '0.04em',
                      }}
                    >
                      <Zap size={10} fill="#fff" />
                      3 Months FREE · Then ₹149/month
                    </motion.div>
                  )}
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={isLoading}
                aria-label="Close paywall"
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  border: '1px solid rgba(74,59,50,0.10)',
                  background: 'rgba(250,246,240,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#8C7A6B', cursor: isLoading ? 'default' : 'pointer',
                  opacity: isLoading ? 0.4 : 1, flexShrink: 0,
                }}
              >
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 22px 8px' }}>

              {/* Pitch line */}
              <p style={{ fontSize: 13.5, color: '#5C4F46', lineHeight: 1.55, margin: '0 0 16px' }}>
                {feature?.paywall?.pitch || 'Get access to the full power of Cream & Crust Pro.'}
              </p>

              {/* Progressive stage content */}
              {renderStageContent()}

              {/* Plan picker — disabled while loading */}
              <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
                {PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={setSelectedPlan}
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Comparison table toggle */}
              <button
                onClick={() => setShowComparison((v) => !v)}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 10,
                  border: '1px solid rgba(74,59,50,0.10)',
                  background: 'transparent', color: '#8C7A6B',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginBottom: 12,
                }}
              >
                {showComparison ? 'Hide comparison' : 'Compare Free vs Pro'}
                <ChevronRight size={13} style={{ transform: showComparison ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              <AnimatePresence>
                {showComparison && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: 16 }}
                  >
                    <div style={{ border: '1px solid rgba(74,59,50,0.10)', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', background: '#FAF7F4', padding: '8px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8C7A6B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Feature</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8C7A6B', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Free</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#D4A050', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pro</span>
                      </div>
                      {COMPARISON.map((row, i) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '1fr 64px 64px',
                          padding: '9px 12px',
                          background: i % 2 === 0 ? '#FFFDF9' : '#FAF7F4',
                          borderTop: '1px solid rgba(74,59,50,0.06)',
                        }}>
                          <span style={{ fontSize: 12.5, color: '#3D2B1F', fontWeight: 500 }}>{row.feature}</span>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {row.free ? <Check size={14} color="#10B981" strokeWidth={3} /> : <span style={{ color: '#D1C4BB', fontSize: 16, lineHeight: 1 }}>—</span>}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {row.pro ? <Check size={14} color="#D4A050" strokeWidth={3} /> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* State banner (error / pending / offline) */}
              <AnimatePresence>
                <StateBanner
                  purchaseState={purchaseState}
                  friendlyMessage={friendlyMessage}
                  onRetry={handleRetry}
                  onContinueFree={handleClose}
                />
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 22px',
              paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid rgba(74,59,50,0.07)',
              background: '#FFFDF9',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* CTA */}
              <motion.button
                whileTap={{ scale: isLoading ? 1 : 0.97 }}
                onClick={handlePurchase}
                disabled={isLoading || purchaseState === PurchaseState.PENDING}
                id="paywall-upgrade-btn"
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
                  background: isLoading
                    ? 'rgba(212,160,80,0.5)'
                    : 'linear-gradient(135deg, #D4A050 0%, #F5D78E 45%, #B8860B 100%)',
                  color: '#fff', fontWeight: 900, fontSize: 15.5,
                  cursor: isLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isLoading ? 'none' : '0 4px 20px rgba(212,160,80,0.40)',
                  letterSpacing: '-0.01em',
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    {purchaseState === PurchaseState.PURCHASING ? 'Opening Google Play…' : 'Processing…'}
                  </>
                ) : (
                  <>
                    <Crown size={16} fill="#fff" />
                    {stage >= 3 ? 'Start 3-Month Free Trial' : 'Upgrade to Pro'} · {selectedPlan === 'yearly' ? '₹1,500/yr' : '₹149/mo'}
                  </>
                )}
              </motion.button>

              {/* Secondary row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <button
                  onClick={handleRestore}
                  disabled={restoring || isLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: 'none', color: '#8C7A6B',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0,
                    opacity: (restoring || isLoading) ? 0.5 : 1,
                  }}
                >
                  <RotateCcw size={12} />
                  {restoring ? 'Restoring…' : 'Restore Purchases'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8C7A6B', fontSize: 11 }}>
                  <Shield size={11} />
                  30-day money-back guarantee
                </div>
              </div>

              {/* Free plan escape */}
              <button
                onClick={handleClose}
                disabled={isLoading}
                style={{
                  background: 'none', border: 'none',
                  color: '#B5A89E', fontSize: 12, fontWeight: 500,
                  cursor: isLoading ? 'default' : 'pointer',
                  padding: '2px 0', textAlign: 'center',
                  opacity: isLoading ? 0.4 : 1,
                }}
              >
                Continue with Free Plan
              </button>

              <div style={{ textAlign: 'center', fontSize: 10.5, color: '#C0B4AB', lineHeight: 1.5 }}>
                Cancel anytime · <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span> · <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Terms of Use</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
