import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
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
      {/* Thermal Print Isolation CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #fssai-sticker-print-area, #fssai-sticker-print-area * {
            visibility: visible !important;
          }
          #fssai-sticker-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 320px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }
        }
      `}</style>

      {/* Crisp Dark Scrim Backdrop (No heavy blur, touchAction none) */}
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

        {/* Header */}
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
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                flexShrink: 0,
              }}
            >
              <Tag size={22} />
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
                FSSAI Food & Allergen Label Printer
              </h2>
              <div style={{ fontSize: 12, color: '#7C6B5E', fontWeight: 500, marginTop: 2 }}>
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
                width: 38,
                height: 38,
                borderRadius: 12,
                border: '1px solid rgba(0, 0, 0, 0.08)',
                background: '#F9F6F0',
                color: '#2D1B14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <Printer size={18} />
            </button>

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
        </div>

        {/* Form + Live Label Preview */}
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
          {/* Top row: Name + Weight + Shelf life (Responsive 3-col on desktop, 1-col on mobile) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? '2fr 1fr 1fr' : '1fr',
              gap: 10,
            }}
          >
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
                  padding: '9px 12px',
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
                  padding: '9px 12px',
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
                  padding: '9px 12px',
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
              Ingredients (Allergens live auto-detected)
            </label>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '9px 12px',
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
                padding: '9px 12px',
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
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7C6B5E', marginBottom: 8, textAlign: 'center' }}>
              THERMAL STICKER PREVIEW (2" × 2" or 3" × 2")
            </div>

            <div
              id="fssai-sticker-print-area"
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
              {/* Bakery Header */}
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: 13,
                  borderBottom: '1px solid #000',
                  paddingBottom: 4,
                  marginBottom: 6,
                }}
              >
                {labelData.bakeryName}
              </div>

              {/* Product Name & Authentic FSSAI Veg/Non-Veg Mark */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{labelData.productName}</span>

                {/* Authentic FSSAI Veg Symbol: Green square with green circle */}
                {labelData.isEggless ? (
                  <div
                    title="100% Vegetarian"
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid #16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
                  </div>
                ) : (
                  <div
                    title="Contains Egg / Non-Vegetarian"
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid #92400E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#92400E' }} />
                  </div>
                )}
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
            padding: isDesktop ? '14px 24px' : '12px 18px',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#ffffff',
            flexShrink: 0,
            flexWrap: 'wrap',
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
              touchAction: 'manipulation',
            }}
          >
            {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Thermal!' : 'Copy ESC/POS Text'}</span>
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
              touchAction: 'manipulation',
            }}
          >
            <Printer size={16} />
            <span>Print Food Sticker</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
