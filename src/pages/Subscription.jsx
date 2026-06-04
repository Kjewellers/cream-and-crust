/**
 * Subscription.jsx — Upgrade / paywall screen.
 *
 * On native Android: fetches real packages from RevenueCat, launches the
 * Google Play billing sheet on tap, and writes the entitlement to Firestore.
 *
 * On web / PWA: shows the plan UI with a "Available on Android app" notice
 * so the screen still looks great without crashing.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, ChevronLeft, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePurchases } from '../hooks/usePurchases';
import { PLAN } from '../services/subscription';

/* ─── Static plan display data (mirrors what's in Play Console) ─── */
const PLANS_DISPLAY = [
  {
    id: 'pro_monthly',       // must match Play Console product ID
    rcIdentifier: 'Monthly', // RevenueCat package identifier (MONTHLY)
    name: 'Pro Monthly',
    price: '₹149',
    period: '/month',
    description: 'Perfect for home bakers & small bakeries.',
    features: [
      'Unlimited Orders',
      'Invoice PDF & WhatsApp',
      'Analytics & Reports',
      'Inventory Management',
      'Recipe Studio',
      'Menu Builder & Website',
      'Priority Support',
    ],
    popular: false,
  },
  {
    id: 'pro_annual',
    rcIdentifier: 'Annual',
    name: 'Pro Annual',
    price: '₹1,499',
    period: '/year',
    description: 'Best value — save ₹289 vs monthly.',
    features: [
      'Everything in Monthly',
      '2 Months Free',
      'Advanced CSV Export',
      'Early Access to New Features',
    ],
    popular: true,
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { offering, offeringsLoading, purchasing, purchase, restore, isNativeApp } = usePurchases();

  /**
   * Find the RevenueCat package from the offering that matches the plan display item.
   * If offering isn't loaded yet (web / loading), returns null.
   */
  const getRcPackage = (planDisplay) => {
    if (!offering?.availablePackages) return null;
    return offering.availablePackages.find((p) =>
      p.identifier.toLowerCase().includes(planDisplay.rcIdentifier.toLowerCase())
    ) || null;
  };

  const handleSubscribe = async (planDisplay) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!isNativeApp) {
      // On web: inform user to use the Android app
      return;
    }

    const pkg = getRcPackage(planDisplay);
    if (!pkg) {
      // Fallback: offerings still loading or mismatch
      return;
    }

    await purchase(pkg);
  };

  const handleRestore = async () => {
    if (!isNativeApp) return;
    await restore();
  };

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
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#2D1B14', margin: 0 }}>Upgrade to Pro</h1>
      </header>

      <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              width: 88, height: 88,
              background: 'linear-gradient(135deg, #D4A050 0%, #B8860B 100%)',
              borderRadius: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 12px 32px rgba(212,160,80,0.3)',
            }}
          >
            <Crown size={44} color="#fff" fill="#fff" />
          </motion.div>
          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 30, fontWeight: 700,
              color: '#2D1B14', margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Scale Your Bakery
          </h2>
          <p style={{ color: '#5C4F46', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Unlock all premium features. Manage more orders, look professional,
            and save hours every week.
          </p>

          {/* Trial badge */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 14, padding: '8px 18px', borderRadius: 99,
              background: 'rgba(212,160,80,0.1)',
              border: '1px solid rgba(212,160,80,0.25)',
              fontSize: 13, fontWeight: 700, color: '#B8860B',
            }}
          >
            ✨ 3 months free trial included
          </div>
        </div>

        {/* Web notice */}
        {!isNativeApp && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#FFF7ED',
              border: '1px solid rgba(212,160,80,0.3)',
              borderRadius: 16, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              marginBottom: 28,
            }}
          >
            <Smartphone size={22} color="#D4A050" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#2D1B14', marginBottom: 2 }}>
                Subscribe on the Android App
              </div>
              <div style={{ fontSize: 13, color: '#5C4F46', lineHeight: 1.5 }}>
                Google Play subscriptions are processed inside the Cream &amp; Crust Android app.
                Download it from the Play Store to subscribe.
              </div>
            </div>
          </motion.div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {PLANS_DISPLAY.map((plan, i) => {
            const rcPkg = getRcPackage(plan);
            const isPurchasing = purchasing;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: '#FFF',
                  border: plan.popular ? '2px solid #D4A050' : '1px solid #EAE2D8',
                  borderRadius: 24, padding: '28px 24px',
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
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#2D1B14', margin: 0 }}>
                    {plan.name}
                  </h3>
                </div>
                <p style={{ color: '#8A7A6E', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
                  {plan.description}
                </p>

                {/* Price — show Play Console live price on native, static on web */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 22 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: '#2D1B14', letterSpacing: '-0.03em' }}>
                    {rcPkg?.product?.priceString ?? plan.price}
                  </span>
                  <span style={{ fontSize: 15, color: '#8A7A6E', fontWeight: 600 }}>
                    {plan.period}
                  </span>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(212,160,80,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={12} color="#D4A050" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 14, color: '#5C4F46', fontWeight: 500 }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  id={`subscribe-btn-${plan.id}`}
                  onClick={() => handleSubscribe(plan)}
                  disabled={isPurchasing || !isNativeApp || (isNativeApp && offeringsLoading)}
                  style={{
                    width: '100%',
                    background: plan.popular
                      ? 'linear-gradient(135deg, #D4A050, #C28D3D)'
                      : '#2D1B14',
                    color: '#FFF', border: 'none',
                    padding: '16px', borderRadius: 16,
                    fontSize: 16, fontWeight: 700,
                    cursor: isPurchasing || !isNativeApp ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: isPurchasing || (!isNativeApp) ? 0.65 : 1,
                    transition: 'opacity 0.2s',
                    boxShadow: plan.popular ? '0 8px 24px rgba(212,160,80,0.3)' : 'none',
                  }}
                >
                  {isPurchasing ? (
                    <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : !isNativeApp ? (
                    'Available on Android App'
                  ) : (
                    'Start Free Trial'
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Restore Purchases — required by Play Store policy */}
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
            lineHeight: 1.6, marginTop: 16,
          }}
        >
          Subscription renews automatically. Cancel anytime in Google Play.{'\n'}
          Payment will be charged to your Google account.
        </p>
      </div>
    </div>
  );
}
