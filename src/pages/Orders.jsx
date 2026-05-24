import React, { useState, useEffect } from 'react';
import { Plus, Search, MessageCircle, Check, X, ChevronRight, Trash2, Clock, SlidersHorizontal, Edit2, MoreHorizontal, FileText, CheckCircle, Download, User, Calendar, MapPin, Phone, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, subscribeToCustomers, addOrderToDB, updateOrderStatusInDB, addCustomerToDB, deleteOrderFromDB } from '../services/db';
import { shareToWhatsApp } from '../services/whatsapp';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, formatCurrency, formatOrderNumber } from '../utils/date';
import { exportToCSV } from '../utils/exportUtils';
import html2canvas from 'html2canvas';
import {
  OrderRowSkeleton, EmptyState, showToast,
  SegmentedControl, SwipeRow, BottomSheet,
  PullToRefresh, shareContent, triggerHaptic,
  OnboardingTutorial
} from '../components/iOS';
import { listContainer, listItem, modalVariants, fabVariants } from '../utils/animations';

const statusFlow = ['inquiry', 'confirmed', 'baking', 'ready', 'delivered'];

const STATUS_COLORS = {
  inquiry:   { bg: 'rgba(194,176,224,0.18)', color: '#7050A8' },
  confirmed: { bg: 'rgba(212,160,80,0.15)',  color: '#A06820' },
  baking:    { bg: 'rgba(240,184,179,0.2)',  color: '#B04040' },
  ready:     { bg: 'rgba(168,216,200,0.25)', color: '#2E7A5A' },
  delivered: { bg: 'rgba(0,0,0,0.06)',       color: '#7A6555' },
};

function CalendarView({ orders, onOrderClick, onWhatsApp, onCustomerClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay(); 
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`
    });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: true,
      dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }
  const remaining = 42 - daysArray.length;
  for (let i = 1; i <= remaining; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [selectedDayString, setSelectedDayString] = useState(null);
  const selectedDayOrders = orders.filter(o => {
    const oDate = o.date || (o.createdAt ? o.createdAt.split('T')[0] : '');
    return oDate === selectedDayString;
  });

  return (
    <div style={{ background: 'white', borderRadius: 24, padding: 20, border: '1px solid rgba(74, 59, 50, 0.05)', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text)' }}>
          {monthNames[month]} {year}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(74, 59, 50, 0.08)', background: 'white', cursor: 'pointer', fontWeight: 800 }}>←</button>
          <button onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(74, 59, 50, 0.08)', background: 'white', cursor: 'pointer', fontWeight: 800 }}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', marginBottom: 10 }}>
        {weekDays.map(d => (
          <div key={d} style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {daysArray.map((cell, idx) => {
          const dayOrders = orders.filter(o => {
            const oDate = o.date || (o.createdAt ? o.createdAt.split('T')[0] : '');
            return oDate === cell.dateString;
          });

          const isToday = cell.dateString === new Date().toISOString().split('T')[0];

          return (
            <div
              key={idx}
              onClick={() => {
                if (dayOrders.length > 0) {
                  triggerHaptic('light');
                  setSelectedDayString(cell.dateString);
                }
              }}
              style={{
                aspectRatio: '1',
                borderRadius: 14,
                border: '1px solid rgba(74, 59, 50, 0.03)',
                background: isToday ? 'var(--cream)' : (cell.isCurrentMonth ? 'white' : 'var(--bg)'),
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: dayOrders.length > 0 ? 'pointer' : 'default',
                opacity: cell.isCurrentMonth ? 1 : 0.4,
                boxShadow: isToday ? '0 0 0 2px var(--accent)' : 'none',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent2)' : 'var(--text)' }}>
                {cell.day}
              </span>
              
              {dayOrders.length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                  {dayOrders.map((o, oIdx) => {
                    const statusStr = String(o.status || 'inquiry').toLowerCase();
                    const dotColor = statusStr === 'delivered' ? '#A8D8C8' : (statusStr === 'ready' ? '#3B82F6' : 'var(--accent)');
                    return (
                      <span 
                        key={oIdx} 
                        style={{ 
                          width: 6, height: 6, borderRadius: '50%', 
                          background: dotColor, display: 'inline-block' 
                        }} 
                        title={`${o.customerName || o.customer}: ${o.product}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDayString && (
          <div className="modal-overlay" onClick={() => setSelectedDayString(null)} style={{ zIndex: 1100 }}>
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 50, opacity: 0 }}
              className="modal" 
              onClick={e => e.stopPropagation()} 
              style={{ maxWidth: 420, padding: 22 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Deliveries: {formatDate(selectedDayString)}</h3>
                <button className="btn-icon" onClick={() => setSelectedDayString(null)}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
                {selectedDayOrders.map(o => (
                  <div 
                    key={o.id}
                    onClick={() => { setSelectedDayString(null); onOrderClick(o); }}
                    style={{ 
                      background: 'var(--bg)', borderRadius: 16, padding: 14, 
                      border: '1px solid rgba(74, 59, 50, 0.05)', cursor: 'pointer',
                      transition: '0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>
                        {o.customerName || o.customer}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent2)' }}>
                        {formatCurrency(o.total || o.totalAmount)}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>
                      🎂 {o.product} {o.size ? `(${o.size})` : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text3)' }}>🕑 Delivery: {formatTime(o.time || o.deliveryTime)}</span>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: 99, 
                        background: 'white', border: '1px solid rgba(181,96,106,0.2)',
                        color: 'var(--accent2)', fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status || 'inquiry').toLowerCase();
  const { bg, color } = STATUS_COLORS[s] || STATUS_COLORS.inquiry;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 600, letterSpacing: '0.01em',
      background: bg, color,
    }}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function OrderRow({ o, allOrders, onAdvance, onWhatsApp, onCustomerClick, onRapido, onOrderClick, onDelete }) {
  const cName = typeof o.customer === 'object'
    ? (o.customer?.name || 'Customer')
    : (o.customerName || o.customer || 'Customer');
  const cPhone = typeof o.customer === 'object' ? (o.customer?.phone || '') : (o.phone || '');
  const pName = o.product || (o.items && o.items[0]?.name) || 'Custom Order';
  const pSize = o.size || (o.items && o.items[0]?.size) || '';
  const dDate = formatDate(o.date || o.createdAt);
  const totalNum = Number(o.total) || Number(o.totalAmount) || 0;
  const advNum   = Number(o.advance) || 0;
  const isPaid   = advNum >= totalNum && totalNum > 0;
  const orderId  = formatOrderNumber(o, allOrders);
  const isDelivered = String(o.status).toLowerCase() === 'delivered';

  const costNum = Number(o.cost) || 0;
  const marginPercentage = (totalNum > 0 && costNum > 0)
    ? Math.round(((totalNum - costNum) / totalNum) * 100)
    : 0;

  return (
    <motion.tr
      variants={listItem}
      layout
      style={{ cursor: 'pointer' }}
      onClick={() => onOrderClick(o)}
    >
      <td>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', letterSpacing: '-0.01em' }}>{orderId}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>via {o.via || 'Direct'}</div>
      </td>
      <td>
        <div 
          onClick={(e) => { e.stopPropagation(); onCustomerClick(o); }}
          style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text)', borderBottom: '1px dashed var(--border)', display: 'inline-block' }}
        >
          {cName}
        </div>
        {cPhone && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{cPhone}</div>}
      </td>
      <td>
        <div style={{ fontSize: 14 }}>{pName}</div>
        {(o.flavor || pSize) && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{[o.flavor, pSize].filter(Boolean).join(' · ')}</div>}
      </td>
      <td>
        <div style={{ fontSize: 13 }}>{dDate}</div>
        {(o.time || o.type) && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{[o.time, o.type].filter(Boolean).join(' · ')}</div>}
      </td>
      <td><StatusBadge status={o.status} /></td>
      <td>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(totalNum)}</div>
        {marginPercentage > 0 && (
          <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#2E7A5A', background: 'rgba(46,122,90,0.08)', padding: '2px 6px', borderRadius: 6, display: 'inline-block', marginTop: 2 }}>
            📈 {marginPercentage}% Profit
          </div>
        )}
        <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600, color: isPaid ? '#2E7A5A' : 'var(--accent2)' }}>
          {isPaid ? '✓ Paid' : `${formatCurrency(advNum)} adv`}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isDelivered && (
            <motion.button whileTap={{ scale: 0.86 }} className="btn-icon" title="Next Status" onClick={(e) => { e.stopPropagation(); onAdvance(o); }}
              style={{ background: 'var(--accent)', color: 'white', width: 34, height: 34, borderRadius: 10 }}>
               <Check size={15} />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.86 }} className="btn-icon" title="WhatsApp" onClick={(e) => { e.stopPropagation(); onWhatsApp(o); }}
            style={{ color: '#25D366', width: 34, height: 34, borderRadius: 10 }}>
            <MessageCircle size={15} />
          </motion.button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <motion.button whileTap={{ scale: 0.86 }} className="btn-icon" title="Book Rapido" onClick={(e) => { e.stopPropagation(); onRapido(o); }}
              style={{ background: '#F9C935', color: '#000', width: 34, height: 34, borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
              🛵
            </motion.button>
            <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>Rapido</span>
          </div>
          <motion.button whileTap={{ scale: 0.86 }} className="btn-icon" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(o); }}
            style={{ color: '#D32F2F', width: 34, height: 34, borderRadius: 10, marginLeft: 6 }}>
            <Trash2 size={15} />
          </motion.button>
        </div>
      </td>
    </motion.tr>
  );
}

function MobileOrderCard({ o, allOrders, onAdvance, onWhatsApp, onCustomerClick, onRapido, onOrderClick, onDelete }) {
  const cName = typeof o.customer === 'object'
    ? (o.customer?.name || 'Customer')
    : (o.customerName || o.customer || 'Customer');
  const pName = o.product || (o.items && o.items[0]?.name) || 'Custom Order';
  const totalNum = Number(o.total) || Number(o.totalAmount) || 0;
  const advNum   = Number(o.advance) || 0;
  const isPaid   = advNum >= totalNum && totalNum > 0;
  const orderId  = formatOrderNumber(o, allOrders);
  const statusStr = String(o.status || 'inquiry').toLowerCase();
  const isDelivered = statusStr === 'delivered';
  const costNum = Number(o.cost) || 0;
  const marginPercentage = (totalNum > 0 && costNum > 0)
    ? Math.round(((totalNum - costNum) / totalNum) * 100)
    : 0;

  // Map status to progress index
  const stages = ['inquiry', 'confirmed', 'baking', 'ready', 'delivered'];
  const currentIndex = stages.indexOf(statusStr);

  let statusBg = 'rgba(139, 92, 246, 0.08)';
  let statusColor = '#8B5CF6';
  if (statusStr === 'confirmed') {
    statusBg = 'rgba(181, 96, 106, 0.08)';
    statusColor = 'var(--accent)';
  } else if (statusStr === 'baking') {
    statusBg = 'rgba(245, 158, 11, 0.08)';
    statusColor = '#D97706';
  } else if (statusStr === 'ready') {
    statusBg = 'rgba(59, 130, 246, 0.08)';
    statusColor = '#3B82F6';
  } else if (isDelivered) {
    statusBg = 'rgba(16, 185, 129, 0.08)';
    statusColor = '#16A34A';
  } else if (statusStr === 'cancelled') {
    statusBg = 'rgba(239, 68, 68, 0.08)';
    statusColor = '#EF4444';
  }

  return (
    <motion.div variants={listItem} layout style={{ marginBottom: 14 }}>
      <SwipeRow onWhatsApp={() => onWhatsApp(o)}>
        <div 
          style={{ 
            padding: '18px 16px', 
            background: 'white',
            borderRadius: 24,
            border: '1px solid rgba(74, 59, 50, 0.04)',
            boxShadow: '0 4px 16px rgba(74,59,50,0.012)',
            cursor: 'pointer' 
          }} 
          onClick={() => onOrderClick(o)}
        >
          {/* Header Row: Avatar + Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img 
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cName)}`}
                alt={cName}
                style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFF5EC', border: '1px solid rgba(181,96,106,0.1)' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 800, color: 'var(--text3)', fontSize: '0.68rem', letterSpacing: '0.02em' }}>#{orderId}</span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: statusBg,
                    color: statusColor,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase'
                  }}>
                    {statusStr}
                  </span>
                </div>
                <div 
                  onClick={(e) => { e.stopPropagation(); onCustomerClick(o); }}
                  style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--text)', marginTop: 2 }}
                >
                  {cName}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--text)' }}>{formatCurrency(totalNum)}</div>
              {marginPercentage > 0 && (
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#2E7A5A', background: 'rgba(46,122,90,0.08)', padding: '2px 6px', borderRadius: 6, display: 'inline-block', marginTop: 2 }}>
                  📈 {marginPercentage}% Profit
                </div>
              )}
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isPaid ? '#16A34A' : '#EF4444', marginTop: 3 }}>
                {isPaid ? 'Paid ✓' : `${formatCurrency(totalNum - advNum)} due`}
              </div>
            </div>
          </div>

          {/* Cake Flavour / Product detail */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text2)', fontWeight: 600, background: 'rgba(74,59,50,0.015)', padding: '8px 12px', borderRadius: 12, marginBottom: 16 }}>
            🎂 {pName}
          </div>

          {/* Dynamic Interactive Progress Timeline */}
          <div style={{ marginBottom: 16, padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', alignItems: 'center' }}>
              {/* Connector line behind stages */}
              <div style={{
                position: 'absolute',
                left: '2%',
                right: '2%',
                height: 3,
                background: 'rgba(74, 59, 50, 0.05)',
                zIndex: 1
              }} />
              <div style={{
                position: 'absolute',
                left: '2%',
                width: `${currentIndex >= 0 ? (currentIndex / 4) * 96 : 0}%`,
                height: 3,
                background: 'var(--accent)',
                zIndex: 1,
                transition: 'width 0.3s ease'
              }} />

              {stages.map((stage, idx) => {
                const isCompleted = idx <= currentIndex;
                const isCurrent = idx === currentIndex;
                
                return (
                  <div 
                    key={stage}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--accent)' : 'white',
                      border: isCompleted ? 'none' : '2px solid rgba(74, 59, 50, 0.15)',
                      zIndex: 2,
                      boxShadow: isCurrent ? '0 0 0 3px rgba(181, 96, 106, 0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    title={stage.toUpperCase()}
                  />
                );
              })}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.52rem', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <span>Inquiry</span>
              <span>Confirm</span>
              <span>Bake</span>
              <span>Ready</span>
              <span>Deliver</span>
            </div>
          </div>

          {/* Bottom Card details and Actions Pill bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingTop: 12,
            borderTop: '1px dashed rgba(74, 59, 50, 0.06)' 
          }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', fontWeight: 700 }}>
              {formatDate(o.date || o.createdAt)} · {formatTime(o.time || o.deliveryTime || '10:00')}
            </div>

            {/* Premium Rounded Action Pills row */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* WhatsApp */}
              <button 
                onClick={(e) => { e.stopPropagation(); onWhatsApp(o); }}
                style={{ 
                  width: 30, height: 30, borderRadius: '50%', 
                  background: '#25D366', color: 'white', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,211,102,0.15)'
                }}
                title="WhatsApp Client"
              >
                <MessageCircle size={13} strokeWidth={3} />
              </button>

              {/* Rapido */}
              <button 
                onClick={(e) => { e.stopPropagation(); onRapido(o); }}
                style={{ 
                  width: 30, height: 30, borderRadius: '50%', 
                  background: '#F9C935', color: '#000', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,201,53,0.15)'
                }}
                title="Rapido Scooter"
              >
                🛵
              </button>

              {/* Next status advance */}
              {!isDelivered && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAdvance(o); }}
                  style={{ 
                    width: 30, height: 30, borderRadius: '50%', 
                    background: 'var(--accent)', color: 'white', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(181,96,106,0.15)'
                  }}
                  title="Next Pipeline Stage"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              )}

              {/* Invoice Generation */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  triggerHaptic('light');
                  showToast('Generating invoice PDF...', 'info');
                  onOrderClick(o); 
                }}
                style={{ 
                  width: 30, height: 30, borderRadius: '50%', 
                  background: 'rgba(74, 59, 50, 0.05)', color: 'var(--text2)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Download Invoice"
              >
                <FileText size={13} strokeWidth={2.5} />
              </button>

              {/* Edit Order */}
              <button 
                onClick={(e) => { e.stopPropagation(); onOrderClick(o); }}
                style={{ 
                  width: 30, height: 30, borderRadius: '50%', 
                  background: 'rgba(181, 96, 106, 0.08)', color: 'var(--accent)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Edit Order Details"
              >
                <Edit2 size={12} strokeWidth={2.5} />
              </button>

              {/* Delete */}
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(o); }}
                style={{ 
                  width: 30, height: 30, borderRadius: '50%', 
                  background: 'rgba(211,47,47,0.06)', color: '#D32F2F', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Delete Order"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </SwipeRow>
    </motion.div>
  );
}

const emptyForm = { 
  customer: '', 
  phone: '', 
  product: '', 
  size: '1kg', 
  date: '', 
  time: '', 
  deliveryAddress: '', 
  mapsLink: '', 
  total: '', 
  advance: '', 
  cost: '',
  notes: '' 
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [generatedOrderCard, setGeneratedOrderCard] = useState(null);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState(null);
  const [showSwipeGuide, setShowSwipeGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSwipeBanner, setShowSwipeBanner] = useState(true);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const { currentUser, isCustomer, business } = useAuth();

  const handleDownloadCard = async () => {
    const cardElement = document.getElementById('order-card-capture');
    if (!cardElement) return;
    try {
      showToast('Generating card...', 'info', 1000);
      const canvas = await html2canvas(cardElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (navigator.share && navigator.canShare) {
        const file = new File([imageBlob], `Order_${generatedOrderCard?.orderId || 'Card'}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'Order Card' });
            return;
          } catch (e) { console.log('Share failed', e); }
        }
      }
      const url = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Order_${generatedOrderCard?.orderId || 'Card'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerHaptic('success');
      showToast('Card saved!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save card', 'error');
    }
  };

  const filtered = (orders || []).filter(o => {
    if (!o) return false;
    const searchLower = search.toLowerCase();
    const c = o.customer;
    const customerName = typeof c === 'object' ? (c?.name || '') : String(c || '');
    const matchesSearch = !search || customerName.toLowerCase().includes(searchLower) || String(o.orderId || o.id || '').toLowerCase().includes(searchLower) || (o.product || '').toLowerCase().includes(searchLower);
    const matchesFilter = filter === 'all' || String(o.status).toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const pipelineCounts = (orders || []).reduce((acc, o) => {
    if (o && o.status) {
      const s = String(o.status).toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
    }
    return acc;
  }, {});

  const statsData = [
    {
      label: 'Total Orders',
      value: orders.length,
      icon: Plus,
      bg: 'rgba(181, 96, 106, 0.1)',
      color: 'var(--accent)'
    },
    {
      label: 'Confirmed',
      value: (orders || []).filter(o => String(o.status).toLowerCase() === 'confirmed').length,
      icon: Check,
      bg: 'rgba(212, 160, 80, 0.1)',
      color: '#A06820'
    },
    {
      label: 'Baking / Ready',
      value: (orders || []).filter(o => ['baking', 'ready'].includes(String(o.status).toLowerCase())).length,
      icon: Search,
      bg: 'rgba(240, 184, 179, 0.15)',
      color: '#B04040'
    },
    {
      label: 'Delivered',
      value: (orders || []).filter(o => String(o.status).toLowerCase() === 'delivered').length,
      icon: MessageCircle,
      bg: 'rgba(46, 122, 90, 0.1)',
      color: '#2E7A5A'
    }
  ];

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('cc_onboarding_completed');
    if (!hasSeenOnboarding && !loading && orders.length > 0) {
      setShowOnboarding(true);
    }
  }, [loading, orders.length]);

  useEffect(() => {
    const userIdFilter = isCustomer ? currentUser?.uid : null;
    let unsubOrders = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    }, userIdFilter);
    let unsubCustomers = subscribeToCustomers((newCust) => {
      setCustomers(newCust || []);
    });
    return () => {
      unsubOrders();
      unsubCustomers();
    };
  }, [isCustomer, currentUser]);

  // Auto-fill logic
  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setForm(prev => {
      const next = { ...prev, phone: val };
      if (val.length >= 10) {
        const existing = customers.find(c => c.phone === val);
        if (existing) {
          next.customer = existing.name || prev.customer;
          next.deliveryAddress = existing.address || prev.deliveryAddress;
        }
      }
      return next;
    });
  };


  const handleDeleteOrder = async (o) => {
    if (window.confirm('Are you sure you want to delete this order? This cannot be undone.')) {
      try {
        await deleteOrderFromDB(o.id);
        triggerHaptic('success');
        showToast('Order deleted', 'success');
        if (generatedOrderCard?.id === o.id) setGeneratedOrderCard(null);
      } catch (err) {
        showToast('Failed to delete', 'error');
      }
    }
  };

  const updateStatus = async (o) => {
    const idx = statusFlow.indexOf(String(o.status).toLowerCase());
    if (idx < statusFlow.length - 1) {
      const next = statusFlow[idx + 1];
      await updateOrderStatusInDB(o.id, next);
      triggerHaptic('medium');
      showToast(`Order → ${next.charAt(0).toUpperCase() + next.slice(1)}`, 'success');

      // Auto-prompt WhatsApp dynamic messaging lifecycle
      const phone = typeof o.customer === 'object' ? o.customer?.phone : o.phone;
      if (phone) {
        const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
        const product = o.product || 'bakes';
        const sizeInfo = o.size ? ` (${o.size})` : '';
        let template = '';

        if (next === 'confirmed') {
          template = `Hi ${cName}! 🎂 Your order for "${product}"${sizeInfo} has been confirmed with ${business?.name || 'Cream & Crust'}. We'll start baking and keep you updated!`;
        } else if (next === 'baking') {
          template = `Hey ${cName}! 🧑‍🍳 Your order for "${product}"${sizeInfo} is now in the oven! Standard baking and decorating is in progress. Stay tuned! ✨`;
        } else if (next === 'ready') {
          template = `Yay ${cName}! 🎉 Your order for "${product}"${sizeInfo} is fresh out of the oven and ready for pickup/delivery! 🧁 Pickup location: ${business?.name || 'Cream & Crust Bakery'}. Let us know when you're arriving!`;
        } else if (next === 'delivered') {
          template = `Thank you ${cName}! ❤️ We hope you love your fresh "${product}"${sizeInfo}! Please share your feedback or tag us. Have a sweet day! 🥐🧁`;
        }

        if (template) {
          const msg = encodeURIComponent(template);
          setTimeout(() => {
            const confirmed = window.confirm(`Send status update WhatsApp to ${cName} (${next})?`);
            if (confirmed) window.open(`https://wa.me/91${phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
          }, 500);
        }
      }
    }
  };

  const handleWhatsApp = async (o) => {
    const cardElement = document.getElementById('order-card-capture');
    if (!cardElement) {
      shareToWhatsApp(o);
      showToast('Opening WhatsApp...', 'info', 2000);
      return;
    }
    
    try {
      showToast('Preparing card image...', 'info', 1500);
      triggerHaptic('light');

      // 1. Capture the element using html2canvas
      const canvas = await html2canvas(cardElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([imageBlob], `Order_${o.orderId || 'Card'}.png`, { type: 'image/png' });

      // 2. Try Web Share API (native share dialog - Android / iOS support files)
      if (navigator.share && navigator.canShare) {
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Order Card #${o.orderId || ''}`,
              text: `Cream & Crust order confirmation for ${o.customer || 'Valued Customer'} 🧁`
            });
            triggerHaptic('success');
            showToast('Shared successfully!', 'success');
            return;
          } catch (e) {
            console.log('Web Share failed', e);
          }
        }
      }

      // 3. Fallback: Copy image to clipboard so user can paste it in WhatsApp
      try {
        const item = new ClipboardItem({ 'image/png': imageBlob });
        await navigator.clipboard.write([item]);
        showToast('Image copied to clipboard! Opening WhatsApp... just paste it.', 'success', 4000);
        triggerHaptic('success');
      } catch (clipErr) {
        console.warn('Clipboard write failed', clipErr);
        showToast('Opening WhatsApp...', 'info', 2000);
      }

      // 4. Open WhatsApp
      const phoneNumber = (o.phone || o.customer?.phone || '').replace(/\D/g, '');
      const fullPhone = phoneNumber.length === 10 ? '91' + phoneNumber : phoneNumber;
      const encodedMsg = encodeURIComponent(`Hi! Here is your order confirmation from ${business?.name || 'Cream & Crust'}. (Please paste the order card image copied to your clipboard!) 🎂`);
      
      setTimeout(() => {
        window.open(`https://wa.me/${fullPhone}?text=${encodedMsg}`, '_blank');
      }, 1500);

    } catch (err) {
      console.error(err);
      shareToWhatsApp(o);
      showToast('Opening WhatsApp...', 'info', 2000);
    }
  };

  const handleRapidoBooking = async (order) => {
    if (!order.deliveryAddress) {
      return showToast('No delivery address provided!', 'error');
    }
    try {
      await navigator.clipboard.writeText(order.deliveryAddress);
      triggerHaptic('light');
      showToast('Address copied! Opening Rapido...', 'info', 2000);
    } catch(e) {
      triggerHaptic('error');
      showToast('Opening Rapido...', 'info', 2000);
    }
    // Opening the Rapido website will automatically launch the Rapido App on mobile devices if installed via Universal Links
    window.open('https://rapido.bike/', '_blank');
  };

  const openCustomerProfile = (order) => {
    const phoneToFind = typeof order.customer === 'object' ? order.customer?.phone : order.phone;
    const cust = customers.find(c => c.phone === phoneToFind);
    if (cust) {
      setSelectedCustomerProfile(cust);
    } else {
      setSelectedCustomerProfile({
        name: typeof order.customer === 'object' ? order.customer?.name : (order.customerName || order.customer),
        phone: typeof order.customer === 'object' ? order.customer?.phone : order.phone,
        address: order.deliveryAddress,
        totalOrders: 1,
        totalSpent: order.total || order.totalAmount
      });
    }
  };

  const addOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const totalAmount = Number(form.total) || 0;
      const advancePaid = Number(form.advance) || 0;
      const balanceDue = Math.max(0, totalAmount - advancePaid);
      
      const newOrder = {
        ...form,
        status: 'inquiry',
        advance: advancePaid,
        total: totalAmount,
        totalAmount: totalAmount, // for compatibility
        balanceDue: balanceDue,
        isPaid: balanceDue === 0,
        via: 'Direct',
        orderId: `CC-${String(orders.length + 101).padStart(3, '0')}`,
        userId: currentUser?.uid || null,
        createdAt: new Date().toISOString(),
      };
      
      const docId = await addOrderToDB(newOrder);
      const finalOrder = { id: docId, ...newOrder };

      // Add to customers if doesn't exist
      const existingCust = customers.find(c => c.phone === form.phone);
      if (!existingCust && form.phone && form.customer) {
        await addCustomerToDB({
          name: form.customer,
          phone: form.phone,
          address: form.deliveryAddress || '',
          lastOrder: new Date().toISOString()
        });
      }

      setShowModal(false);
      setForm(emptyForm);
      triggerHaptic('success');
      showToast('Order saved! Generating card... 🎂', 'success');
      
      // Show Order Card
      setTimeout(() => {
        setGeneratedOrderCard(finalOrder);
      }, 300);
      
    } catch (err) {
      showToast('Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const segOptions = [
    { value: 'all', label: 'All' },
    { value: 'inquiry', label: 'Inquiry' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'baking', label: 'Baking' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const modalForm = (
    <form onSubmit={addOrder}>
      <div className="form-grid">
        <div className="form-group full"><label className="form-label">Customer Name *</label><input required value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="e.g. Priya Sharma" /></div>
        <div className="form-group full"><label className="form-label">Phone Number *</label><input required value={form.phone} onChange={handlePhoneChange} placeholder="10-digit number" maxLength={10} type="tel" /></div>
        
        <div className="form-group full"><label className="form-label">Cake Flavour & Design *</label><textarea required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="Chocolate Truffle with floral design" rows={2} /></div>
        
        <div className="form-group full">
          <label className="form-label">Cake Weight *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['500gm', '1kg', '1.5kg', '2kg', '2kg+'].map(w => (
              <div 
                key={w} 
                onClick={() => setForm({ ...form, size: w })}
                style={{ 
                  padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: form.size === w ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: form.size === w ? 'var(--cream)' : 'transparent',
                  color: form.size === w ? 'var(--accent2)' : 'var(--text2)'
                }}
              >
                {w}
              </div>
            ))}
          </div>
        </div>

        <div className="form-group"><label className="form-label">Delivery Date *</label><input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Delivery Time *</label><input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
        
        <div className="form-group full"><label className="form-label">Delivery Address *</label><input required value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Full address" /></div>
        <div className="form-group full"><label className="form-label">📍 Google Maps Link (optional)</label><input value={form.mapsLink} onChange={e => setForm({ ...form, mapsLink: e.target.value })} placeholder="https://maps.app.goo.gl/..." type="url" /></div>

        <div className="form-group"><label className="form-label">Total Amount (₹) *</label><input type="number" required value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Advance Received (₹) *</label><input type="number" required value={form.advance} onChange={e => setForm({ ...form, advance: e.target.value })} placeholder="0" /></div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="full">
          <div className="form-group">
            <label className="form-label">Ingredient Cost (₹)</label>
            <input type="number" value={form.cost || ''} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="e.g. 500" />
          </div>
          <div className="form-group">
            <label className="form-label">Balance Due (₹)</label>
            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontWeight: 700, color: '#C4574A', height: 44, display: 'flex', alignItems: 'center' }}>
               ₹{Math.max(0, (Number(form.total) || 0) - (Number(form.advance) || 0)).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        
        <div className="form-group full"><label className="form-label">Notes (optional)</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any other details..." /></div>
      </div>
      <div style={{ marginTop: 20 }}>
        <motion.button whileTap={{ scale: 0.98 }} type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16 }} disabled={submitting}>
          {submitting ? 'Saving...' : '✅ Save Order'}
        </motion.button>
      </div>
    </form>
  );

          if (generatedOrderCard) {
    const o = generatedOrderCard;
    
    // Split notes into elegant bullet points
    const notesList = o.notes ? o.notes.split(/[\n,]+/).map(n => n.trim()).filter(Boolean) : [];
    
    // Choose template image (default chocolate cake or dynamically selected based on flavor)
    let cakePreviewImage = '/assets/templates/wedding_premium_hero_1778776255942.png';
    const productLower = (o.product || '').toLowerCase();
    if (productLower.includes('truffle') || productLower.includes('chocolate') || productLower.includes('dark')) {
      cakePreviewImage = '/assets/templates/product_truffle_1778776334868.png';
    } else if (productLower.includes('velvet') || productLower.includes('red')) {
      cakePreviewImage = '/assets/templates/product_red_velvet_1778776354239.png';
    } else if (productLower.includes('cheese') || productLower.includes('berry')) {
      cakePreviewImage = '/assets/templates/product_cheesecake_1778776370456.png';
    }

    const customerFirstName = (o.customer || o.customerName || 'Dear').split(' ')[0];
    const customMessage = o.notes ? o.notes : 'Thank you for choosing Cream & Crust!';

    return (
      <div style={{ padding: '16px 4px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fade-in 0.3s ease-out' }}>
        {/* Responsive viewport container */}
        <div style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px 0'
        }}>
          {/* Vertical luxury card capture block (Ensures mobile pixel-perfection on canvas captures) */}
          <div 
            id="order-card-capture" 
            style={{ 
              width: 420,
              minHeight: 740,
              height: 'auto',
              minWidth: 420,
              background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF5F2 100%)', 
              borderRadius: 28, 
              padding: '28px 22px 22px 22px', 
              boxShadow: '0 12px 40px rgba(181, 96, 106, 0.06)', 
              border: '1.5px solid #FFEBE5',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            {/* Crown Icon above title */}
            <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', justifyContent: 'center' }}>
              <svg width="22" height="16" viewBox="0 0 24 18" fill="#FFB300" stroke="#E65100" strokeWidth="1.5">
                <path d="M2,16 L22,16 L20,6 L15,11 L12,4 L9,11 L4,6 Z" />
                <circle cx="12" cy="3" r="1.2" fill="#D84315" />
                <circle cx="4" cy="5" r="1" fill="#D84315" />
                <circle cx="20" cy="5" r="1" fill="#D84315" />
              </svg>
            </div>

            {/* Top-Right Cherry Blossom SVG with Sparkles */}
            <svg style={{ position: 'absolute', top: 0, right: 0, width: 130, height: 130, pointerEvents: 'none', zIndex: 1 }} viewBox="0 0 100 100">
              {/* Branch */}
              <path d="M100,20 C85,25 75,40 70,55" fill="none" stroke="#D7CCC8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M90,22 C80,18 78,8 75,0" fill="none" stroke="#D7CCC8" strokeWidth="1.5" strokeLinecap="round" />
              {/* Big Flower 1 */}
              <g transform="translate(75, 40)">
                <circle cx="0" cy="0" r="4" fill="#FF8A80" />
                <path d="M0,-3 C-3,-8 3,-8 0,-3 Z M3,0 C8,-3 8,3 3,0 Z M0,3 C3,8 -3,8 0,3 Z M-3,0 C-8,3 -8,-3 -3,0 Z" fill="#FFCDD2" stroke="#FF8A80" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="1.5" fill="#FFE082" />
              </g>
              {/* Big Flower 2 */}
              <g transform="translate(88, 18)">
                <circle cx="0" cy="0" r="3.5" fill="#FF8A80" />
                <path d="M0,-2.5 C-2.5,-7 2.5,-7 0,-2.5 Z M2.5,0 C7,-2.5 7,2.5 2.5,0 Z M0,2.5 C2.5,7 -2.5,7 0,2.5 Z M-2.5,0 C-7,2.5 -7,-2.5 -2.5,0 Z" fill="#FFCDD2" stroke="#FF8A80" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="1.2" fill="#FFE082" />
              </g>
              {/* Sparkles */}
              <path d="M55,38 L56.5,41 L59.5,42 L56.5,43 L55,46 L53.5,43 L50.5,42 L53.5,41 Z" fill="#FFE082" />
              <path d="M72,70 L73,72 L75,72.5 L73,73 L72,75 L71,73 L69,72.5 L71,72 Z" fill="#FFE082" />
            </svg>

            {/* Header row with circular logo and company title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 2, marginTop: 4 }}>
              <div style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#FFF',
                border: '2px solid #FFF0ED',
                boxShadow: '0 4px 14px rgba(181, 96, 106, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden'
              }}>
                <img src={business?.logoUrl || '/logo.png'} alt="Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontFamily: '"Playfair Display", Georgia, serif', color: '#4A3B32', fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {business?.name || 'Cream & Crust Bakery'}
                </h2>
                <div style={{ color: '#E38A95', fontSize: 16, fontWeight: 'normal', fontFamily: '"Playball", cursive', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Made with love <span style={{ color: '#E38A95' }}>❤️</span>
                </div>
              </div>
            </div>

            {/* ORDER CONFIRMED Banner */}
            <div style={{
              background: '#EDF7ED',
              border: '1.5px solid #C8E6C9',
              borderRadius: 18,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(76,175,80,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                {/* Left leaf sprig */}
                <span style={{ fontSize: '14px', color: '#81C784', marginRight: -2 }}>🌿</span>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#2E7D32',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Check size={16} color="white" strokeWidth={3.5} />
                </div>
                {/* Right leaf sprig */}
                <span style={{ fontSize: '14px', color: '#81C784', marginLeft: -2, transform: 'scaleX(-1)', display: 'inline-block' }}>🌿</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1B5E20', fontSize: 14, fontWeight: 900, letterSpacing: '0.04em' }}>ORDER CONFIRMED 🎉</h3>
                <div style={{ color: '#2E7D32', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  We're excited to bake your celebration! 🎂
                </div>
              </div>
              {/* Green Sparkles */}
              <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: '#81C784', opacity: 0.8 }}>
                <path d="M12,2 L14,8 L20,10 L14,12 L12,18 L10,12 L4,10 L10,8 Z" />
              </svg>
            </div>

            {/* Main Product & Delivery Details white block */}
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: '16px',
              border: '1.5px solid rgba(181, 96, 106, 0.08)',
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 4px 16px rgba(181, 96, 106, 0.015)',
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: 16,
              alignItems: 'center'
            }}>
              {/* Product Image left */}
              <div style={{
                width: 140, height: 140, borderRadius: 14, overflow: 'hidden',
                background: '#FFF5F5', border: '1px solid #FFEBE5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}>
                <img
                  src={cakePreviewImage}
                  alt="Product"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Heart Ribbon Badge on top-left of image */}
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1.5px solid #FFCDD2',
                  boxShadow: '0 2px 6px rgba(181, 96, 106, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#E38A95'
                }}>
                  ❤️
                </div>
              </div>

              {/* Delivery info right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: '#FFF0EE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '13px' }}>🎂</span>
                  </div>
                  <span style={{ color: '#4A3B32', fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 900 }}>
                    {o.product || 'Chocolate Cake'}
                  </span>
                  <span style={{
                    background: '#FFF0EE', color: '#B5606A', fontSize: 10.5, fontWeight: 800,
                    padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    ⚖️ {o.size || '1kg'}
                  </span>
                </div>

                <div style={{ borderTop: '1px dashed rgba(181, 96, 106, 0.12)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Row 1: Delivery Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                    <span style={{ color: '#9E8E85', fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="#B5606A" strokeWidth={2.5} /> Delivery Date
                    </span>
                    <span style={{ color: '#4A3B32', fontWeight: 800 }}>{formatDate(o.date)}</span>
                  </div>
                  {/* Row 2: Delivery Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                    <span style={{ color: '#9E8E85', fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="#B5606A" strokeWidth={2.5} /> Delivery Time
                    </span>
                    <span style={{ color: '#4A3B32', fontWeight: 800 }}>{formatTime(o.time) || '3:40 PM'}</span>
                  </div>
                  {/* Row 3: Delivery Address */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                    <span style={{ color: '#9E8E85', fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} color="#B5606A" strokeWidth={2.5} /> Delivery Address
                    </span>
                    <span style={{ color: '#4A3B32', fontWeight: 800, maxWidth: '60%', textAlign: 'right', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={o.deliveryAddress || 'Pickup'}>
                      {o.deliveryAddress || 'Pickup'}
                    </span>
                  </div>
                  {/* Row 4: Customer Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                    <span style={{ color: '#9E8E85', fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} color="#B5606A" strokeWidth={2.5} /> Customer Name
                    </span>
                    <span style={{ color: '#4A3B32', fontWeight: 800 }}>
                      {typeof o.customer === 'object' ? (o.customer?.name || '') : String(o.customer || o.customerName || 'Valued Customer')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: '14px 16px',
              border: '1.5px solid rgba(181, 96, 106, 0.08)',
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 4px 16px rgba(181, 96, 106, 0.015)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 'bold', color: '#4A3B32', marginBottom: 12 }}>
                <span style={{ fontSize: '14px' }}>💳</span>
                <span>Payment Summary</span>
                {/* Tiny pink sparkles */}
                <span style={{ color: '#E38A95', fontSize: '11px', marginLeft: 4 }}>✨</span>
              </div>

              {/* 3 cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {/* Total Card */}
                <div style={{
                  background: '#FDFDFD',
                  border: '1px solid rgba(74, 59, 50, 0.08)',
                  borderRadius: 12,
                  padding: '10px 6px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 85
                }}>
                  <div>
                    <div style={{ fontSize: '8px', color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Amount</div>
                    <div style={{ fontSize: '13px', color: '#2E7D32', fontWeight: 900, marginTop: 4 }}>{formatCurrency(o.total)}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '10px' }}>🛍️</span>
                  </div>
                </div>

                {/* Paid Card */}
                <div style={{
                  background: '#EDF7ED',
                  border: '1px solid #C8E6C9',
                  borderRadius: 12,
                  padding: '10px 6px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 85
                }}>
                  <div>
                    <div style={{ fontSize: '8px', color: '#2E7D32', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Amount Paid</div>
                    <div style={{ fontSize: '13px', color: '#2E7D32', fontWeight: 900, marginTop: 4 }}>{formatCurrency(o.advance)}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                    <Check size={9} color="white" strokeWidth={4} />
                  </div>
                </div>

                {/* Due Card */}
                <div style={{
                  background: '#FFF0EE',
                  border: '1px solid #FFCDD2',
                  borderRadius: 12,
                  padding: '10px 6px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 85
                }}>
                  <div>
                    <div style={{ fontSize: '8px', color: '#B5606A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Remaining Due</div>
                    <div style={{ fontSize: '13px', color: '#C2185B', fontWeight: 900, marginTop: 4 }}>
                      {formatCurrency(Math.max(0, (o.total || 0) - (o.advance || 0)))}
                    </div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FFF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C2185B" strokeWidth="3">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Customizations horizontal pill bar */}
            <div style={{
              background: '#FFF0EE',
              borderRadius: 14,
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10.5px',
              fontWeight: 800,
              color: '#B5606A',
              position: 'relative',
              zIndex: 2,
              border: '1px solid #FFCDD2'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                🌿 Eggless
              </span>
              <span style={{ color: '#FFCDD2' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                🎉 Custom Theme
              </span>
              <span style={{ color: '#FFCDD2' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                🕯️ 1 Candle
              </span>
              <span style={{ color: '#FFCDD2' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                🎁 Special Care
              </span>
            </div>

            {/* Bottom Thank You section */}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, borderTop: '1px dashed rgba(181, 96, 106, 0.15)', paddingTop: 12 }}>
              {/* Left and right gold sparkles */}
              <div style={{ position: 'absolute', left: 20, top: 12, color: '#FFE082', fontSize: 14 }}>✨</div>
              <div style={{ position: 'absolute', right: 20, top: 12, color: '#FFE082', fontSize: 14 }}>✨</div>

              <div style={{ color: '#E38A95', fontSize: 20, fontWeight: 'normal', fontFamily: '"Playball", cursive' }}>
                Thank you! <span style={{ color: '#E38A95' }}>❤️</span>
              </div>
              <div style={{ color: '#9E8E85', fontSize: 14, fontWeight: 'normal', fontFamily: '"Playball", cursive', fontStyle: 'italic', marginTop: 2 }}>
                Thank you for choosing
              </div>
              <div style={{ color: '#4A3B32', fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 900, marginTop: 2, letterSpacing: '0.02em' }}>
                {business?.name || 'Cream & Crust Bakery'} <span style={{ color: '#E38A95' }}>❤️</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ color: '#F5C6C6', fontSize: '11px', transform: 'scaleX(-1)', display: 'inline-block' }}>🌿</span>
                <span style={{ color: '#D47A85', fontSize: '13px' }}>❤️</span>
                <span style={{ color: '#F5C6C6', fontSize: '11px' }}>🌿</span>
              </div>

              {/* Watermark text requested by user */}
              <div style={{ fontSize: '8px', color: 'rgba(158, 142, 133, 0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 14 }}>
                Generated via Cream & Crust ERP App
              </div>
            </div>

          </div>
        </div>

        {/* Real Active Utility UI Buttons (Invisible to canvas screenshot capture) */}
        <div data-html2canvas-ignore="true" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, width: '100%', maxWidth: 380 }}>
          <button className="btn btn-primary" onClick={() => handleWhatsApp(o)} style={{ display: 'flex', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', border: 'none', padding: '12px 14px', borderRadius: 12, fontWeight: 800 }}>
            <MessageCircle size={18} /> Share Order on WhatsApp
          </button>
          {o.deliveryAddress && (
            <button className="btn btn-primary" onClick={() => handleRapidoBooking(o)} style={{ display: 'flex', justifyContent: 'center', gap: 8, background: '#F9C935', color: '#000', border: 'none', padding: '12px 14px', borderRadius: 12, fontWeight: 800 }}>
              🛵 Book Rapido Delivery
            </button>
          )}
          <button className="btn btn-outline" onClick={handleDownloadCard} style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 14px', borderRadius: 12, fontWeight: 800 }}>
            📥 Save Card to Device
          </button>
          <button className="btn btn-outline" onClick={() => setGeneratedOrderCard(null)} style={{ display: 'flex', justifyContent: 'center', gap: 8, border: 'none', color: 'var(--text2)', padding: '12px 14px', fontWeight: 800 }}>
            👁️ Close Card & View All Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text)', margin: 0 }}>Orders</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.78rem', marginTop: 2, fontWeight: 700, letterSpacing: '-0.01em' }}>Track every celebration beautifully ✨</p>
        </div>
        
        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mobile Header Search Button */}
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowHeaderSearch(!showHeaderSearch);
            }}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'white', border: '1px solid rgba(74, 59, 50, 0.04)',
              boxShadow: '0 2px 8px rgba(74,59,50,0.02)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: showHeaderSearch ? 'var(--accent)' : 'var(--text2)'
            }}
          >
            <Search size={18} strokeWidth={2.5} />
          </button>

          {/* Settings / Filter Slider */}
          <button 
            onClick={() => {
              triggerHaptic('light');
              showToast('Filters panel opened', 'info');
            }}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'white', border: '1px solid rgba(74, 59, 50, 0.04)',
              boxShadow: '0 2px 8px rgba(74,59,50,0.02)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text2)'
            }}
          >
            <SlidersHorizontal size={17} strokeWidth={2.5} />
          </button>

          <button className="btn btn-outline desktop-only" onClick={() => exportToCSV(orders, 'orders_export')} style={{ borderRadius: 12, height: 40 }}>
            <Download size={18} /> Export
          </button>
          
          <button className="btn btn-primary desktop-only" onClick={() => { setForm(emptyForm); setShowModal(true); }} style={{ borderRadius: 12, height: 40 }}>
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Dynamic Inline Search Container */}
      <AnimatePresence>
        {showHeaderSearch && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
              <input
                placeholder="Search orders, clients, flavors…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{ 
                  paddingLeft: 40,
                  borderRadius: 16,
                  border: '1px solid rgba(74, 59, 50, 0.08)',
                  background: 'white',
                  height: 40,
                  fontSize: '0.86rem'
                }}
              />
              <button 
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 800 }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2x2 Metrics Grid (Responsive: 2x2 on Mobile, 1x4 on Desktop) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 12, 
        marginBottom: 20 
      }}>
        {statsData.map((stat, i) => (
          <div 
            key={i} 
            style={{
              background: 'white',
              borderRadius: 20,
              padding: 16,
              border: '1px solid rgba(74, 59, 50, 0.05)',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: stat.bg,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <stat.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)', marginTop: 2, letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Closeable Swipe Actions Banner */}
      <AnimatePresence>
        {showSwipeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: '#FFF5EC',
              border: '1px solid rgba(181, 96, 106, 0.12)',
              borderRadius: 20,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(181,96,106,0.01)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '18px' }}>👉</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text2)' }}>
                  Swipe right for quick actions. WhatsApp, Rapido, Invoice & more
                </span>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowSwipeBanner(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Pipeline Node Progress Tracker */}
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '20px 16px',
        border: '1px solid rgba(74, 59, 50, 0.05)',
        boxShadow: 'var(--shadow-xs)',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} color="var(--accent)" /> Order Pipeline Stages
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          {/* Connector Line behind nodes */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: '8%',
            right: '8%',
            height: 2,
            background: 'rgba(74, 59, 50, 0.06)',
            zIndex: 1
          }} />

          {statusFlow.map((step, idx) => {
            const count = pipelineCounts[step] || 0;
            const isCurrentFilter = filter === step;
            const hasOrders = count > 0;
            
            let nodeBg = 'white';
            let nodeBorder = '2px solid rgba(74, 59, 50, 0.08)';
            let textColor = 'var(--text3)';

            if (isCurrentFilter) {
              nodeBg = 'var(--accent)';
              nodeBorder = '2px solid var(--accent)';
              textColor = 'var(--accent)';
            } else if (hasOrders) {
              nodeBg = 'var(--cream)';
              nodeBorder = '2px solid #E8B4BB'; // peach border
              textColor = 'var(--text)';
            }

            return (
              <div 
                key={step} 
                onClick={() => {
                  triggerHaptic('light');
                  setFilter(isCurrentFilter ? 'all' : step);
                }}
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  zIndex: 2,
                  position: 'relative'
                }}
              >
                {/* Node Circle */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: nodeBg,
                  border: nodeBorder,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  boxShadow: isCurrentFilter ? '0 4px 12px rgba(181, 96, 106, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}>
                  {/* Count Badge inside node */}
                  <span style={{ 
                    color: isCurrentFilter ? 'white' : (hasOrders ? 'var(--accent)' : 'rgba(74, 59, 50, 0.4)'), 
                    fontSize: '0.82rem',
                    fontWeight: 800
                  }}>
                    {count}
                  </span>
                </div>
                
                {/* Label */}
                <span style={{ 
                  fontSize: '0.66rem', 
                  fontWeight: isCurrentFilter || hasOrders ? 800 : 700, 
                  color: isCurrentFilter ? 'var(--accent)' : (hasOrders ? 'var(--text)' : 'var(--text3)'),
                  marginTop: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  textAlign: 'center'
                }}>
                  {step === 'inquiry' ? 'Inquiry' : 
                   step === 'confirmed' ? 'Confirm' : 
                   step === 'baking' ? 'Bake' : 
                   step === 'ready' ? 'Ready' : 'Deliver'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle Switch */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text2)', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
          {viewMode === 'list' ? 'Order Directory' : 'Delivery Calendar'}
        </div>
        <div style={{ background: 'rgba(74, 59, 50, 0.04)', padding: 3, borderRadius: 12, display: 'inline-flex', gap: 4 }}>
          <button 
            onClick={() => { triggerHaptic('light'); setViewMode('list'); }}
            style={{
              padding: '6px 14px', borderRadius: 9, fontSize: '0.76rem', fontWeight: 800, border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? 'white' : 'transparent',
              color: viewMode === 'list' ? 'var(--text)' : 'var(--text3)',
              boxShadow: viewMode === 'list' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: '0.15s'
            }}
          >
            📋 List
          </button>
          <button 
            onClick={() => { triggerHaptic('light'); setViewMode('calendar'); }}
            style={{
              padding: '6px 14px', borderRadius: 9, fontSize: '0.76rem', fontWeight: 800, border: 'none', cursor: 'pointer',
              background: viewMode === 'calendar' ? 'white' : 'transparent',
              color: viewMode === 'calendar' ? 'var(--text)' : 'var(--text3)',
              boxShadow: viewMode === 'calendar' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: '0.15s'
            }}
          >
            📅 Calendar
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--accent)' : 'var(--text3)' }} />
          <input
            placeholder="Search orders, customers, products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ 
              paddingLeft: 42,
              borderRadius: 16,
              border: '1px solid rgba(74, 59, 50, 0.08)',
              background: 'white',
              height: 44,
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Scrolling Filter Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, margin: '0 -16px', paddingLeft: 16, paddingRight: 16 }} className="hide-scrollbar">
          {segOptions.map(opt => {
            const isActive = filter === opt.value;
            const count = opt.value === 'all' 
              ? orders.length 
              : orders.filter(o => String(o.status || 'inquiry').toLowerCase() === opt.value).length;
            
            return (
              <button
                key={opt.value}
                onClick={() => {
                  triggerHaptic('light');
                  setFilter(opt.value);
                }}
                style={{
                  padding: '6px 16px', 
                  borderRadius: 99, 
                  fontSize: '0.78rem', 
                  fontWeight: 800,
                  cursor: 'pointer', 
                  whiteSpace: 'nowrap',
                  background: isActive ? 'var(--accent)' : 'white',
                  color: isActive ? 'white' : 'var(--text2)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid rgba(74, 59, 50, 0.06)',
                  boxShadow: isActive ? '0 4px 12px rgba(181, 96, 106, 0.15)' : '0 2px 4px rgba(74, 59, 50, 0.01)',
                  transition: 'all 0.2s ease'
                }}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView 
          orders={filtered} 
          onOrderClick={setGeneratedOrderCard} 
          onWhatsApp={handleWhatsApp} 
          onCustomerClick={openCustomerProfile} 
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="card desktop-only" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(74, 59, 50, 0.05)', boxShadow: 'var(--shadow-xs)' }}>
            {loading ? (
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center' }}>
                <span style={{ fontSize: '3.5rem', marginBottom: 16, display: 'inline-block', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>🎂</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em' }}>No orders yet</h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text3)', maxWidth: 320, lineHeight: 1.6, marginBottom: 24, fontWeight: 500 }}>
                  Start tracking celebrations beautifully. Create your first order manually or load a complete set of mock orders instantly.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowModal(true)}
                    style={{
                      padding: '12px 24px', background: 'var(--accent)', color: 'white',
                      borderRadius: 14, fontWeight: 800, fontSize: '0.86rem',
                      border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(181,96,106,0.2)'
                    }}
                  >
                    + New Order
                  </motion.button>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Order</th><th>Customer</th><th>Product</th>
                      <th>Delivery</th><th>Status</th><th>Payment</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => (
                      <OrderRow key={o.id} o={o} allOrders={orders} onAdvance={updateStatus} onWhatsApp={handleWhatsApp} onRapido={handleRapidoBooking} onCustomerClick={openCustomerProfile} onOrderClick={setGeneratedOrderCard} onDelete={handleDeleteOrder} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only">
            {loading ? (
              [...Array(4)].map((_, i) => <OrderRowSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: 'white', borderRadius: 24, border: '1px solid rgba(74, 59, 50, 0.04)', boxShadow: '0 4px 16px rgba(74,59,50,0.012)' }}>
                <span style={{ fontSize: '3rem', marginBottom: 12, display: 'inline-block', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>🎂</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>No orders yet</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text3)', maxWidth: 260, lineHeight: 1.5, marginBottom: 20, fontWeight: 500 }}>
                  Add orders manually or tap below to seed your workspace with live demo orders.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowModal(true)}
                    style={{
                      width: '100%', padding: '12px', background: 'var(--accent)', color: 'white',
                      borderRadius: 14, fontWeight: 800, fontSize: '0.84rem',
                      border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(181,96,106,0.15)'
                    }}
                  >
                    + New Order
                  </motion.button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((o) => (
                  <MobileOrderCard key={o.id} o={o} allOrders={orders} onAdvance={updateStatus} onWhatsApp={handleWhatsApp} onRapido={handleRapidoBooking} onCustomerClick={openCustomerProfile} onOrderClick={setGeneratedOrderCard} onDelete={handleDeleteOrder} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <motion.button
        variants={fabVariants}
        initial="hidden"
        animate="show"
        whileTap={{ scale: 0.88 }}
        className="fab"
        onClick={() => { setForm(emptyForm); setShowModal(true); }}
      >
        <Plus size={22} />
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay desktop-only" onClick={() => setShowModal(false)}>
            <motion.div variants={modalVariants} initial="hidden" animate="show" exit="exit" className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <h2>New Order</h2>
                <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              {modalForm}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mobile-only">
        <BottomSheet open={showModal} onClose={() => setShowModal(false)} title="New Order">
          {modalForm}
        </BottomSheet>
      </div>

      <AnimatePresence>
        {selectedCustomerProfile && (
          <div className="modal-overlay" onClick={() => setSelectedCustomerProfile(null)} style={{ zIndex: 1100 }}>
            <motion.div variants={modalVariants} initial="hidden" animate="show" exit="exit" className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>Customer Profile</h3>
                <button className="btn-icon" onClick={() => setSelectedCustomerProfile(null)}><X size={18} /></button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                  {selectedCustomerProfile.name?.charAt(0)?.toUpperCase() || '👤'}
                </div>
                <h2 style={{ margin: '0 0 4px 0' }}>{selectedCustomerProfile.name}</h2>
                <div style={{ color: 'var(--text3)' }}>{selectedCustomerProfile.phone}</div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>SAVED ADDRESS</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomerProfile.address || 'No address saved'}</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: 'var(--cream)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>TOTAL ORDERS</div>
                  <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent2)' }}>{selectedCustomerProfile.totalOrders || 1}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(46,122,90,0.1)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>TOTAL SPENT</div>
                  <div style={{ fontWeight: 700, fontSize: 24, color: '#2E7A5A' }}>₹{Math.round(selectedCustomerProfile.totalSpent || 0)}</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
