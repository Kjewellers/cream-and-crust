import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Package, ShoppingBag, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useKeyboardInsets } from '../../hooks/useKeyboardInsets';
import QuickCreateSheet from '../QuickCreateSheet';
import BottomNavCustomiseSheet, {
  NAV_SHORTCUTS,
  loadBottomNavSlots,
  saveBottomNavSlots,
} from './BottomNavCustomiseSheet';

const getFabConfig = (pathname) => {
  if (pathname === '/' || pathname === '/dashboard') return 'quick-create';
  if (pathname.startsWith('/orders')) return 'open-new-order-modal';
  if (pathname.startsWith('/customers')) return 'open-new-customer-modal';
  if (pathname.startsWith('/products')) return 'open-new-product-modal';
  if (pathname.startsWith('/expenses')) return 'open-new-expense-modal';
  if (pathname.startsWith('/inventory')) return 'open-new-inventory-modal';
  if (pathname.startsWith('/shopping-list')) return 'open-new-shopping-modal';

  if (
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/menu-builder')
  ) {
    return 'quick-actions';
  }

  return 'quick-create';
};

export default function BottomNav() {
  const { isAdmin, userRole, currentUser } = useAuth();
  const isBaker = userRole === 'baker';
  const location = useLocation();
  const uid = currentUser?.uid || null;

  const { keyboardOpen } = useKeyboardInsets();

  const [slotIds, setSlotIds] = useState(() => loadBottomNavSlots(uid));
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateMode, setQuickCreateMode] = useState('quick-create');
  const longPressTimer = useRef(null);

  useEffect(() => {
    setSlotIds(loadBottomNavSlots(uid));
  }, [uid]);

  useEffect(() => {
    const open = () => setCustomiseOpen(true);
    window.addEventListener('cc-open-bottom-nav-customise', open);
    return () => window.removeEventListener('cc-open-bottom-nav-customise', open);
  }, []);

  if (!(isAdmin || isBaker)) {
    const customerItems = [
      { to: '/', icon: Package, label: 'Shop' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/profile', icon: Settings, label: 'Profile' },
    ];
    return createPortal(
      <nav
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bottom-nav-bg, rgba(255, 255, 255, 0.95))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
          zIndex: 90,
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          paddingTop: 8,
          display: keyboardOpen ? 'none' : undefined,
          willChange: 'transform',
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
      </nav>,
      document.body
    );
  }

  const handleSlotsChange = (next) => {
    saveBottomNavSlots(uid, next);
    setSlotIds(next);
    setCustomiseOpen(false);
  };

  const startLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'medium' }));
      } catch (e) {}
      setQuickCreateMode('universal');
      setQuickCreateOpen(true);
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

    const action = getFabConfig(location.pathname);

    if (action === 'quick-create' || action === 'quick-actions') {
      setQuickCreateMode(action);
      setQuickCreateOpen(true);
    } else {
      window.dispatchEvent(new CustomEvent(action));
    }
  };

  const renderSlot = (slotId, key) => {
    const item = NAV_SHORTCUTS.find((s) => s.id === slotId);
    if (!item) return <div key={key} style={{ width: 56 }} />;
    const Icon = item.icon;
    return (
      <motion.div key={key} whileTap={{ scale: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
        <NavLink
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
      </motion.div>
    );
  };

  return createPortal(
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
          background: 'var(--bottom-nav-bg, rgba(255, 255, 255, 0.95))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border, rgba(0, 0, 0, 0.06))',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)',
          zIndex: 90,
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          paddingTop: 8,
          display: keyboardOpen ? 'none' : undefined,
          willChange: 'transform',
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
          {renderSlot(slotIds[0], 'slot-0')}
          {renderSlot(slotIds[1], 'slot-1')}

          <div
            style={{
              position: 'relative',
              width: 60,
              height: 44,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
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
                background: '#E15A75',
                color: 'white',
                boxShadow: '0 8px 24px rgba(225, 90, 117, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
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
      <QuickCreateSheet
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        mode={quickCreateMode}
      />
    </>,
    document.body
  );
}
