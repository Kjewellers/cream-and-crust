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
 *  Stage 1: Benefits showcase
 *  Stage 2: Benefits and plan selection
 *  Stage 3+: Free trial availability for eligible accounts
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  X, Check, Crown, Zap,
  RotateCcw, Shield, ChevronRight,
  WifiOff, AlertTriangle, Clock,
} from 'lucide-react';
import { useSubscriptionContext } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { getFeature } from '../../services/PremiumFeatureRegistry';
import { getPaywallEncounterCount, track } from '../../services/PremiumAnalytics';
import {
  findPackageForPlan,
  getOfferings,
  initPurchases,
  isNativeAndroidRuntime,
} from '../../services/purchases';
import {
  PurchaseState,
  executePurchase,
  executeRestore,
} from '../../services/PurchaseStateMachine';
import { activateWebSubscription } from '../../services/webSubscriptionService';

// ── Plan data (derived from centralized config) ───────────────────────────────────────────
// Free vs Pro comparison
const COMPARISON = [
  { feature: 'Orders & Customers', free: true, pro: true },
  { feature: 'Invoices & inventory', free: true, pro: true },
  { feature: 'Advanced Recipe Costing', free: false, pro: true },
  { feature: 'Advanced analytics', free: false, pro: true },
  { feature: 'Digital menu builder', free: false, pro: true },
  { feature: 'CSV exports', free: false, pro: true },
];

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const {
    paywallOpen,
    paywallFeatureKey,
    pendingActionDescriptor,
    closePaywall,
  } = useSubscriptionContext();
  const { currentUser } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [purchaseState, setPurchaseState] = useState(PurchaseState.IDLE);
  const [friendlyMessage, setFriendlyMessage] = useState('');
  const [stage, setStage] = useState(1);
  const [showComparison, setShowComparison] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const feature = paywallFeatureKey ? getFeature(paywallFeatureKey) : null;
  const isNative = isNativeAndroidRuntime();
  const monthlyPackage = findPackageForPlan(offering, 'monthly');
  const yearlyPackage = findPackageForPlan(offering, 'yearly');
  const selectedPackage = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;
  const plans = isNative ? [
    {
      id: 'monthly',
      label: 'Monthly',
      price: monthlyPackage?.product?.priceString || (catalogLoading ? 'Loading…' : 'Unavailable'),
      period: monthlyPackage ? '/month' : '',
      subtext: monthlyPackage ? 'Billed monthly · Cancel anytime' : 'Not available in Google Play',
      popular: false,
      available: Boolean(monthlyPackage),
    },
    {
      id: 'yearly',
      label: 'Annual',
      price: yearlyPackage?.product?.priceString || (catalogLoading ? 'Loading…' : 'Unavailable'),
      period: yearlyPackage ? '/year' : '',
      subtext: yearlyPackage ? 'Billed yearly · Best value' : 'Not available in Google Play',
      popular: true,
      available: Boolean(yearlyPackage),
    },
  ] : [
    {
      id: 'monthly',
      label: 'Monthly',
      price: '₹149',
      period: '/month',
      subtext: 'Billed monthly · 14-day trial',
      popular: false,
      available: true,
    },
    {
      id: 'yearly',
      label: 'Annual',
      price: '₹1,499',
      period: '/year',
      subtext: '₹125/mo · Save 17%',
      popular: true,
      available: true,
    },
  ];

  const isLoading = purchaseState === PurchaseState.LOADING ||
                    purchaseState === PurchaseState.PURCHASING ||
                    purchaseState === PurchaseState.VERIFYING;

  useEffect(() => {
    if (!paywallOpen || !currentUser?.uid || !isNative) {
      setOffering(null);
      setCatalogLoading(false);
      return undefined;
    }

    let cancelled = false;
    setCatalogLoading(true);
    initPurchases(currentUser.uid)
      .then((ready) => ready ? getOfferings() : null)
      .then((currentOffering) => {
        if (!cancelled) setOffering(currentOffering);
      })
      .catch((error) => {
        console.warn('[PremiumPaywall] Failed to load store plans:', error?.message || error);
        if (!cancelled) setOffering(null);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paywallOpen, currentUser?.uid, isNative]);

  useEffect(() => {
    if (!offering) return;
    if (selectedPlan === 'yearly' && !yearlyPackage && monthlyPackage) {
      setSelectedPlan('monthly');
    } else if (selectedPlan === 'monthly' && !monthlyPackage && yearlyPackage) {
      setSelectedPlan('yearly');
    }
  }, [offering, selectedPlan, monthlyPackage, yearlyPackage]);

  useEffect(() => {
    if (!paywallOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) {
        closePaywall(paywallFeatureKey, { cancelled: true });
        setPurchaseState(PurchaseState.IDLE);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [paywallOpen, isLoading, closePaywall, paywallFeatureKey]);

  // Reset state when paywall opens
  useEffect(() => {
    if (!paywallOpen || !paywallFeatureKey) return;
    const count = getPaywallEncounterCount(paywallFeatureKey);
    setStage(Math.max(1, count >= 3 ? 3 : count));
    setPurchaseState(PurchaseState.IDLE);
    setFriendlyMessage('');
    setShowComparison(false);
    if (['monthly', 'yearly'].includes(pendingActionDescriptor?.planId)) {
      setSelectedPlan(pendingActionDescriptor.planId);
    } else {
      setSelectedPlan('yearly');
    }
  }, [paywallOpen, paywallFeatureKey, pendingActionDescriptor]);

  const handleClose = useCallback(() => {
    if (isLoading) return; // Don't close while purchase is in-flight
    closePaywall(paywallFeatureKey, { cancelled: true });
    setPurchaseState(PurchaseState.IDLE);
  }, [closePaywall, isLoading, paywallFeatureKey]);

  const handlePurchase = useCallback(async () => {
    if (isLoading || catalogLoading) return;

    if (!isNative) {
      // 🌐 First-class Web Pro subscription activation
      setPurchaseState(PurchaseState.PURCHASING);
      track.purchaseStarted(paywallFeatureKey, selectedPlan);
      setFriendlyMessage('');
      try {
        const planId = selectedPlan === 'yearly' ? 'web_pro_annual' : 'web_pro_monthly';
        await activateWebSubscription({ planId, isTrial: true });
        setPurchaseState(PurchaseState.SUCCESS);
        track.purchaseCompleted(planId, paywallFeatureKey);
        setTimeout(() => {
          closePaywall(paywallFeatureKey, { success: true });
        }, 800);
      } catch (err) {
        console.error('[WebPaywall] Activation error:', err);
        setFriendlyMessage(err.message || 'Web subscription activation failed.');
        setPurchaseState(PurchaseState.FAILED);
      }
      return;
    }

    if (!selectedPackage) return;

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
  }, [isLoading, catalogLoading, isNative, selectedPackage, paywallFeatureKey, selectedPlan, closePaywall]);

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

    return (
      <motion.div key={`stage-${stage}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-paywall-title"
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              maxWidth: 580,
              margin: '0 auto',
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
                  <div id="premium-paywall-title" style={{ fontSize: 17, fontWeight: 900, color: '#2D1B14', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
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
                      Free trial for eligible Google Play accounts
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

              {/* Store localized prices are the source of truth for displayed plans. */}
              <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={setSelectedPlan}
                    disabled={isLoading || catalogLoading || !plan.available}
                  />
                ))}
              </div>

              {!isNative && (
                <div
                  role="status"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#FFF7ED',
                    border: '1px solid rgba(212,160,80,0.25)',
                    color: '#6B5140',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  Subscribe securely through Google Play in the Cream &amp; Crust Android app.
                </div>
              )}

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
                disabled={isLoading || (isNative && (!selectedPackage || catalogLoading)) || purchaseState === PurchaseState.PENDING}
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
                {catalogLoading ? (
                  <>Loading plans…</>
                ) : isLoading ? (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    {purchaseState === PurchaseState.PURCHASING
                      ? (isNative ? 'Opening Google Play…' : 'Activating Web Pro…')
                      : 'Processing…'}
                  </>
                ) : (
                  <>
                    <Crown size={16} fill="#fff" />
                    {!isNative
                      ? `Start 14-Day Free Trial · ${selectedPlan === 'yearly' ? '₹1,499/yr' : '₹149/mo'}`
                      : !selectedPackage
                        ? 'Plan unavailable'
                        : `Continue with Google Play · ${selectedPackage.product?.priceString || ''}${selectedPlan === 'yearly' ? '/year' : '/month'}`}
                  </>
                )}
              </motion.button>

              {/* Secondary row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                {!isNative ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8C7A6B', fontSize: 12 }}>
                    <span>🌐 Web Pro Edition · Instant Browser Access</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRestore}
                    disabled={!isNative || restoring || isLoading}
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
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8C7A6B', fontSize: 11 }}>
                  <Shield size={11} />
                  {isNative ? 'Secure billing by Google Play' : 'Secure Cloud Billing · Cancel anytime'}
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
                Cancel anytime · <Link to="/privacy" style={{ color: 'inherit' }}>Privacy Policy</Link> · <Link to="/terms" style={{ color: 'inherit' }}>Terms of Use</Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
