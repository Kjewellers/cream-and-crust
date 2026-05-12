import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Award, CalendarDays, Lock, Loader2, 
  PieChart, TrendingDown, Target, Info, ChevronRight, Zap, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, subscribeToExpenses } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/date';
import { calculateTotalRevenue } from '../utils/finance';
import { Skeleton, EmptyState, triggerHaptic } from '../components/iOS';

export default function Analytics() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverDay, setHoverDay] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const ordersUnsub = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    }, currentUser.uid);

    const expensesUnsub = subscribeToExpenses((newExp) => {
      setExpenses(newExp || []);
    }, currentUser.uid);

    return () => {
      ordersUnsub();
      expensesUnsub();
    };
  }, [currentUser]);

  // --- Calculations ---
  const committedOrders = useMemo(() => orders.filter(o => {
    const status = String(o.status || '').toLowerCase();
    return status !== 'inquiry' && status !== 'cancelled';
  }), [orders]);

  const totalRevenue = useMemo(() => calculateTotalRevenue(committedOrders), [committedOrders]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Top Products Logic
  const topProducts = useMemo(() => {
    const counts = {};
    committedOrders.forEach(o => {
      const p = o.product || o.cakeFlavour || 'Custom';
      counts[p] = (counts[p] || 0) + (Number(o.total || 0));
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [committedOrders]);

  const last7Days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dStr = d.toISOString().split('T')[0];
      const dayOrders = committedOrders.filter(o => (o.deliveryDate || o.date || o.createdAt?.split('T')[0]) === dStr);
      const amount = dayOrders.reduce((sum, o) => sum + (Number(o.total || o.totalAmount) || 0), 0);
      return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), amount, date: dStr };
    });
  }, [committedOrders]);

  const maxRev = Math.max(...last7Days.map(d => d.amount), 1);

  if (loading) return (
    <div style={{ padding: 20 }}>
      <Skeleton height={40} width={250} style={{ marginBottom: 32 }} />
      <div className="stats-grid">
        {[...Array(4)].map((_, i) => <Skeleton key={i} height={140} radius={20} />)}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', marginBottom: 8 }}>
          <Zap size={18} fill="var(--accent)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Business Intelligence</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Performance Hub</h1>
        <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>Data-driven insights for your bakery</p>
      </div>

      {/* Main Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card green">
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-change" style={{ color: '#2E7A5A' }}>{committedOrders.length} confirmed orders</div>
        </div>
        <div className="stat-card pink">
          <div className="stat-icon pink"><TrendingDown size={20} /></div>
          <div className="stat-label">Expenses</div>
          <div className="stat-value">{formatCurrency(totalExpenses)}</div>
          <div className="stat-change" style={{ color: '#B04040' }}>{expenses.length} records</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon orange"><Award size={20} /></div>
          <div className="stat-label">Net Profit</div>
          <div className="stat-value">{formatCurrency(netProfit)}</div>
          <div className="stat-change" style={{ fontWeight: 800 }}>{margin}% Profit Margin</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><Target size={20} /></div>
          <div className="stat-label">Efficiency Score</div>
          <div className="stat-value">{Math.min(100, Math.round((netProfit / (totalExpenses || 1)) * 50))}%</div>
          <div className="stat-change">Profit vs Expense ratio</div>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Revenue Trends</h3>
              <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>Earnings over the last 7 days</p>
            </div>
            <div className="badge confirmed" style={{ fontSize: '0.75rem' }}>Weekly</div>
          </div>

          {totalRevenue === 0 ? (
            <EmptyState icon="📊" title="No revenue recorded" subtitle="Charts will appear here once you fulfill orders." />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 14, position: 'relative' }}>
              {last7Days.map((day, i) => (
                <div 
                  key={day.day} 
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%' }}
                  onMouseEnter={() => { setHoverDay(day); triggerHaptic('light'); }}
                  onMouseLeave={() => setHoverDay(null)}
                >
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.amount / maxRev) * 100 || 5}%` }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100, delay: i * 0.05 }}
                      style={{ 
                        width: '100%', 
                        background: i === 6 ? 'linear-gradient(to top, var(--accent), #D4714A)' : 'linear-gradient(to top, var(--accent-lt), var(--cream))', 
                        borderRadius: '10px 10px 4px 4px',
                        boxShadow: i === 6 ? '0 4px 12px rgba(212,113,74,0.3)' : 'none'
                      }} 
                    />
                    <AnimatePresence>
                      {hoverDay?.date === day.date && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: -40 }} exit={{ opacity: 0 }}
                          style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, zIndex: 10, whiteSpace: 'nowrap' }}
                        >
                          {formatCurrency(day.amount)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase' }}>{day.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 24 }}>Top Performance</h3>
          {topProducts.length === 0 ? (
            <EmptyState icon="🍰" title="No sales data" subtitle="Best selling products will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {topProducts.map(([name, val], i) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--cream)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                        {i + 1}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{formatCurrency(val)}</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(val / topProducts[0][1]) * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                      style={{ height: '100%', background: 'var(--accent)', borderRadius: 4 }} 
                    />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: 16, background: 'rgba(212,113,74,0.05)', borderRadius: 16, border: '1px dashed var(--accent-lt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 4 }}>
                  <Star size={14} fill="var(--accent)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>BEST SELLER</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{topProducts[0][0]}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Generates {Math.round((topProducts[0][1] / (totalRevenue || 1)) * 100)}% of your revenue.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="card" style={{ marginTop: 24, padding: 32 }}>
         <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 24 }}>Expense Optimization</h3>
         {expenses.length === 0 ? (
            <EmptyState icon="💸" title="No expense records" subtitle="Categorize your spending to optimize margins." />
         ) : (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
             {['Ingredients', 'Packaging', 'Marketing', 'Rent', 'Staff', 'Other'].map(cat => {
                const catTotal = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
                if (catTotal === 0) return null;
                const perc = Math.round((catTotal / totalExpenses) * 100);
                return (
                  <div key={cat} className="card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: 20 }}>
                    <div style={{ color: 'var(--text3)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>{cat}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatCurrency(catTotal)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                       <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                         <div style={{ width: `${perc}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                       </div>
                       <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)' }}>{perc}%</span>
                    </div>
                  </div>
                );
             })}
           </div>
         )}
      </div>
    </motion.div>
  );
}

