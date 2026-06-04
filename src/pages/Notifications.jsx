import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bell, ShoppingBag, Package, Truck, Calendar as CalendarIcon, BarChart3, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { subscribeToNotifications, deleteNotificationFromDB, updateNotificationInDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast, triggerHaptic } from '../components/iOS';

const timeAgo = (dateString) => {
  if (!dateString) return 'now';
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TYPE_CONFIG = {
  order: { icon: ShoppingBag, bg: '#FFF1F2', color: '#F43F5E' },
  inventory: { icon: Package, bg: '#FEF9C3', color: '#EAB308' },
  shipping: { icon: Truck, bg: '#DCFCE7', color: '#22C55E' },
  system: { icon: BarChart3, bg: '#E0F2FE', color: '#3B82F6' },
  event: { icon: CalendarIcon, bg: '#F3E8FF', color: '#A855F7' },
  default: { icon: Bell, bg: '#F3F4F6', color: '#6B7280' }
};

export default function Notifications() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const markAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await updateNotificationInDB(id, { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    triggerHaptic('success');
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await updateNotificationInDB(n.id, { read: true });
    }
    showToast('All caught up! 🎉', 'success');
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    triggerHaptic('light');
    try {
      await deleteNotificationFromDB(id);
    } catch (e) {
      showToast('Error deleting notification', 'error');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } }
  };

  return (
    <div style={{ 
      minHeight: '100%', 
      background: 'linear-gradient(180deg, #FFF1F2 0%, #FFFFFF 100%)',
      paddingBottom: 80 
    }}>
      {/* HEADER */}
      <div style={{ 
        padding: 'env(safe-area-inset-top, 44px) 20px 20px', 
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255, 241, 242, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(244, 63, 94, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, color: '#4A3B32', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F43F5E', background: '#FFF1F2', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <Bell size={14} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Stay Updated</span>
          </div>
        </div>
        
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#4A3B32', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
          Smart Notifications<br/>
          <span style={{ color: '#F43F5E', fontStyle: 'italic' }}>That Keep You<br/>in the Loop ♡</span>
        </h1>

        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            style={{ 
              marginTop: 16, background: '#F43F5E', color: 'white', border: 'none', borderRadius: 99, 
              padding: '10px 20px', fontSize: '0.85rem', fontWeight: 800, 
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.3)'
            }}
          >
            <CheckCircle2 size={16} /> Mark all as read
          </button>
        )}
      </div>

      {/* LIST */}
      <div style={{ padding: '24px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#F43F5E' }}>
              <Bell size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4A3B32' }}>All caught up!</h3>
            <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: 8 }}>You don't have any new notifications.</p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence mode="popLayout">
              {notifications.map(notif => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
                const Icon = config.icon;
                return (
                  <motion.div 
                    key={notif.id}
                    layout
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    onClick={() => markAsRead(notif.id, notif.read)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 24,
                      padding: '16px',
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      boxShadow: notif.read ? '0 4px 12px rgba(74, 59, 50, 0.04)' : '0 8px 24px rgba(244, 63, 94, 0.12)',
                      border: notif.read ? '1px solid rgba(0,0,0,0.03)' : '1.5px solid rgba(244, 63, 94, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    {!notif.read && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: '#F43F5E' }} />}
                    
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                      background: config.bg, color: config.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={22} strokeWidth={2.5} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4A3B32', margin: 0 }}>
                          {notif.title}
                        </h4>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600 }}>
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                        {notif.message}
                      </p>
                    </div>

                    <button 
                      onClick={(e) => deleteNotif(notif.id, e)}
                      style={{ background: 'none', border: 'none', padding: 4, color: '#D1D5DB', cursor: 'pointer' }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
