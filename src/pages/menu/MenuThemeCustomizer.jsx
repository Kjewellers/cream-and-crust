import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToast } from '../../components/iOS';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { SaveBar } from './MenuBuilderShell';

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

export default function MenuThemeCustomizer() {
  const { menu, loading, saveMenu } = useMenuBuilderData();
  const [theme, setTheme] = useState(menu.theme);
  const [saving, setSaving] = useState(false);

  useEffect(() => setTheme(menu.theme), [menu.theme]);

  const update = (key, value) => setTheme(prev => ({ ...prev, [key]: value }));

  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= theme.sectionOrder.length) return;
    setTheme(prev => {
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

  if (loading) return (
    <MenuBuilderShell title="Theme" subtitle="Personalise your menu's look.">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>
    </MenuBuilderShell>
  );

  return (
    <MenuBuilderShell title="Theme Customizer" subtitle="Tune colours, fonts, and layout.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Colour Presets */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>🎨 Colour Palette</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {PRESET_PALETTES.map(preset => {
              const active = theme.primaryColor === preset.primary;
              return (
                <motion.button
                  key={preset.label}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { update('primaryColor', preset.primary); update('secondaryColor', preset.secondary); }}
                  style={{
                    padding: '10px 8px', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: active ? preset.primary + '18' : 'var(--bg)',
                    outline: active ? `2px solid ${preset.primary}` : '1.5px solid var(--border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                  }}
                >
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: preset.primary }} />
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: preset.secondary }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: active ? preset.primary : 'var(--text2)' }}>{preset.label}</span>
                </motion.button>
              );
            })}
          </div>
          {/* Custom colour pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Custom Primary</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={theme.primaryColor} onChange={e => update('primaryColor', e.target.value)} style={{ width: 40, height: 40, padding: 2, borderRadius: 8, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text2)' }}>{theme.primaryColor}</span>
              </div>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Custom Secondary</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={theme.secondaryColor} onChange={e => update('secondaryColor', e.target.value)} style={{ width: 40, height: 40, padding: 2, borderRadius: 8, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text2)' }}>{theme.secondaryColor}</span>
              </div>
            </label>
          </div>
        </div>

        {/* Typography */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>✍️ Typography</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FONT_OPTIONS.map(font => (
              <motion.button
                key={font.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => update('font', font.value)}
                style={{
                  padding: '12px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: theme.font === font.value ? 'var(--accent-light)' : 'var(--bg)',
                  outline: theme.font === font.value ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontFamily: font.value, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{font.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontWeight: 600, marginTop: 1 }}>{font.style}</div>
                </div>
                {theme.font === font.value && <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '0.75rem' }}>✓</span>}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Style controls */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>⚙️ Style Options</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Button Style</span>
              <select value={theme.buttonStyle} onChange={e => update('buttonStyle', e.target.value)}>
                <option value="pill">Pill (Rounded)</option>
                <option value="soft">Soft Rounded</option>
                <option value="classic">Classic Square</option>
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Spacing Density</span>
              <select value={theme.spacingDensity} onChange={e => update('spacingDensity', e.target.value)}>
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="airy">Airy</option>
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Animations</span>
              <select value={theme.animationIntensity} onChange={e => update('animationIntensity', e.target.value)}>
                <option value="none">None</option>
                <option value="subtle">Subtle</option>
                <option value="premium">Premium ✨</option>
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Card Radius — {theme.cardRadius}px</span>
              <input type="range" min={4} max={28} value={theme.cardRadius} onChange={e => update('cardRadius', Number(e.target.value))} style={{ accentColor: 'var(--accent)' }} />
            </label>
          </div>
        </div>

        {/* Section Order */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>🔀 Section Order</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 14 }}>Drag or tap arrows to reorder sections on your public menu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {theme.sectionOrder.map((section, index) => {
              const info = sectionLabels[section] || { label: section, emoji: '📌' };
              return (
                <div
                  key={section}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: 14, background: 'var(--bg)',
                    border: '1.5px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>{info.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{info.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => moveSection(index, -1)} disabled={index === 0}><ArrowUp size={13} /></button>
                    <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => moveSection(index, 1)} disabled={index === theme.sectionOrder.length - 1}><ArrowDown size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SaveBar onSave={save} saving={saving} label="Save Theme" />
    </MenuBuilderShell>
  );
}
