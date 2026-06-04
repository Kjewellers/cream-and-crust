/**
 * SubscriptionCard — premium subscription UI for Settings/Profile.
 *
 * Shows the current plan status, features, and a CTA to subscribe.
 * All billing is handled via Google Play Billing (RevenueCat) on native Android.
 * On web, navigates to the /subscribe page.
 *
 * ₹149/month with 3 months free trial via Play Console.
 *
 * NOTE: No client-side trial activation — all subscription writes come from
 * the RevenueCat webhook (Cloud Function) for security. Removing startFreeTrial()
 * client call prevents browser-console bypass attacks.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Sparkles, Star, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PLAN } from '../services/subscription';
import { triggerHaptic } from './iOS';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionCard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  // useSubscription uses onSnapshot — updates instantly when RevenueCat webhook fires.
  // No client-side writes — all subscription state comes from the server.
  const { isActive, isTrial, expiryDate, loading } = useSubscription();

  const handleSubscribe = () => {
    triggerHaptic('light');
    navigate('/subscribe');
  };

  const daysLeft = expiryDate
    ? Math.max(0, Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

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

      {/* Price */}
      {!isActive && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
            }}
          >
            ₹{PLAN.price}
          </span>
          <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 600 }}>
            /{PLAN.period}
          </span>
          <span
            style={{
              marginLeft: 10,
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
        {PLAN.features.map((f) => (
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
              ? `Trial ends ${new Date(status.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : `Renews ${new Date(status.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </span>
        </div>
      )}
    </motion.div>
  );
}
