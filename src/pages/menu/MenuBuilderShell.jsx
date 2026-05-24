import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, LayoutDashboard, ListTree, Palette, PackagePlus, Send, Store, ChevronRight } from 'lucide-react';

const steps = [
  { to: '/menu-builder', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/menu-builder/create', icon: Store, label: 'Bakery Details' },
  { to: '/menu-builder/categories', icon: ListTree, label: 'Categories' },
  { to: '/menu-builder/products', icon: PackagePlus, label: 'Products' },
  { to: '/menu-builder/theme', icon: Palette, label: 'Theme' },
  { to: '/menu-builder/preview', icon: Eye, label: 'Preview' },
];

export default function MenuBuilderShell({ children, title, subtitle, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fade-in"
      style={{ paddingBottom: 100 }}
    >
      {/* ── Header ── */}
      <div style={{
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>{title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.4 }}>{subtitle}</p>
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      </div>

      {/* ── Step Tabs (horizontal scroll, no scrollbar) ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 12,
        marginBottom: 20,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        margin: '0 -16px',
        padding: '0 16px 14px',
      }}>
        {steps.map((step, i) => (
          <NavLink
            key={step.to}
            to={step.to}
            end={step.end}
            style={({ isActive }) => ({
              minHeight: 38,
              padding: '0 12px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              background: isActive ? 'var(--accent)' : 'var(--bg2)',
              color: isActive ? 'white' : 'var(--text2)',
              boxShadow: isActive ? 'var(--shadow-accent)' : 'var(--shadow-xs)',
              fontWeight: 800,
              fontSize: 12,
              textDecoration: 'none',
              flexShrink: 0,
              border: isActive ? 'none' : '1px solid var(--border)',
            })}
          >
            <step.icon size={14} />
            {i === 0 ? step.label : `${i}. ${step.label}`}
          </NavLink>
        ))}
      </div>

      {children}
    </motion.div>
  );
}

export function PublishButton({ onClick, disabled }) {
  return (
    <button
      className="btn btn-primary"
      onClick={onClick}
      disabled={disabled}
      style={{ gap: 6, fontSize: '0.82rem', padding: '0 14px', height: 38 }}
    >
      <Send size={15} /> Publish
    </button>
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
