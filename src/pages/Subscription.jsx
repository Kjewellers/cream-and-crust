/**
 * Subscription.jsx — Upgrade / paywall screen.
 *
 * On native Android: fetches RevenueCat packages and launches Google Play.
 * The trusted webhook mirrors verified subscription state to Firestore.
 *
 * On web / PWA: shows the plan UI with a "Available on Android app" notice
 * so the screen still looks great without crashing.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, ChevronLeft, Loader2, RefreshCw, Smartphone, Globe, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { usePurchases } from '../hooks/usePurchases';
import { findPackageForPlan } from '../services/purchases';
import { PLAN, ANNUAL_PLAN, WEB_PLANS } from '../services/subscription';
import { activateWebSubscription } from '../services/webSubscriptionService';
import { triggerHaptic } from '../components/iOS';

/* ─── Plan labels; localized prices come from Google Play at runtime. ─── */
const PLANS_DISPLAY = [
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    period: `/${PLAN.period}`,
    description: 'Pro access with monthly billing. Cancel through Google Play.',
    features: [
      'AI Bakery Assistant',
      'Advanced analytics',
      'Shareable digital menu',
      'CSV exports for bakery records',
    ],
    popular: false,
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    period: `/${ANNUAL_PLAN.period}`,
    description: 'The same Pro features with annual billing through Google Play.',
    features: [
      'AI Bakery Assistant',
      'Advanced analytics',
      'Shareable digital menu',
      'CSV exports for bakery records',
    ],
    popular: true,
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isPro, isTrial, expiryDate } = useSubscriptionContext();
  const { offering, offeringsLoading, purchasing, purchase, restore, isNativeApp } = usePurchases();
  const [webActivating, setWebActivating] = useState(null);
  const [webSuccess, setWebSuccess] = useState(false);

  /**
   * Find the RevenueCat package from the offering that matches the plan display item.
   * If offering isn't loaded yet (web / loading), returns null.
   */
  const getRcPackage = (planDisplay) => {
    return findPackageForPlan(offering, planDisplay.id.includes('annual') ? 'yearly' : 'monthly');
  };

  const handleSubscribe = async (planDisplay) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const pkg = getRcPackage(planDisplay);
    const success = await purchase(pkg);
    if (success) {
      setTimeout(() => {
        navigate('/');
      }, 1000);
    }
  };

  const handleWebSubscribe = async (plan) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setWebActivating(plan.id);
    try {
      triggerHaptic('medium');
      await activateWebSubscription({ planId: plan.id, isTrial: true });
      setWebSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('Web subscription error:', err);
      alert(err.message || 'Failed to activate web subscription.');
    } finally {
      setWebActivating(null);
    }
  };

  const handleRestore = async () => {
    const success = await restore();
    if (success) {
      setTimeout(() => {
        navigate('/');
      }, 1000);
    }
  };

  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFDF9', fontFamily: '"Inter", sans-serif' }}>
      {/* Header */}
      <header
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: '1px solid #F0EAE2',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          aria-label="Go back"
        >
          <ChevronLeft size={24} color="#2D1B14" />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#2D1B14', margin: 0 }}>
          {isNativeApp ? 'Upgrade to Pro' : 'Cream & Crust Web Pro'}
        </h1>
      </header>

      <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
        {/* Active subscription banner if user already has Pro */}
        {isPro && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(135deg, #FFF7F2 0%, #FFF0ED 100%)',
              border: '2px solid rgba(212,160,80,0.4)',
              borderRadius: 20,
              padding: '20px 22px',
              marginBottom: 30,
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(212,160,80,0.15)',
            }}
          >
            <div style={{ display: 'inline-flex', padding: 10, borderRadius: '50%', background: 'linear-gradient(135deg, #D4A050, #B8860B)', color: '#fff', marginBottom: 10 }}>
              <Crown size={28} fill="#fff" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#2D1B14', margin: '0 0 6px' }}>
              You're a Pro Baker! 👑
            </h3>
            <p style={{ fontSize: 13.5, color: '#5C4F46', margin: '0 0 12px' }}>
              {isTrial ? 'You are currently enjoying your free trial.' : 'Your Cream & Crust Pro access is fully active.'}
              {formattedExpiry && ` Access valid until ${formattedExpiry}.`}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 800 }}>
              <Check size={14} strokeWidth={3} /> All Pro Features Unlocked
            </div>
          </motion.div>
        )}

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              width: 84, height: 84,
              background: 'linear-gradient(135deg, #D4A050 0%, #B8860B 100%)',
              borderRadius: 26,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
              boxShadow: '0 12px 32px rgba(212,160,80,0.3)',
            }}
          >
            <Crown size={42} color="#fff" fill="#fff" />
          </motion.div>
          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 28, fontWeight: 700,
              color: '#2D1B14', margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Scale Your Bakery on {isNativeApp ? 'Android' : 'Web'}
          </h2>
          <p style={{ color: '#5C4F46', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
            Unlock AI recipe assistant, live digital menu storefront, custom invoice PDFs, and advanced analytics on any device.
          </p>

          {/* Trial badge */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 14, padding: '7px 16px', borderRadius: 99,
              background: 'rgba(212,160,80,0.1)',
              border: '1px solid rgba(212,160,80,0.25)',
              fontSize: 12.5, fontWeight: 700, color: '#B8860B',
            }}
          >
            ✨ {isNativeApp ? 'Free trial for eligible Google Play accounts' : '14-Day Free Trial included on Web Pro'}
          </div>
        </div>

        {/* Web Pro Edition Callout */}
        {!isNativeApp && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8F0 100%)',
              border: '1.5px solid rgba(212,160,80,0.3)',
              borderRadius: 18, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              marginBottom: 26,
              boxShadow: '0 4px 14px rgba(212,160,80,0.08)',
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(212,160,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Globe size={22} color="#B8860B" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: '#2D1B14', marginBottom: 2 }}>
                Web Browser Edition
              </div>
              <div style={{ fontSize: 13, color: '#66564B', lineHeight: 1.45 }}>
                Optimized for computer, laptop, tablet, and mobile browsers with independent web billing and instant activation.
              </div>
            </div>
          </motion.div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(!isNativeApp
            ? [WEB_PLANS.monthly, WEB_PLANS.yearly]
            : PLANS_DISPLAY
          ).map((plan, i) => {
            const isWebPlan = !isNativeApp;
            const rcPkg = isWebPlan ? null : getRcPackage(plan);
            const isPurchasing = isWebPlan ? webActivating === plan.id : purchasing;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: '#FFF',
                  border: plan.popular ? '2px solid #D4A050' : '1px solid #EAE2D8',
                  borderRadius: 24, padding: '26px 22px',
                  position: 'relative',
                  boxShadow: plan.popular
                    ? '0 16px 40px rgba(212,160,80,0.15)'
                    : '0 4px 16px rgba(0,0,0,0.05)',
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute', top: -14, left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #D4A050, #C28D3D)',
                      color: '#FFF', padding: '5px 18px', borderRadius: 99,
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}
                  >
                    Best Value
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <h3 style={{ fontSize: 21, fontWeight: 800, color: '#2D1B14', margin: 0 }}>
                    {plan.name}
                  </h3>
                </div>
                <p style={{ color: '#8A7A6E', fontSize: 13.5, margin: '0 0 18px', lineHeight: 1.5 }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#2D1B14', letterSpacing: '-0.03em' }}>
                    {isWebPlan
                      ? plan.priceFormatted
                      : (rcPkg?.product?.priceString ?? (offeringsLoading ? 'Loading…' : 'Unavailable'))}
                  </span>
                  <span style={{ fontSize: 14.5, color: '#8A7A6E', fontWeight: 600 }}>
                    {plan.period}
                  </span>
                  {isWebPlan && plan.savings && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: '#16A34A',
                        background: 'rgba(22,163,74,0.10)',
                        padding: '3px 9px',
                        borderRadius: 99,
                      }}
                    >
                      {plan.savings}
                    </span>
                  )}
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'rgba(212,160,80,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={12} color="#D4A050" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 13.5, color: '#5C4F46', fontWeight: 500 }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  id={`subscribe-btn-${plan.id}`}
                  onClick={() => (isWebPlan ? handleWebSubscribe(plan) : handleSubscribe(plan))}
                  disabled={isPurchasing || (isWebPlan ? false : (offeringsLoading || !rcPkg))}
                  style={{
                    width: '100%',
                    background: plan.popular
                      ? 'linear-gradient(135deg, #D4A050, #C28D3D)'
                      : '#2D1B14',
                    color: '#FFF', border: 'none',
                    padding: '15px', borderRadius: 16,
                    fontSize: 15.5, fontWeight: 700,
                    cursor: isPurchasing ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: isPurchasing ? 0.65 : 1,
                    transition: 'all 0.2s',
                    boxShadow: plan.popular ? '0 8px 24px rgba(212,160,80,0.3)' : 'none',
                  }}
                >
                  {isPurchasing ? (
                    <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Activating Web Pro...</>
                  ) : isWebPlan ? (
                    plan.popular
                      ? `Upgrade to Annual (${plan.priceFormatted}/yr)`
                      : `Start 14-Day Free Trial (${plan.priceFormatted}/mo)`
                  ) : offeringsLoading ? (
                    'Loading plans…'
                  ) : !rcPkg ? (
                    'Plan unavailable'
                  ) : (
                    'Continue with Google Play'
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Restore Purchases on Native Android */}
        {isNativeApp && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            id="restore-purchases-btn"
            onClick={handleRestore}
            disabled={purchasing}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, width: '100%', marginTop: 20,
              background: 'transparent', border: 'none',
              color: '#8A7A6E', fontSize: 14, fontWeight: 600,
              cursor: purchasing ? 'wait' : 'pointer',
              padding: '12px 0',
            }}
          >
            <RefreshCw size={15} />
            Restore Purchases
          </motion.button>
        )}

        {/* Fine print */}
        <p
          style={{
            textAlign: 'center', fontSize: 11.5, color: '#A09080',
            lineHeight: 1.6, marginTop: 20,
          }}
        >
          {isNativeApp
            ? 'Subscription renews automatically. Cancel anytime in Google Play. Payment charged to Google account.'
            : 'Web Pro subscription includes a 14-day free trial. Instant access across all web browsers.'}
        </p>
      </div>
    </div>
  );
}
