import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Award, CalendarDays, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeToOrders } from '../services/db';
import { formatCurrency } from '../utils/date';
import { Skeleton } from '../components/iOS';

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <Skeleton height={40} width={300} radius={8} />
        <Skeleton height={20} width={200} radius={4} style={{ marginTop: 8 }} />
      </div>
      <div className="stats-grid" style={{ marginTop: 24 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} height={120} radius={12} />)}
      </div>
    </div>
  );

  // Real Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => {
    const d = o.deliveryDate || o.date || (o.createdAt && String(o.createdAt).split('T')[0]);
    return d === todayStr;
  });
  
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingOrders = orders.filter(o => o.status !== 'delivered');

  const stats = [
    { 
      label: "Today's Orders", 
      value: todayOrders.length, 
      change: 'Real-time', 
      icon: CalendarDays, 
      color: 'green' 
    },
    { 
      label: "Today's Revenue", 
      value: formatCurrency(todayRevenue), 
      change: 'Aggregated', 
      icon: TrendingUp, 
      color: 'pink' 
    },
    { 
      label: "Total Revenue", 
      value: formatCurrency(totalRevenue), 
      change: 'Gross volume', 
      icon: Award, 
      color: 'orange' 
    },
    { 
      label: "Open Orders", 
      value: pendingOrders.length, 
      change: 'Action required', 
      icon: BarChart3, 
      color: 'purple' 
    },
  ];

  // Last 7 days chart logic
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => {
      const deliveryD = o.deliveryDate || o.date || (o.createdAt && String(o.createdAt).split('T')[0]);
      return deliveryD === dStr;
    });
    const rev = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return {
      date: dStr,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      revenue: rev
    };
  });

  // Orders by status distribution
  const ordersByStatus = orders.reduce((acc, o) => {
    const s = o.status || 'inquiry';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} initial="hidden" animate="show" className="fade-in">
      <div className="page-header">
        <h1>Analytics & Insights</h1>
        <p>Real-time performance metrics for your bakery</p>
      </div>

      <div className="stats-grid">
        {stats.map(s => (
          <div className={`stat-card ${s.color}`} key={s.label}>
            <div className={`stat-icon ${s.color}`}><s.icon size={20} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Revenue Trend (Last 7 Days)</h3>
          <div style={{ height: 250, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            {last7Days.map((day, i) => {
              const maxRev = Math.max(...last7Days.map(d => d.revenue), 1);
              const height = (day.revenue / maxRev) * 100;
              return (
                <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: '100%', background: i === 6 ? 'var(--accent)' : 'var(--cream)', height: `${Math.max(height, 5)}%`, borderRadius: '4px 4px 0 0', transition: 'var(--transition)' }} className="hover-effect" title={formatCurrency(day.revenue)} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Order Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(ordersByStatus).map(([status, count]) => {
              const total = orders.length || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={status} style={{ padding: '12px 16px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>
                    <span style={{ fontWeight: 700 }}>{count} orders ({Math.round(percentage)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'white', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
