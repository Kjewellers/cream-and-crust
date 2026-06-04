import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckSquare, Square } from 'lucide-react';

const DEFAULT_CHECKLIST = [
  'Preheat oven to 180°C',
  'Prepare cake tin',
  'Sieve dry ingredients',
  'Cream butter and sugar',
  'Prepare batter',
  'Bake for 45 mins',
  'Cool completely',
  'Decorate',
];

export default function RecipeChecklist({ recipe, onClose }) {
  const items = recipe?.steps?.map((s) => s.title || s.desc) || DEFAULT_CHECKLIST;
  const [checked, setChecked] = useState({});

  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="rv-details"
      style={{ zIndex: 230 }}
    >
      <div className="rv-wizard-header">
        <button className="rv-circle-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Preparation Checklist</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rv-pink)' }}>
          {done}/{items.length}
        </div>
      </div>

      <div className="rv-wizard-content">
        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {recipe?.name ? `${recipe.name} — 2 kg Cake` : 'Preparation Checklist (2 kg Cake)'}
            </span>
            <span style={{ fontSize: 14, color: 'var(--rv-pink)', fontWeight: 700 }}>
              {Math.round((done / items.length) * 100)}%
            </span>
          </div>
          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${(done / items.length) * 100}%` }}
              style={{ height: '100%', background: 'var(--rv-pink-gradient)', borderRadius: 99 }}
              transition={{ type: 'spring', stiffness: 200 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggle(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: checked[i] ? 'var(--rv-pink-light)' : '#fff',
                border: `1px solid ${checked[i] ? 'rgba(255,107,138,0.2)' : 'var(--rv-border)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--rv-shadow-sm)',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {checked[i] ? (
                  <CheckSquare size={22} color="var(--rv-pink)" />
                ) : (
                  <Square size={22} color="#D1D5DB" />
                )}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: checked[i] ? 'var(--rv-muted)' : 'var(--rv-dark)',
                  textDecoration: checked[i] ? 'line-through' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {item}
              </div>
            </motion.div>
          ))}
        </div>

        {done === items.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              marginTop: 24,
              background: '#D1FAE5',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 800, color: '#10B981', fontSize: 18 }}>
              All Steps Complete!
            </div>
            <div style={{ fontSize: 14, color: '#065F46', marginTop: 4 }}>
              Your recipe is ready to serve!
            </div>
          </motion.div>
        )}
      </div>

      <div className="rv-bottom-action">
        <button className="rv-btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </motion.div>
  );
}
