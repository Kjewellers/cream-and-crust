import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, TrendingUp, Users, Clock, ArrowUpRight, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeToOrders } from '../services/db';
import { shareToWhatsApp } from '../services/whatsapp';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const quickActions = [
  { icon: '📝', label: 'New Order', route: '/orders' },
  { icon: '🧁', label: 'Add Product', route: '/products' },
  { icon: '👥', label: 'Customers', route: '/customers' },
  { icon: '💰', label: 'Record Payment', route: '/payments' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.date === today);
  const revenue = todayOrders.reduce((sum, o) => sum + (Number(o.advance) || 0), 0);
  const pendingDelivery = orders.filter(o => o.status === 'ready' || o.status === 'baking').length;
  
  const uniqueCustomers = new Set(orders.map(o => o.customer)).size;

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, change: '+12%', icon: ShoppingBag, color: 'pink' },
    { label: "Today's Collection", value: `₹${revenue.toLocaleString()}`, change: '+22%', icon: TrendingUp, color: 'orange' },
    { label: 'Total Customers', value: uniqueCustomers, change: '+5 this week', icon: Users, color: 'green' },
    { label: 'Pending Production', value: pendingDelivery, change: 'Urgent', icon: Clock, color: 'purple' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="page-header">
        <h1>Good Morning ☀️</h1>
        <p>Here's what's happening at Cream & Crust today</p>
      </motion.div>

      <motion.div variants={item} className="stats-grid">
        {stats.map(s => (
          <motion.div whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }} className={`stat-card ${s.color}`} key={s.label}>
            <div className={`stat-icon ${s.color}`}><s.icon size={20} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change"><ArrowUpRight size={14} /> {s.change}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="content-grid">
        <motion.div variants={item} className="card table-card">
          <div className="table-header">
            <h3>Recent Orders</h3>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/orders')}>View All <ChevronRight size={14} /></button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Fetching orders...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.orderId || o.id.slice(0, 5)}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.customer}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>via {o.via}</div>
                      </td>
                      <td>
                        <div>{o.product}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{o.size}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{o.date}</td>
                      <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                      <td style={{ fontWeight: 600 }}>₹{o.total?.toLocaleString()}</td>
                      <td>
                        <button className="btn-icon" onClick={() => shareToWhatsApp(o)} title="Send WhatsApp Invoice" style={{ color: '#25D366', width: 28, height: 28 }}>
                          <MessageCircle size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        <motion.div variants={item} className="card">
          <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
          <div className="quick-actions">
            {quickActions.map(a => (
              <div className="quick-action" key={a.label} onClick={() => navigate(a.route)}>
                <div className="quick-action-icon">{a.icon}</div>
                <span>{a.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: 12 }}>Instagram Activity</h4>
            <div style={{ padding: '10px 12px', background: 'var(--cream)', borderRadius: 10, marginBottom: 8, fontSize: '0.82rem', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 New Inquiry for Custom Cake
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--cream)', borderRadius: 10, marginBottom: 8, fontSize: '0.82rem', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              💬 3 messages waiting on WhatsApp
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
