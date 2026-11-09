import React from 'react';
import { Lock, Crown } from 'lucide-react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { useSubscription } from '../hooks/useSubscription';

export default function SubscriptionGate({ children, fallback, featureKey = 'generic' }) {
  const context = useSubscriptionContext();
  const sub = useSubscription();
  const isActive = Boolean(context?.isPro || sub?.isActive);
  const loading = Boolean(context?.subscriptionLoading ?? sub?.loading);
  const openPaywall = context?.openPaywall;

  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #EAE2D8', borderTopColor: '#D4A050', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (isActive) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div style={{
      background: '#FFFDF9',
      border: '1px dashed #EAE2D8',
      borderRadius: 16,
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      margin: '20px 0'
    }}>
      <div style={{
        width: 64, height: 64, background: '#FFF9F5', borderRadius: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        boxShadow: '0 4px 12px rgba(212,160,80,0.15)'
      }}>
        <Lock size={32} color="#D4A050" />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2D1B14', marginBottom: 8 }}>Premium Feature</h3>
      <p style={{ fontSize: 14, color: '#5C4F46', maxWidth: 300, marginBottom: 24 }}>
        This feature requires an active Cream & Crust Pro subscription.
      </p>
      <button 
        onClick={() => openPaywall(featureKey)}
        style={{
          background: 'linear-gradient(135deg, #D4A050, #C28D3D)',
          color: '#FFF',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 999,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(212,160,80,0.3)'
        }}
      >
        <Crown size={18} /> Upgrade to Pro
      </button>
    </div>
  );
}
