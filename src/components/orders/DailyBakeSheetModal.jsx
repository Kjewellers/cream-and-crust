import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  Share2,
  Calendar,
  CheckCircle2,
  Circle,
  Flame,
  ChefHat,
  PackageCheck,
  Sparkles,
  Clock,
  Cake,
  MessageCircle,
} from 'lucide-react';
import { triggerHaptic, showToast } from '../iOS';
import { formatDate, formatTime } from '../../utils/date';

/**
 * DailyBakeSheetModal
 *
 * Professional daily production & kitchen batch planner.
 * Aggregates active orders by delivery date, calculates total batter & sponge weights,
 * and provides a live 4-stage kitchen checklist (Mix -> Bake -> Decorate -> Box).
 */
export default function DailyBakeSheetModal({ open, onClose, orders = [] }) {
  const [selectedFilter, setSelectedFilter] = useState('today'); // 'today' | 'tomorrow' | '3days' | 'all'
  const [checkedStages, setCheckedStages] = useState(() => {
    try {
      const saved = localStorage.getItem('cc_daily_bake_sheet_stages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const origBody = document.body.style.overflow;
    const origDoc = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origDoc;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Persist checked stages
  const toggleStage = (orderId, stageKey) => {
    triggerHaptic('light');
    setCheckedStages((prev) => {
      const orderStages = prev[orderId] || {};
      const next = {
        ...prev,
        [orderId]: {
          ...orderStages,
          [stageKey]: !orderStages[stageKey],
        },
      };
      try {
        localStorage.setItem('cc_daily_bake_sheet_stages', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 86400000;
  const dayAfterTomorrow = todayStart + 86400000 * 2;
  const threeDaysEnd = todayStart + 86400000 * 3;

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Exclude already completed/cancelled
      const st = (order.status || '').toLowerCase();
      if (st === 'delivered' || st === 'cancelled') return false;

      // Delivery timestamp
      let deliveryMs = null;
      if (order.deliveryDate) {
        const d = new Date(order.deliveryDate);
        if (!isNaN(d.getTime())) deliveryMs = d.getTime();
      } else if (order.createdAt) {
        deliveryMs = new Date(order.createdAt).getTime();
      }

      if (!deliveryMs) return selectedFilter === 'all';

      if (selectedFilter === 'today') {
        return deliveryMs >= todayStart && deliveryMs < tomorrowStart;
      }
      if (selectedFilter === 'tomorrow') {
        return deliveryMs >= tomorrowStart && deliveryMs < dayAfterTomorrow;
      }
      if (selectedFilter === '3days') {
        return deliveryMs >= todayStart && deliveryMs < threeDaysEnd;
      }
      return true; // 'all'
    });
  }, [orders, selectedFilter, todayStart, tomorrowStart, dayAfterTomorrow, threeDaysEnd]);

  // Aggregate items/flavours and weights
  const aggregatedBatches = useMemo(() => {
    const map = {};
    filteredOrders.forEach((ord) => {
      const items = ord.items && ord.items.length > 0 ? ord.items : [{ name: ord.productName || 'Custom Cake', weight: ord.weight || '1kg', quantity: ord.quantity || 1 }];
      items.forEach((it) => {
        const name = (it.name || ord.productName || 'Custom Cake').trim();
        const weightStr = (it.weight || ord.weight || '').toLowerCase();
        let kg = 1;
        if (weightStr.includes('kg')) {
          const val = parseFloat(weightStr.replace('kg', '').trim());
          if (!isNaN(val)) kg = val;
        } else if (weightStr.includes('gm') || weightStr.includes('g')) {
          const val = parseFloat(weightStr.replace(/gm|g/, '').trim());
          if (!isNaN(val)) kg = val / 1000;
        } else if (weightStr.includes('lb')) {
          const val = parseFloat(weightStr.replace('lb', '').trim());
          if (!isNaN(val)) kg = val * 0.453;
        }

        const qty = parseInt(it.quantity || ord.quantity || 1, 10);
        if (!map[name]) {
          map[name] = { name, totalWeightKg: 0, totalCount: 0, orders: [] };
        }
        map[name].totalWeightKg += kg * qty;
        map[name].totalCount += qty;
        if (!map[name].orders.includes(ord.id || ord.orderNumber)) {
          map[name].orders.push(ord.id || ord.orderNumber);
        }
      });
    });
    return Object.values(map);
  }, [filteredOrders]);

  // Progress metrics
  const totalStagesCount = filteredOrders.length * 4;
  let completedStagesCount = 0;
  filteredOrders.forEach((o) => {
    const st = checkedStages[o.id] || {};
    if (st.mixed) completedStagesCount++;
    if (st.baked) completedStagesCount++;
    if (st.decorated) completedStagesCount++;
    if (st.boxed) completedStagesCount++;
  });
  const progressPercent = totalStagesCount > 0 ? Math.round((completedStagesCount / totalStagesCount) * 100) : 0;

  // WhatsApp Kitchen Sheet Formatter
  const shareKitchenSheetWhatsApp = () => {
    triggerHaptic('success');
    const dateLabel =
      selectedFilter === 'today'
        ? 'TODAY'
        : selectedFilter === 'tomorrow'
        ? 'TOMORROW'
        : selectedFilter === '3days'
        ? 'NEXT 3 DAYS'
        : 'ACTIVE SCHEDULE';

    let text = `📋 *CREAM & CRUST — DAILY BAKE SHEET (${dateLabel})*\n`;
    text += `Total Active Orders: ${filteredOrders.length}\n`;
    text += `Production Progress: ${progressPercent}%\n\n`;

    text += `🍰 *PRODUCTION BATCH AGGREGATE:*\n`;
    aggregatedBatches.forEach((b, i) => {
      text += `${i + 1}. *${b.name}* — ${b.totalWeightKg > 0 ? b.totalWeightKg.toFixed(1) + ' kg' : b.totalCount + ' pcs'} (${b.orders.length} orders)\n`;
    });

    text += `\n📦 *ORDER DETAIL & STAGES:*\n`;
    filteredOrders.forEach((o, idx) => {
      const st = checkedStages[o.id] || {};
      const statusIcon = st.boxed ? '✅ Boxed' : st.decorated ? '🎨 Decorated' : st.baked ? '♨️ Baked' : st.mixed ? '🥣 Mixed' : '⏳ Pending';
      text += `• *#${o.orderNumber || idx + 1}* — ${o.customerName || 'Customer'} (${o.productName || 'Order'} - ${o.weight || '1kg'})\n`;
      text += `  Slot: ${o.deliveryTime || 'Anytime'} | Status: ${statusIcon}\n`;
      if (o.notes || o.customMessage) {
        text += `  Note: "${o.customMessage || o.notes}"\n`;
      }
    });

    text += `\n_Generated via Cream & Crust Production Hub_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.48)',
          }}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 720,
            maxHeight: 'min(90dvh, 780px)',
            background: '#ffffff',
            borderRadius: 28,
            boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #B5606A 0%, #D4A050 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(181, 96, 106, 0.25)',
                }}
              >
                <ChefHat size={22} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 19,
                    fontWeight: 800,
                    color: '#2D1B14',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Daily Bake & Prep Sheet
                </h2>
                <div style={{ fontSize: 12.5, color: '#7C6B5E', fontWeight: 500 }}>
                  Kitchen production planner & batch scaling
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handlePrint}
                title="Print Kitchen Sheet"
                aria-label="Print Kitchen Sheet"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: '#F9F6F0',
                  color: '#2D1B14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Printer size={18} />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: 'none',
                  background: 'rgba(0, 0, 0, 0.05)',
                  color: '#2D1B14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Filter Pills + Kitchen Progress Strip */}
          <div
            style={{
              padding: '12px 22px',
              background: '#FCFAF7',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'tomorrow', label: 'Tomorrow' },
                { id: '3days', label: 'Next 3 Days' },
                { id: 'all', label: 'All Active' },
              ].map((f) => {
                const active = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedFilter(f.id);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: active ? '1.5px solid #B5606A' : '1px solid rgba(0, 0, 0, 0.08)',
                      background: active ? '#B5606A' : '#ffffff',
                      color: active ? '#ffffff' : '#4A3B32',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Kitchen Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7C6B5E', textTransform: 'uppercase' }}>
                  Kitchen Progress
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#2D1B14' }}>
                  {progressPercent}% Complete
                </div>
              </div>
              <div
                style={{
                  width: 60,
                  height: 8,
                  borderRadius: 99,
                  background: 'rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #B5606A, #10B981)',
                    borderRadius: 99,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modal Content Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Batch Aggregation Card */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#7C6B5E',
                  }}
                >
                  🥣 Aggregated Production Batches
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#B5606A' }}>
                  {aggregatedBatches.length} Unique Bakes
                </span>
              </div>

              {aggregatedBatches.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    background: '#FAF6F0',
                    borderRadius: 18,
                    color: '#7C6B5E',
                    fontSize: 14,
                  }}
                >
                  🎉 No pending baking scheduled for this period!
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 10,
                  }}
                >
                  {aggregatedBatches.map((batch) => (
                    <div
                      key={batch.name}
                      style={{
                        background: '#FFF9F5',
                        border: '1px solid rgba(181, 96, 106, 0.18)',
                        borderRadius: 16,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#2D1B14',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {batch.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#B5606A' }}>
                          {batch.totalWeightKg > 0 ? `${batch.totalWeightKg.toFixed(1)} kg` : `${batch.totalCount} pcs`}
                        </span>
                        <span style={{ fontSize: 12, color: '#7C6B5E', fontWeight: 600 }}>
                          ({batch.orders.length} {batch.orders.length === 1 ? 'order' : 'orders'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders Stage Checklist */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#7C6B5E',
                  }}
                >
                  👨‍🍳 Order Production Line ({filteredOrders.length})
                </span>
                <span style={{ fontSize: 11, color: '#7C6B5E' }}>
                  Tap stages to mark complete
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredOrders.map((ord, idx) => {
                  const st = checkedStages[ord.id] || {};
                  const isAllDone = st.mixed && st.baked && st.decorated && st.boxed;

                  return (
                    <div
                      key={ord.id || idx}
                      style={{
                        background: isAllDone ? '#F4FBF7' : '#ffffff',
                        border: isAllDone
                          ? '1.5px solid #10B981'
                          : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: 18,
                        padding: '14px 16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top line: Customer & Item info */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                background: 'rgba(0,0,0,0.06)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                color: '#4A3B32',
                              }}
                            >
                              #{ord.orderNumber || idx + 1}
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#2D1B14' }}>
                              {ord.customerName || 'Customer'}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#B5606A',
                              marginTop: 2,
                            }}
                          >
                            {ord.productName || 'Custom Cake'} • {ord.weight || '1kg'}
                          </div>

                          {(ord.notes || ord.customMessage) && (
                            <div
                              style={{
                                fontSize: 12,
                                color: '#7C6B5E',
                                fontStyle: 'italic',
                                marginTop: 4,
                                background: '#FAF6F0',
                                padding: '4px 8px',
                                borderRadius: 8,
                                display: 'inline-block',
                              }}
                            >
                              "{ord.customMessage || ord.notes}"
                            </div>
                          )}
                        </div>

                        {/* Delivery Time Badge */}
                        <div
                          style={{
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#2D1B14',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Clock size={13} color="#B5606A" />
                            {ord.deliveryTime || 'Anytime'}
                          </span>
                          <span style={{ fontSize: 11, color: '#7C6B5E' }}>
                            {ord.deliveryDate ? formatDate(ord.deliveryDate) : 'Today'}
                          </span>
                        </div>
                      </div>

                      {/* 4 Production Stages Checkboxes */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 6,
                          paddingTop: 8,
                          borderTop: '1px dashed rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        {[
                          { key: 'mixed', label: '1. Mixed', emoji: '🥣' },
                          { key: 'baked', label: '2. Baked', emoji: '♨️' },
                          { key: 'decorated', label: '3. Decorated', emoji: '🎨' },
                          { key: 'boxed', label: '4. Boxed', emoji: '📦' },
                        ].map((stage) => {
                          const checked = !!st[stage.key];
                          return (
                            <button
                              key={stage.key}
                              type="button"
                              onClick={() => toggleStage(ord.id, stage.key)}
                              style={{
                                padding: '8px 6px',
                                borderRadius: 10,
                                border: checked
                                  ? '1.5px solid #10B981'
                                  : '1px solid rgba(0, 0, 0, 0.08)',
                                background: checked ? '#E8F5E9' : '#FAF6F0',
                                color: checked ? '#1B5E20' : '#4A3B32',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {checked ? (
                                <CheckCircle2 size={13} color="#10B981" />
                              ) : (
                                <Circle size={13} color="#A8A29E" />
                              )}
                              <span>{stage.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Bar — WhatsApp Kitchen Share */}
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12.5, color: '#7C6B5E', fontWeight: 600 }}>
              Auto-saved to kitchen terminal
            </div>

            <button
              type="button"
              onClick={shareKitchenSheetWhatsApp}
              style={{
                padding: '12px 20px',
                borderRadius: 14,
                border: 'none',
                background: '#25D366',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
              }}
            >
              <MessageCircle size={18} />
              <span>Share Bake Sheet on WhatsApp</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

