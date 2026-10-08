import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  ShoppingBag,
  Package,
  BookOpen,
  Database,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';

/**
 * CommandPalette — Spotlight/Airbnb-grade global search overlay.
 * Triggered via Cmd+K / Ctrl+K keyboard shortcut or header search tap.
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { orders = [], products = [], customers = [] } = useData() || {};
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Static navigation routes & quick actions
  const defaultItems = useMemo(
    () => [
      { id: 'dash', label: 'Dashboard', category: 'Navigation', icon: LayoutDashboard, path: '/' },
      { id: 'ord', label: 'Orders Manager', category: 'Navigation', icon: ShoppingBag, path: '/orders' },
      { id: 'prod', label: 'Product Catalog', category: 'Navigation', icon: Package, path: '/products' },
      { id: 'rec', label: 'Baking Recipes', category: 'Navigation', icon: BookOpen, path: '/recipes' },
      { id: 'inv', label: 'Inventory & Stock', category: 'Navigation', icon: Database, path: '/inventory' },
      { id: 'cust', label: 'Customer Directory', category: 'Navigation', icon: Users, path: '/customers' },
      { id: 'exp', label: 'Expense Tracker', category: 'Navigation', icon: Receipt, path: '/expenses' },
      { id: 'ana', label: 'Sales Analytics', category: 'Navigation', icon: BarChart3, path: '/analytics' },
      { id: 'ai', label: 'Cream AI Assistant', category: 'AI Tools', icon: Sparkles, path: '/ai-assistant' },
      { id: 'set', label: 'Bakery Settings', category: 'Account', icon: Settings, path: '/settings' },
    ],
    []
  );

  // Dynamic search results matching query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return defaultItems;

    const results = [];

    // Match static routes
    defaultItems.forEach((item) => {
      if (item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)) {
        results.push(item);
      }
    });

    // Match orders
    orders.forEach((o) => {
      const name = o.customerName || 'Customer';
      const prod = o.product || 'Order';
      if (name.toLowerCase().includes(q) || prod.toLowerCase().includes(q) || String(o.id).includes(q)) {
        results.push({
          id: `order-${o.id}`,
          label: `Order: ${name} — ${prod}`,
          category: 'Orders',
          icon: ShoppingBag,
          path: '/orders',
        });
      }
    });

    // Match products
    products.forEach((p) => {
      if (p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)) {
        results.push({
          id: `prod-${p.id}`,
          label: `Product: ${p.name}`,
          category: 'Products',
          icon: Package,
          path: '/products',
        });
      }
    });

    return results.slice(0, 12);
  }, [query, defaultItems, orders, products]);

  const handleSelect = (item) => {
    onClose();
    setQuery('');
    if (item.path) navigate(item.path);
  };

  // Keyboard navigation within search modal
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99990,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 'clamp(40px, 10vh, 120px)',
          paddingLeft: 16,
          paddingRight: 16,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 12, 11, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 560,
            background: 'var(--card, #fff)',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-md, rgba(0,0,0,0.1))',
          }}
        >
          {/* Input Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              gap: 12,
              borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
            }}
          >
            <Search size={20} color="var(--accent, #B5606A)" />
            <input
              type="text"
              autoFocus
              placeholder="Search orders, products, recipes or jump to page..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 16,
                fontFamily: 'inherit',
                color: 'var(--text, #1C1917)',
              }}
            />
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'var(--bg, #f5f5f5)',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 12,
                color: 'var(--text3)',
                cursor: 'pointer',
              }}
            >
              ESC
            </button>
          </div>

          {/* Results List */}
          <div
            style={{
              maxHeight: 380,
              overflowY: 'auto',
              padding: '8px 12px 14px',
            }}
          >
            {filteredItems.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                No results found for "{query}"
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 14,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-lt, rgba(181, 96, 106, 0.1))' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: isSelected ? 'var(--accent, #B5606A)' : 'var(--bg, #f5f5f5)',
                          color: isSelected ? '#fff' : 'var(--text2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text, #1C1917)' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{item.category}</div>
                      </div>
                    </div>
                    <ArrowRight size={16} color={isSelected ? 'var(--accent, #B5606A)' : 'transparent'} />
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
