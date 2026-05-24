import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    emoji: '🏪',
    color: '#B5606A',
    bg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    accentBg: 'rgba(181,96,106,0.12)',
    title: 'Set Up Your Bakery',
    subtitle: 'Start with the basics',
    description: 'Give your menu a name, upload your bakery logo, and write a short description that makes customers excited to order.',
    tips: ['Use your real bakery name', 'Upload a high-quality logo', 'Keep description under 100 words'],
    illustration: <BakeryIllustration />,
    action: { label: 'Go to Bakery Details', path: '/menu-builder/create' },
  },
  {
    id: 2,
    emoji: '📂',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    accentBg: 'rgba(124,58,237,0.10)',
    title: 'Create Categories',
    subtitle: 'Organise your menu',
    description: 'Group your items into categories like Cakes, Cookies, Breads, or Seasonal Specials so customers can browse easily.',
    tips: ['Start with 3–5 categories', 'Add emoji icons for visual appeal', 'Seasonal items boost sales'],
    illustration: <CategoriesIllustration />,
    action: { label: 'Add Categories', path: '/menu-builder/categories' },
  },
  {
    id: 3,
    emoji: '🍰',
    color: '#EA823C',
    bg: 'linear-gradient(135deg, #FFF8F1 0%, #FFE8D0 100%)',
    accentBg: 'rgba(234,130,60,0.10)',
    title: 'Add Menu Products',
    subtitle: 'Showcase your bakes',
    description: 'List every product with a mouth-watering photo, description, and price. The more detail you add, the more orders you get!',
    tips: ['Add a photo for every item', 'Write tempting descriptions', 'Set clear, competitive prices'],
    illustration: <ProductsIllustration />,
    action: { label: 'Add Products', path: '/menu-builder/products' },
  },
  {
    id: 4,
    emoji: '🎨',
    color: '#0284C7',
    bg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    accentBg: 'rgba(2,132,199,0.10)',
    title: 'Customise Your Theme',
    subtitle: 'Make it yours',
    description: 'Choose colours, fonts, and layout that match your brand personality. Your menu should look as good as your bakes taste!',
    tips: ['Match your brand colours', 'Try the grid layout for photos', 'Dark mode looks ultra-premium'],
    illustration: <ThemeIllustration />,
    action: { label: 'Open Theme Editor', path: '/menu-builder/theme' },
  },
  {
    id: 5,
    emoji: '🚀',
    color: '#10B981',
    bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    accentBg: 'rgba(16,185,129,0.10)',
    title: 'Preview & Publish',
    subtitle: 'Go live in one tap',
    description: 'Check how your menu looks on mobile and desktop, then hit Publish. Share the link on Instagram, WhatsApp, or anywhere!',
    tips: ['Preview on mobile first', 'Share link in your Instagram bio', 'Update menu anytime — live instantly'],
    illustration: <PublishIllustration />,
    action: { label: 'Preview Menu', path: '/menu-builder/preview' },
  },
];

// ── Illustrations ──────────────────────────────────────────────────────────────

function BakeryIllustration() {
  return (
    <div style={{ position: 'relative', width: 200, height: 160, margin: '0 auto' }}>
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: '5rem', display: 'block', filter: 'drop-shadow(0 8px 20px rgba(181,96,106,0.25))' }}>🏪</div>
      </motion.div>
      {/* Floating badges */}
      <motion.div
        animate={{ x: [0, 4, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'white', borderRadius: 12, padding: '6px 10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          fontSize: '0.7rem', fontWeight: 800, color: '#B5606A',
          display: 'flex', alignItems: 'center', gap: 4
        }}
      >
        <span>🧁</span> Cream & Crust
      </motion.div>
      <motion.div
        animate={{ x: [0, -4, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        style={{
          position: 'absolute', bottom: 20, left: 0,
          background: 'white', borderRadius: 12, padding: '6px 10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          fontSize: '0.7rem', fontWeight: 800, color: '#7C3AED'
        }}
      >
        📍 India
      </motion.div>
    </div>
  );
}

function CategoriesIllustration() {
  const cats = ['🎂 Cakes', '🍪 Cookies', '🥐 Breads', '🍩 Donuts'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200, margin: '0 auto' }}>
      {cats.map((cat, i) => (
        <motion.div
          key={cat}
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.15, duration: 0.5, ease: 'backOut' }}
          style={{
            background: 'white',
            borderRadius: 12, padding: '8px 14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            fontSize: '0.8rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 8,
            border: i === 0 ? '2px solid #7C3AED' : '1.5px solid rgba(0,0,0,0.05)'
          }}
        >
          {cat}
          {i === 0 && <span style={{ marginLeft: 'auto', color: '#7C3AED', fontSize: '0.65rem', fontWeight: 900 }}>ACTIVE</span>}
        </motion.div>
      ))}
    </div>
  );
}

function ProductsIllustration() {
  const products = [
    { name: 'Chocolate Truffle', price: '₹650', emoji: '🎂' },
    { name: 'Butter Cookies', price: '₹250', emoji: '🍪' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 210, margin: '0 auto' }}>
      {products.map((p, i) => (
        <motion.div
          key={p.name}
          animate={{ y: [0, i % 2 === 0 ? -4 : 4, 0] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'white',
            borderRadius: 16, padding: 12,
            boxShadow: '0 4px 16px rgba(234,130,60,0.12)',
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#FFF8F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', flexShrink: 0
          }}>{p.emoji}</div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4A3B32' }}>{p.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#EA823C', fontWeight: 900, marginTop: 2 }}>{p.price}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ThemeIllustration() {
  const colors = ['#B5606A', '#7C3AED', '#0284C7', '#10B981', '#EA823C'];
  return (
    <div style={{ textAlign: 'center', width: 200, margin: '0 auto' }}>
      <motion.div
        animate={{ rotate: [0, 2, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'white', borderRadius: 20, padding: 16,
          boxShadow: '0 8px 24px rgba(2,132,199,0.15)'
        }}
      >
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          {colors.map((c, i) => (
            <motion.div
              key={c}
              animate={{ scale: i === 0 ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c,
                border: i === 0 ? '2.5px solid #4A3B32' : '2px solid transparent'
              }}
            />
          ))}
        </div>
        <div style={{ height: 8, background: '#FFF1F2', borderRadius: 8, marginBottom: 6 }} />
        <div style={{ height: 8, background: '#EDE9FE', borderRadius: 8, marginBottom: 6, width: '80%', margin: '0 auto 6px' }} />
        <div style={{ height: 8, background: '#F0F9FF', borderRadius: 8, width: '60%', margin: '0 auto' }} />
      </motion.div>
    </div>
  );
}

function PublishIllustration() {
  return (
    <div style={{ textAlign: 'center', position: 'relative', width: 200, height: 160, margin: '0 auto' }}>
      <motion.div
        animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: '4.5rem', display: 'block', lineHeight: 1 }}
      >
        🚀
      </motion.div>
      {/* Sparkle particles */}
      {[
        { top: 10, left: 20, delay: 0 },
        { top: 30, right: 15, delay: 0.5 },
        { bottom: 30, left: 30, delay: 1 },
        { bottom: 10, right: 30, delay: 1.5 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: pos.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', ...pos,
            width: 10, height: 10, borderRadius: '50%',
            background: '#10B981'
          }}
        />
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: 12,
          background: 'white', borderRadius: 12, padding: '6px 14px',
          boxShadow: '0 4px 16px rgba(16,185,129,0.2)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: '0.72rem', fontWeight: 800, color: '#10B981'
        }}
      >
        <CheckCircle2 size={13} /> Menu Live!
      </motion.div>
    </div>
  );
}

// ── Main Guide Component ───────────────────────────────────────────────────────

export default function MenuBuilderGuide({ onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    if (isLast) { onClose(); return; }
    setDirection(1);
    setStep(s => s + 1);
  };

  const goPrev = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep(s => s - 1);
  };

  const goToStep = (s) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const handleAction = () => {
    onClose();
    navigate(current.action.path);
  };

  // Prevent scroll behind overlay
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, scale: 0.97 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(10, 8, 6, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          background: 'white',
          borderRadius: 28,
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          position: 'relative',
        }}
      >
        {/* ── Header Bar ── */}
        <div style={{
          padding: '18px 20px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1rem' }}>📖</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Menu Builder Guide
            </span>
            <span style={{
              background: current.accentBg, color: current.color,
              fontSize: '0.62rem', fontWeight: 900,
              padding: '2px 8px', borderRadius: 99
            }}>
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text2)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step Progress Dots ── */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 20px 0', justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <motion.button
              key={i}
              onClick={() => goToStep(i)}
              animate={{
                width: i === step ? 28 : 8,
                background: i === step ? current.color : i < step ? current.color + '60' : 'rgba(0,0,0,0.12)'
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                height: 8, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
              }}
            />
          ))}
        </div>

        {/* ── Step Content ── */}
        <div style={{ minHeight: 440, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              style={{ padding: '20px 24px 0' }}
            >
              {/* Illustration area */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  borderRadius: 20,
                  background: current.bg,
                  padding: '28px 20px',
                  marginBottom: 20,
                  textAlign: 'center',
                  minHeight: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {current.illustration}
              </motion.div>

              {/* Title + subtitle */}
              <div style={{ marginBottom: 12 }}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    fontSize: '0.68rem', fontWeight: 900, color: current.color,
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4
                  }}
                >
                  {current.subtitle}
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}
                >
                  {current.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{ color: 'var(--text2)', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.6 }}
                >
                  {current.description}
                </motion.p>
              </div>

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}
              >
                {current.tips.map((tip, i) => (
                  <motion.div
                    key={tip}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.07 }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: current.accentBg, color: current.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '0.6rem', fontWeight: 900, marginTop: 1
                    }}>✓</span>
                    {tip}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer Buttons ── */}
        <div style={{
          padding: '14px 24px 20px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', gap: 10
        }}>
          {/* Back */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goPrev}
            disabled={step === 0}
            style={{
              width: 42, height: 42, borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.1)',
              background: 'none', cursor: step === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: step === 0 ? 'rgba(0,0,0,0.2)' : 'var(--text)',
              flexShrink: 0
            }}
          >
            <ArrowLeft size={18} />
          </motion.button>

          {/* Go to step action */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAction}
            style={{
              flex: 1, height: 42, borderRadius: 14,
              border: `1.5px solid ${current.color}30`,
              background: current.accentBg,
              color: current.color,
              fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            {current.action.label}
          </motion.button>

          {/* Next / Done */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goNext}
            style={{
              width: isLast ? 'auto' : 42,
              padding: isLast ? '0 18px' : 0,
              height: 42, borderRadius: 14,
              background: current.color,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: 'white', fontWeight: 800, fontSize: '0.82rem',
              flexShrink: 0
            }}
          >
            {isLast ? (
              <><CheckCircle2 size={16} /> Done</>
            ) : (
              <ArrowRight size={18} />
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
