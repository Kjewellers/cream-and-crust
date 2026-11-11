import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  ShieldCheck,
  Printer,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { triggerHaptic } from '../iOS';

export default function FssaiLabelShortcutCard({ onOpenQuickModal }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('hideFssaiShortcutCard') === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setDismissed(false);
            try {
              localStorage.removeItem('hideFssaiShortcutCard');
            } catch {}
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#059669',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
          }}
        >
          <Tag size={12} /> Show FSSAI Label Studio Shortcut
        </button>
      </div>
    );
  }

  const handleOpenStudio = () => {
    triggerHaptic('medium');
    navigate('/label-studio');
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    triggerHaptic('light');
    setDismissed(true);
    try {
      localStorage.setItem('hideFssaiShortcutCard', 'true');
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #FFFFFF 100%)',
        border: '1.5px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 24,
        padding: '20px 22px',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.07)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative subtle background aura */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Dismiss / Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        title="Dismiss shortcut"
        aria-label="Dismiss FSSAI shortcut"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          background: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: '50%',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          cursor: 'pointer',
          zIndex: 3,
          transition: 'all 0.18s ease',
        }}
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1.35fr) minmax(220px, 0.9fr)',
          gap: 20,
          alignItems: 'center',
        }}
      >
        {/* Left Side: Editorial & 3-Step Guided Roadmap */}
        <div>
          {/* Eyebrow & Live compliance pulse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#10B981',
                color: '#ffffff',
                padding: '3px 9px',
                borderRadius: 20,
                fontSize: '0.64rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              <ShieldCheck size={11} strokeWidth={3} />
              FSSAI REGULATORY ATELIER
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.72rem',
                color: '#047857',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
                  display: 'inline-block',
                }}
              />
              India Food Safety Standards (2026)
            </span>
          </div>

          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#064E3B',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
              lineHeight: 1.25,
            }}
          >
            Food Safety & Thermal Label Studio
          </h3>

          <p
            style={{
              fontSize: '0.82rem',
              color: '#4B5563',
              margin: '0 0 14px 0',
              lineHeight: 1.45,
            }}
          >
            Auto-generate compliant product stickers in 3 guided steps with real-time allergen detection, 5 designer templates & auto-adjusting 58mm/80mm thermal profiles.
          </p>

          {/* 3-Step Guided Beads */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 9px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#065F46',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                }}
              >
                1
              </span>
              Formula & Allergens
            </div>

            <ChevronRight size={12} color="#9CA3AF" />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 9px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#065F46',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                }}
              >
                2
              </span>
              Design & Typography
            </div>

            <ChevronRight size={12} color="#9CA3AF" />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 9px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#065F46',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                }}
              >
                3
              </span>
              Auto Thermal Print
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleOpenStudio}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              <span>Launch 3-Step Studio</span>
              <ArrowRight size={15} strokeWidth={2.6} />
            </motion.button>

            {typeof onOpenQuickModal === 'function' && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  triggerHaptic('light');
                  onOpenQuickModal('allergen-label');
                }}
                style={{
                  background: '#ffffff',
                  color: '#065F46',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 14,
                  padding: '9px 15px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <Printer size={14} />
                <span>Quick Modal</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Animated Sticker Card Preview */}
        <motion.div
          whileHover={{ y: -4, rotate: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={handleOpenStudio}
          style={{
            cursor: 'pointer',
            background: '#ffffff',
            borderRadius: 18,
            border: '2px dashed rgba(16, 185, 129, 0.4)',
            padding: '14px 16px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            position: 'relative',
          }}
        >
          {/* Top Label Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              STAMP PREVIEW
            </span>
            {/* Veg mark */}
            <div
              style={{
                width: 15,
                height: 15,
                border: '1.5px solid #16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A' }} />
            </div>
          </div>

          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1F2937', lineHeight: 1.2 }}>
            Artisan Celebration Cake
          </div>

          <div style={{ fontSize: '0.68rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
            <span>Net Wt: <b>1 kg</b></span>
            <span>MRP: <b>₹1,200</b></span>
          </div>

          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 6,
              padding: '3px 6px',
              fontSize: '0.64rem',
              color: '#991B1B',
              fontWeight: 700,
            }}
          >
            ⚠️ CONTAINS: GLUTEN, MILK
          </div>

          {/* Barcode Mock */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, paddingTop: 4, borderTop: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.62rem', color: '#4B5563', fontWeight: 700 }}>
              fssai Lic: 21524000000000
            </span>
            <div style={{ display: 'flex', gap: 1, height: 12 }}>
              {[2, 1, 3, 1, 2, 3, 1, 2, 1, 3].map((w, i) => (
                <div key={i} style={{ width: w, height: '100%', background: '#374151' }} />
              ))}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: -8,
              right: 12,
              background: '#059669',
              color: '#ffffff',
              fontSize: '0.6rem',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 10,
              boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
            }}
          >
            Tap to Edit
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
