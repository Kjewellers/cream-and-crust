import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  Users,
  Package,
  BookOpen,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  Database,
  WifiOff,
  LogOut,
  Lock,
  Sun,
  Moon,
  Receipt,
  ShoppingCart,
  Plus,
  MoreHorizontal,
  Bell,
  Sliders,
  Check,
  X,
  GripVertical,
  User as UserIcon,
  MapPin,
} from 'lucide-react';

import SystemGuard from './components/SystemGuard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { subscribeToOrders, subscribeToInventory } from './services/db';
import { ToastContainer, Loader2, showToast } from './components/iOS';
import { useTranslation } from 'react-i18next';
import { ConfettiCanvas, SuccessBurstOverlay, FloatingRewardLayer } from './components/DopamineKit';
import PremiumAppTour from './components/PremiumAppTour';
import AppErrorBoundary from './components/AppErrorBoundary';
import PwaUpdateToast from './components/PwaUpdateToast';
import OfflineBanner from './components/OfflineBanner';
import { useKeyboardInsets } from './hooks/useKeyboardInsets';
import { pageVariants } from './animations';
import './index.css';

// ─── Lazy-loaded pages (code-split for faster initial load) ───────
// NOTE: Dashboard and Login are now lazy-loaded. They are large pages
// (103KB and 68KB respectively) and do NOT need to be in the initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const Subscribe = lazy(() => import('./pages/Subscription'));
const Orders = lazy(() => import('./pages/Orders'));
const Products = lazy(() => import('./pages/Products'));
const Customers = lazy(() => import('./pages/Customers'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Recipes = lazy(() => import('./pages/Recipes'));
const Profile = lazy(() => import('./pages/Profile'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));
const SetupAdmin = lazy(() => import('./pages/SetupAdmin'));
const PublicOrderForm = lazy(() => import('./pages/PublicOrderForm'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const MenuDashboard = lazy(() => import('./pages/MenuDashboard'));
const CreateMenu = lazy(() => import('./pages/CreateMenu'));
const MenuCategories = lazy(() => import('./pages/MenuCategories'));
const MenuProducts = lazy(() => import('./pages/MenuProducts'));
const MenuThemeCustomizer = lazy(() => import('./pages/MenuThemeCustomizer'));
const MenuLivePreview = lazy(() => import('./pages/MenuLivePreview'));
const PublishedMenu = lazy(() => import('./pages/PublishedMenu'));
const OnboardingModal = lazy(() => import('./components/OnboardingModal'));

// ─── Delayed Fallback to prevent buffering flash ────────
function DelayedFallback({ fullScreen }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return <div style={{ minHeight: fullScreen ? '100vh' : '60vh' }} />;
  return (
    <div style={{ minHeight: fullScreen ? '100vh' : '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" color="var(--accent, #B5606A)" size={28} />
    </div>
  );
}

// Higher Order Component to wrap pages seamlessly
export const PageWrapper = ({ children, className = '' }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    className={`page-wrapper ${className}`}
    style={{ minHeight: '100%', width: '100%', originY: 0 }}
  >
    {children}
  </motion.div>
);

// ── Shared pending-order count hook ───────────────────────────────────────
// Single Firestore listener — both Sidebar and MobileHeader call this
// hook; React deduplicates the subscription at the hook level so only
// ONE onSnapshot is active regardless of how many components mount.
function usePendingOrders() {
  const { currentUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!currentUser) { setPendingCount(0); return; }
    const unsubscribe = subscribeToOrders((orders) => {
      const count = orders.filter((o) => {
        const s = String(o.status || 'inquiry').toLowerCase();
        return ['inquiry', 'confirmed', 'baking', 'ready', 'new'].includes(s);
      }).length;
      setPendingCount(count);
    }, currentUser.uid);
    return () => unsubscribe();
  }, [currentUser]);
  return pendingCount;
}

function Sidebar({ open, onClose, theme, toggleTheme }) {
  const { isAdmin, userRole, logout, currentUser } = useAuth();
  const { t } = useTranslation();
  const pendingCount = usePendingOrders();

  const adminNavItems = [
    {
      section: 'MAIN',
      items: [
        { to: '/', icon: LayoutDashboard, label: t('nav.home') },
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
        { to: '/menu-builder', icon: Menu, label: t('nav.menuBuilder') },
        { to: '/customers', icon: Users, label: t('nav.customers') },
        { to: '/analytics', icon: BarChart3, label: t('nav.analytics') },
      ],
    },
    {
      section: 'OPERATIONS',
      items: [
        { to: '/inventory', icon: Package, label: t('nav.inventory') },
        { to: '/recipes', icon: BookOpen, label: t('nav.recipes') },
        { to: '/expenses', icon: Receipt, label: t('nav.expenses') },
        { to: '/shopping-list', icon: ShoppingCart, label: t('nav.shoppingList') },
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
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside
        className={`sidebar ${open ? 'open' : ''}`}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div className="sidebar-brand">
          <img
            src="/logo.png"
            alt="Cream & Crust"
            className="brand-logo"
            style={{
              width: '42px',
              height: '42px',
              objectFit: 'contain',
              borderRadius: '8px',
              flexShrink: 0,
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span style={{ display: 'none', fontSize: '1.8rem' }}>🧁</span>
          <div>
            <h1>Cream & Crust</h1>
            <small>{isAdmin ? 'BAKERY MANAGER' : 'Customer Portal'}</small>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {navItems.map((section) => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
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

        <div style={{ marginTop: 'auto', padding: '10px 0' }}>
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
      </aside>
    </>
  );
}

function MobileHeader({ onMenuClick, theme, toggleTheme }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const pendingCount = usePendingOrders();

  const handleBellClick = () => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' }));
    } catch (e) {}
    import('./components/iOS').then(({ showToast }) => {
      showToast(
        pendingCount > 0
          ? `${pendingCount} active order${pendingCount > 1 ? 's' : ''} need attention! 🥐`
          : 'All orders up to date ✅',
        pendingCount > 0 ? 'info' : 'success'
      );
    });
  };

  const initials =
    currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '👤';

  return (
    <div
      className="mobile-header"
      style={{
        boxShadow: 'none',
        borderBottom: '1px solid rgba(74, 59, 50, 0.05)',
        background: '#FFFFFF',
      }}
    >
      <div
        className="mobile-header-inner"
        style={{
          padding: '0 16px',
          height: 62,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <button
          className="hamburger"
          onClick={onMenuClick}
          style={{
            color: 'var(--text)',
            background: 'none',
            padding: 0,
            width: 'auto',
            height: 'auto',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Menu size={24} strokeWidth={2} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
              border: '1px solid rgba(181, 96, 106, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🧁
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font)',
                fontWeight: 900,
                fontSize: '15px',
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}
            >
              Cream &amp; Crust
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--text3)',
                letterSpacing: '0.01em',
              }}
            >
              Let's bake happiness! 🧁
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleBellClick}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              position: 'relative',
            }}
          >
            <Bell size={21} strokeWidth={2} />
            {pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  background: '#E15A3E',
                  color: 'white',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  padding: '1px 4.5px',
                  borderRadius: 99,
                  border: '1.5px solid white',
                  boxShadow: '0 2px 4px rgba(225,90,62,0.15)',
                  minWidth: 16,
                  textAlign: 'center',
                }}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>

          <div
            style={{ position: 'relative', width: 32, height: 32, cursor: 'pointer' }}
            onClick={() => navigate('/profile')}
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(181, 96, 106, 0.15)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), #8A3D4A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  border: '1.5px solid rgba(181,96,106,0.2)',
                }}
              >
                {initials}
              </div>
            )}
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 8,
                height: 8,
                background: '#10B981',
                borderRadius: '50%',
                border: '1.5px solid white',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Nav: customisable shortcut catalog ─────────────────────
//
// Each entry is one shortcut the baker/admin can pin to the mobile
// footer. Center slot is always the FAB; the four outer slots are
// user-configurable. The chosen slot order is persisted to
// `localStorage` under `cc_bottomNavSlots:<uid>` so multiple accounts
// on the same device keep separate layouts.
const NAV_SHORTCUTS = [
  { id: 'home', to: '/', icon: LayoutDashboard, label: 'Home' },
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

const DEFAULT_SLOT_IDS = ['home', 'orders', 'products', 'profile'];

// Per-user storage key, with a one-time migration from the legacy
// global key (anyone who saved before per-user scoping landed).
function bottomNavSlotsKey(uid) {
  if (!uid) return null;
  return `cc_bottomNavSlots:${uid}`;
}

function loadBottomNavSlots(uid) {
  try {
    const userKey = bottomNavSlotsKey(uid);
    let raw = userKey ? localStorage.getItem(userKey) : null;

    // Migration: copy the legacy global key onto this user the first
    // time we see them so we don't strand existing saved layouts.
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
    // Drop any ids that no longer exist in the catalog so a stale value
    // can't break the nav.
    const valid = parsed.filter((id) => NAV_SHORTCUTS.some((s) => s.id === id));
    if (valid.length !== 4) return DEFAULT_SLOT_IDS;
    return valid;
  } catch {
    return DEFAULT_SLOT_IDS;
  }
}

function saveBottomNavSlots(uid, slots) {
  const userKey = bottomNavSlotsKey(uid);
  if (!userKey) return;
  try {
    localStorage.setItem(userKey, JSON.stringify(slots));
  } catch {}
}

/**
 * Customisation sheet for the bottom nav. Shows every available
 * shortcut and lets the baker pick which 4 occupy the outer footer
 * slots. The center FAB stays fixed. Selection is saved to
 * `localStorage` and bubbled up via `onSave`.
 */
function BottomNavCustomiseSheet({ open, currentIds, onClose, onSave }) {
  const [selected, setSelected] = useState(currentIds);

  // Re-seed local state when the sheet re-opens.
  useEffect(() => {
    if (open) setSelected(currentIds);
  }, [open, currentIds]);

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Deselect — but never let the list drop below 1.
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      // Select — cap at 4.
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
          {/* Drag handle */}
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

          {/* Header */}
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

          {/* Selected order — drag handles via up/down arrows */}
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

          {/* All available shortcuts */}
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

          {/* Footer actions */}
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

function BottomNav() {
  const { isAdmin, userRole, currentUser } = useAuth();
  const isBaker = userRole === 'baker';
  const navigate = useNavigate();
  const location = useLocation();
  const uid = currentUser?.uid || null;
  // Hide the bottom nav while the on-screen keyboard is open so it never
  // overlaps a focused input (Req 4.6).
  const { keyboardOpen } = useKeyboardInsets();

  // ── Customisable bottom-nav state ──────────────────────────────
  // All hooks live ABOVE the early-return for customer mode so the hook
  // count is constant across renders. React unmounts and remounts the
  // component every time the role flips, so violating that contract
  // would throw "Rendered fewer hooks than expected" the moment a
  // baker logs in (the first render sees customer-shape, the next
  // render sees baker-shape, hook indices shift, blank screen).
  const [slotIds, setSlotIds] = useState(() => loadBottomNavSlots(uid));
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const longPressTimer = useRef(null);

  // Refresh from storage whenever the uid changes (logout→login,
  // account switch on a shared device, etc.) so each account sees
  // its own footer layout.
  useEffect(() => {
    setSlotIds(loadBottomNavSlots(uid));
  }, [uid]);

  // Global trigger so Settings (or anywhere else) can open the
  // customise sheet without holding a ref to BottomNav.
  useEffect(() => {
    const open = () => setCustomiseOpen(true);
    window.addEventListener('cc-open-bottom-nav-customise', open);
    return () => window.removeEventListener('cc-open-bottom-nav-customise', open);
  }, []);

  // Customer mode early return — must come AFTER every hook above.
  if (!(isAdmin || isBaker)) {
    const customerItems = [
      { to: '/', icon: Package, label: 'Shop' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/profile', icon: Settings, label: 'Profile' },
    ];
    return (
      <nav
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          zIndex: 90,
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          paddingTop: 8,
          display: keyboardOpen ? 'none' : undefined,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {customerItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textDecoration: 'none',
                color: isActive ? '#B5606A' : '#9CA3AF',
                transition: 'all 0.3s ease',
              })}
            >
              <item.icon size={22} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  const handleSlotsChange = (next) => {
    saveBottomNavSlots(uid, next);
    setSlotIds(next);
    setCustomiseOpen(false);
  };

  // Long-press anywhere on the nav opens the customise sheet —
  // discoverable without an extra always-visible button.
  const startLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'medium' }));
      } catch (e) {}
      setCustomiseOpen(true);
    }, 550);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleFabClick = () => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' }));
    } catch (e) {}

    if (location.pathname === '/orders') {
      window.dispatchEvent(new CustomEvent('open-new-order-modal'));
    } else {
      navigate('/orders?new=true');
    }
  };

  // Render a single nav slot from a shortcut id. Active state shows a
  // soft rose dot beneath the icon as the indicator (instead of a flat
  // colour shift only) — feels more refined than typical Material tabs.
  const renderSlot = (slotId, key) => {
    const item = NAV_SHORTCUTS.find((s) => s.id === slotId);
    if (!item) return <div key={key} style={{ width: 56 }} />;
    const Icon = item.icon;
    return (
      <NavLink
        key={key}
        to={item.to}
        end
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          width: 56,
          textDecoration: 'none',
          color: isActive ? 'var(--accent)' : 'var(--text3)',
          transition: 'color 0.2s ease',
          padding: '4px 0 2px',
          position: 'relative',
        })}
      >
        {({ isActive }) => (
          <>
            <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
            <span
              style={{
                fontSize: '0.64rem',
                fontWeight: isActive ? 800 : 600,
                letterSpacing: '0.01em',
              }}
            >
              {item.label}
            </span>
            {/* Active indicator dot */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -2,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: isActive ? 'var(--accent)' : 'transparent',
                transition: 'background 0.2s ease, transform 0.2s ease',
                transform: isActive ? 'scale(1)' : 'scale(0.6)',
              }}
            />
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      <nav
        className="mobile-only"
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)',
          zIndex: 90,
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          paddingTop: 8,
          display: keyboardOpen ? 'none' : undefined,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            position: 'relative',
            padding: '0 8px',
          }}
        >
          {/* Outer slots 1 & 2 */}
          {renderSlot(slotIds[0], 'slot-0')}
          {renderSlot(slotIds[1], 'slot-1')}

          {/* Center FAB — hidden on /orders and /calendar where each
              module already has its own primary "+" surface, so the
              center button stops feeling redundant/intrusive. */}
          {location.pathname === '/orders' || location.pathname === '/calendar' ? (
            <div key="fab-spacer" style={{ width: 60, height: 44 }} aria-hidden="true" />
          ) : (
            <div
              style={{
                position: 'relative',
                width: 60,
                height: 44,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {/* Ambient glow halo — soft rose ring that gives the FAB
                its lift without the cheap hard white cutout border. */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -28,
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(181, 96, 106, 0.18) 0%, rgba(181, 96, 106, 0) 70%)',
                  filter: 'blur(2px)',
                  pointerEvents: 'none',
                  zIndex: 90,
                }}
              />
              <button
                onClick={handleFabClick}
                aria-label="New order"
                style={{
                  position: 'absolute',
                  top: -24,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  // Soft rose gradient: subtle top-left highlight, deeper at the
                  // bottom-right. Reads as a single coherent material rather
                  // than a flat disc.
                  background: 'linear-gradient(140deg, #C97582 0%, #B5606A 55%, #984E58 100%)',
                  color: 'white',
                  // Layered shadow: a rose-tinted soft glow + a tight contact
                  // shadow + a 1px inner highlight that fakes a lit rim.
                  boxShadow:
                    '0 14px 28px -8px rgba(181, 96, 106, 0.55), ' +
                    '0 6px 12px -4px rgba(60, 20, 24, 0.30), ' +
                    'inset 0 1px 0 0 rgba(255, 255, 255, 0.30), ' +
                    'inset 0 -1px 0 0 rgba(60, 20, 24, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  cursor: 'pointer',
                  transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s ease',
                  zIndex: 91,
                  padding: 0,
                }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.94)';
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onPointerLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Plus size={22} strokeWidth={2.4} />
              </button>
            </div>
          )}

          {/* Outer slots 3 & 4 */}
          {renderSlot(slotIds[2], 'slot-2')}
          {renderSlot(slotIds[3], 'slot-3')}
        </div>
      </nav>

      <BottomNavCustomiseSheet
        open={customiseOpen}
        currentIds={slotIds}
        onClose={() => setCustomiseOpen(false)}
        onSave={handleSlotsChange}
      />
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';

  // Wrap each route element in its own Suspense so navigating between
  // already-loaded pages never shows a full-page spinner, only the
  // specific new page being loaded for the first time.
  const renderRoute = (path, element) => (
    <Route
      path={path}
      element={
        <Suspense fallback={<DelayedFallback />}>
          <PageWrapper>{element}</PageWrapper>
        </Suspense>
      }
    />
  );

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {isAdmin || isBaker ? (
          <>
            {renderRoute('/', <Dashboard />)}

            {renderRoute('/orders', <Orders />)}
            {renderRoute('/calendar', <Calendar />)}
            {renderRoute('/products', <Products />)}
            {renderRoute('/customers', <Customers />)}
            {renderRoute('/inventory', <Inventory />)}
            {renderRoute('/recipes', <Recipes />)}
            {renderRoute('/analytics', <Analytics />)}
            {renderRoute('/expenses', <Expenses />)}
            {renderRoute('/shopping-list', <ShoppingList />)}
            {renderRoute('/profile', <Profile />)}
            {renderRoute('/settings', <SettingsPage />)}
            {renderRoute('/menu-builder', <MenuDashboard />)}
            {renderRoute('/menu-builder/create', <CreateMenu />)}
            {renderRoute('/menu-builder/categories', <MenuCategories />)}
            {renderRoute('/menu-builder/products', <MenuProducts />)}
            {renderRoute('/menu-builder/theme', <MenuThemeCustomizer />)}
            {renderRoute('/menu-builder/preview', <MenuLivePreview />)}
            {renderRoute('/super-admin', <SuperAdmin />)}
            {renderRoute('/subscribe', <Subscribe />)}
          </>
        ) : (
          <>
            {renderRoute('/', <Products />)}
            {renderRoute('/orders', <Orders />)}
            {renderRoute('/profile', <Profile />)}
            {renderRoute('/settings', <SettingsPage />)}
          </>
        )}
        {renderRoute('/menu/:username', <PublishedMenu />)}
        {renderRoute('/order/:username', <PublicOrderForm />)}
        {renderRoute('/privacy', <PrivacyPolicy />)}
        {renderRoute('/terms', <TermsOfService />)}
        {renderRoute('/setup-admin', <SetupAdmin />)}
        <Route
          path="*"
          element={
            <div style={{ padding: 40, textAlign: 'center' }}>
              <h2>404 - Page Not Found</h2>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/')}
                style={{ marginTop: 20 }}
              >
                Go Home
              </button>
            </div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'linear-gradient(160deg, #FFF9F5 0%, #FFF1F4 40%, #FAF6F0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Ambient gradient orbs */}
      <div
        style={{
          position: 'absolute',
          width: '140%',
          height: '140%',
          top: '-20%',
          left: '-20%',
          background:
            'radial-gradient(circle at 25% 30%, rgba(181,96,106,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 70%, rgba(212,160,80,0.10) 0%, transparent 45%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating bakery emojis */}
      {['🧁', '🎂', '🍰', '🥐', '✨', '🍪'].map((emoji, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={{
            opacity: [0, 0.6, 0.4],
            y: [40, -20, -60],
            x: [0, (i % 2 === 0 ? 1 : -1) * 15, (i % 2 === 0 ? -1 : 1) * 8],
          }}
          transition={{
            duration: 4 + i * 0.5,
            delay: 0.3 + i * 0.15,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            fontSize: 20 + i * 3,
            top: `${15 + i * 12}%`,
            left: `${10 + i * 14}%`,
            pointerEvents: 'none',
            filter: 'blur(0.5px)',
          }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Center content */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        {/* Logo with glow ring */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.1 }}
          style={{ position: 'relative' }}
        >
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -18,
              borderRadius: 32,
              background: 'linear-gradient(135deg, rgba(181,96,106,0.35), rgba(212,160,80,0.25))',
              filter: 'blur(22px)',
              zIndex: -1,
            }}
          />
          <img
            src="/logo.png"
            alt="Cream & Crust"
            style={{
              width: 110,
              height: 110,
              objectFit: 'contain',
              borderRadius: 28,
              boxShadow: '0 16px 40px rgba(181,96,106,0.18), 0 4px 12px rgba(0,0,0,0.06)',
              background: '#fff',
              padding: 3,
              border: '2px solid rgba(181,96,106,0.12)',
            }}
          />
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          style={{ marginTop: 28, textAlign: 'center' }}
        >
          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '2.2rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: 0,
              color: '#2D1B14',
              lineHeight: 1.1,
            }}
          >
            Cream & Crust
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: 8,
              fontSize: '0.78rem',
              color: '#8C7A6B',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}
          >
            Bakery Atelier
          </motion.p>
        </motion.div>

        {/* Elegant progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{
            marginTop: 40,
            width: 160,
            height: 3,
            background: 'rgba(181,96,106,0.10)',
            borderRadius: 10,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '50%',
              background:
                'linear-gradient(90deg, transparent, #B5606A, rgba(212,160,80,0.8), transparent)',
              borderRadius: 10,
            }}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        style={{
          position: 'absolute',
          bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            color: '#B5A89E',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          Made for premium bakers
        </div>
        <div
          style={{
            fontSize: '0.6rem',
            color: '#D4C4B8',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          Crafted in India 🇮🇳
        </div>
      </motion.div>
    </motion.div>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showSplash, setShowSplash] = useState(true);
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Splash screen timing ────────────────────────────────────────────────────
  // Minimum 1.2s: enough for the brand animation to play through fully.
  // Hard 5s max: safety valve in case auth listener never fires (offline, etc.)
  // With the new parallel Firestore reads, auth completes in ~1-2s so the
  // splash should disappear at ~1.2s on the happy path.
  useEffect(() => {
    console.log('[Splash] Starting timers: min=1200ms, hard=5000ms');
    const minTimer = setTimeout(() => {
      console.log('[Splash] Min time elapsed (1200ms)');
      setMinSplashTimeElapsed(true);
    }, 1200);
    const hardTimer = setTimeout(() => {
      console.log('[Splash] HARD TIMEOUT fired at 5000ms — forcing splash off');
      setShowSplash(false);
    }, 5000);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(hardTimer);
    };
  }, []);

  // Allow any page (e.g. Settings) to flip the theme via a global event,
  // and broadcast the current theme so those pages can reflect it.
  useEffect(() => {
    const onSet = (e) => {
      const next = e?.detail;
      if (next === 'light' || next === 'dark') setTheme(next);
      else setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };
    window.addEventListener('cc-set-theme', onSet);
    return () => window.removeEventListener('cc-set-theme', onSet);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cc-theme-changed', { detail: theme }));
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const {
    currentUser,
    userRole,
    onboardingCompleted,
    business,
    userDetails,
    finishOnboarding,
    hasSeenTourV1,
    loading: authLoading,
  } = useAuth();

  // Hide splash when BOTH the min time has elapsed AND auth has finished loading
  useEffect(() => {
    if (minSplashTimeElapsed && !authLoading) {
      console.log('[Splash] Both conditions met — hiding splash screen');
      setShowSplash(false);
    }
  }, [minSplashTimeElapsed, authLoading]);

  const [localHasSeenTour, setLocalHasSeenTour] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const alertedItemsRef = useRef(new Set());

  useEffect(() => {
    if (!currentUser) {
      alertedItemsRef.current.clear();
      return;
    }

    const unsubscribe = subscribeToInventory(
      (items) => {
        items.forEach((item) => {
          const isLow = Number(item.stock) <= Number(item.minStock || 0);
          if (isLow) {
            if (!alertedItemsRef.current.has(item.id)) {
              alertedItemsRef.current.add(item.id);
              showToast(
                `⚠️ Low Stock: "${item.item}" is down to ${item.stock} ${item.unit}!`,
                'error'
              );
              try {
                window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'warning' }));
              } catch (e) {}
            }
          } else {
            alertedItemsRef.current.delete(item.id);
          }
        });
      },
      null,
      currentUser.uid
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const key = `cc_tour_v1_seen_${currentUser.uid}`;
      setLocalHasSeenTour(localStorage.getItem(key) === 'true');
    } else {
      setLocalHasSeenTour(false);
      setShowTutorial(false);
    }
  }, [currentUser]);

  const handleTourComplete = () => {
    if (currentUser) {
      localStorage.setItem(`cc_tour_v1_seen_${currentUser.uid}`, 'true');
      setLocalHasSeenTour(true);
    }
  };

  const location = useLocation();

  const isPublicRoute =
    location.pathname.startsWith('/order/') ||
    location.pathname.startsWith('/menu/') ||
    location.pathname === '/privacy' ||
    location.pathname === '/terms';

  const content = isPublicRoute ? (
    <motion.div
      key="public"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Suspense fallback={<DelayedFallback fullScreen />}>
        <Routes>
          <Route path="/order/:username" element={<PublicOrderForm />} />
          <Route path="/menu/:username" element={<PublishedMenu />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </Suspense>
    </motion.div>
  ) : !currentUser && !authLoading ? (
    <motion.div
      key="login"
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      style={{ height: '100vh', width: '100vw' }}
    >
      <Suspense fallback={<DelayedFallback fullScreen />}>
        <Login />
      </Suspense>
    </motion.div>
  ) : currentUser ? (
    <motion.div
      key="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="app"
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <MobileHeader
        onMenuClick={() => setSidebarOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="main">
        <AppErrorBoundary uid={currentUser?.uid ?? null}>
          <Suspense fallback={<DelayedFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </AppErrorBoundary>
      </main>
      <BottomNav />
      {currentUser && !localHasSeenTour && !hasSeenTourV1 && onboardingCompleted && (
        <PremiumAppTour onComplete={handleTourComplete} />
      )}
      {currentUser && !onboardingCompleted && !showTutorial && (
        <Suspense fallback={null}>
          <OnboardingModal
            user={{ ...currentUser, ...userDetails }}
            business={business}
            onComplete={() => setShowTutorial(true)}
          />
        </Suspense>
      )}
      {currentUser && !onboardingCompleted && showTutorial && !localHasSeenTour && (
        <PremiumAppTour onComplete={handleTourComplete} />
      )}
    </motion.div>
  ) : (
    <div
      key="loading"
      style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Loader2 className="animate-spin" color="var(--accent)" />
    </div>
  );

  return (
    <>
      <AnimatePresence>{showSplash && <SplashScreen key="splash" />}</AnimatePresence>
      <SystemGuard>
        <AnimatePresence mode="wait">{content}</AnimatePresence>
      </SystemGuard>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <MainLayout />
        <ToastContainer />
        <OfflineBanner />
        <ConfettiCanvas />
        <SuccessBurstOverlay />
        <FloatingRewardLayer />
        <PwaUpdateToast />
      </AuthProvider>
    </BrowserRouter>
  );
}
