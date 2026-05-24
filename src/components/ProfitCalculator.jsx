import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calculator, IndianRupee } from 'lucide-react';
import { formatCurrency } from '../utils/date';
import { modalVariants } from '../utils/animations';

export default function ProfitCalculator({ open, onClose }) {
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');

  const numCost = Number(cost) || 0;
  const numPrice = Number(price) || 0;
  const profit = numPrice - numCost;
  const margin = numPrice > 0 ? (profit / numPrice) * 100 : 0;
  const markup = numCost > 0 ? (profit / numCost) * 100 : 0;

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <motion.div variants={modalVariants} initial="hidden" animate="show" exit="exit" className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(181,96,106,0.1)', padding: 8, borderRadius: 10 }}>
              <Calculator size={20} color="var(--accent)" />
            </div>
            <h3 style={{ margin: 0 }}>ROI / Profit Calculator</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="form-group full">
          <label className="form-label">Total Cost (Ingredients + Packaging)</label>
          <div style={{ position: 'relative' }}>
            <IndianRupee size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text3)' }} />
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} style={{ paddingLeft: 40 }} placeholder="0" />
          </div>
        </div>

        <div className="form-group full" style={{ marginTop: 12 }}>
          <label className="form-label">Proposed Selling Price</label>
          <div style={{ position: 'relative' }}>
            <IndianRupee size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text3)' }} />
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ paddingLeft: 40 }} placeholder="0" />
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--cream))', borderRadius: 16, padding: 20, marginTop: 24, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600, fontSize: '0.9rem' }}>Net Profit</span>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: profit > 0 ? '#2E7A5A' : 'var(--text)' }}>{formatCurrency(profit)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600, fontSize: '0.9rem' }}>Profit Margin</span>
            <span style={{ fontWeight: 800, color: margin >= 30 ? '#2E7A5A' : 'var(--accent2)' }}>{margin.toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600, fontSize: '0.9rem' }}>Markup (ROI)</span>
            <span style={{ fontWeight: 800 }}>{markup.toFixed(1)}%</span>
          </div>
        </div>
        
        <div style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text3)', textAlign: 'center', fontWeight: 500 }}>
          💡 Tip: Industry standard profit margin for home bakers is 30% - 50%.
        </div>
      </motion.div>
    </div>
  );
}
