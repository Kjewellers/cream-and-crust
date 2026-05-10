import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ShoppingBag,
  Clock,
  MapPin,
  ChevronRight as ChevronRightSmall,
  Cake
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders } from '../services/db';
import { formatDate, formatTime } from '../utils/date';
import { 
  BottomSheet, 
  EmptyState, 
  Skeleton, 
  PressButton 
} from '../components/iOS';
import { 
  listContainer, 
  listItem, 
  pageVariants, 
  cardTap 
} from '../utils/animations';

export default function Calendar() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper to check if two dates are same day
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Calendar logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, date: new Date(year, month, i) });
    }
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const ordersOnSelectedDate = orders.filter(o => {
    const d = o.deliveryDate || o.date || (o.createdAt && String(o.createdAt).split('T')[0]);
    return isSameDay(d, selectedDate);
  });

  const getOrdersForDay = (date) => {
    if (!date) return [];
    return orders.filter(o => {
      const d = o.deliveryDate || o.date || (o.createdAt && String(o.createdAt).split('T')[0]);
      return isSameDay(d, date);
    });
  };

  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    if (window.innerWidth < 960) {
      setShowMobileDetails(true);
    }
  };

  const renderOrderList = (list) => (
    <motion.div variants={listContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {list.length === 0 ? (
        <EmptyState 
          icon="🥧" 
          title="Clear Schedule" 
          subtitle={`No orders booked for ${selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`}
          action={() => navigate('/orders')}
          actionLabel="+ Create Order"
        />
      ) : (
        list.map(o => {
          const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
          const time = formatTime(o.deliveryTime || o.time || '10:00');
          const pName = o.product || (o.items && o.items[0]?.name) || 'Custom Order';
          
          return (
            <motion.div 
              key={o.id} 
              variants={listItem}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/orders')}
              style={{ 
                padding: '16px', 
                background: 'var(--bg2)', 
                borderRadius: 'var(--radius)', 
                boxShadow: 'var(--shadow-xs)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}
            >
              <div style={{ 
                width: 44, height: 44, borderRadius: 12, 
                background: 'var(--cream)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Cake size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{cName}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {pName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {time}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {o.type || 'Pickup'}</span>
                </div>
              </div>
              <ChevronRightSmall size={18} color="var(--text3)" />
            </motion.div>
          );
        })
      )}
    </motion.div>
  );

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="show" className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Calendar</h1>
          <p>Manage your baking schedule and delivery slots</p>
        </div>
        <PressButton className="btn btn-primary desktop-only" onClick={() => navigate('/orders')}>
          <Plus size={18} /> New Order
        </PressButton>
      </div>

      <div className="content-grid">
        {/* Calendar Card */}
        <motion.div variants={listItem} className="card" style={{ padding: '24px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 8px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>
              {monthName} {year}
            </h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <PressButton onClick={() => changeMonth(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={20} />
              </PressButton>
              <PressButton onClick={() => changeMonth(1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} />
              </PressButton>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {daysInMonth.map((d, i) => {
              const isSelected = d.date && isSameDay(d.date, selectedDate);
              const isToday = d.date && isSameDay(d.date, new Date());
              const dayOrders = getOrdersForDay(d.date);
              const hasOrders = dayOrders.length > 0;
              const isBusy = dayOrders.length >= 5;

              return (
                <motion.div 
                  key={i} 
                  whileTap={d.day ? { scale: 0.9 } : {}}
                  onClick={() => handleDateClick(d.date)}
                  style={{ 
                    aspectRatio: '1/1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14, 
                    position: 'relative',
                    cursor: d.day ? 'pointer' : 'default',
                    background: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-lt)' : 'transparent',
                    color: isSelected ? 'white' : isToday ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    fontSize: 15,
                    border: isBusy ? '1.5px solid var(--accent2)' : 'none'
                  }}
                >
                  {d.day}
                  {hasOrders && !isSelected && (
                    <div style={{ 
                      width: 4, height: 4, borderRadius: '50%', 
                      background: isBusy ? 'var(--accent2)' : 'var(--accent)', 
                      marginTop: 2 
                    }} />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 24, display: 'flex', gap: 16, padding: '0 8px', fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} /> 1-4 Orders
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <div style={{ width: 8, height: 8, borderRadius: 8, border: '1.5px solid var(--accent2)' }} /> Fully Booked
             </div>
          </div>
        </motion.div>

        {/* Selected Day Details — Desktop */}
        <motion.div variants={listItem} className="desktop-only">
           <div className="card" style={{ minHeight: 400 }}>
             <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>
               Deliveries on {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
             </h3>
             {loading ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {[...Array(3)].map((_, i) => <Skeleton key={i} height={70} radius={18} />)}
               </div>
             ) : renderOrderList(ordersOnSelectedDate)}
           </div>
        </motion.div>
      </div>

      {/* Mobile Details Bottom Sheet */}
      <div className="mobile-only">
        <BottomSheet 
          open={showMobileDetails} 
          onClose={() => setShowMobileDetails(false)}
          title={selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        >
          <div style={{ marginTop: 12 }}>
            {renderOrderList(ordersOnSelectedDate)}
          </div>
        </BottomSheet>
      </div>

      <PressButton className="fab mobile-only" onClick={() => navigate('/orders')}>
        <Plus size={22} />
      </PressButton>
    </motion.div>
  );
}
