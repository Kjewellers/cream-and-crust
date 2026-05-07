import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Check, ShieldCheck, Zap, Clock, AlertCircle, Plus, X, ArrowRight } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';

export default function Billing() {
  const { subscription, isPro, isTrial, isExpired, daysRemaining, loading } = useSubscription();
  const { currentUser } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  if (loading) return <div className="loading" style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Billing...</div>;

  const handleRazorpaySubscription = async () => {
    setUpgrading(true);
    setError(null);

    try {
      // 1. Create subscription on server
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_BASE}/api/payments/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.uid,
          planId: 'plan_PhH2O0wW2w2w2w' // Ensure this matches your ₹250 plan in Razorpay
        })
      });
      
      const subData = await response.json();
      if (!subData.id) throw new Error('Subscription creation failed: ' + (subData.error || 'Unknown error'));

      // 2. Open Razorpay Checkout for Subscription
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use env var
        subscription_id: subData.id,
        name: 'Cream & Crust',
        description: 'Bakery Pro Subscription (₹250/mo)',
        handler: async function (response) {
          // Payment successful on client side
          setSuccess(true);
          setUpgrading(false);
          setTimeout(() => {
            setShowUpgradeModal(false);
            setSuccess(false);
            window.location.reload(); 
          }, 5000);
        },
        prefill: {
          name: currentUser?.displayName || '',
          email: currentUser?.email || '',
        },
        theme: {
          color: '#d69e8c'
        },
        modal: {
          ondismiss: function() {
            setUpgrading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description);
        setUpgrading(false);
      });
      rzp.open();

    } catch (err) {
      console.error('Subscription initialization error:', err);
      setError('Could not start subscription. Please try again.');
      setUpgrading(false);
    }
  };

  const plans = [
    {
      name: 'Basic / Trial',
      price: 'Free',
      period: '30 Days',
      features: ['Order Management', 'Basic Product Catalog', 'Customer Database'],
      current: isTrial,
      btn: 'Current Plan',
      color: 'var(--text3)'
    },
    {
      name: 'Bakery Pro',
      price: '₹250',
      period: '/ month',
      features: ['Everything in Basic', 'Inventory Management', 'Recipe Costing', 'Sales Analytics', 'Priority Support'],
      current: isPro,
      btn: isPro ? 'Current Plan' : 'Upgrade Now',
      color: 'var(--accent)'
    }
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Subscription & Billing</h1>
        <p>Manage your bakery's plan and payment settings.</p>
      </div>

      {(isExpired || subscription?.isExpired) && !isPro && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '20px', borderRadius: 'var(--radius)', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #ffeeba' }}>
          <AlertCircle size={24} />
          <div>
            <h4 style={{ margin: 0 }}>Trial Expired</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Your 30-day free trial has ended. Please upgrade to Pro to continue using all features.</p>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card purple">
          <div className="stat-icon purple"><ShieldCheck /></div>
          <div className="stat-label">Current Plan</div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>{isPro ? 'Bakery Pro' : 'Free Trial'}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><Clock /></div>
          <div className="stat-label">Trial Status</div>
          <div className="stat-value">{isTrial ? `${daysRemaining} Days Left` : (isPro ? 'Active Member' : 'Expired')}</div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon pink"><CreditCard /></div>
          <div className="stat-label">Next Billing</div>
          <div className="stat-value">{isPro ? 'Next Month' : 'N/A'}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: 20, marginTop: 40 }}>Choose Your Plan</h2>
      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {plans.map((plan, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className={`card ${plan.current ? 'active-plan' : ''}`} 
            style={{ 
              border: plan.current ? `2px solid ${plan.color}` : '1px solid var(--border)', 
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {plan.current && (
              <div style={{ position: 'absolute', top: 0, right: 0, background: plan.color, color: 'white', padding: '4px 12px', borderRadius: '0 0 0 12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Active
              </div>
            )}
            <h3 style={{ fontSize: '1.4rem', marginBottom: 10 }}>{plan.name}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 20 }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text)' }}>{plan.price}</span>
              <span style={{ color: 'var(--text3)' }}>{plan.period}</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 30 }}>
              {plan.features.map((f, j) => (
                <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: '0.95rem', color: 'var(--text2)' }}>
                  <Check size={16} style={{ color: 'var(--mint)' }} /> {f}
                </li>
              ))}
            </ul>

            <button 
              className={`btn ${plan.current ? 'btn-outline' : 'btn-primary'}`} 
              style={{ width: '100%', padding: '15px' }}
              disabled={plan.current || upgrading}
              onClick={() => plan.name === 'Bakery Pro' && setShowUpgradeModal(true)}
            >
              {plan.btn}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="modal-card" 
              style={{ maxWidth: 450, padding: 0, overflow: 'hidden' }}
            >
              <div style={{ background: 'var(--accent)', color: 'white', padding: '30px', textAlign: 'center', position: 'relative' }}>
                <button onClick={() => setShowUpgradeModal(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                <Zap size={48} style={{ marginBottom: 15 }} />
                <h2 style={{ color: 'white', margin: 0 }}>Upgrade to Pro</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '10px 0 0' }}>Join 100+ bakers growing their business.</p>
              </div>

              <div style={{ padding: '30px' }}>
                {!success ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <span style={{ fontWeight: 600 }}>Bakery Pro Monthly</span>
                      <span style={{ fontWeight: 700 }}>₹250.00</span>
                    </div>
                    
                    {error && (
                      <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: '0.85rem', marginBottom: 20 }}>
                        {error}
                      </div>
                    )}

                    <button 
                      className="btn btn-primary" 
                      onClick={handleRazorpaySubscription} 
                      disabled={upgrading} 
                      style={{ width: '100%', padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
                    >
                      {upgrading ? 'Processing...' : <><CreditCard size={18} /> Subscribe with Razorpay</>}
                    </button>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text3)', textAlign: 'center', marginTop: 20 }}>
                      Secure payment via Razorpay. Your subscription will be activated automatically after verification.
                    </p>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--mint)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem' }}>✓</div>
                    <h3 style={{ margin: 0 }}>Payment Verification in Progress</h3>
                    <p style={{ color: 'var(--text3)', marginTop: 10 }}>We are verifying your payment. Your Pro features will be unlocked within a few minutes.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


