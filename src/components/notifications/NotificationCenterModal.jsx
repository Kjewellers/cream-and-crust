/**
 * NotificationCenterModal.jsx
 *
 * Enterprise In-App Notification Center Modal for Cream & Crust.
 * Categorized tabs (All, Unread, Orders, Inventory, System),
 * real-time multi-device sync, bulk action controls, and deep-link routing.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Filter, X, ShoppingBag, Package, Shield, Sparkles, ChevronRight } from 'lucide-react';
import {
  subscribeToNotificationSync,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
} from '../../services/notifications/NotificationSync';
import { handleNotificationTap } from '../../services/notifications/DeepLinkRouter';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenterModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;

    const unsubscribe = subscribeToNotificationSync(currentUser.uid, ({ notifications: list, unreadCount: count }) => {
      setNotifications(list);
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((item) => {
    if (item.archived) return false;
    if (activeTab === 'unread') return !item.read;
    if (activeTab === 'orders') return item.type?.includes('ORDER');
    if (activeTab === 'inventory') return item.type?.includes('INVENTORY') || item.type?.includes('STOCK');
    if (activeTab === 'system') return item.type?.includes('SYSTEM') || item.type?.includes('SECURITY');
    return true;
  });

  const getCategoryIcon = (type) => {
    if (type?.includes('ORDER')) return <ShoppingBag size={18} color="#B5606A" />;
    if (type?.includes('INVENTORY') || type?.includes('STOCK')) return <Package size={18} color="#E07A5F" />;
    if (type?.includes('SYSTEM') || type?.includes('SECURITY')) return <Shield size={18} color="#4A7C59" />;
    return <Bell size={18} color="#8C7A6B" />;
  };

  const handleItemClick = (item) => {
    if (!item.read) {
      markNotificationAsRead(item.id);
    }
    handleNotificationTap(item, navigate);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(45, 27, 20, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          height: '100%',
          background: '#FDFBF7',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'calc(env(safe-area-inset-top, 16px) + 16px) 20px 16px',
            borderBottom: '1px solid rgba(140,122,107,0.12)',
            background: '#FDFBF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(181, 96, 106, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B5606A',
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2D1B14' }}>
                Notifications
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#8C7A6B', fontWeight: 600 }}>
                {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsAsRead(notifications)}
                title="Mark all as read"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#B5606A',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: 8,
                }}
              >
                <CheckCheck size={16} /> Mark Read
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: 10,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#2D1B14',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '12px 16px',
            borderBottom: '1px solid rgba(140,122,107,0.08)',
            overflowX: 'auto',
            background: '#FAF7F2',
          }}
        >
          {['all', 'unread', 'orders', 'inventory', 'system'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: activeTab === tab ? 800 : 600,
                background: activeTab === tab ? '#2D1B14' : 'rgba(0,0,0,0.04)',
                color: activeTab === tab ? '#FDFBF7' : '#66564B',
                cursor: 'pointer',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8C7A6B' }}>
              <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>No notifications found</div>
              <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                You're all caught up with your bakery updates!
              </div>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleItemClick(item)}
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  background: item.read ? '#FFFFFF' : 'rgba(181, 96, 106, 0.05)',
                  border: item.read ? '1px solid rgba(140,122,107,0.1)' : '1px solid rgba(181, 96, 106, 0.25)',
                  marginBottom: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  position: 'relative',
                }}
              >
                {!item.read && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 14,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#B5606A',
                    }}
                  />
                )}

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getCategoryIcon(item.type)}
                </div>

                <div style={{ flex: 1, pr: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#2D1B14', lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#66564B', marginTop: 3, lineHeight: 1.4 }}>
                    {item.message || item.body}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#A09084', marginTop: 6, fontWeight: 500 }}>
                    {item.createdAt?.toLocaleTimeString ? item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveNotification(item.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#C4B5A8',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  title="Archive"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
