import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertTriangle,
  Package,
  CheckCircle2,
  ChefHat,
  Truck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/date';
import { BottomSheet, EmptyState, Skeleton, triggerHaptic } from '../components/iOS';
import ModuleTour from '../components/ModuleTour';
import { calendarTourSteps } from '../components/tours/calendarTour';
import AnimatedDemo from '../components/AnimatedDemo';
import { calendarDemoScenes } from '../components/demos/calendarDemo';

const STATUS_CONFIG = {
  inquiry: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: '💬', label: 'Inquiry' },
  confirmed: { color: '#D97706', bg: 'rgba(217,119,6,0.12)', icon: '✅', label: 'Confirmed' },
  baking: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '🔥', label: 'Baking' },
  ready: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: '📦', label: 'Ready' },
  delivered: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '🎉', label: 'Delivered' },
};

function toDateStr(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return String(date).split('T')[0];
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function friendlyDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
}

// Group an order into a time slot based on its delivery time.
function timeSlot(o) {
  const t = o.deliveryTime || o.time || '';
  const hour = parseInt(String(t).split(':')[0], 10);
  if (Number.isNaN(hour)) return 'Anytime';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

const SLOT_ORDER = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
const SLOT_META = {
  Morning: { emoji: '🌅', color: '#F59E0B' },
  Afternoon: { emoji: '☀️', color: '#3B82F6' },
  Evening: { emoji: '🌙', color: '#8B5CF6' },
  Anytime: { emoji: '🕐', color: '#8C7A6B' },
};

// Is this a pickup order? (no delivery address)
function isPickupOrder(o) {
  const type = String(o.deliveryType || o.type || '').toLowerCase();
  if (type.includes('pickup')) return true;
  const addr = o.deliveryAddress || (typeof o.customer === 'object' ? o.customer?.address : '');
  return !addr;
}

export default function Calendar() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { orders, loading } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showSheet, setShowSheet] = useState(false);



  // Map dateStr -> orders
  const ordersByDate = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const d = o.deliveryDate || o.date || '';
      if (!d) return;
      const key = String(d).split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [orders]);

  // Calendar grid
  const { days, monthLabel } = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const label = currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const grid = [];
    for (let i = 0; i < first; i++) grid.push(null);
    for (let i = 1; i <= total; i++) {
      grid.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    return { days: grid, monthLabel: label };
  }, [currentMonth]);

  // Week ahead (next 7 days from today)
  const weekAhead = useMemo(() => {
    const today = todayStr();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      return { date: d, orders: ordersByDate[d] || [] };
    });
  }, [ordersByDate]);

  // Prep warnings: days with 3+ orders need prep 1-2 days before
  const prepWarnings = useMemo(() => {
    const warns = new Set();
    Object.entries(ordersByDate).forEach(([d, list]) => {
      if (
        list.filter((o) => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase()))
          .length >= 3
      ) {
        warns.add(addDays(d, -1));
        warns.add(addDays(d, -2));
      }
    });
    return warns;
  }, [ordersByDate]);

  const selectedOrders = ordersByDate[selectedDate] || [];

  const handleDayClick = (d) => {
    if (!d) return;
    triggerHaptic('light');
    setSelectedDate(d);
    if (window.innerWidth < 960) setShowSheet(true);
  };

  const changeMonth = (n) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + n, 1));
  };

  const OrderCard = ({ o }) => {
    const cName =
      typeof o.customer === 'object'
        ? o.customer?.name || 'Customer'
        : o.customerName || o.customer || 'Customer';
    const s = String(o.status || 'inquiry').toLowerCase();
    const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.inquiry;
    const total = Number(o.total || o.totalAmount || 0);
    const advance = Number(o.advance || 0);
    const due = total - advance;
    const pickup = isPickupOrder(o);

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/orders', { state: { openOrderId: o.id } })}
        style={{
          background: 'var(--card)',
          borderRadius: 18,
          padding: '14px 16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)',
          cursor: 'pointer',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: cfg.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {cfg.icon}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
                {cName}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text2)',
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                🎂 {o.product || 'Custom Order'} {o.size ? `(${o.size})` : ''}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>
              ₹{total.toLocaleString('en-IN')}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: due > 0 ? '#EF4444' : '#10B981',
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              {due > 0 ? `₹${due.toLocaleString('en-IN')} due` : 'Paid ✓'}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.7rem',
                color: 'var(--text3)',
                fontWeight: 600,
              }}
            >
              <Clock size={12} /> {formatTime(o.deliveryTime || o.time || '10:00')}
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '0.65rem',
                fontWeight: 700,
                color: pickup ? 'var(--text2)' : '#3B82F6',
              }}
            >
              {pickup ? '🏪 Pickup' : '🚚 Delivery'}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 99,
              background: cfg.bg,
              color: cfg.color,
              textTransform: 'uppercase',
            }}
          >
            {cfg.label}
          </span>
        </div>
      </motion.div>
    );
  };

  const DayDetail = () => {
    // Revenue + grouping
    const dayRevenue = selectedOrders.reduce(
      (sum, o) => sum + Number(o.total || o.totalAmount || 0),
      0
    );
    const grouped = SLOT_ORDER.map((slot) => ({
      slot,
      orders: selectedOrders.filter((o) => timeSlot(o) === slot),
    })).filter((g) => g.orders.length > 0);

    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>
              {friendlyDate(selectedDate)}
            </div>
            <div
              style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}
            >
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}
              {dayRevenue > 0 && (
                <>
                  {' · '}
                  <span style={{ color: '#2E7A5A', fontWeight: 800 }}>
                    ₹{dayRevenue.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/orders')}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>
        {prepWarnings.has(selectedDate) && (
          <div
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 14,
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color="#D97706" />
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D97706' }}>
              Busy day ahead — start prep today! 🧑‍🍳
            </div>
          </div>
        )}
        {selectedOrders.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="No orders"
            subtitle="Enjoy the free day or plan ahead!"
            action={() => navigate('/orders')}
            actionLabel="+ New Order"
          />
        ) : (
          grouped.map(({ slot, orders: slotOrders }) => (
            <div key={slot} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: SLOT_META[slot].color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ fontSize: 14 }}>{SLOT_META[slot].emoji}</span>
                {slot} · {slotOrders.length}
              </div>
              {slotOrders.map((o) => (
                <OrderCard key={o.id} o={o} />
              ))}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
      {/* Header */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1>Delivery Calendar</h1>
          <p>Plan your baking schedule and deliveries</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="btn btn-primary desktop-only"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={18} /> New Order
        </button>
      </div>

      {/* Week Ahead Strip */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 10,
          }}
        >
          Next 7 Days
        </div>
        <div
          style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}
          className="hide-scrollbar"
        >
          {weekAhead.map(({ date, orders: dayOrders }) => {
            const isSelected = date === selectedDate;
            const isToday = date === todayStr();
            const active = dayOrders.filter(
              (o) => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase())
            );
            const isBusy = active.length >= 3;
            const d = new Date(date + 'T00:00:00');
            return (
              <motion.div
                key={date}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleDayClick(date)}
                style={{
                  minWidth: 60,
                  borderRadius: 16,
                  padding: '10px 6px',
                  textAlign: 'center',
                  background: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-lt)' : 'var(--card)',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : isBusy ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                  boxShadow: isSelected
                    ? '0 4px 16px var(--accent-lt)'
                    : 'var(--shadow-xs)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text3)',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  {d.toLocaleString('en-IN', { weekday: 'short' })}
                </div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: isSelected ? 'white' : 'var(--text)',
                    lineHeight: 1,
                  }}
                >
                  {d.getDate()}
                </div>
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                  {dayOrders.length > 0 ? (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 99,
                        background: isSelected
                          ? 'rgba(255,255,255,0.2)'
                          : isBusy
                            ? 'rgba(245,158,11,0.15)'
                            : 'var(--accent-lt)',
                        color: isSelected ? 'white' : isBusy ? '#D97706' : 'var(--accent)',
                      }}
                    >
                      {dayOrders.length}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.55rem',
                        color: isSelected ? 'rgba(255,255,255,0.5)' : 'var(--text3)',
                        fontWeight: 600,
                      }}
                    >
                      free
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}
        className="content-grid"
      >
        {/* Month Calendar */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 24,
            padding: '20px 16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* Month Nav */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              padding: '0 4px',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', margin: 0 }}>
              {monthLabel}
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => changeMonth(-1)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(todayStr());
                }}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                Today
              </button>
              <button
                onClick={() => changeMonth(1)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div
                key={i}
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  padding: '4px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {days.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />;
              const dayOrders = ordersByDate[dateStr] || [];
              const active = dayOrders.filter(
                (o) => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase())
              );
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr();
              const isPrepWarn = prepWarnings.has(dateStr);
              const isBusy = active.length >= 3;
              const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0);

              return (
                <motion.div
                  key={dateStr}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleDayClick(dateStr)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    background: isSelected
                      ? 'var(--accent)'
                      : isToday
                        ? 'var(--accent-lt)'
                        : isPrepWarn
                          ? 'rgba(245,158,11,0.07)'
                          : 'transparent',
                    border:
                      isBusy && !isSelected
                        ? '1.5px solid rgba(245,158,11,0.35)'
                        : '1.5px solid transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: isSelected || isToday ? 800 : 500,
                      color: isSelected ? 'white' : isToday ? 'var(--accent)' : 'var(--text)',
                      lineHeight: 1,
                    }}
                  >
                    {new Date(dateStr + 'T00:00:00').getDate()}
                  </span>
                  {dayRevenue > 0 && (
                    <span
                      style={{
                        fontSize: '0.55rem',
                        fontWeight: 800,
                        color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--accent)',
                        marginTop: 1,
                      }}
                    >
                      ₹{dayRevenue >= 1000 ? (dayRevenue / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : dayRevenue}
                    </span>
                  )}
                  {dayOrders.length > 0 && !isSelected && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 2,
                        marginTop: 3,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        maxWidth: '80%',
                      }}
                    >
                      {dayOrders.slice(0, 3).map((o, oi) => {
                        const s = String(o.status || 'inquiry').toLowerCase();
                        const c = STATUS_CONFIG[s]?.color || 'var(--accent)';
                        return (
                          <span
                            key={oi}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: c,
                              display: 'inline-block',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {isSelected && dayOrders.length > 0 && (
                    <span
                      style={{
                        fontSize: '0.55rem',
                        fontWeight: 900,
                        color: 'rgba(255,255,255,0.85)',
                        marginTop: 2,
                      }}
                    >
                      {dayOrders.length}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{ display: 'flex', gap: 16, marginTop: 16, padding: '0 4px', flexWrap: 'wrap' }}
          >
            {[
              { color: '#8B5CF6', label: 'Inquiry' },
              { color: '#D97706', label: 'Confirmed' },
              { color: '#EF4444', label: 'Baking' },
              { color: '#3B82F6', label: 'Ready' },
              { color: '#10B981', label: 'Delivered' },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: 'var(--text3)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    display: 'inline-block',
                  }}
                />
                {label}
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#D97706',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  border: '1.5px solid rgba(245,158,11,0.5)',
                  display: 'inline-block',
                }}
              />
              Busy / Prep
            </div>
          </div>
        </div>

        {/* Desktop Day Detail */}
        <div className="desktop-only">
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 24,
              padding: 24,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              minHeight: 400,
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={80} radius={18} />
                ))}
              </div>
            ) : (
              <DayDetail />
            )}
          </div>
        </div>
      </div>

      {/* Workload summary cards */}
      <div
        style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
      >
        {[
          {
            icon: Package,
            label: 'Active Orders',
            value: orders.filter(
              (o) => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase())
            ).length,
            color: '#B5606A',
            bg: 'rgba(181,96,106,0.1)',
          },
          {
            icon: ChefHat,
            label: 'Baking Now',
            value: orders.filter((o) => String(o.status).toLowerCase() === 'baking').length,
            color: '#EF4444',
            bg: 'rgba(239,68,68,0.1)',
          },
          {
            icon: Truck,
            label: 'Ready Today',
            value: (ordersByDate[todayStr()] || []).filter(
              (o) => String(o.status).toLowerCase() === 'ready'
            ).length,
            color: '#3B82F6',
            bg: 'rgba(59,130,246,0.1)',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div
            key={label}
            style={{
              background: 'white',
              borderRadius: 18,
              padding: '14px 12px',
              border: '1px solid rgba(74,59,50,0.05)',
              boxShadow: '0 2px 10px rgba(74,59,50,0.04)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
              }}
            >
              <Icon size={18} color={color} />
            </div>
            <div
              style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text)', lineHeight: 1 }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="mobile-only">
        <BottomSheet
          open={showSheet}
          onClose={() => setShowSheet(false)}
          title={friendlyDate(selectedDate)}
        >
          <div style={{ marginTop: 8 }}>
            {loading ? <Skeleton height={80} radius={18} /> : <DayDetail />}
          </div>
        </BottomSheet>
      </div>
      <AnimatedDemo moduleId="calendar" title="Plan Your Deliveries" scenes={calendarDemoScenes} />
    </motion.div>
  );
}
