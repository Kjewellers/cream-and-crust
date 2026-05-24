import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../../components/iOS';
import { normalizeSlug } from '../../data/menuDefaults';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { SaveBar } from './MenuBuilderShell';

const EMOJI_SUGGESTIONS = ['🎂', '🧁', '🍪', '🥐', '🍰', '🍩', '🎁', '🌸', '🍫', '🥧', '🍮', '🎉'];

export default function MenuCategories() {
  const { menu, loading, saveMenu } = useMenuBuilderData();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => setCategories(menu.categories || []), [menu.categories]);

  const updateCategory = (index, patch) =>
    setCategories(prev => prev.map((cat, i) => i === index ? { ...cat, ...patch } : cat));

  const moveCategory = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    setCategories(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const addCategory = () =>
    setCategories(prev => [...prev, { id: `cat-${Date.now()}`, name: 'New Category', emoji: '🎂', visible: true }]);

  const removeCategory = (index) =>
    setCategories(prev => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    try {
      await saveMenu({ categories: categories.map(c => ({ ...c, id: c.id || normalizeSlug(c.name) })) });
      showToast('Categories saved! 🎉', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <MenuBuilderShell title="Categories" subtitle="Organise your menu sections.">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>
    </MenuBuilderShell>
  );

  return (
    <MenuBuilderShell title="Menu Categories" subtitle="Add, reorder, and manage your menu sections.">
      {/* Add button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="btn btn-outline"
        onClick={addCategory}
        style={{ width: '100%', height: 48, marginBottom: 16, borderStyle: 'dashed', gap: 8, fontWeight: 800 }}
      >
        <Plus size={18} /> Add New Category
      </motion.button>

      {/* Category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {categories.map((category, index) => (
            <motion.div
              key={category.id || index}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="card"
              style={{ padding: '14px 16px', borderRadius: 18, border: category.visible === false ? '1.5px dashed var(--border)' : '1.5px solid transparent' }}
            >
              {/* Row 1: emoji + name + toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {/* Emoji picker */}
                <div style={{ position: 'relative' }}>
                  <input
                    value={category.emoji || '🎂'}
                    onChange={e => updateCategory(index, { emoji: e.target.value })}
                    style={{
                      width: 44, height: 44, textAlign: 'center', fontSize: '1.4rem',
                      borderRadius: 12, border: '1.5px solid var(--border)',
                      background: 'var(--bg)', cursor: 'text', padding: 0
                    }}
                    maxLength={2}
                  />
                </div>
                {/* Name */}
                <input
                  value={category.name}
                  onChange={e => updateCategory(index, { name: e.target.value })}
                  placeholder="Category name"
                  style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', minWidth: 0 }}
                />
                {/* Visible toggle */}
                <button
                  type="button"
                  onClick={() => updateCategory(index, { visible: category.visible === false ? true : false })}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 99, border: 'none',
                    background: category.visible !== false ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.06)',
                    color: category.visible !== false ? '#10B981' : 'var(--text3)',
                    fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer'
                  }}
                >
                  {category.visible !== false ? '✓ Show' : 'Hidden'}
                </button>
              </div>

              {/* Row 2: emoji suggestions + order controls + delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {EMOJI_SUGGESTIONS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => updateCategory(index, { emoji: em })}
                      style={{
                        flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: 'none',
                        background: category.emoji === em ? 'var(--accent-light)' : 'var(--bg)',
                        fontSize: '0.95rem', cursor: 'pointer'
                      }}
                    >{em}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => moveCategory(index, -1)} disabled={index === 0}>
                    <ArrowUp size={14} />
                  </button>
                  <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1}>
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="btn-icon"
                    style={{ width: 32, height: 32, color: '#E15A3E' }}
                    onClick={() => removeCategory(index)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {categories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No categories yet</div>
            <div style={{ fontSize: '0.8rem' }}>Tap "Add New Category" to get started</div>
          </div>
        )}
      </div>

      <SaveBar onSave={save} saving={saving} label="Save Categories" />
    </MenuBuilderShell>
  );
}
