import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Cake,
  ShieldAlert,
  Sparkles,
  Layers,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import {
  calculateTierStack,
  suggestTierConfigurations,
  formatTierStackWhatsAppMessage,
} from '../../utils/cakeCalculator';

export default function TierCakeCalculatorModal({ open, onClose, bakeryName = 'Cream & Crust Bakery' }) {
  const [servingStyle, setServingStyle] = useState('dessert'); // 'dessert' | 'coffee'
  const [tiers, setTiers] = useState([
    { id: '1', size: 6, shape: 'round' },
    { id: '2', size: 8, shape: 'round' },
  ]);
  const [targetGuests, setTargetGuests] = useState('50');
  const [copied, setCopied] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Complete background scroll locking (Instagram / Airbnb standard)
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const origOverflow = document.body.style.overflow;
    const origDocOverflow = document.documentElement.style.overflow;
    const origPosition = document.body.style.position;
    const origTop = document.body.style.top;
    const origWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = origDocOverflow;
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.top = origTop;
      document.body.style.width = origWidth;
      try {
        window.scrollTo(0, scrollY);
      } catch (_) {}
    };
  }, [open, onClose]);

  const calculation = useMemo(() => {
    return calculateTierStack(tiers, servingStyle);
  }, [tiers, servingStyle]);

  const suggestions = useMemo(() => {
    const num = parseInt(targetGuests, 10);
    if (!num || isNaN(num) || num <= 0) return [];
    return suggestTierConfigurations(num, servingStyle);
  }, [targetGuests, servingStyle]);

  const specMessageText = useMemo(() => {
    return formatTierStackWhatsAppMessage({
      tiers,
      servingStyle,
      eventTitle: `${calculation.totalServings} Guest Celebration Cake`,
      bakeryName,
    });
  }, [tiers, servingStyle, calculation.totalServings, bakeryName]);

  const addTier = () => {
    if (tiers.length >= 5) {
      showToast('Maximum 5 tiers supported', 'info');
      return;
    }
    triggerHaptic('light');
    const lastTier = tiers[tiers.length - 1];
    const nextSize = lastTier ? Math.min(14, Number(lastTier.size) + 2) : 8;
    setTiers([...tiers, { id: String(Date.now()), size: nextSize, shape: 'round' }]);
  };

  const removeTier = (index) => {
    if (tiers.length <= 1) {
      showToast('At least 1 tier required', 'info');
      return;
    }
    triggerHaptic('light');
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTierSize = (index, newSize) => {
    triggerHaptic('light');
    setTiers(
      tiers.map((t, i) => (i === index ? { ...t, size: Number(newSize) } : t))
    );
  };

  const applySuggestion = (cfg) => {
    triggerHaptic('success');
    setTiers(cfg.stack.map((t, idx) => ({ id: String(Date.now() + idx), size: t.size, shape: 'round' })));
    showToast(`Applied ${cfg.label} configuration ✨`, 'success');
  };

  const handleCopySpecs = async () => {
    try {
      await navigator.clipboard.writeText(specMessageText);
      triggerHaptic('success');
      setCopied(true);
      showToast('Tier cake specs copied to clipboard! ✨', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    triggerHaptic('success');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(specMessageText)}`;
    window.open(url, '_blank');
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        padding: isDesktop ? '20px' : 0,
      }}
    >
      {/* Crisp Dark Scrim Backdrop (No heavy blur, touch action none) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.52)',
          touchAction: 'none',
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Modal / Bottom Sheet Card */}
      <motion.div
        initial={isDesktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: '100%' }}
        animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={isDesktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 680,
          maxHeight: isDesktop ? 'min(90dvh, 780px)' : '92dvh',
          background: '#ffffff',
          borderRadius: isDesktop ? 24 : '24px 24px 0 0',
          boxShadow: isDesktop
            ? '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.06)'
            : '0 -10px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10,
          paddingBottom: isDesktop ? 0 : 'max(env(safe-area-inset-bottom, 12px), 12px)',
        }}
      >
        {/* Mobile Drag Indicator Handle */}
        {!isDesktop && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 10,
              paddingBottom: 4,
              touchAction: 'none',
            }}
          >
            <div
              style={{
                width: 38,
                height: 4.5,
                borderRadius: 3,
                background: 'rgba(0, 0, 0, 0.22)',
              }}
            />
          </div>
        )}

        {/* Modal Header */}
        <div
          style={{
            padding: isDesktop ? '18px 24px 14px' : '12px 18px 12px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.25)',
                flexShrink: 0,
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: isDesktop ? 19 : 17,
                  fontWeight: 800,
                  color: '#2D1B14',
                  lineHeight: 1.25,
                }}
              >
                Tiered Cake Structural Calculator
              </h2>
              <div style={{ fontSize: 12, color: '#7C6B5E', fontWeight: 500, marginTop: 2 }}>
                Portions, cake weight, base board & dowels guide
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0, 0, 0, 0.06)',
              color: '#2D1B14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              touchAction: 'manipulation',
              transition: 'background 0.15s ease, transform 0.15s ease',
            }}
            onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
            onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: isDesktop ? '20px 24px' : '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            touchAction: 'pan-y',
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Serving Style Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#FAF6F0',
              borderRadius: 16,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>
                Serving Portion Size
              </div>
              <div style={{ fontSize: 11.5, color: '#7C6B5E' }}>
                {servingStyle === 'dessert'
                  ? 'Dessert Portion: 1" × 2" × 4" (Celebrations / Plated)'
                  : 'Coffee / Finger Portion: 1" × 1" × 4" (Cocktails / Buffets)'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 4,
                background: '#ffffff',
                padding: 3,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {['dessert', 'coffee'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setServingStyle(s);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: servingStyle === s ? '#B5606A' : 'transparent',
                    color: servingStyle === s ? '#ffffff' : '#4A3B32',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s} Portion
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Bar (Responsive 2x2 on Mobile, 4 across on Desktop) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
              gap: 10,
            }}
          >
            {[
              { label: 'Total Servings', value: `${calculation.totalServings} guests`, color: '#B5606A' },
              { label: 'Finished Weight', value: `~${calculation.totalWeightKg} kg`, color: '#D4A050' },
              { label: 'Base Board', value: `${calculation.baseBoardSize}" board`, color: '#2563EB' },
              { label: 'Support Dowels', value: `${calculation.dowelsRequired} dowels`, color: '#10B981' },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  background: '#FFF9F5',
                  border: '1px solid rgba(181, 96, 106, 0.14)',
                  borderRadius: 14,
                  padding: '12px 10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7C6B5E' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: m.color, marginTop: 2 }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Tier Stack Builder */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#7C6B5E',
                }}
              >
                🎂 Tier Architecture ({tiers.length} Tiers)
              </span>

              <button
                type="button"
                onClick={addTier}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: '1px solid #B5606A',
                  background: '#FFF9F5',
                  color: '#B5606A',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Add Tier
              </button>
            </div>

            {/* Tiers List (Top to Bottom) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tiers.map((tier, idx) => (
                <div
                  key={tier.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 14,
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        background: 'rgba(0,0,0,0.06)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: '#4A3B32',
                      }}
                    >
                      {idx === 0 ? 'Top Tier' : idx === tiers.length - 1 ? 'Base Tier' : `Tier ${idx + 1}`}
                    </span>

                    {/* Pan Size Dropdown */}
                    <select
                      value={tier.size}
                      onChange={(e) => updateTierSize(idx, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        border: '1.5px solid rgba(181, 96, 106, 0.3)',
                        background: '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                        color: '#2D1B14',
                        cursor: 'pointer',
                      }}
                    >
                      {[4, 5, 6, 7, 8, 9, 10, 12, 14].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}" Round Pan
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#B5606A' }}>
                      {calculation.tierBreakdown[idx]?.servings || 0} servings (~{calculation.tierBreakdown[idx]?.weightKg} kg)
                    </span>

                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      disabled={tiers.length <= 1}
                      aria-label="Remove Tier"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: tiers.length <= 1 ? '#D1D5DB' : '#EF4444',
                        cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Auto-Suggest by Guest Count */}
          <div
            style={{
              background: '#FAF6F0',
              borderRadius: 18,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#B5606A" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>
                  Auto-Recommend Stacks for Guest Count
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7C6B5E' }}>Guests:</span>
                <input
                  type="number"
                  value={targetGuests}
                  onChange={(e) => setTargetGuests(e.target.value)}
                  min={10}
                  max={300}
                  style={{
                    width: 70,
                    padding: '4px 8px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(181,96,106,0.3)',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            {suggestions.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(sug)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(181, 96, 106, 0.25)',
                      background: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#2D1B14' }}>
                      {sug.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#B5606A',
                        background: '#FFF0EE',
                        padding: '1px 6px',
                        borderRadius: 6,
                      }}
                    >
                      {sug.totalServings} servings
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#7C6B5E' }}>
                Type a guest count (e.g. 60 or 100) to see recommended tier pairings.
              </div>
            )}
          </div>

          {/* Structural Dowel & Delivery Guide */}
          {calculation.structuralGuide.length > 0 && (
            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <ShieldAlert size={16} color="#10B981" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>
                  Kitchen Structural & Dowel Checklist
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#047857', lineHeight: 1.5 }}>
                {calculation.structuralGuide.map((guide, i) => (
                  <li key={i}>{guide}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions Bar */}
        <div
          style={{
            padding: isDesktop ? '14px 24px' : '12px 18px',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: '#ffffff',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleCopySpecs}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#ffffff',
              color: '#2D1B14',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Specs!' : 'Copy Specs'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              background: '#25D366',
              color: '#ffffff',
              fontSize: 13.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.28)',
              touchAction: 'manipulation',
            }}
          >
            <MessageCircle size={16} />
            <span>Share Specs on WhatsApp</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
