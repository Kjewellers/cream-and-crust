import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Sparkles,
  ShoppingBag,
  Package,
  BookOpen,
  Database,
  Users,
  Receipt,
  BarChart3,
  CalendarDays,
  Menu,
  Settings,
  X,
  Check,
} from 'lucide-react';

export const NAV_SHORTCUTS = [
  { id: 'home', to: '/', icon: LayoutDashboard, label: 'Home' },
  { id: 'ai', to: '/ai-companion', icon: Sparkles, label: 'Cream AI' },
  { id: 'orders', to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { id: 'products', to: '/products', icon: Package, label: 'Products' },
  { id: 'recipes', to: '/recipes', icon: BookOpen, label: 'Recipes' },
  { id: 'inventory', to: '/inventory', icon: Database, label: 'Inventory' },
  { id: 'customers', to: '/customers', icon: Users, label: 'Customers' },
  { id: 'expenses', to: '/expenses', icon: Receipt, label: 'Expenses' },
  { id: 'analytics', to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'calendar', to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { id: 'menu', to: '/menu-builder', icon: Menu, label: 'Menu' },
  { id: 'profile', to: '/profile', icon: Settings, label: 'Profile' },
];

export const DEFAULT_SLOT_IDS = ['home', 'orders', 'products', 'profile'];

export function bottomNavSlotsKey(uid) {
  if (!uid) return null;
  return `cc_bottomNavSlots:${uid}`;
}

export function loadBottomNavSlots(uid) {
  try {
    const userKey = bottomNavSlotsKey(uid);
    let raw = userKey ? localStorage.getItem(userKey) : null;

    if (!raw && userKey) {
      const legacy = localStorage.getItem('cc_bottomNavSlots');
      if (legacy) {
        try {
          localStorage.setItem(userKey, legacy);
        } catch {}
        raw = legacy;
      }
    }
    if (!raw) return DEFAULT_SLOT_IDS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 4) return DEFAULT_SLOT_IDS;
    const valid = parsed.filter((id) => NAV_SHORTCUTS.some((s) => s.id === id));
    if (valid.length !== 4) return DEFAULT_SLOT_IDS;
    return valid;
  } catch {
    return DEFAULT_SLOT_IDS;
  }
}

export function saveBottomNavSlots(uid, slots) {
  const userKey = bottomNavSlotsKey(uid);
  if (!userKey) return;
  try {
    localStorage.setItem(userKey, JSON.stringify(slots));
  } catch {}
}

export default function BottomNavCustomiseSheet({ open, currentIds, onClose, onSave }) {
  const [selected, setSelected] = useState(currentIds);

  useEffect(() => {
    if (open) setSelected(currentIds);
  }, [open, currentIds]);

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setSelected((prev) => {
      const next = prev.slice();
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx) => {
    setSelected((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = prev.slice();
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    if (selected.length !== 4) return;
    onSave(selected);
  };

  const handleReset = () => setSelected(DEFAULT_SLOT_IDS);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(15, 15, 15, 0.28)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '88vh',
            background: 'var(--card)',
            borderRadius: '24px 24px 0 0',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -24px 60px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 10,
              paddingBottom: 4,
              flexShrink: 0,
            }}
          >
            <div
              style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-md)' }}
            />
          </div>

          <div
            style={{
              padding: '12px 22px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexShrink: 0,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: '-0.015em',
                  color: 'var(--text)',
                }}
              >
                Customise footer
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text3)' }}>
                Pick 4 shortcuts to pin · {selected.length}/4
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--bg)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text2)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '14px 22px 8px', flexShrink: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Order
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.map((id, idx) => {
                const item = NAV_SHORTCUTS.find((s) => s.id === id);
                if (!item) return null;
                const Icon = item.icon;
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 8,
                        background: 'var(--accent-light, rgba(181,96,106,0.10))',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <Icon size={18} color="var(--accent)" strokeWidth={1.7} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      {item.label}
                    </span>
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      aria-label={`Move ${item.label} up`}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: idx === 0 ? 'var(--text3)' : 'var(--text2)',
                        opacity: idx === 0 ? 0.4 : 1,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === selected.length - 1}
                      aria-label={`Move ${item.label} down`}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: idx === selected.length - 1 ? 'var(--text3)' : 'var(--text2)',
                        opacity: idx === selected.length - 1 ? 0.4 : 1,
                        cursor: idx === selected.length - 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ↓
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '8px 22px 14px', flex: 1, overflowY: 'auto' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                marginTop: 6,
              }}
            >
              All shortcuts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {NAV_SHORTCUTS.map((item) => {
                const Icon = item.icon;
                const isSelected = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    aria-pressed={isSelected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(181,96,106,0.12), rgba(181,96,106,0.06))'
                        : 'var(--bg)',
                      border: isSelected
                        ? '1px solid rgba(181, 96, 106, 0.45)'
                        : '1px solid var(--border)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Icon
                      size={18}
                      color={isSelected ? 'var(--accent)' : 'var(--text2)'}
                      strokeWidth={1.7}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? 'var(--text)' : 'var(--text2)',
                      }}
                    >
                      {item.label}
                    </span>
                    {isSelected && <Check size={14} color="var(--accent)" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: '12px 22px 18px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 10,
              flexShrink: 0,
              paddingBottom: 'max(18px, env(safe-area-inset-bottom, 18px))',
            }}
          >
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'transparent',
                border: '1px solid var(--border-md)',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text2)',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={selected.length !== 4}
              style={{
                flex: 2,
                padding: '12px 16px',
                background:
                  selected.length === 4
                    ? 'linear-gradient(140deg, #C97582 0%, #B5606A 55%, #984E58 100%)'
                    : 'var(--border-md)',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                color: 'white',
                cursor: selected.length === 4 ? 'pointer' : 'not-allowed',
                boxShadow:
                  selected.length === 4 ? '0 8px 18px -6px rgba(181, 96, 106, 0.45)' : 'none',
              }}
            >
              Save layout
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
