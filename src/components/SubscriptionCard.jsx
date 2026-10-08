/**
 * SubscriptionCard — premium subscription UI for Settings/Profile.
 *
 * Shows the current plan status, features, and a CTA to subscribe.
 * All billing is handled via Google Play Billing (RevenueCat) on native Android.
 * On web, navigates to the /subscribe page.
 *
 * Monthly: ₹149/month | Annual: ₹1,499/year (save ₹289)
 * 3 months free trial via Play Console.
 *
 * NOTE: No client-side trial activation — all subscription writes come from
 * the RevenueCat webhook (Cloud Function) for security. Removing startFreeTrial()
 * client call prevents browser-console bypass attacks.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Sparkles, Star, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { PLAN, ANNUAL_PLAN } from '../services/subscription';
import { triggerHaptic } from './iOS';
import { useNavigate } from 'react-router-dom';

/* ─── Plan toggle pill ────────────────────────────────────────────────────── */
function PlanToggle({ selected, onSelect }) {
  const options = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Annual' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        background: 'rgba(74,59,50,0.06)',
        borderRadius: 12,
        padding: 3,
        marginBottom: 14,
        gap: 2,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 10,
            border: 'none',
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: selected === opt.id
              ? '#fff'
              : 'transparent',
            color: selected === opt.id ? '#2D1B14' : '#8C7A6B',
            boxShadow: selected === opt.id
              ? '0 1px 4px rgba(0,0,0,0.08)'
              : 'none',
          }}
        >
          {opt.label}
          {opt.id === 'yearly' && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 800,
              color: '#16A34A',
              marginLeft: 4,
              textTransform: 'uppercase',
            }}>
              Save ₹289
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function SubscriptionCard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { openPaywall } = useSubscriptionContext();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  // useSubscription uses onSnapshot — updates instantly when RevenueCat webhook fires.
  // No client-side writes — all subscription state comes from the server.
  const { isActive, isTrial, expiryDate, loading } = useSubscription();

  const handleSubscribe = () => {
    triggerHaptic('light');
    openPaywall('settings_subscription_card', selectedPlan);
  };

  const validExpiryDate = expiryDate && new Date(expiryDate).getTime() > Date.now() ? new Date(expiryDate) : null;
  const daysLeft = validExpiryDate
    ? Math.max(0, Math.ceil((validExpiryDate - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;
  const expiryLabel = validExpiryDate
    ? validExpiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : 'No Expiry';

  // Map to legacy shape for JSX below
  const status = {
    active: isActive,
    isTrial,
    expiresAt: expiryDate?.toISOString?.() ?? null,
    plan: isActive ? (isTrial ? 'trial' : 'pro') : 'free',
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
        Loading subscription...
      </div>
    );
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isActive
          ? 'linear-gradient(135deg, #FFF7F2 0%, #FFF0ED 50%, #FFFDFB 100%)'
          : 'linear-gradient(135deg, #FAF7F5 0%, #F5F0ED 100%)',
        borderRadius: 20,
        padding: '22px 20px',
        border: isActive ? '1.5px solid rgba(212,160,80,0.3)' : '1.5px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gold shimmer for active */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,160,80,0.15) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: isActive
              ? 'linear-gradient(135deg, #D4A050 0%, #B8860B 100%)'
              : 'rgba(74,59,50,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isActive ? '0 4px 12px rgba(212,160,80,0.3)' : 'none',
          }}
        >
          <Crown
            size={22}
            color={isActive ? '#fff' : '#8C7A6B'}
            fill={isActive ? '#fff' : 'none'}
          />
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}
          >
            {PLAN.name}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: isActive ? '#D4A050' : 'var(--text3)',
              fontWeight: 700,
            }}
          >
            {isActive
              ? isTrial
                ? `Free trial — ${daysLeft} days left`
                : `Active subscription`
              : status?.plan === 'expired'
                ? 'Subscription expired'
                : 'Upgrade your bakery'}
          </div>
        </div>
      </div>

      {/* Plan toggle & Price */}
      {!isActive && (
        <>
          {/* Monthly / Annual toggle */}
          <PlanToggle selected={selectedPlan} onSelect={(p) => { triggerHaptic('light'); setSelectedPlan(p); }} />

          {/* Price display */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: 'var(--text)',
                letterSpacing: '-0.03em',
              }}
            >
              ₹{selectedPlan === 'yearly' ? ANNUAL_PLAN.price : PLAN.price}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 600 }}>
              /{selectedPlan === 'yearly' ? ANNUAL_PLAN.period : PLAN.period}
            </span>
            {selectedPlan === 'yearly' && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#16A34A',
                  background: 'rgba(22,163,74,0.10)',
                  padding: '3px 10px',
                  borderRadius: 99,
                }}
              >
                Save ₹{ANNUAL_PLAN.savings} · ₹{ANNUAL_PLAN.monthlyEquivalent}/mo
              </span>
            )}
            <span
              style={{
                marginLeft: selectedPlan === 'yearly' ? 0 : 10,
                fontSize: 12,
                fontWeight: 800,
                color: '#D4A050',
                background: 'rgba(212,160,80,0.12)',
                padding: '3px 10px',
                borderRadius: 99,
              }}
            >
              3 months FREE
            </span>
          </div>
        </>
      )}

      {/* Features */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 12px',
          marginBottom: 18,
        }}
      >
        {(selectedPlan === 'yearly' && !isActive
          ? [...PLAN.features, ...ANNUAL_PLAN.features]
          : PLAN.features
        ).map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={13} color={isActive ? '#D4A050' : '#16A34A'} strokeWidth={3} />
            <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA — Subscribe via Google Play Billing */}
      {!status.active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            id="subscription-card-cta"
            onClick={handleSubscribe}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #D4A050 0%, #B8860B 100%)',
              color: '#fff',
              fontWeight: 900,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(212,160,80,0.3)',
            }}
          >
            <Sparkles size={17} />
            {status.plan === 'expired' ? 'Resubscribe to Pro' : 'Start 3 Months Free'}
          </button>

          {/* Restore Purchases — required by Play Store policy */}
          <button
            type="button"
            id="subscription-card-restore"
            onClick={handleSubscribe}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: 'var(--text3)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} />
            View Plans & Restore Purchases
          </button>
        </div>
      )}

      {isActive && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(212,160,80,0.08)',
            border: '1px solid rgba(212,160,80,0.15)',
          }}
        >
          <Star size={15} color="#D4A050" fill="#D4A050" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B8860B' }}>
            {isTrial
              ? `Trial ends ${expiryLabel}`
              : expiryDate
                ? `Renews ${expiryLabel}`
                : 'No Expiry'}
          </span>
        </div>
      )}
    </motion.div>
  );
}
