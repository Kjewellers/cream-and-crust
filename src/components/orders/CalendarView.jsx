/**
 * CalendarView — mini calendar grid showing order dots per day.
 * Extracted from Orders.jsx for maintainability.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../iOS';
import { formatDate, formatTime, formatCurrency } from '../../utils/date';
import { safeDisplayValue } from '../../utils/crypto';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView({ orders, onOrderClick, onWhatsApp, onCustomerClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayString, setSelectedDayString] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const firstDayIndex = new Date(year, month, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthTotalDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`,
    });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: true,
      dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }
  const remaining = 42 - daysArray.length;
  for (let i = 1; i <= remaining; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }

  const selectedDayOrders = orders.filter((o) => {
    const oDate = o.date || (o.createdAt ? o.createdAt.split('T')[0] : '');
    return oDate === selectedDayString;
  });

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 24,
        padding: 20,
        border: '1px solid rgba(74, 59, 50, 0.05)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            color: 'var(--text)',
          }}
        >
          {MONTH_NAMES[month]} {year}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={prevMonth}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(74, 59, 50, 0.08)',
              background: 'white',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(74, 59, 50, 0.08)',
              background: 'white',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            →
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'var(--text3)',
              textTransform: 'uppercase',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {daysArray.map((cell, idx) => {
          const dayOrders = orders.filter((o) => {
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
                background: isToday ? 'var(--cream)' : cell.isCurrentMonth ? 'white' : 'var(--bg)',
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: dayOrders.length > 0 ? 'pointer' : 'default',
                opacity: cell.isCurrentMonth ? 1 : 0.4,
                boxShadow: isToday ? '0 0 0 2px var(--accent)' : 'none',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? 'var(--accent2)' : 'var(--text)',
                }}
              >
                {cell.day}
              </span>
              {dayOrders.length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                  {dayOrders.map((o, oIdx) => {
                    const statusStr = String(o.status || 'inquiry').toLowerCase();
                    const dotColor =
                      statusStr === 'delivered'
                        ? '#A8D8C8'
                        : statusStr === 'ready'
                          ? '#3B82F6'
                          : 'var(--accent)';
                    return (
                      <span
                        key={oIdx}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: dotColor,
                          display: 'inline-block',
                        }}
                        title={`${safeDisplayValue(o.customerName || o.customer, 'Customer')}: ${o.product}`}
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
          <div
            className="modal-overlay"
            onClick={() => setSelectedDayString(null)}
            style={{ zIndex: 1100 }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420, padding: 22 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>
                  Deliveries: {formatDate(selectedDayString)}
                </h3>
                <button className="btn-icon" onClick={() => setSelectedDayString(null)}>
                  ✕
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}
              >
                {selectedDayOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setSelectedDayString(null);
                      onOrderClick(o);
                    }}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 16,
                      padding: 14,
                      border: '1px solid rgba(74, 59, 50, 0.05)',
                      cursor: 'pointer',
                      transition: '0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>
                      {safeDisplayValue(o.customerName || o.customer, 'Customer')}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent2)' }}>
                        {formatCurrency(o.total || o.totalAmount)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text2)',
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      🎂 {o.product} {o.size ? `(${o.size})` : ''}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.7rem',
                      }}
                    >
                      <span style={{ color: 'var(--text3)' }}>
                        🕑 Delivery: {formatTime(o.time || o.deliveryTime)}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: 'white',
                          border: '1px solid rgba(181,96,106,0.2)',
                          color: 'var(--accent2)',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
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
