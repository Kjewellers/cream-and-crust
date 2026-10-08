import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Sparkles,
  ShoppingBag,
  CalendarDays,
  Package,
  Menu,
  Users,
  BarChart3,
  BookOpen,
  Receipt,
  ShoppingCart,
  Trash2,
  User as UserIcon,
  Settings,
  Sun,
  Moon,
  LogOut,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

import { usePendingOrders } from '../../hooks/usePendingOrders';
export default function NavigationMenu({ onClose, theme, toggleTheme }) {
  const { isAdmin, userRole, logout } = useAuth();
  const { t } = useTranslation();
  const pendingCount = usePendingOrders();

  const adminNavItems = [
    {
      section: 'MAIN',
      items: [
        { to: '/', icon: LayoutDashboard, label: t('nav.home') },
        {
          to: '/ai-assistant',
          icon: Sparkles,
          label: 'AI Assistant',
          badge: (
            <span
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,160,80,0.15), rgba(212,160,80,0.08))',
                color: '#B8860B',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.6rem',
                fontWeight: 'bold',
                letterSpacing: '0.04em',
              }}
            >
              PRO
            </span>
          ),
          premium: true,
        },
        {
          to: '/orders',
          icon: ShoppingBag,
          label: t('nav.orders'),
          badge: pendingCount > 0 ? pendingCount : null,
        },
        { to: '/calendar', icon: CalendarDays, label: t('nav.calendar') },
      ],
    },
    {
      section: 'BUSINESS',
      items: [
        { to: '/products', icon: Package, label: t('nav.products') },
        {
          to: '/menu-builder',
          icon: Menu,
          label: t('nav.menuBuilder'),
          premium: true,
          badge: (
            <span
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,160,80,0.15), rgba(212,160,80,0.08))',
                color: '#B8860B',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.6rem',
                fontWeight: 'bold',
                letterSpacing: '0.04em',
              }}
            >
              PRO
            </span>
          ),
        },
        { to: '/customers', icon: Users, label: t('nav.customers') },
        {
          to: '/analytics',
          icon: BarChart3,
          label: t('nav.analytics'),
          premium: true,
          badge: (
            <span
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,160,80,0.15), rgba(212,160,80,0.08))',
                color: '#B8860B',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.6rem',
                fontWeight: 'bold',
                letterSpacing: '0.04em',
              }}
            >
              PRO
            </span>
          ),
        },
      ],
    },
    {
      section: 'OPERATIONS',
      items: [
        { to: '/inventory', icon: Package, label: t('nav.inventory') },
        { to: '/recipes', icon: BookOpen, label: t('nav.recipes') },
        { to: '/expenses', icon: Receipt, label: t('nav.expenses') },
        { to: '/shopping-list', icon: ShoppingCart, label: t('nav.shoppingList') },
        { to: '/recycle-bin', icon: Trash2, label: 'Recycle Bin' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { to: '/profile', icon: UserIcon, label: t('nav.profile') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ],
    },
  ];

  const customerNavItems = [
    {
      section: 'Store',
      items: [
        { to: '/', icon: Package, label: t('nav.products') },
        { to: '/orders', icon: ShoppingBag, label: t('nav.orders') },
      ],
    },
    {
      section: 'Account',
      items: [
        { to: '/profile', icon: UserIcon, label: t('nav.profile') },
        { to: '/settings', icon: Settings, label: t('nav.settings') },
      ],
    },
  ];

  const isBaker = userRole === 'baker';
  const navItems = isAdmin || isBaker ? adminNavItems : customerNavItems;

  return (
    <>
      <div
        className="sidebar-brand"
        style={{
          margin: '18px 12px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          border: '1px solid var(--hairline)',
          borderRadius: 20,
          background: 'var(--surface-polished)',
        }}
      >
        <img
          src="/logo.png"
          alt="Cream & Crust"
          style={{
            width: 42,
            height: 42,
            objectFit: 'contain',
            borderRadius: 8,
            flexShrink: 0,
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
          }}
        />
        <span style={{ display: 'none', fontSize: '1.8rem' }}>🧁</span>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Cream & Crust</h1>
          <small style={{ opacity: 0.6, fontSize: '0.75rem' }}>
            {isAdmin ? 'BAKERY MANAGER' : 'Customer Portal'}
          </small>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px',
          overscrollBehavior: 'contain',
        }}
      >
        {navItems.map((section) => (
          <div
            key={section.section}
            style={{ marginBottom: 20, marginTop: section.section === 'MAIN' ? 10 : 0 }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                marginBottom: 8,
                paddingLeft: 12,
                letterSpacing: '0.05em',
              }}
            >
              {section.section}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
                style={{ opacity: item.locked ? 0.6 : 1 }}
              >
                <item.icon />
                {item.label}
                {item.badge != null && (
                  <motion.span
                    key={item.badge}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="nav-badge"
                  >
                    {item.badge}
                  </motion.span>
                )}
                {item.locked && <Lock size={12} style={{ marginLeft: 'auto' }} />}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 12px 18px', borderTop: '1px solid var(--hairline)' }}>
        <button
          onClick={toggleTheme}
          className="nav-item"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
        </button>
        <button
          onClick={logout}
          className="nav-item"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <LogOut size={18} /> {t('nav.signOut')}
        </button>
      </div>
    </>
  );
}
