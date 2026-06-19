import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, LayoutDashboard, ListTree, Palette, PackagePlus, Send, Store, Check, TrendingUp } from 'lucide-react';
import { useMenuBuilderData } from './useMenuBuilderData';

// The four build steps shown in the progress bar.
// Dashboard and Preview are separate quick-links above.
const BUILD_STEPS = [
  { to: '/menu-builder/create',     label: 'Bakery',     icon: Store },
  { to: '/menu-builder/categories', label: 'Categories', icon: ListTree },
  { to: '/menu-builder/products',   label: 'Products',   icon: PackagePlus },
  { to: '/menu-builder/theme',      label: 'Theme',      icon: Palette },
];

// Compute completion status for each build step from menu data.
function useStepStatus() {
  const { business, menu, products, loading } = useMenuBuilderData();
  return useMemo(() => {
    if (loading) return { bakery: false, categories: false, products: false, theme: false, completed: 0, total: 4, ready: false };
    const bakeryName = (menu.bakeryName || business?.name || '').trim();
    const contact = (menu.whatsapp || business?.whatsapp || business?.phone || '').trim();
    const bakery = Boolean(bakeryName && bakeryName !== 'Cream & Crust' && contact);
    const visibleCats = (menu.categories || []).filter(c => c.visible !== false).length;
    const categoriesDone = visibleCats >= 2;
    const visibleProducts = (products || []).filter(p => !p.menuHidden);
    const productsDone = visibleProducts.length >= 3;
    // Theme considered "touched" if user has changed any default
    const t = menu.theme || {};
    const themeDone = Boolean(
      t.template && t.template !== 'classic'
      || (t.primaryColor && t.primaryColor !== '#8f4229')
      || (t.font && t.font !== 'Playfair Display')
    );
    const completed = [bakery, categoriesDone, productsDone, themeDone].filter(Boolean).length;
    return {
      bakery,
      categories: categoriesDone,
      products: productsDone,
      theme: themeDone,
      completed,
      total: 4,
      ready: completed === 4,
    };
  }, [business, menu, products, loading]);
}

function StepProgressBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useStepStatus();
  const statusKeys = ['bakery', 'categories', 'products', 'theme'];

  const activeIndex = BUILD_STEPS.findIndex(s => location.pathname.startsWith(s.to));

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Step circles + connecting rails */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '4px 6px 0',
      }}>
        {/* Background rail */}
        <div style={{
          position: 'absolute',
          top: 18,
          left: 'calc(6px + 18px)',
          right: 'calc(6px + 18px)',
          height: 2,
          background: 'var(--border)',
          borderRadius: 99,
          zIndex: 0,
        }} />
        {/* Filled rail showing progress so far */}
        {status.completed > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(status.completed, BUILD_STEPS.length - 1) / (BUILD_STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 18,
              left: 'calc(6px + 18px)',
              maxWidth: 'calc(100% - 12px - 36px)',
              height: 2,
              background: 'linear-gradient(90deg, #B5606A 0%, #D8B97E 100%)',
              borderRadius: 99,
              zIndex: 1,
            }}
          />
        )}

        {BUILD_STEPS.map((step, i) => {
          const done = status[statusKeys[i]];
          const active = activeIndex === i;
          const Icon = step.icon;
          const baseColor = '#B5606A';
          const goldColor = '#D8B97E';

          let circleBg = 'var(--card)';
          let circleBorder = '2px solid var(--border)';
          let labelColor = 'var(--text3)';
          let circleColor = 'var(--text3)';
          let shadow = 'none';

          if (done) {
            circleBg = `linear-gradient(135deg, ${baseColor} 0%, ${goldColor} 100%)`;
            circleBorder = 'none';
            circleColor = '#fff';
            labelColor = 'var(--text)';
            shadow = '0 4px 10px rgba(181,96,106,0.28)';
          } else if (active) {
            circleBg = 'var(--card)';
            circleBorder = `2px solid ${baseColor}`;
            circleColor = baseColor;
            labelColor = baseColor;
            shadow = `0 0 0 4px ${baseColor}1A`;
          }

          return (
            <motion.button
              key={step.to}
              type="button"
              onClick={() => navigate(step.to)}
              whileTap={{ scale: 0.92 }}
              style={{
                position: 'relative',
                zIndex: 2,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                width: 64,
              }}
              aria-label={step.label}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: circleBg,
                border: circleBorder,
                color: circleColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: shadow,
                transition: 'all 0.25s ease',
              }}>
                {done ? <Check size={16} strokeWidth={3} /> : <Icon size={15} strokeWidth={active ? 2.4 : 2} />}
              </div>
              <span style={{
                fontSize: 10.5,
                fontWeight: active || done ? 800 : 700,
                color: labelColor,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Progress summary line */}
      <div style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text3)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: status.ready ? '#10B981' : '#D8B97E',
            boxShadow: status.ready ? '0 0 0 3px rgba(16,185,129,0.18)' : 'none',
          }} />
          {status.ready ? 'Ready to publish' : `${status.completed} of ${status.total} steps complete`}
        </span>
        <NavLink
          to="/menu-builder/preview"
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: isActive ? 'var(--accent)' : 'var(--text2)',
            textDecoration: 'none',
            fontWeight: 800,
          })}
        >
          <Eye size={12} /> Preview
        </NavLink>
      </div>
    </div>
  );
}

export default function MenuBuilderShell({ children, title, subtitle, action, hideProgressBar }) {
  const location = useLocation();
  const isDashboard = location.pathname === '/menu-builder' || location.pathname === '/menu-builder/';
  const isAnalytics = location.pathname === '/menu-builder/analytics';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fade-in"
      style={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {!isDashboard && (
                <NavLink
                  to="/menu-builder"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--text3)',
                    textDecoration: 'none',
                    padding: '4px 10px',
                    borderRadius: 99,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <LayoutDashboard size={11} /> Dashboard
                </NavLink>
              )}
            </div>
            <h1 style={{
              margin: 0,
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              color: 'var(--text)',
            }}>
              {title}
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.45 }}>{subtitle}</p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isAnalytics && (
              <NavLink
                to="/menu-builder/analytics"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(52,211,153,0.05) 100%)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  color: '#047857',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.1)',
                  transition: 'transform 0.15s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <TrendingUp size={14} strokeWidth={2.5} /> Analytics
              </NavLink>
            )}
            {action && <div>{action}</div>}
          </div>
        </div>
      </div>

      {/* Step progress bar */}
      {!hideProgressBar && !isAnalytics && <StepProgressBar />}

      {children}
    </motion.div>
  );
}

export function PublishButton({ onClick, disabled, pulse = false }) {
  return (
    <motion.button
      className="btn btn-primary"
      onClick={onClick}
      disabled={disabled}
      animate={pulse ? {
        boxShadow: [
          '0 4px 14px rgba(181,96,106,0.35)',
          '0 4px 20px rgba(181,96,106,0.65)',
          '0 4px 14px rgba(181,96,106,0.35)',
        ],
        scale: [1, 1.04, 1],
      } : {}}
      transition={pulse ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
      whileTap={{ scale: 0.95 }}
      style={{
        gap: 6,
        fontSize: '0.82rem',
        padding: '0 14px',
        height: 38,
        background: pulse
          ? 'linear-gradient(135deg, #B5606A 0%, #D8B97E 100%)'
          : undefined,
        border: 'none',
      }}
    >
      <Send size={15} /> Publish
    </motion.button>
  );
}

export function SaveBar({ onSave, saving, label = 'Save Changes' }) {
  return (
    <div style={{
      position: 'sticky',
      bottom: 72,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '10px 0',
      display: 'flex',
      justifyContent: 'flex-end',
    }}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="btn btn-primary"
        onClick={onSave}
        disabled={saving}
        style={{ boxShadow: '0 4px 20px rgba(181,96,106,0.35)', height: 44, gap: 8 }}
      >
        {saving ? '⏳ Saving...' : `💾 ${label}`}
      </motion.button>
    </div>
  );
}
