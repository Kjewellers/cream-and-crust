import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  Package,
  Palette,
  Send,
  BookOpen,
  ArrowRight,
  Store,
  ListTree,
  PackagePlus,
  QrCode,
  Sparkles,
  Check,
  BarChart3,
} from 'lucide-react';
import { showToast } from '../../components/iOS';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { PublishButton } from './MenuBuilderShell';
import MenuBuilderGuide from '../../components/menu/MenuBuilderGuide';
import QRCodeView from './QRCodeView';
import ModuleTour from '../../components/ModuleTour';
import { menuBuilderTourSteps } from '../../components/tours/menuBuilderTour';
import AnimatedDemo from '../../components/AnimatedDemo';
import { menuDemoScenes } from '../../components/demos/menuDemo';

// Build flow steps with completion logic identical to the shell.
const BUILD_STEPS = [
  {
    key: 'bakery',
    to: '/menu-builder/create',
    icon: Store,
    label: 'Bakery Details',
    desc: 'Name, logo, contact, hours',
    color: '#B5606A',
  },
  {
    key: 'categories',
    to: '/menu-builder/categories',
    icon: ListTree,
    label: 'Categories',
    desc: 'At least 2 visible groups',
    color: '#7C3AED',
  },
  {
    key: 'products',
    to: '/menu-builder/products',
    icon: PackagePlus,
    label: 'Products',
    desc: 'At least 3 items with photos',
    color: '#EA823C',
  },
  {
    key: 'theme',
    to: '/menu-builder/theme',
    icon: Palette,
    label: 'Theme & Layout',
    desc: 'Pick a template, colours, fonts',
    color: '#0284C7',
  },
];

function computeStepStatus(business, menu, products) {
  // Identity + contact now come from the profile. The "Bakery Details" step
  // is complete when the profile has a real bakery name and a contact number.
  const bakeryName = (business?.name || menu.bakeryName || '').trim();
  const contact = (business?.whatsapp || business?.phone || menu.whatsapp || '').trim();
  const bakery = Boolean(bakeryName && bakeryName !== 'Cream & Crust' && contact);
  const visibleCats = (menu.categories || []).filter((c) => c.visible !== false).length;
  const categories = visibleCats >= 2;
  const visibleProducts = (products || []).filter((p) => !p.menuHidden);
  const productsDone = visibleProducts.length >= 3;
  const t = menu.theme || {};
  const theme = Boolean(
    (t.template && t.template !== 'classic') ||
    (t.primaryColor && t.primaryColor !== '#8f4229') ||
    (t.font && t.font !== 'Playfair Display')
  );
  return { bakery, categories, products: productsDone, theme };
}

export default function MenuDashboard() {
  const { business, username, menu, products, loading, publishMenu } = useMenuBuilderData();
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();
  const publicUrl = `${window.location.origin}/menu/${username}`;

  const status = useMemo(
    () => computeStepStatus(business || {}, menu, products),
    [business, menu, products]
  );
  const completedCount = Object.values(status).filter(Boolean).length;
  const totalSteps = BUILD_STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  // Smart next-step CTA: first incomplete step
  const nextStep = useMemo(() => BUILD_STEPS.find((s) => !status[s.key]) || null, [status]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    showToast('Menu link copied! 🔗', 'success');
  };

  const handlePublish = async () => {
    if (!allDone) {
      showToast('Finish all 4 steps first', 'error');
      return;
    }
    if (visibleProducts.length < 5) {
      showToast(`Add at least 5 products to publish (you have ${visibleProducts.length})`, 'error');
      return;
    }
    await publishMenu();
    showToast('Menu published! 🚀', 'success');
  };

  if (loading)
    return (
      <MenuBuilderShell title="Menu Builder" subtitle="Loading…">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          Loading your menu…
        </div>
      </MenuBuilderShell>
    );

  const visibleProducts = products.filter((p) => !p.menuHidden);
  const isPublished = menu.published;
  const canPublish = allDone;

  return (
    <>
      <AnimatePresence>
        {showGuide && <MenuBuilderGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>

      <MenuBuilderShell
        title="Menu Builder"
        subtitle="Craft and publish your bakery's shareable menu."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowGuide(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                height: 38,
                padding: '0 12px',
              }}
            >
              <BookOpen size={14} /> Guide
            </button>
            <PublishButton
              onClick={handlePublish}
              disabled={!canPublish}
              pulse={canPublish && !isPublished}
            />
          </div>
        }
      >
        {/* ── Journey Hero — progress + smart next CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative',
            padding: '18px 18px 16px',
            borderRadius: 22,
            marginBottom: 14,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #FFF8F1 0%, #FCEAE0 55%, #F7DCC9 100%)',
            border: '1px solid rgba(181,96,106,0.18)',
            boxShadow: '0 6px 20px rgba(181,96,106,0.10)',
          }}
        >
          {/* Decorative gold orb */}
          <div
            style={{
              position: 'absolute',
              right: -40,
              top: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 30% 30%, rgba(216,185,126,0.45) 0%, rgba(216,185,126,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="#B5606A" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#8B4951',
                }}
              >
                Your Menu Journey
              </span>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#8B4951',
                padding: '3px 10px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(181,96,106,0.18)',
              }}
            >
              {completedCount}/{totalSteps} done
            </span>
          </div>

          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '1.55rem',
              fontWeight: 800,
              color: '#3F1D22',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: 10,
            }}
          >
            {allDone
              ? isPublished
                ? 'Live and looking lovely.'
                : 'Ready to share with the world.'
              : 'A few more touches and you\u2019re live.'}
          </div>

          {/* Animated progress bar */}
          <div
            style={{
              height: 8,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.55)',
              overflow: 'hidden',
              marginBottom: 14,
              border: '1px solid rgba(181,96,106,0.12)',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: 99,
                background: 'linear-gradient(90deg, #B5606A 0%, #D8B97E 100%)',
                boxShadow: '0 0 8px rgba(216,185,126,0.6)',
              }}
            />
          </div>

          {/* Smart next-step CTA */}
          {nextStep ? (
            <button
              onClick={() => navigate(nextStep.to)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(8px)',
                textAlign: 'left',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: nextStep.color + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <nextStep.icon size={17} color={nextStep.color} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#8B4951',
                    textTransform: 'uppercase',
                  }}
                >
                  Next step
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                  {nextStep.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                  {nextStep.desc}
                </div>
              </div>
              <ArrowRight size={18} color={nextStep.color} style={{ flexShrink: 0 }} />
            </button>
          ) : (
            <motion.button
              onClick={handlePublish}
              animate={
                !isPublished
                  ? {
                      boxShadow: [
                        '0 4px 12px rgba(181,96,106,0.30)',
                        '0 4px 22px rgba(181,96,106,0.60)',
                        '0 4px 12px rgba(181,96,106,0.30)',
                      ],
                    }
                  : {}
              }
              transition={
                !isPublished ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}
              }
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 14px',
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                background: isPublished
                  ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                  : 'linear-gradient(135deg, #B5606A 0%, #D8B97E 100%)',
                color: '#fff',
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: '0.02em',
              }}
            >
              {isPublished ? (
                <>
                  <CheckCircle2 size={17} /> Menu is live — view public page
                </>
              ) : (
                <>
                  <Send size={16} /> Publish menu
                </>
              )}
            </motion.button>
          )}
        </motion.div>

        {/* ── Status pill (compact, only shown when published) ── */}
        {isPublished && (
          <div
            className="card"
            style={{
              padding: '12px 14px',
              borderRadius: 16,
              marginBottom: 14,
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(52,211,153,0.05) 100%)',
              border: '1px solid rgba(16,185,129,0.20)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 0 4px rgba(16,185,129,0.18)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#047857',
                  letterSpacing: '-0.01em',
                }}
              >
                Live · {visibleProducts.length} products visible
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#047857',
                  opacity: 0.85,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {publicUrl}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleCopy}
                aria-label="Copy link"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: '#047857',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                <Copy size={12} /> Copy
              </button>
              <button
                onClick={() => window.open(publicUrl, '_blank')}
                style={{
                  background: '#10B981',
                  border: 'none',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                Open <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── Share your menu card (shown after publishing) ── */}
        {isPublished && (
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 18,
              marginBottom: 14,
              background:
                'linear-gradient(135deg, rgba(181,96,106,0.06) 0%, rgba(212,160,80,0.04) 100%)',
              border: '1px solid rgba(181,96,106,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 22 }}>🎉</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                  Your menu is live!
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  Share it everywhere to get more orders
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(publicUrl);
                  showToast('Link copied! Paste it in your Instagram bio', 'success');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(181,96,106,0.12)',
                  background: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 18 }}>📸</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Add to Instagram bio
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Copies link — paste in your IG profile
                  </div>
                </div>
                <Copy size={14} color="var(--text3)" />
              </button>
              <button
                onClick={() => {
                  const text = `Check out my bakery menu! 🧁\n${publicUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(37,211,102,0.18)',
                  background: 'rgba(37,211,102,0.04)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 18 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Share on WhatsApp
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Send menu link to customers & groups
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text3)" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(publicUrl);
                  showToast('Link copied! Add it to your WhatsApp business bio', 'success');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(181,96,106,0.08)',
                  background: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 18 }}>🔗</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Add to WhatsApp bio
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Copies link for your WA Business profile
                  </div>
                </div>
                <Copy size={14} color="var(--text3)" />
              </button>
            </div>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            {
              icon: Package,
              label: 'Products',
              value: `${visibleProducts.length}/${products.length}`,
              color: '#EA823C',
            },
            {
              icon: ListTree,
              label: 'Categories',
              value: (menu.categories || []).filter((c) => c.visible !== false).length,
              color: '#7C3AED',
            },
            {
              icon: CheckCircle2,
              label: 'Status',
              value: isPublished ? 'Live' : 'Draft',
              color: isPublished ? '#10B981' : '#F59E0B',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card"
              style={{ padding: '12px 10px', borderRadius: 16, textAlign: 'center' }}
            >
              <stat.icon size={16} color={stat.color} style={{ marginBottom: 4 }} />
              <div
                style={{
                  fontSize:
                    typeof stat.value === 'string' && stat.value.length > 5 ? '0.88rem' : '1.15rem',
                  fontWeight: 900,
                  color: 'var(--text)',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Build Flow ── */}
        {isPublished && (
          <motion.div
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            style={{ marginBottom: 14 }}
          >
            <Link
              to="/menu-builder/analytics"
              style={{
                padding: '20px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #2D2323 0%, #B5606A 100%)',
                boxShadow: '0 8px 30px rgba(181,96,106,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Shine effect */}
              <motion.div 
                animate={{ x: ['-100%', '250%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  transform: 'skewX(-20deg)'
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <BarChart3 size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Menu Analytics <span style={{ background: '#D8B97E', color: '#FFF', fontSize: 10, padding: '2px 6px', borderRadius: 6, fontWeight: 900 }}>NEW</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: 500 }}>
                    Track live visitors & conversion
                  </div>
                </div>
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.15)', 
                borderRadius: '50%', 
                width: 34, height: 34, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
                backdropFilter: 'blur(4px)'
              }}>
                <ArrowRight size={18} color="#FFF" />
              </div>
            </Link>
          </motion.div>
        )}
        <div className="card" style={{ padding: '16px 18px', borderRadius: 20, marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            >
              Build Flow
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--text3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {completedCount === totalSteps ? '✓ All set' : `${totalSteps - completedCount} left`}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BUILD_STEPS.map((step, i) => {
              const done = status[step.key];
              return (
                <Link
                  key={step.to}
                  to={step.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    textDecoration: 'none',
                    background: done ? 'rgba(16,185,129,0.06)' : step.color + '0E',
                    border: done
                      ? '1.5px solid rgba(16,185,129,0.25)'
                      : `1.5px solid ${step.color}1F`,
                    transition: 'transform 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: done
                        ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                        : step.color + '18',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: done ? '#fff' : step.color,
                    }}
                  >
                    {done ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <step.icon size={15} strokeWidth={2.2} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ color: done ? '#047857' : step.color, fontWeight: 900 }}>
                        {i + 1}.
                      </span>
                      {step.label}
                      {done && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: '#047857',
                            padding: '1px 6px',
                            borderRadius: 99,
                            background: 'rgba(16,185,129,0.15)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          DONE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>
                      {step.desc}
                    </div>
                  </div>
                  <ArrowRight
                    size={15}
                    color={done ? '#047857' : step.color}
                    style={{ flexShrink: 0, opacity: 0.7 }}
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <motion.button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={!canPublish}
            animate={
              canPublish && !isPublished
                ? {
                    boxShadow: [
                      '0 4px 12px rgba(181,96,106,0.30)',
                      '0 4px 20px rgba(181,96,106,0.60)',
                      '0 4px 12px rgba(181,96,106,0.30)',
                    ],
                  }
                : {}
            }
            transition={
              canPublish && !isPublished
                ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
            whileTap={{ scale: 0.96 }}
            style={{
              gap: 6,
              height: 46,
              opacity: canPublish ? 1 : 0.55,
              cursor: canPublish ? 'pointer' : 'not-allowed',
              background: canPublish
                ? 'linear-gradient(135deg, #B5606A 0%, #D8B97E 100%)'
                : undefined,
              border: 'none',
            }}
          >
            <Send size={16} /> {isPublished ? 'Re-publish' : 'Publish'}
          </motion.button>
          <button
            className="btn btn-outline"
            onClick={handleCopy}
            style={{ gap: 6, height: 46 }}
            disabled={!isPublished}
          >
            <Copy size={16} /> Copy Link
          </button>
        </div>

        {/* ── QR Code ── */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 900,
              color: 'var(--text)',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <QrCode size={14} color="var(--accent)" /> QR Code
          </div>
          {isPublished ? (
            <QRCodeView username={username} />
          ) : (
            <div
              className="card"
              style={{
                padding: '24px 20px',
                textAlign: 'center',
                borderRadius: 20,
                border: '2px dashed var(--border)',
                background: 'var(--bg2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: '2rem' }}>🔒</div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)' }}>
                QR Code Locked
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', maxWidth: 280 }}>
                Publish your bakery menu to generate a custom table-stand QR code 🧁
              </div>
            </div>
          )}
        </div>
      </MenuBuilderShell>
      <AnimatedDemo moduleId="menu" title="Build Your Online Menu" scenes={menuDemoScenes} />
    </>
  );
}
