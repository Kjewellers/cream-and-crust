import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Plus, Scale, Info } from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';

export default function BatchScaler({ recipe, currentMult, onApply, onClose }) {
  const [targetYield, setTargetYield] = useState(currentMult);
  const yieldStr = recipe.yield || '1 Batch';
  const baseYield = parseInt(yieldStr) || 1; 
  const yieldUnit = yieldStr.replace(/[0-9.]/g, '').trim() || 'Servings';

  const adjust = (amount) => {
    setTargetYield(prev => {
      const next = Math.max(0.5, prev + amount);
      triggerHaptic('light');
      return Number(next.toFixed(1));
    });
  };

  const handleApply = () => {
    triggerHaptic('medium');
    onApply(targetYield);
    showToast(`Scaled to ${targetYield}x batch`);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: 'var(--r-bg)', padding: '24px 20px 40px', borderRadius: '24px 24px 0 0', boxShadow: 'var(--r-shadow-lg)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--r-dark)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale size={20} color="var(--r-accent)" />
            Batch Scaler
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--r-surface)', border: '1px solid var(--r-border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-mid)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ background: 'var(--r-surface)', border: '1px solid var(--r-border)', borderRadius: 'var(--r-radius-lg)', padding: 20, marginBottom: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--r-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
              Target Batch Size
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--r-dark)', letterSpacing: '-0.05em', lineHeight: 1 }}>
              {targetYield}x
            </div>
            <div style={{ fontSize: 14, color: 'var(--r-mid)', marginTop: 8 }}>
              Yields ~{(baseYield * targetYield).toFixed(1)} {yieldUnit}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <button onClick={() => adjust(-0.5)} style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--r-bg)', border: '1px solid var(--r-border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-dark)' }}>
              <Minus size={24} />
            </button>
            <div style={{ width: 1, height: 40, background: 'var(--r-border-md)' }} />
            <button onClick={() => adjust(0.5)} style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--r-bg)', border: '1px solid var(--r-border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-dark)' }}>
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--r-accent-lt)', borderRadius: 'var(--r-radius-sm)', padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 24 }}>
          <Info size={16} color="var(--r-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: 'var(--r-accent)', lineHeight: 1.5 }}>
            Cost and ingredient quantities will be automatically adjusted across the recipe.
          </div>
        </div>

        <button onClick={handleApply} className="rv-btn-primary" style={{ width: '100%' }}>
          Apply {targetYield}x Scaling
        </button>
      </motion.div>
    </div>
  );
}
