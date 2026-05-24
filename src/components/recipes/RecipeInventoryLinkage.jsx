import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const LINKED = [
  { name: 'All Purpose Flour', qty: '10 kg', status: 'In Stock', color: '#10B981', bg: '#D1FAE5' },
  { name: 'Cocoa Powder',      qty: '2 kg',  status: 'In Stock', color: '#10B981', bg: '#D1FAE5' },
  { name: 'Butter',            qty: '1.5 kg', status: 'Low Stock', color: '#F59E0B', bg: '#FEF3C7' },
  { name: 'Dark Chocolate',    qty: '1 kg',  status: 'In Stock', color: '#10B981', bg: '#D1FAE5' },
];

export default function RecipeInventoryLinkage({ onClose }) {
  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="rv-details" style={{ zIndex: 120 }}
    >
      <div className="rv-wizard-header">
        <button className="rv-circle-btn" onClick={onClose}><ArrowLeft size={20} /></button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Inventory Linkage</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="rv-wizard-content">
        <div style={{ background: 'var(--rv-pink-light)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--rv-pink)', marginBottom: 4 }}>
            📦 Auto-Deduction Active
          </div>
          <div style={{ fontSize: 13, color: 'var(--rv-muted)' }}>
            When an order is placed, ingredients are automatically deducted from inventory.
          </div>
        </div>

        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Linked Ingredients</div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--rv-border)', overflow: 'hidden', boxShadow: 'var(--rv-shadow-sm)' }}>
          <div style={{ display: 'flex', padding: '12px 16px', background: 'var(--rv-cream)', borderBottom: '1px solid var(--rv-border)' }}>
            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--rv-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingredient</div>
            <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: 'var(--rv-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Quantity</div>
            <div style={{ width: 90, fontSize: 12, fontWeight: 700, color: 'var(--rv-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Status</div>
          </div>

          {LINKED.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < LINKED.length - 1 ? '1px solid var(--rv-border)' : 'none' }}>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{item.name}</div>
              <div style={{ width: 80, fontSize: 14, color: 'var(--rv-muted)', textAlign: 'center' }}>{item.qty}</div>
              <div style={{ width: 90, textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: item.bg, color: item.color,
                  padding: '4px 10px', borderRadius: 20,
                  fontSize: 12, fontWeight: 700
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: '16px', background: '#FEF3C7', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#D97706' }}>Butter — Low Stock</div>
            <div style={{ fontSize: 13, color: '#92400E', marginTop: 2 }}>Only 1.5 kg remaining. Reorder before your next batch!</div>
          </div>
        </div>
      </div>

      <div className="rv-bottom-action">
        <button
          className="rv-btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => { onClose(); window.location.href = '/inventory'; }}
        >
          <ExternalLink size={18} /> Manage Inventory
        </button>
      </div>
    </motion.div>
  );
}
