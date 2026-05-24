import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingCart, Check, ListChecks } from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';

export default function ShoppingListExport({ recipe, mult, onClose }) {
  const [selected, setSelected] = useState(
    new Set(recipe.ingredients.map(i => i.name))
  );
  const [loading, setLoading] = useState(false);

  const toggle = (name) => {
    triggerHaptic('light');
    setSelected(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  const handleExport = () => {
    if (selected.size === 0) return;
    triggerHaptic('medium');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast(`Added ${selected.size} items to Shopping List`, 'success');
      onClose();
    }, 1200);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: 'var(--r-bg)', padding: '24px 20px 40px', borderRadius: '24px 24px 0 0', boxShadow: 'var(--r-shadow-lg)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--r-dark)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={20} color="var(--r-accent)" />
            Send to List
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--r-surface)', border: '1px solid var(--r-border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-mid)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: 14, color: 'var(--r-mid)', marginBottom: 16, lineHeight: 1.5 }}>
          Select the ingredients you want to add to your master shopping list for the <strong>{mult}x batch</strong> of {recipe.name}.
        </div>

        <div style={{ flex: 1, overflowY: 'auto', margin: '0 -20px 24px', padding: '0 20px', borderTop: '1px solid var(--r-border)', borderBottom: '1px solid var(--r-border)', background: 'var(--r-surface)' }}>
          {recipe.ingredients.map((ing, i) => (
            <div
              key={i}
              onClick={() => toggle(ing.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: i < recipe.ingredients.length - 1 ? '1px solid var(--r-border)' : 'none', cursor: 'pointer'
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: selected.has(ing.name) ? 'none' : '2px solid var(--r-border-md)', background: selected.has(ing.name) ? 'var(--r-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                {selected.has(ing.name) && <Check size={14} strokeWidth={3} />}
              </div>
              <div style={{ fontSize: 24 }}>{ing.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--r-dark)', marginBottom: 2 }}>{ing.name}</div>
                <div style={{ fontSize: 13, color: 'var(--r-muted)' }}>{ing.qty} (x{mult})</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleExport}
          className="rv-btn-primary"
          style={{ width: '100%' }}
          disabled={selected.size === 0 || loading}
        >
          {loading ? (
            'Adding...'
          ) : (
            <>
              <ListChecks size={18} />
              Add {selected.size} Items
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
