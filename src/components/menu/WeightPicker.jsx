/**
 * @file WeightPicker.jsx
 *
 * Step 1 of the order flow for weight-based products (cakes, custom
 * cakes, bento cakes, etc.). The customer picks a weight and sees
 * the auto-calculated price before proceeding to the channel picker.
 *
 * Price logic: basePrice is treated as the per-kg rate.
 *   0.5 kg → price × 0.5
 *   1 kg   → price × 1
 *   1.5 kg → price × 1.5
 *   2 kg   → price × 2
 *   3 kg   → price × 3
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, ChevronRight } from 'lucide-react';

const PRIMARY = '#B5606A';
const GOLD = '#D8B97E';
const INK = '#1A1410';
const SOFT = '#F5F1EC';
const BORDER = '#E5E0D8';

/** Categories whose products are sold by weight */
const WEIGHT_CATEGORIES = [
  'cakes', 'cake', 'custom cakes', 'custom-cakes', 'custom cake',
  'bento cakes', 'bento-cakes', 'bento cake',
  'cheesecake', 'cheesecakes',
  'pastries', 'pastry',
];

/** Check if a product category should trigger the weight picker */
export function isWeightCategory(category) {
  if (!category) return false;
  const cat = String(category).toLowerCase().trim();
  return WEIGHT_CATEGORIES.some(
    (wc) => cat === wc || cat.includes('cake')
  );
}

const WEIGHT_OPTIONS = [
  { value: 0.5, label: '½ kg', shortLabel: '0.5' },
  { value: 1,   label: '1 kg', shortLabel: '1' },
  { value: 1.5, label: '1½ kg', shortLabel: '1.5' },
  { value: 2,   label: '2 kg', shortLabel: '2' },
  { value: 3,   label: '3 kg', shortLabel: '3' },
];

export default function WeightPicker({ open, onClose, onConfirm, product }) {
  const [selectedWeight, setSelectedWeight] = useState(1);

  const basePrice = Number(product?.price || product?.basePrice || 0);

  const options = useMemo(
    () =>
      WEIGHT_OPTIONS.map((opt) => ({
        ...opt,
        price: Math.round(basePrice * opt.value),
      })),
    [basePrice]
  );

  // Reset to 1kg when opening
  useEffect(() => {
    if (open) setSelectedWeight(1);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const currentOption = options.find((o) => o.value === selectedWeight) || options[1];

  const handleConfirm = () => {
    onConfirm({
      weight: selectedWeight,
      weightLabel: currentOption.label,
      calculatedPrice: currentOption.price,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="cc-weight-picker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20, 14, 16, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 16,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Select weight"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 460,
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '20px 20px 24px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.18), 0 20px 60px rgba(0,0,0,0.10)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: INK,
            marginBottom: 'max(env(safe-area-inset-bottom), 24px)',
          }}
        >
          {/* Drag handle */}
          <div style={{
            width: 40, height: 4, background: BORDER, borderRadius: 99, margin: '0 auto 16px',
          }} />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 14, right: 14, width: 36, height: 36,
              borderRadius: '50%', border: 'none', background: SOFT,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: INK,
            }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${PRIMARY}18 0%, ${GOLD}22 100%)`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Scale size={22} color={PRIMARY} strokeWidth={2} />
            </div>
            <div style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.32em',
              textTransform: 'uppercase', color: PRIMARY, marginBottom: 6,
            }}>
              Select Weight
            </div>
            <h2 style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 22, fontWeight: 700, margin: 0,
              letterSpacing: '-0.015em', color: INK, lineHeight: 1.25,
            }}>
              {product?.name || 'Choose Size'}
            </h2>
            {basePrice > 0 && (
              <div style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 12, color: '#9C8A80', marginTop: 6,
              }}>
                Base price: ₹{basePrice}/kg
              </div>
            )}
          </div>

          {/* Weight options */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
            marginBottom: 20,
          }}>
            {options.map((opt) => {
              const isActive = opt.value === selectedWeight;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedWeight(opt.value)}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '14px 4px 12px',
                    borderRadius: 16,
                    border: `2px solid ${isActive ? PRIMARY : BORDER}`,
                    background: isActive
                      ? `linear-gradient(135deg, ${PRIMARY}12 0%, ${GOLD}18 100%)`
                      : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="weight-glow"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${PRIMARY}08 0%, ${GOLD}12 100%)`,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 18,
                    fontWeight: 700,
                    color: isActive ? PRIMARY : INK,
                    position: 'relative',
                    lineHeight: 1.1,
                  }}>
                    {opt.shortLabel}
                  </span>
                  <span style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: isActive ? PRIMARY : '#9C8A80',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    position: 'relative',
                  }}>
                    kg
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Price display */}
          <motion.div
            key={currentOption.price}
            initial={{ scale: 0.95, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              background: `linear-gradient(135deg, ${PRIMARY}0A 0%, ${GOLD}14 100%)`,
              border: `1.5px solid ${PRIMARY}22`,
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 11, fontWeight: 600,
                color: '#9C8A80', marginBottom: 2,
                letterSpacing: '0.02em',
              }}>
                {currentOption.label} — {product?.name}
              </div>
              <div style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 28, fontWeight: 700,
                color: INK, letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>
                ₹{currentOption.price.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${PRIMARY} 0%, ${GOLD} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: `0 6px 20px ${PRIMARY}44`,
            }}>
              <Scale size={20} />
            </div>
          </motion.div>

          {/* Confirm button */}
          <motion.button
            type="button"
            onClick={handleConfirm}
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -1 }}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 14,
              border: 'none',
              background: `linear-gradient(135deg, ${PRIMARY} 0%, ${GOLD} 100%)`,
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: '"Inter", sans-serif',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              boxShadow: `0 8px 24px ${PRIMARY}33`,
            }}
          >
            Continue to order <ChevronRight size={16} strokeWidth={2.5} />
          </motion.button>

          <div style={{
            marginTop: 12, fontSize: 11, color: '#9C8A80',
            textAlign: 'center', fontFamily: '"Inter", sans-serif', lineHeight: 1.5,
          }}>
            Price is calculated based on weight selected.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
