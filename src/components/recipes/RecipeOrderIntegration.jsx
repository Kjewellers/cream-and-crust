import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react';

const FLOW_STEPS = [
  { icon: '✅', text: 'Recipe is scaled automatically' },
  { icon: '✅', text: 'Ingredients are deducted from inventory' },
  { icon: '✅', text: 'Preparation checklist is generated' },
  { icon: '✅', text: 'Baker gets notified' },
];

export default function RecipeOrderIntegration({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.2 }}
      className="rv-details"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rv-wizard-header">
        <button className="rv-circle-btn" onClick={onClose} aria-label="Back" type="button">
          <ArrowLeft size={18} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 18, flex: 1, margin: '0 12px' }}>
          Order Integration
        </div>
        <button
          className="rv-circle-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          type="button"
          style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--rv-dark)' }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="rv-wizard-content">
        {/* Flow diagram */}
        <div
          style={{
            background: 'var(--rv-pink-light)',
            borderRadius: 16,
            padding: '20px',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rv-muted)', marginBottom: 8 }}>
            WHEN AN ORDER IS PLACED
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div
              style={{
                background: 'var(--rv-pink)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 20,
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Order Placed
            </div>
            <ArrowRight size={20} color="var(--rv-pink)" />
            <div style={{ fontSize: 32 }}>📋</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FLOW_STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: '#fff',
                borderRadius: 12,
                padding: '16px',
                boxShadow: 'var(--rv-shadow-sm)',
                border: '1px solid var(--rv-border)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} color="#10B981" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{step.text}</div>
            </motion.div>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            background: 'var(--rv-cream)',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Fully Automated Flow</div>
          <div style={{ fontSize: 14, color: 'var(--rv-muted)', lineHeight: 1.6 }}>
            Every order automatically triggers the complete recipe workflow — from scaling to
            checklist generation.
          </div>
        </div>
      </div>

      <div className="rv-bottom-action">
        <button
          className="rv-btn-primary"
          onClick={() => {
            onClose();
            // Use hash navigation — compatible with HashRouter on Android
            window.location.hash = '/orders';
          }}
        >
          View Orders →
        </button>
      </div>
    </motion.div>
  );
}
