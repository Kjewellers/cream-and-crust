/**
 * CreamCrustLiveBanner.jsx
 *
 * Enterprise 60 FPS In-App Floating Notification & Live Activity Banner.
 * Positioned cleanly below the status bar with spring motion physics,
 * glassmorphism backdrop blur, live order progress bars, and soft haptics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShoppingBag, Flame, Truck, CheckCircle, ChevronRight, X, Sparkles } from 'lucide-react';
import { subscribeToLiveActivity } from '../../services/notifications/LiveActivityEngine';
import { handleNotificationTap } from '../../services/notifications/DeepLinkRouter';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic } from '../iOS';

export default function CreamCrustLiveBanner() {
  const [activeBanner, setActiveBanner] = useState(null);
  const [liveOrder, setLiveOrder] = useState(null);
  const [dismissedOrderIds, setDismissedOrderIds] = useState(new Set());
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Clear transient banners on route change so they don't linger across screens
  useEffect(() => {
    setActiveBanner(null);
  }, [location.pathname]);

  // Listen to Live Activity Engine updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveActivity((order) => {
      setLiveOrder(order);
      if (order && order.percentage > 0 && order.percentage < 100) {
        // Trigger gentle haptic when active order updates
        triggerHaptic('light');
      }
    });
    return () => unsubscribe();
  }, []);

  // Expose global window trigger for incoming foreground FCM notifications
  useEffect(() => {
    window.showCreamCrustBanner = (notification) => {
      setActiveBanner(notification);
      triggerHaptic('medium');

      // Auto-hide notifications after 5.5 seconds
      clearTimeout(window.bannerTimeout);
      window.bannerTimeout = setTimeout(() => {
        setActiveBanner(null);
      }, 5500);
    };

    return () => {
      delete window.showCreamCrustBanner;
    };
  }, []);

  const dismiss = useCallback(() => {
    setActiveBanner(null);
    if (liveOrder?.id) {
      setDismissedOrderIds((prev) => new Set(prev).add(liveOrder.id));
    }
  }, [liveOrder]);

  const isOrderDismissed = liveOrder?.id && dismissedOrderIds.has(liveOrder.id);
  const currentLive = isOrderDismissed ? null : liveOrder;

  const displayData = activeBanner || (currentLive ? {
    title: `Order #${currentLive.id?.slice(-4) || '1042'} • ${currentLive.stageLabel}`,
    body: `${currentLive.emoji} ${currentLive.percentage}% Complete • ${currentLive.customerName || 'Customer'}`,
    type: 'ORDER_STATUS',
    orderId: currentLive.id,
    percentage: currentLive.percentage,
    isLiveOrder: true,
  } : null);

  if (!displayData) return null;

  const onTap = () => {
    handleNotificationTap(displayData, navigate);
    dismiss();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 12px) + 8px)',
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <AnimatePresence>
        <motion.div
          key="cc-live-banner"
          initial={{ y: -60, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          drag="y"
          dragConstraints={{ top: -100, bottom: 0 }}
          onDragEnd={(e, info) => {
            if (info.offset.y < -20) {
              dismiss();
            }
          }}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 420,
            background: 'rgba(253, 251, 247, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 20,
            border: '1px solid rgba(181, 96, 106, 0.22)',
            boxShadow: '0 12px 32px -8px rgba(45, 27, 20, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '12px 16px',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
          onClick={onTap}
        >
          {/* Top Bar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #B5606A 0%, #8C434B 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  boxShadow: '0 4px 10px rgba(181, 96, 106, 0.3)',
                }}
              >
                {displayData.isLiveOrder ? <Flame size={18} /> : <Bell size={18} />}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#2D1B14',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {displayData.title || displayData.notification?.title || 'Cream & Crust Alert'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#66564B', fontWeight: 500, marginTop: 2 }}>
                  {displayData.body || displayData.notification?.body || 'Tap to view details'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronRight size={16} color="#8C7A6B" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: 10,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#8C7A6B',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Live Progress Bar (if live order progress) */}
          {displayData.percentage !== undefined && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  height: 5,
                  width: '100%',
                  background: 'rgba(181, 96, 106, 0.12)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${displayData.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #B5606A, #D4A050)',
                    borderRadius: 10,
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
