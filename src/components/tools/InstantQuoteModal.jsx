import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Calculator,
  Cake,
  Sparkles,
  Share2,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import {
  calculateCustomCakeQuote,
  formatWhatsAppQuoteMessage,
  FINISH_RATES,
  DECORATION_TIERS,
  ADDONS_CATALOG,
} from '../../utils/cakeQuoteBuilder';

export default function InstantQuoteModal({ open, onClose, bakery = {} }) {
  const [customerName, setCustomerName] = useState('');
  const [occasion, setOccasion] = useState('Birthday Celebration');
  const [deliveryDate, setDeliveryDate] = useState('Tomorrow 5:00 PM');
  const [flavour, setFlavour] = useState('Belgian Chocolate Truffle');
  const [weightKg, setWeightKg] = useState('1.5');
  const [finishKey, setFinishKey] = useState('buttercream');
  const [decorationKey, setDecorationKey] = useState('florals');
  const [selectedAddons, setSelectedAddons] = useState(['acrylicTopper']);
  const [deliveryFee, setDeliveryFee] = useState('150');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [copied, setCopied] = useState(false);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const origBody = document.body.style.overflow;
    const origDoc = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origDoc;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const quote = useMemo(() => {
    return calculateCustomCakeQuote({
      baseFlavour: flavour,
      weightKg: parseFloat(weightKg) || 1.0,
      finishKey,
      decorationKey,
      selectedAddons,
      deliveryFee: parseFloat(deliveryFee) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
    });
  }, [flavour, weightKg, finishKey, decorationKey, selectedAddons, deliveryFee, discountAmount]);

  const messageText = useMemo(() => {
    return formatWhatsAppQuoteMessage({
      customerName: customerName || 'Valued Customer',
      occasion,
      deliveryDate,
      flavour,
      weightKg: parseFloat(weightKg) || 1.0,
      finishKey,
      decorationKey,
      selectedAddons,
      deliveryFee: parseFloat(deliveryFee) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      bakeryName: bakery.name || 'Cream & Crust Bakery',
      upiId: bakery.upiId || '',
    });
  }, [customerName, occasion, deliveryDate, flavour, weightKg, finishKey, decorationKey, selectedAddons, deliveryFee, discountAmount, bakery]);

  const toggleAddon = (key) => {
    triggerHaptic('light');
    setSelectedAddons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      triggerHaptic('success');
      setCopied(true);
      showToast('WhatsApp quote copied to clipboard! ✨', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    triggerHaptic('success');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.48)',
          }}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 680,
            maxHeight: 'min(90dvh, 760px)',
            background: '#ffffff',
            borderRadius: 28,
            boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                }}
              >
                <MessageCircle size={22} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 19,
                    fontWeight: 800,
                    color: '#2D1B14',
                  }}
                >
                  WhatsApp Instant Quote Builder
                </h2>
                <div style={{ fontSize: 12.5, color: '#7C6B5E', fontWeight: 500 }}>
                  Produce aesthetic pricing proposals in 30 seconds
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: 'none',
                background: 'rgba(0, 0, 0, 0.05)',
                color: '#2D1B14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form & Pricing Breakdown */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Customer & Occasion */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Occasion & Date
                </label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="e.g. 1st Birthday Party"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>
            </div>

            {/* Flavor & Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Sponge / Flavour
                </label>
                <input
                  type="text"
                  value={flavour}
                  onChange={(e) => setFlavour(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Weight (Kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>
            </div>

            {/* Finish & Decoration Style */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Outer Finish
                </label>
                <select
                  value={finishKey}
                  onChange={(e) => setFinishKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    marginTop: 4,
                  }}
                >
                  {Object.entries(FINISH_RATES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} {v.addPrice > 0 ? `(+₹${v.addPrice})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Art / Styling Tier
                </label>
                <select
                  value={decorationKey}
                  onChange={(e) => setDecorationKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.1)',
                    fontWeight: 700,
                    fontSize: 12.5,
                    marginTop: 4,
                  }}
                >
                  {Object.entries(DECORATION_TIERS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} {v.addPrice > 0 ? `(+₹${v.addPrice})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add-ons Chips */}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                Luxury Add-ons & Extras
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(ADDONS_CATALOG).map(([k, v]) => {
                  const active = selectedAddons.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleAddon(k)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 10,
                        border: active ? '1.5px solid #B5606A' : '1px solid rgba(0,0,0,0.1)',
                        background: active ? '#FFF0EE' : '#ffffff',
                        color: active ? '#B5606A' : '#4A3B32',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {active ? '✓ ' : '+ '} {v.label} (₹{v.price})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Pricing Summary Card */}
            <div
              style={{
                background: '#FAF6F0',
                borderRadius: 18,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Total Quote Value
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#2D1B14' }}>
                  ₹{quote.grandTotal.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#B5606A', textTransform: 'uppercase' }}>
                  50% Advance to Confirm
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#B5606A' }}>
                  ₹{quote.advanceRequired.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={handleCopy}
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
              }}
            >
              {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                padding: '10px 20px',
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
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
              }}
            >
              <MessageCircle size={16} />
              <span>Share Quote on WhatsApp</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
