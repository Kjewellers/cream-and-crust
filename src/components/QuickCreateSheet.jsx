import React from 'react';
import PremiumBottomSheet from './PremiumBottomSheet';
import {
  ShoppingBag,
  Users,
  Package,
  Receipt,
  Database,
  ShoppingCart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function QuickCreateSheet({ open, onClose, mode = 'quick-create' }) {
  const navigate = useNavigate();

  const handleAction = (eventName, route) => {
    onClose();
    setTimeout(() => {
      if (route && window.location.pathname !== route) {
        navigate(route);
      }
      // Small delay to allow navigation to mount the component before dispatching event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(eventName));
      }, 100);
    }, 150);
  };

  const allActions = [
    {
      id: 'order',
      label: 'New Order',
      icon: ShoppingBag,
      color: '#E15A3E',
      bg: 'rgba(225,90,62,0.1)',
      event: 'open-new-order-modal',
      route: '/orders',
    },
    {
      id: 'customer',
      label: 'New Customer',
      icon: Users,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.1)',
      event: 'open-new-customer-modal',
      route: '/customers',
    },
    {
      id: 'product',
      label: 'New Product',
      icon: Package,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.1)',
      event: 'open-new-product-modal',
      route: '/products',
    },
    {
      id: 'expense',
      label: 'New Expense',
      icon: Receipt,
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.1)',
      event: 'open-new-expense-modal',
      route: '/expenses',
    },
    {
      id: 'inventory',
      label: 'Add Stock',
      icon: Database,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.1)',
      event: 'open-new-inventory-modal',
      route: '/inventory',
    },
    {
      id: 'shopping',
      label: 'Add Shopping Item',
      icon: ShoppingCart,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.1)',
      event: 'open-new-shopping-modal',
      route: '/shopping-list',
    },
  ];

  let visibleActions = [];
  let title = 'Create New';

  if (mode === 'quick-actions') {
    title = 'Quick Actions';
    visibleActions = allActions.filter(a => ['order', 'customer', 'product', 'expense'].includes(a.id));
  } else if (mode === 'universal') {
    title = 'Create Anything';
    visibleActions = allActions;
  } else {
    // default 'quick-create' (Dashboard)
    title = 'Quick Create';
    visibleActions = allActions;
  }

  return (
    <PremiumBottomSheet
      open={open}
      onClose={onClose}
      title={title}
      maxHeight="90dvh"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        paddingTop: 8,
      }}>
        {visibleActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(action.event, action.route)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 12px',
                background: 'var(--card, #FFFFFF)',
                border: '1px solid rgba(74, 59, 50, 0.08)',
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: action.bg,
                color: action.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}>
                <Icon size={24} strokeWidth={2} />
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text, #2D1B14)',
                lineHeight: 1.2,
              }}>
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </PremiumBottomSheet>
  );
}
