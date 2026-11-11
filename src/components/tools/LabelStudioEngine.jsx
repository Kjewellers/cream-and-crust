import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Info,
  Calendar,
  DollarSign,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import {
  generateLabelData,
  PRINTER_FORMATS,
  LABEL_TEMPLATES,
  LABEL_FONTS,
  detectAllergens,
} from '../../utils/allergenLabelGenerator';

const QUICK_PRESETS = [
  { name: 'Artisan Celebration Cake', weight: '1 kg', price: '1200', shelf: 3, ing: 'Refined wheat flour, butter, dairy milk, dark chocolate, sugar, vanilla extract' },
  { name: 'Sourdough Country Loaf', weight: '600g', price: '280', shelf: 4, ing: 'Organic wheat flour, water, wild sourdough culture, sea salt' },
  { name: 'French Butter Croissant (4 Pcs)', weight: '320g', price: '360', shelf: 2, ing: 'Wheat flour, cultured butter (34%), milk, sugar, yeast, salt' },
  { name: 'Dark Chocolate Truffles Box', weight: '250g', price: '550', shelf: 14, ing: 'Belgian dark chocolate (55%), dairy cream, butter, cocoa powder, roasted almonds' },
  { name: 'Assorted Macaron Box (6 Pcs)', weight: '180g', price: '480', shelf: 5, ing: 'Almond flour, powdered sugar, egg white, white chocolate, fruit puree, pistachio' },
];

export default function LabelStudioEngine({
  defaultProduct = null,
  isModal = false,
  onClose = null,
}) {
  const [step, setStep] = useState(1); // 1 = Product Details, 2 = Templates & Fonts, 3 = Printer & Output
  const [direction, setDirection] = useState(1);

  // Step 1 State: Product & Regulatory Form
  const [productName, setProductName] = useState(defaultProduct?.name || 'Artisan Celebration Cake');
  const [netWeight, setNetWeight] = useState(defaultProduct?.weight || '1 kg');
  const [mrp, setMrp] = useState('850');
  const [shelfLifeDays, setShelfLifeDays] = useState(3);
  const [ingredientsText, setIngredientsText] = useState(
    defaultProduct?.ingredients?.join(', ') ||
      'Refined wheat flour (maida), butter, dairy milk, dark chocolate, sugar, vanilla extract'
  );
  const [fssaiNumber, setFssaiNumber] = useState(() => {
    return localStorage.getItem('cc_bakery_fssai_lic') || '';
  });
  const [forceVeg, setForceVeg] = useState(null); // null = auto, true = veg, false = non-veg
  const [showNutrition, setShowNutrition] = useState(false);
  const [showBarcode, setShowBarcode] = useState(true);

  // Step 2 State: Templates & Fonts
  const [templateKey, setTemplateKey] = useState('classicThermal');
  const [fontKey, setFontKey] = useState('sans');

  // Step 3 State: Printer Profiles
  const [printerFormat, setPrinterFormat] = useState(() => {
    return localStorage.getItem('cc_bakery_printer_profile') || 'stickerSquare50';
  });

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const currentFormat = PRINTER_FORMATS[printerFormat] || PRINTER_FORMATS.stickerSquare50;
  const currentTemplate = LABEL_TEMPLATES[templateKey] || LABEL_TEMPLATES.classicThermal;
  const currentFont = LABEL_FONTS[fontKey] || LABEL_FONTS.sans;

  const goToStep = (targetStep) => {
    if (targetStep < 1 || targetStep > 3) return;
    triggerHaptic('light');
    setDirection(targetStep > step ? 1 : -1);
    setStep(targetStep);
  };

  const applyPreset = (preset) => {
    triggerHaptic('success');
    setProductName(preset.name);
    setNetWeight(preset.weight);
    setMrp(preset.price);
    setShelfLifeDays(preset.shelf);
    setIngredientsText(preset.ing);
    showToast(`Loaded ${preset.name} formula ✨`, 'success');
  };

  const handleSelectPrinterFormat = (id) => {
    triggerHaptic('light');
    setPrinterFormat(id);
    try {
      localStorage.setItem('cc_bakery_printer_profile', id);
    } catch {}
  };

  const handleSaveFssai = (val) => {
    setFssaiNumber(val);
    try {
      localStorage.setItem('cc_bakery_fssai_lic', val);
    } catch {}
  };

  const handleCopyThermal = async () => {
    try {
      await navigator.clipboard.writeText(labelData.thermalText);
      triggerHaptic('success');
      setCopied(true);
      showToast('ESC/POS thermal roll text copied! 📋', 'success');
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
        backgroundColor: currentTemplate.bgColor || '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `fssai-label-${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      triggerHaptic('success');
      showToast('High-resolution 300 DPI sticker saved! 🏷️', 'success');
    } catch (err) {
      showToast('Direct download failed. Use Print Food Sticker.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Dynamic Thermal / Roll / A4 Page CSS */}
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
        }
      `}</style>

      {/* ── 3-Step Guided Progress Ribbon ── */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 640 }}>
          {[
            { num: 1, label: 'Product & Formula', sub: 'Details & Allergens' },
            { num: 2, label: 'Design & Style', sub: 'Templates & Fonts' },
            { num: 3, label: 'Printer & Output', sub: 'Print & Export' },
          ].map((s, idx) => {
            const active = step === s.num;
            const completed = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => goToStep(s.num)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: active || completed ? 1 : 0.55,
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: active
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : completed
                        ? '#ECFDF5'
                        : '#F3F4F6',
                      color: active ? '#ffffff' : completed ? '#059669' : '#6B7280',
                      border: active ? 'none' : completed ? '1.5px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      boxShadow: active ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {completed ? <Check size={14} strokeWidth={3} /> : s.num}
                  </div>
                  <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, fontWeight: active ? 800 : 700, color: active ? '#10B981' : '#2D1B14' }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: 10, color: '#7C6B5E' }}>{s.sub}</span>
                  </div>
                </button>
                {idx < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: completed ? '#10B981' : 'rgba(0,0,0,0.08)',
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Quick Quick-Print Action in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              background: '#ECFDF5',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#059669',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            <span>Fast Print</span>
          </button>
        </div>
      </div>

      {/* ── Main Split View Body: Left Step Wizard & Right Live Canvas ── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(320px, 0.85fr)',
          overflow: 'hidden',
        }}
      >
        {/* Left Column: Animated Step Wizard Form */}
        <div
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '24px 28px',
            borderRight: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <AnimatePresence mode="wait">
            {/* ── STEP 1: Product Formulation & Regulatory Data ── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981' }}>
                      Step 1 of 3
                    </span>
                    <span style={{ fontSize: 11, color: '#7C6B5E' }}>• Product & Regulatory Formulation</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2D1B14' }}>
                    Enter Recipe Information & Batch Standards
                  </h3>
                </div>

                {/* Quick Formula Presets */}
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 6 }}>
                    ⚡ Load Bakery Formula Presets
                  </div>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.1)',
                          background: '#FAF6F0',
                          color: '#4A3B32',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                    Product Title (Printed on Sticker)
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Belgian Chocolate Truffle Cake"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      fontWeight: 700,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  />
                </div>

                {/* Net Weight + MRP + Shelf Life Days in 3 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                      Net Wt.
                    </label>
                    <input
                      type="text"
                      value={netWeight}
                      onChange={(e) => setNetWeight(e.target.value)}
                      placeholder="e.g. 500g"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        fontWeight: 700,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                      MRP Price (₹)
                    </label>
                    <input
                      type="text"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      placeholder="650"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        fontWeight: 700,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                      Shelf Life (Days)
                    </label>
                    <input
                      type="number"
                      value={shelfLifeDays}
                      onChange={(e) => setShelfLifeDays(e.target.value)}
                      min={1}
                      max={90}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(0,0,0,0.1)',
                        fontWeight: 700,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    />
                  </div>
                </div>

                {/* Ingredients with Live Auto-Detector */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                      Ingredients (Real-Time Allergen Engine)
                    </label>
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                      Live Regulatory Scan
                    </span>
                  </div>
                  <textarea
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                    rows={3}
                    placeholder="List all ingredients separated by commas..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      fontWeight: 600,
                      fontSize: 13,
                      marginTop: 4,
                      fontFamily: 'inherit',
                      lineHeight: 1.45,
                    }}
                  />
                </div>

                {/* Live Detected Allergen Chips */}
                <div style={{ background: '#FFF9F5', border: '1px solid rgba(181, 96, 106, 0.2)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#B5606A', textTransform: 'uppercase', marginBottom: 6 }}>
                    Detected FSSAI Allergen Declarations:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11.5,
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
                      {labelData.isEggless ? '100% VEG / EGGLESS' : 'CONTAINS EGG'}
                    </span>

                    {labelData.allergens.map((alg) => (
                      <span
                        key={alg}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
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
                  <div style={{ fontSize: 11, color: '#7C6B5E', marginTop: 6, lineHeight: 1.4 }}>
                    {labelData.advisoryStatement}
                  </div>
                </div>

                {/* FSSAI License Number */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase' }}>
                    FSSAI License Registration Number (14 Digits)
                  </label>
                  <input
                    type="text"
                    value={fssaiNumber}
                    onChange={(e) => handleSaveFssai(e.target.value)}
                    placeholder="e.g. 11524036000123"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1.5px solid rgba(0,0,0,0.1)',
                      fontWeight: 700,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  />
                  <div style={{ fontSize: 10.5, color: '#7C6B5E', marginTop: 3 }}>
                    Auto-saved securely on your device for future sticker print runs.
                  </div>
                </div>

                {/* Step 1 Next Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <span>Proceed to Step 2: Templates & Fonts</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Templates & Brand Typography ── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981' }}>
                      Step 2 of 3
                    </span>
                    <span style={{ fontSize: 11, color: '#7C6B5E' }}>• Brand Styling & Layout</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2D1B14' }}>
                    Choose Your Label Design Template & Brand Font
                  </h3>
                </div>

                {/* 5 Curated Label Templates */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                    Aesthetic Label Template Layouts
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    {Object.values(LABEL_TEMPLATES).map((tmpl) => {
                      const active = templateKey === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => {
                            triggerHaptic('light');
                            setTemplateKey(tmpl.id);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: active ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                            background: active ? '#ECFDF5' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>
                              {tmpl.name}
                            </span>
                            {active ? (
                              <Check size={16} color="#10B981" strokeWidth={3} />
                            ) : (
                              <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>
                                {tmpl.previewBadge}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: '#7C6B5E', lineHeight: 1.3 }}>
                            {tmpl.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Typography Engine */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                    Brand Typography
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
                            padding: '12px 10px',
                            borderRadius: 12,
                            border: active ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                            background: active ? '#ECFDF5' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: f.fontFamily, color: '#2D1B14' }}>
                            {f.sample}
                          </div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: active ? '#059669' : '#7C6B5E', marginTop: 4 }}>
                            {f.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feature Toggles */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                    Additional Label Badges & Tables
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowNutrition(!showNutrition)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: showNutrition ? '1.5px solid #10B981' : '1px solid rgba(0,0,0,0.12)',
                        background: showNutrition ? '#ECFDF5' : '#fff',
                        color: showNutrition ? '#059669' : '#4A3B32',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Utensils size={15} />
                      <span>Nutrition Table {showNutrition ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBarcode(!showBarcode)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: showBarcode ? '1.5px solid #10B981' : '1px solid rgba(0,0,0,0.12)',
                        background: showBarcode ? '#ECFDF5' : '#fff',
                        color: showBarcode ? '#059669' : '#4A3B32',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Barcode size={15} />
                      <span>Vector Barcode {showBarcode ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 Back & Next Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    style={{
                      padding: '10px 18px',
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
                    <ArrowLeft size={16} />
                    <span>Back to Product Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <span>Proceed to Step 3: Printer & Print</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Printer Profiles & Auto-Calibration ── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981' }}>
                      Step 3 of 3
                    </span>
                    <span style={{ fontSize: 11, color: '#7C6B5E' }}>• Printer Calibration & Output</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2D1B14' }}>
                    Select Your Printer Roll or Paper Sheet
                  </h3>
                </div>

                {/* Printer Profile Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.values(PRINTER_FORMATS).map((fmt) => {
                    const active = printerFormat === fmt.id;
                    return (
                      <div
                        key={fmt.id}
                        onClick={() => handleSelectPrinterFormat(fmt.id)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 14,
                          border: active ? '2px solid #10B981' : '1px solid rgba(0,0,0,0.1)',
                          background: active ? '#ECFDF5' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#2D1B14' }}>
                              {fmt.name}
                            </span>
                            {fmt.badge && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  background: active ? '#10B981' : 'rgba(0,0,0,0.06)',
                                  color: active ? '#fff' : '#7C6B5E',
                                }}
                              >
                                {fmt.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#7C6B5E', marginTop: 2 }}>
                            {fmt.subtitle}
                          </div>
                        </div>

                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: active ? '6.5px solid #10B981' : '2px solid rgba(0,0,0,0.2)',
                            background: '#fff',
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    );
                  })}
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
                    <b>Auto Printer Isolation:</b> The browser print dialog has been calibrated for <b>{currentFormat.name}</b>.
                    Hitting <b>Print Food Sticker</b> isolates the exact sticker without margins or background pages.
                  </div>
                </div>

                {/* Step 3 Production Action Buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={handleCopyThermal}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#ffffff',
                      color: '#2D1B14',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                    <span>{copied ? 'Copied ESC/POS!' : 'Copy Bluetooth Text'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloading}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#ffffff',
                      color: '#2D1B14',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: downloading ? 'wait' : 'pointer',
                    }}
                  >
                    <Download size={16} />
                    <span>{downloading ? 'Rendering...' : 'Save 300 DPI PNG'}</span>
                  </button>
                </div>

                {/* Final Primary Print Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    style={{
                      padding: '10px 18px',
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
                    <ArrowLeft size={16} />
                    <span>Back to Style</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    style={{
                      padding: '12px 28px',
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontSize: 14.5,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <Printer size={18} />
                    <span>Print Food Sticker Now</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Live Interactive Floating Sticker Canvas */}
        <div
          style={{
            background: '#F8F6F2',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#7C6B5E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Live Sticker Canvas
            </span>
            <span style={{ fontSize: 10, background: '#ECFDF5', color: '#059669', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
              {currentFormat.shortName}
            </span>
          </div>

          {/* Interactive Floating Sticker Node */}
          <motion.div
            id="fssai-sticker-print-area"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              width: '100%',
              maxWidth: currentFormat.maxWidthPx || 340,
              aspectRatio: currentFormat.aspectRatio || '1 / 1',
              background: currentTemplate.bgColor,
              color: currentTemplate.textColor,
              border: currentTemplate.borderStyle,
              borderRadius: templateKey === 'compactJar' ? 24 : 10,
              padding: currentFormat.id === 'thermal58' ? '12px 14px' : '16px 18px',
              fontFamily: currentFont.fontFamily,
              fontSize: currentFormat.id === 'thermal58' ? 10.5 : 11.5,
              lineHeight: 1.35,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 36px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Bakery Brand Header */}
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

            {/* Product Name & Authentic FSSAI Veg Symbol */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 2px' }}>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: currentFormat.id === 'thermal58' ? 13 : 15,
                  lineHeight: 1.2,
                  color: currentTemplate.textColor,
                }}
              >
                {labelData.productName}
              </span>

              {/* FSSAI Veg Green Dot / Egg Brown Dot */}
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

            {/* Metrics: Net Wt, MRP, Batch Code */}
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

            {/* Dates: Mfg Date & Best Before */}
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
                  Nutrition Facts (per 100g):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <span>Energy: {labelData.nutrition.energyKcal}kcal</span>
                  <span>Protein: {labelData.nutrition.proteinG}g</span>
                  <span>Carbs: {labelData.nutrition.carbsG}g</span>
                  <span>Sugar: {labelData.nutrition.sugarG}g</span>
                  <span>Fat: {labelData.nutrition.fatG}g</span>
                  <span>Sat: {labelData.nutrition.satFatG}g</span>
                </div>
              </div>
            )}

            {/* Storage statement */}
            <div style={{ fontSize: 9, opacity: 0.85, marginTop: 3 }}>
              {labelData.storageInstructions}
            </div>

            {/* Barcode & FSSAI Lic Footer */}
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
                  fssai Lic: {labelData.fssaiNumber}
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
          </motion.div>

          <div style={{ fontSize: 11, color: '#7C6B5E', marginTop: 12, textAlign: 'center' }}>
            Template: <b>{currentTemplate.name}</b> · Font: <b>{currentFont.name}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
