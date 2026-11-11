import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  Copy,
  Tag,
  Download,
  Sparkles,
  Check,
  Layers,
  Barcode,
  Eye,
  Utensils,
  ChevronDown,
  Info,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import {
  generateLabelData,
  PRINTER_FORMATS,
  LABEL_TEMPLATES,
  LABEL_FONTS,
  detectAllergens,
} from '../../utils/allergenLabelGenerator';

export default function AllergenLabelModal({ open, onClose, defaultProduct = null }) {
  const [productName, setProductName] = useState(defaultProduct?.name || 'Artisan Celebration Cake');
  const [netWeight, setNetWeight] = useState(defaultProduct?.weight || '500g');
  const [mrp, setMrp] = useState('650');
  const [shelfLifeDays, setShelfLifeDays] = useState(3);
  const [ingredientsText, setIngredientsText] = useState(
    defaultProduct?.ingredients?.join(', ') ||
      'Refined wheat flour (maida), butter, dairy milk, dark chocolate, sugar, vanilla essence'
  );
  const [fssaiNumber, setFssaiNumber] = useState(() => {
    return localStorage.getItem('cc_bakery_fssai_lic') || '';
  });
  const [printerFormat, setPrinterFormat] = useState(() => {
    return localStorage.getItem('cc_bakery_printer_profile') || 'stickerSquare50';
  });
  const [templateKey, setTemplateKey] = useState('classicThermal');
  const [fontKey, setFontKey] = useState('sans');
  const [showNutrition, setShowNutrition] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);
  const [forceVeg, setForceVeg] = useState(null); // null = auto, true = veg, false = non-veg
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'content' | 'printer'

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
    const data = generateLabelData({
      productName,
      netWeight,
      ingredients: list,
      fssaiNumber,
      shelfLifeDays: Number(shelfLifeDays) || 3,
      mrp,
      printerFormat,
      templateKey,
      fontKey,
      showNutrition,
      showBarcode,
    });

    if (forceVeg !== null) {
      data.isEggless = forceVeg;
    }
    return data;
  }, [
    productName,
    netWeight,
    ingredientsText,
    fssaiNumber,
    shelfLifeDays,
    mrp,
    printerFormat,
    templateKey,
    fontKey,
    showNutrition,
    showBarcode,
    forceVeg,
  ]);

  const handleSelectPrinterFormat = (id) => {
    triggerHaptic('light');
    setPrinterFormat(id);
    try {
      localStorage.setItem('cc_bakery_printer_profile', id);
    } catch {}
  };

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

  const handleDownloadImage = async () => {
    const node = document.getElementById('fssai-sticker-print-area');
    if (!node) return;
    try {
      triggerHaptic('light');
      setDownloading(true);
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, {
        scale: 3,
        useCORS: true,
        backgroundColor: labelData.templateCfg.bgColor || '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `label-${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      triggerHaptic('success');
      showToast('High-res label downloaded! 🏷️', 'success');
    } catch (err) {
      showToast('Export failed. You can use Print Sticker directly.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const saveFssai = (val) => {
    setFssaiNumber(val);
    try {
      localStorage.setItem('cc_bakery_fssai_lic', val);
    } catch {}
  };

  if (!open || typeof document === 'undefined') return null;

  const currentFormat = PRINTER_FORMATS[printerFormat] || PRINTER_FORMATS.stickerSquare50;
  const currentTemplate = LABEL_TEMPLATES[templateKey] || LABEL_TEMPLATES.classicThermal;
  const currentFont = LABEL_FONTS[fontKey] || LABEL_FONTS.sans;

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
      {/* Dynamic Thermal / A4 Print Isolation CSS */}
      <style>{`
        @page {
          size: ${currentFormat.printPageSize || 'auto'};
          margin: 0;
        }
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
            width: ${currentFormat.widthMm ? `${currentFormat.widthMm}mm` : '100%'} !important;
            max-width: none !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: ${currentTemplate.borderStyle || '1px solid #000'} !important;
            background: ${currentTemplate.bgColor || '#ffffff'} !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          ${
            printerFormat === 'a4SheetGrid'
              ? `
            .fssai-a4-repeat-grid {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 15mm !important;
              padding: 15mm !important;
              width: 210mm !important;
              height: 297mm !important;
              visibility: visible !important;
            }
          `
              : ''
          }
        }
      `}</style>

      {/* Crisp Dark Scrim Backdrop */}
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
          maxWidth: isDesktop ? 880 : '100%',
          maxHeight: isDesktop ? 'min(92dvh, 840px)' : '94dvh',
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
        {/* Mobile Drag Handle */}
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
            padding: isDesktop ? '16px 24px 12px' : '12px 18px 10px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  FSSAI Food & Regulatory Label Studio
                </h2>
                <span
                  style={{
                    background: '#ECFDF5',
                    color: '#059669',
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 99,
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  AUTO-ADJUST
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#7C6B5E', fontWeight: 500, marginTop: 2 }}>
                Multi-template sticker designs · Dynamic printer profiles · FSSAI compliance
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloading}
              title="Download High-Res PNG"
              aria-label="Download Label Image"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid rgba(0, 0, 0, 0.08)',
                background: '#F9F6F0',
                color: '#2D1B14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: downloading ? 'wait' : 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <Download size={16} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Print Sticker"
              aria-label="Print Sticker"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
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
              <Printer size={16} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
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

        {/* Mode / Feature Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            background: '#FAF6F0',
            padding: '4px 18px',
            gap: 6,
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'design', label: '🎨 Templates & Fonts' },
            { id: 'printer', label: '🖨️ Printer & Size Profiles' },
            { id: 'content', label: '📝 Product & Ingredients' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: 'none',
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#10B981' : '#7C6B5E',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: 12.5,
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area: Split View on Desktop (Controls Left, Live Preview Right) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isDesktop ? 'row' : 'column',
            overflow: 'hidden',
          }}
        >
          {/* Controls Panel */}
          <div
            style={{
              flex: isDesktop ? '1 1 52%' : 'none',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              padding: isDesktop ? '20px 24px' : '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              borderRight: isDesktop ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
              borderBottom: !isDesktop ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
              maxHeight: isDesktop ? 'none' : '45vh',
            }}
          >
            {/* Tab 1: Design Templates & Fonts */}
            {activeTab === 'design' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                    Label Design Style Template
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                    {Object.values(LABEL_TEMPLATES).map((tmpl) => {
                      const active = templateKey === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setTemplateKey(tmpl.id);
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: active ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                            background: active ? '#ECFDF5' : '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#2D1B14' }}>
                              {tmpl.name}
                            </span>
                            {active && <Check size={14} color="#10B981" />}
                          </div>
                          <span style={{ fontSize: 10, color: '#7C6B5E', lineHeight: 1.25 }}>
                            {tmpl.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Typography Choice */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                    Product Title Typography
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {Object.values(LABEL_FONTS).map((f) => {
                      const active = fontKey === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setFontKey(f.id);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: active ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                            background: active ? '#ECFDF5' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 800, fontFamily: f.fontFamily, color: '#2D1B14' }}>
                            {f.sample}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#059669' : '#7C6B5E', marginTop: 2 }}>
                            {f.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles & Badges */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setShowNutrition(!showNutrition)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      border: showNutrition ? '1.5px solid #10B981' : '1px solid rgba(0,0,0,0.12)',
                      background: showNutrition ? '#ECFDF5' : '#fff',
                      color: showNutrition ? '#059669' : '#4A3B32',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Utensils size={14} />
                    <span>Nutrition Facts {showNutrition ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBarcode(!showBarcode)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      border: showBarcode ? '1.5px solid #10B981' : '1px solid rgba(0,0,0,0.12)',
                      background: showBarcode ? '#ECFDF5' : '#fff',
                      color: showBarcode ? '#059669' : '#4A3B32',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Barcode size={14} />
                    <span>Barcode & Lot {showBarcode ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Printer & Size Profiles */}
            {activeTab === 'printer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                      Select Your Thermal / Sticker Printer
                    </label>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>
                      Auto-Adjusts Output & Margins
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.values(PRINTER_FORMATS).map((fmt) => {
                      const active = printerFormat === fmt.id;
                      return (
                        <div
                          key={fmt.id}
                          onClick={() => handleSelectPrinterFormat(fmt.id)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: active ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                            background: active ? '#ECFDF5' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>
                                {fmt.name}
                              </span>
                              {fmt.badge && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 6,
                                    background: active ? '#10B981' : 'rgba(0,0,0,0.06)',
                                    color: active ? '#fff' : '#7C6B5E',
                                  }}
                                >
                                  {fmt.badge}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#7C6B5E', marginTop: 2 }}>
                              {fmt.subtitle}
                            </div>
                          </div>

                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: active ? '6px solid #10B981' : '2px solid rgba(0,0,0,0.2)',
                              background: '#fff',
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <Info size={18} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: '#065F46', lineHeight: 1.45 }}>
                    <b>Intelligent Auto-Scaling:</b> The preview and print layout automatically adjust their width,
                    font proportions, character column wrapping (32 vs 44 cols), and page setup rules for your selected printer.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Product & Regulatory Content */}
            {activeTab === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Product Name */}
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

                {/* Weight + MRP + Shelf Life in 3 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
                        padding: '9px 10px',
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
                      MRP (₹)
                    </label>
                    <input
                      type="text"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      placeholder="650"
                      style={{
                        width: '100%',
                        padding: '9px 10px',
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
                      max={90}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: 10,
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        fontWeight: 700,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    />
                  </div>
                </div>

                {/* Ingredients with auto-allergen detector */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                    Ingredients (Allergens live detected)
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

                {/* FSSAI License Number */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                    FSSAI License Number (Saved locally)
                  </label>
                  <input
                    type="text"
                    value={fssaiNumber}
                    onChange={(e) => saveFssai(e.target.value)}
                    placeholder="e.g. 11524036000123"
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

                {/* Veg / Non-Veg Manual Override Toggle */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                    FSSAI Dietary Category
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Auto (Ingredients)', val: null },
                      { label: '100% Veg / Eggless (Green)', val: true },
                      { label: 'Contains Egg (Brown)', val: false },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setForceVeg(opt.val);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 10,
                          border: forceVeg === opt.val ? '1.5px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                          background: forceVeg === opt.val ? '#ECFDF5' : '#fff',
                          color: forceVeg === opt.val ? '#059669' : '#4A3B32',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live Detected Allergen Badges Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  background: labelData.isEggless ? '#E8F5E9' : '#FFF3E0',
                  color: labelData.isEggless ? '#2E7D32' : '#E65100',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: labelData.isEggless ? '#2E7D32' : '#E65100',
                  }}
                />
                {labelData.isEggless ? '100% VEG' : 'CONTAINS EGG'}
              </span>

              {labelData.allergens.map((alg) => (
                <span
                  key={alg}
                  style={{
                    padding: '3px 7px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#FEE2E2',
                    color: '#B91C1C',
                  }}
                >
                  ⚠️ {alg}
                </span>
              ))}
            </div>
          </div>

          {/* Live Preview Panel */}
          <div
            style={{
              flex: isDesktop ? '1 1 48%' : 'none',
              background: '#F8F6F2',
              padding: isDesktop ? '20px 24px' : '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7C6B5E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {currentFormat.shortName} · {currentTemplate.name}
            </div>

            {/* Sticker Live Canvas */}
            <div
              id="fssai-sticker-print-area"
              style={{
                width: '100%',
                maxWidth: currentFormat.maxWidthPx || 340,
                aspectRatio: currentFormat.aspectRatio || '1 / 1',
                background: currentTemplate.bgColor,
                color: currentTemplate.textColor,
                border: currentTemplate.borderStyle,
                borderRadius: templateKey === 'compactJar' ? 24 : 10,
                padding: currentFormat.id === 'thermal58' ? '10px 12px' : '14px 16px',
                fontFamily: currentFont.fontFamily,
                fontSize: currentFormat.id === 'thermal58' ? 10.5 : 11.5,
                lineHeight: 1.35,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Bakery Atelier Brand Header */}
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  fontSize: currentFormat.id === 'thermal58' ? 12 : 13,
                  borderBottom: currentTemplate.headerBorder,
                  paddingBottom: 4,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: currentTemplate.accentColor || currentTemplate.textColor,
                }}
              >
                {labelData.bakeryName}
              </div>

              {/* Product Name & Official FSSAI Veg/Non-Veg Mark */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 2px' }}>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: currentFormat.id === 'thermal58' ? 13 : 14.5,
                    lineHeight: 1.2,
                    color: currentTemplate.textColor,
                  }}
                >
                  {labelData.productName}
                </span>

                {/* Authentic FSSAI Veg Symbol: Green square with green circle */}
                {labelData.isEggless ? (
                  <div
                    title="100% Vegetarian (FSSAI)"
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid #16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      flexShrink: 0,
                      background: '#fff',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
                  </div>
                ) : (
                  <div
                    title="Contains Egg / Non-Vegetarian (FSSAI)"
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid #92400E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      flexShrink: 0,
                      background: '#fff',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#92400E' }} />
                  </div>
                )}
              </div>

              {/* Metrics strip: Net Wt, MRP, Batch */}
              <div style={{ fontSize: 10.5, display: 'flex', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                <span>
                  Net Wt: <b>{labelData.netWeight}</b>
                </span>
                {labelData.mrp && (
                  <span>
                    MRP: <b>{labelData.mrp}</b>
                  </span>
                )}
                <span>
                  Lot: <b>{labelData.batchCode}</b>
                </span>
              </div>

              {/* Dates Row */}
              <div style={{ fontSize: 10, marginTop: 2, display: 'flex', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                <span>Mfg: {labelData.mfgDateStr}</span>
                <span>
                  Best Before: <b>{labelData.bestBeforeDateStr}</b>
                </span>
              </div>

              {/* Allergen Statement */}
              <div
                style={{
                  borderTop: currentTemplate.dividerStyle,
                  marginTop: 4,
                  paddingTop: 4,
                  fontSize: 9.5,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: labelData.allergens.length > 0 ? '#B91C1C' : currentTemplate.textColor,
                }}
              >
                {labelData.advisoryStatement}
              </div>

              {/* Optional Nutrition Facts Table */}
              {showNutrition && (
                <div
                  style={{
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: 4,
                    padding: '3px 6px',
                    fontSize: 8.5,
                    marginTop: 4,
                    background: 'rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                    Approx Nutrition (per 100g):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                    <span>Energy: {labelData.nutrition.energyKcal}kcal</span>
                    <span>Protein: {labelData.nutrition.proteinG}g</span>
                    <span>Carbs: {labelData.nutrition.carbsG}g</span>
                    <span>Sugar: {labelData.nutrition.sugarG}g</span>
                    <span>Fat: {labelData.nutrition.fatG}g</span>
                    <span>Sat. Fat: {labelData.nutrition.satFatG}g</span>
                  </div>
                </div>
              )}

              {/* Storage statement */}
              <div style={{ fontSize: 9, opacity: 0.85, marginTop: 3 }}>
                {labelData.storageInstructions}
              </div>

              {/* Barcode / Traceability & FSSAI Lic Line */}
              <div
                style={{
                  borderTop: currentTemplate.dividerStyle,
                  marginTop: 4,
                  paddingTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                {labelData.fssaiNumber ? (
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.02em' }}>
                    fssai Lic. No: {labelData.fssaiNumber}
                  </span>
                ) : (
                  <span style={{ fontSize: 8.5, opacity: 0.6 }}>fssai verified bakery</span>
                )}

                {showBarcode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Crisp Vector Code-128 Mock Barcode */}
                    <div style={{ display: 'flex', gap: 1, height: 14, alignItems: 'flex-end' }}>
                      {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2].map((w, i) => (
                        <div key={i} style={{ width: w, height: '100%', background: currentTemplate.textColor }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#7C6B5E', marginTop: 10, textAlign: 'center' }}>
              Printer ready: <b>{currentFormat.name}</b>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyThermal}
              style={{
                padding: '10px 14px',
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
              <span>{copied ? 'Copied ESC/POS!' : 'Copy ESC/POS Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloading}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                background: '#ffffff',
                color: '#2D1B14',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: downloading ? 'wait' : 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <Download size={16} />
              <span>{downloading ? 'Exporting...' : 'Save Image (PNG)'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '10px 22px',
              borderRadius: 12,
              border: 'none',
              background: '#10B981',
              color: '#ffffff',
              fontSize: 13.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
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
