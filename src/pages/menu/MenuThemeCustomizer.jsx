import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Eye, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../../components/iOS';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { SaveBar } from './MenuBuilderShell';
import MenuRenderer from '../../components/menu/MenuRenderer';

const sectionLabels = {
  hero: { label: 'Hero Banner', emoji: '🖼️' },
  categories: { label: 'Categories', emoji: '📂' },
  bestsellers: { label: 'Bestsellers', emoji: '⭐' },
  products: { label: 'All Products', emoji: '🍰' },
  custom: { label: 'Custom Cakes', emoji: '🎂' },
  trust: { label: 'Trust Badges', emoji: '✅' },
  footer: { label: 'Footer', emoji: '📄' },
};

const FONT_OPTIONS = [
  { value: 'Playfair Display', label: 'Playfair Display', style: 'serif' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', style: 'modern' },
  { value: 'Quicksand', label: 'Quicksand', style: 'rounded' },
];

const PRESET_PALETTES = [
  { label: 'Rose', primary: '#B5606A', secondary: '#D6989E' },
  { label: 'Violet', primary: '#7C3AED', secondary: '#A78BFA' },
  { label: 'Ocean', primary: '#0284C7', secondary: '#38BDF8' },
  { label: 'Forest', primary: '#15803D', secondary: '#4ADE80' },
  { label: 'Amber', primary: '#B45309', secondary: '#FCD34D' },
  { label: 'Slate', primary: '#334155', secondary: '#94A3B8' },
];

// Available menu-page templates. The renderer picks one of these based on
// `theme.template`. Adding a new template = (1) add an entry here,
// (2) add the renderer component and branch in MenuRenderer.jsx.
const TEMPLATE_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Editorial layout with clean grid and product cards',
    swatches: ['#B5606A', '#FFFFFF', '#F4ECE3'],
    accent: '🍰',
  },
  {
    id: 'editorial',
    label: 'Editorial Magazine',
    description: 'Vogue-style cream paper, oversized serif, parallax & image zoom',
    swatches: ['#FAF6F0', '#1A1410', '#B89968'],
    accent: '📖',
  },
  {
    id: 'midnight',
    label: 'Midnight Velvet',
    description: 'Deep maroon + gold leaf, candlelit glow, spotlight reveals',
    swatches: ['#1A0A11', '#D4A857', '#F4E9D4'],
    accent: '✦',
  },
  {
    id: 'gallery',
    label: 'Pastel Gallery',
    description: 'Museum exhibition — custom cursor, 3D tilt, falling-leaf cards, plaques',
    swatches: ['#FAF8F4', '#F4DDD6', '#D9DFCE'],
    accent: '🖼',
  },
  {
    id: 'cinema',
    label: 'Cinema Pâtisserie',
    description: 'Studio ident intro, marquee bulbs, movie posters, ticket stubs, rolling credits',
    swatches: ['#080507', '#7A1E2A', '#D4A857'],
    accent: '🎬',
  },
  {
    id: 'maison',
    label: 'Joie Pâtisserie',
    description:
      'Bakerly-inspired joyful pastel — yellow & pink, sticker tags, hand-drawn squiggles, bold rounded CTAs',
    swatches: ['#FFE373', '#FF8FB8', '#9DC9EC'],
    accent: '🥐',
  },
  {
    id: 'doodle',
    label: 'Pinterest Doodle',
    description: 'Hand-drawn cream paper, polaroid cards, animated doodles',
    swatches: ['#FBF4E9', '#A14F61', '#FFE7A8'],
    accent: '✿',
  },
];

export default function MenuThemeCustomizer() {
  const { business, menu, products, loading, saveMenu } = useMenuBuilderData();
  const [theme, setTheme] = useState(menu.theme);
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null); // template id being previewed

  useEffect(() => setTheme(menu.theme), [menu.theme]);

  const update = (key, value) => setTheme((prev) => ({ ...prev, [key]: value }));

  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= theme.sectionOrder.length) return;
    setTheme((prev) => {
      const next = [...prev.sectionOrder];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...prev, sectionOrder: next };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveMenu({ theme });
      showToast('Theme saved! 🎨', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <MenuBuilderShell title="Theme" subtitle="Personalise your menu's look.">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>
      </MenuBuilderShell>
    );

  return (
    <MenuBuilderShell title="Theme Customizer" subtitle="Tune colours, fonts, and layout.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Template picker — selects the public-menu visual style */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}
          >
            ✨ Menu Template
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 10,
            }}
          >
            {TEMPLATE_OPTIONS.map((tpl) => {
              const active = (theme.template || 'classic') === tpl.id;
              return (
                <motion.button
                  key={tpl.id}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -2 }}
                  onClick={() => setPreviewTemplate(tpl.id)}
                  style={{
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 16,
                    border: active
                      ? `2px solid ${theme.primaryColor || '#B5606A'}`
                      : '1.5px solid var(--border)',
                    background: active ? (theme.primaryColor || '#B5606A') + '12' : 'var(--bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.18s ease',
                  }}
                >
                  {/* Swatch row */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {tpl.swatches.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          background: c,
                          border: '1px solid rgba(0,0,0,0.08)',
                        }}
                      />
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: 18 }}>{tpl.accent}</span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: 'var(--text)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {tpl.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text3)',
                        marginTop: 3,
                        lineHeight: 1.45,
                      }}
                    >
                      {tpl.description}
                    </div>
                  </div>
                  {active ? (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: theme.primaryColor || '#B5606A',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      ● Active
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Eye size={10} /> Tap to preview
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Colour Presets */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}
          >
            🎨 Colour Palette
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {PRESET_PALETTES.map((preset) => {
              const active = theme.primaryColor === preset.primary;
              return (
                <motion.button
                  key={preset.label}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    update('primaryColor', preset.primary);
                    update('secondaryColor', preset.secondary);
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? preset.primary + '18' : 'var(--bg)',
                    outline: active ? `2px solid ${preset.primary}` : '1.5px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: preset.primary,
                      }}
                    />
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: preset.secondary,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: active ? preset.primary : 'var(--text2)',
                    }}
                  >
                    {preset.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {/* Custom colour pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Custom Primary</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => update('primaryColor', e.target.value)}
                  style={{ width: 40, height: 40, padding: 2, borderRadius: 8, cursor: 'pointer' }}
                />
                <span
                  style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text2)' }}
                >
                  {theme.primaryColor}
                </span>
              </div>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Custom Secondary</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => update('secondaryColor', e.target.value)}
                  style={{ width: 40, height: 40, padding: 2, borderRadius: 8, cursor: 'pointer' }}
                />
                <span
                  style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text2)' }}
                >
                  {theme.secondaryColor}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Typography */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}
          >
            ✍️ Typography
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FONT_OPTIONS.map((font) => (
              <motion.button
                key={font.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => update('font', font.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: theme.font === font.value ? 'var(--accent-light)' : 'var(--bg)',
                  outline:
                    theme.font === font.value
                      ? '2px solid var(--accent)'
                      : '1.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: font.value,
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--text)',
                    }}
                  >
                    {font.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--text3)',
                      fontWeight: 600,
                      marginTop: 1,
                    }}
                  >
                    {font.style}
                  </div>
                </div>
                {theme.font === font.value && (
                  <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '0.75rem' }}>
                    ✓
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Style controls */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}
          >
            ⚙️ Style Options
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Button Style</span>
              <select
                value={theme.buttonStyle}
                onChange={(e) => update('buttonStyle', e.target.value)}
              >
                <option value="pill">Pill (Rounded)</option>
                <option value="soft">Soft Rounded</option>
                <option value="classic">Classic Square</option>
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Spacing Density</span>
              <select
                value={theme.spacingDensity}
                onChange={(e) => update('spacingDensity', e.target.value)}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="airy">Airy</option>
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Animations</span>
              <select
                value={theme.animationIntensity}
                onChange={(e) => update('animationIntensity', e.target.value)}
              >
                <option value="none">None</option>
                <option value="subtle">Subtle</option>
                <option value="premium">Premium ✨</option>
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Card Radius — {theme.cardRadius}px</span>
              <input
                type="range"
                min={4}
                max={28}
                value={theme.cardRadius}
                onChange={(e) => update('cardRadius', Number(e.target.value))}
                style={{ accentColor: 'var(--accent)' }}
              />
            </label>
          </div>
        </div>

        {/* Section Order */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}
          >
            🔀 Section Order
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 14 }}>
            Drag or tap arrows to reorder sections on your public menu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {theme.sectionOrder.map((section, index) => {
              const info = sectionLabels[section] || { label: section, emoji: '📌' };
              return (
                <div
                  key={section}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: 14,
                    background: 'var(--bg)',
                    border: '1.5px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>{info.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                      {info.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-icon"
                      style={{ width: 30, height: 30 }}
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className="btn-icon"
                      style={{ width: 30, height: 30 }}
                      onClick={() => moveSection(index, 1)}
                      disabled={index === theme.sectionOrder.length - 1}
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SaveBar onSave={save} saving={saving} label="Save Theme" />

      {/* ── Template Preview Modal — portaled to body to escape page stacking context ── */}
      {createPortal(
        <AnimatePresence>
          {previewTemplate && (
            <motion.div
              key="template-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPreviewTemplate(null)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(20, 14, 16, 0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100vw',
                  height: '100dvh',
                  background: '#FFFFFF',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Floating header (overlay on the preview) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 99,
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <Eye size={11} /> Preview
                    </div>
                    <span
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: 700,
                        fontSize: 17,
                        color: 'var(--text)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {TEMPLATE_OPTIONS.find((t) => t.id === previewTemplate)?.label ||
                        previewTemplate}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text3)',
                        display: 'none',
                      }}
                      className="cc-hide-on-narrow"
                    >
                      {TEMPLATE_OPTIONS.find((t) => t.id === previewTemplate)?.description || ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    aria-label="Close preview"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'var(--bg2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text)',
                      flexShrink: 0,
                    }}
                  >
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </div>

                {/* Live preview — full width, scrollable */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    paddingTop: 64, // space for floating header
                    paddingBottom: 88, // space for floating footer
                    background: 'var(--bg)',
                  }}
                >
                  <MenuRenderer
                    business={business}
                    settings={{ ...menu, theme: { ...menu.theme, template: previewTemplate } }}
                    products={products}
                    preview
                  />
                </div>

                {/* Floating footer actions */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    padding: '14px 18px max(env(safe-area-inset-bottom), 14px)',
                    display: 'flex',
                    gap: 10,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    style={{
                      flex: 1,
                      padding: '13px 14px',
                      borderRadius: 12,
                      border: '1.5px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      update('template', previewTemplate);
                      setPreviewTemplate(null);
                      showToast(
                        `Template set to ${TEMPLATE_OPTIONS.find((t) => t.id === previewTemplate)?.label || previewTemplate}. Tap Save Theme to apply.`,
                        'success'
                      );
                    }}
                    style={{
                      flex: 2,
                      padding: '13px 14px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #B5606A 0%, #D8B97E 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 6px 16px rgba(181,96,106,0.30)',
                    }}
                  >
                    <Check size={14} strokeWidth={3} /> Use this template
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </MenuBuilderShell>
  );
}
