import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  Copy,
  Tag,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Leaf,
  Check,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import { generateLabelData, detectAllergens } from '../../utils/allergenLabelGenerator';

export default function AllergenLabelModal({ open, onClose, defaultProduct = null }) {
  const [productName, setProductName] = useState(defaultProduct?.name || 'Artisan Celebration Cake');
  const [netWeight, setNetWeight] = useState(defaultProduct?.weight || '500g');
  const [shelfLifeDays, setShelfLifeDays] = useState(3);
  const [ingredientsText, setIngredientsText] = useState(
    defaultProduct?.ingredients?.join(', ') ||
      'Refined wheat flour (maida), butter, dairy milk, dark chocolate, sugar, vanilla essence'
  );
  const [fssaiNumber, setFssaiNumber] = useState(() => {
    return localStorage.getItem('cc_bakery_fssai_lic') || '';
  });
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

  const labelData = useMemo(() => {
    const list = ingredientsText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    return generateLabelData({
      productName,
      netWeight,
      ingredients: list,
      fssaiNumber,
      shelfLifeDays: Number(shelfLifeDays) || 3,
    });
  }, [productName, netWeight, ingredientsText, fssaiNumber, shelfLifeDays]);

  const handleCopyThermal = async () => {
    try {
      await navigator.clipboard.writeText(labelData.thermalText);
      triggerHaptic('success');
      setCopied(true);
      showToast('ESC/POS thermal label copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy', 'error');
    }
  };

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  const saveFssai = (val) => {
    setFssaiNumber(val);
    try {
      localStorage.setItem('cc_bakery_fssai_lic', val);
    } catch {}
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
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                <Tag size={22} />
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
                  FSSAI Food & Allergen Label Printer
                </h2>
                <div style={{ fontSize: 12.5, color: '#7C6B5E', fontWeight: 500 }}>
                  Compliant regulatory stickers & thermal printing
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handlePrint}
                title="Print Sticker"
                aria-label="Print Sticker"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: '#F9F6F0',
                  color: '#2D1B14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Printer size={18} />
              </button>

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
          </div>

          {/* Form + Live Label Preview */}
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
            {/* Top row: Name + Weight + Shelf life */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
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
                  Net Wt.
                </label>
                <input
                  type="text"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
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
                  Best Before (Days)
                </label>
                <input
                  type="number"
                  value={shelfLifeDays}
                  onChange={(e) => setShelfLifeDays(e.target.value)}
                  min={1}
                  max={60}
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

            {/* Ingredients Input */}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                Ingredients (Allergens auto-detected live)
              </label>
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  marginTop: 4,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* FSSAI License Number Input */}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                FSSAI License Number (Saved locally)
              </label>
              <input
                type="text"
                value={fssaiNumber}
                onChange={(e) => saveFssai(e.target.value)}
                placeholder="e.g. 11223344556677"
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

            {/* Live Detected Allergen Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  background: labelData.isEggless ? '#E8F5E9' : '#FFF3E0',
                  color: labelData.isEggless ? '#2E7D32' : '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: labelData.isEggless ? '#2E7D32' : '#E65100',
                  }}
                />
                {labelData.isEggless ? '100% VEG / EGGLESS' : 'CONTAINS EGG'}
              </span>

              {labelData.allergens.map((alg) => (
                <span
                  key={alg}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: '#FEE2E2',
                    color: '#B91C1C',
                  }}
                >
                  ⚠️ {alg}
                </span>
              ))}
            </div>

            {/* Sticker Preview Box */}
            <div
              style={{
                border: '2px dashed rgba(0,0,0,0.18)',
                borderRadius: 16,
                padding: '16px',
                background: '#FAFAFA',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#7C6B5E', marginBottom: 8 }}>
                THERMAL STICKER PREVIEW (2" × 2" or 3" × 2")
              </div>

              <div
                style={{
                  maxWidth: 320,
                  margin: '0 auto',
                  background: '#FFFFFF',
                  border: '1.5px solid #2D1B14',
                  borderRadius: 8,
                  padding: '14px',
                  fontFamily: '"Courier New", monospace',
                  fontSize: 12,
                  color: '#000',
                  lineHeight: 1.4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6 }}>
                  {labelData.bakeryName}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{labelData.productName}</span>
                  <span style={{ fontSize: 10, border: '1px solid #000', padding: '1px 4px' }}>
                    {labelData.isEggless ? 'VEG' : 'EGG'}
                  </span>
                </div>

                <div style={{ fontSize: 11, marginTop: 4 }}>
                  Net Wt: <b>{labelData.netWeight}</b> | Batch: <b>{labelData.batchCode}</b>
                </div>
                <div style={{ fontSize: 10, marginTop: 2 }}>
                  Mfg: {labelData.mfgDateStr} | Best Before: <b>{labelData.bestBeforeDateStr}</b>
                </div>

                <div style={{ borderTop: '1px dashed #000', marginTop: 6, paddingTop: 4, fontSize: 9.5 }}>
                  {labelData.advisoryStatement}
                </div>

                {labelData.fssaiNumber && (
                  <div style={{ fontSize: 9, marginTop: 4, fontWeight: 'bold' }}>
                    FSSAI Lic: {labelData.fssaiNumber}
                  </div>
                )}
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
              onClick={handleCopyThermal}
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
              <span>{copied ? 'Copied!' : 'Copy ESC/POS Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: '#10B981',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Printer size={16} />
              <span>Print Sticker</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
