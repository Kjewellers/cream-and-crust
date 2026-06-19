import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Mic, ShoppingBag, ClipboardCopy, Calculator, Package,
  TrendingUp, ArrowUpRight, Bell, AlertTriangle, CheckCircle2, Clock,
  DollarSign, Users, BarChart2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../context/DataContext';
import './AIAssistantHub.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 300 } }
};

function dispatchAI(message, featureId) {
  window.dispatchEvent(new CustomEvent('dispatch-ai-command', { detail: { message, featureId } }));
}

/* ── Priority Feed ── */
function PriorityFeed({ orders, inventory, expenses }) {
  const today = new Date().toISOString().split('T')[0];

  const items = useMemo(() => {
    const feed = [];

    // Low stock alerts
    const lowStock = inventory.filter(i => i.minStock > 0 && (i.stock || 0) <= (i.minStock || 0));
    lowStock.slice(0, 2).forEach(item => {
      feed.push({
        urgency: 'critical',
        icon: '🔴',
        text: `${item.item || item.name} is running low (${item.stock}${item.unit ? ' ' + item.unit : ''} remaining)`,
        action: 'Check Inventory',
        featureId: 'inventory_check',
      });
    });

    // Expiring items (within 3 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const expiring = inventory.filter(i => {
      if (!i.expiryDate) return false;
      const exp = new Date(i.expiryDate);
      return exp >= new Date() && exp <= soon;
    });
    expiring.slice(0, 1).forEach(item => {
      const daysLeft = Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000);
      feed.push({
        urgency: 'warning',
        icon: '🟡',
        text: `${item.item || item.name} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        action: 'View Inventory',
        featureId: 'inventory_check',
      });
    });

    // Today's deliveries
    const todayDeliveries = orders.filter(o => (o.deliveryDate || '').startsWith(today) && o.status !== 'delivered' && o.status !== 'cancelled');
    if (todayDeliveries.length > 0) {
      feed.push({
        urgency: 'info',
        icon: '📦',
        text: `${todayDeliveries.length} order${todayDeliveries.length > 1 ? 's' : ''} due for delivery today`,
        action: 'View Orders',
        featureId: null,
        route: '/orders',
      });
    }

    // Pending payments
    const unpaid = orders.filter(o => o.paymentStatus !== 'paid' && !o.isPaid && o.status !== 'cancelled');
    const pendingAmount = unpaid.reduce((s, o) => s + (o.total || 0), 0);
    if (unpaid.length > 0) {
      feed.push({
        urgency: 'warning',
        icon: '💰',
        text: `₹${pendingAmount.toLocaleString('en-IN')} pending from ${unpaid.length} unpaid order${unpaid.length > 1 ? 's' : ''}`,
        action: 'Review',
        featureId: null,
        route: '/orders',
      });
    }

    // Weekly revenue insight
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekRevenue = orders
      .filter(o => (o.paymentStatus === 'paid' || o.isPaid) && o.createdAt && new Date(o.createdAt) >= weekAgo)
      .reduce((s, o) => s + (o.total || 0), 0);
    if (weekRevenue > 0) {
      feed.push({
        urgency: 'success',
        icon: '📈',
        text: `Revenue this week: ₹${weekRevenue.toLocaleString('en-IN')}`,
        action: 'Full Report',
        featureId: 'coach_me',
      });
    }

    // Empty state
    if (feed.length === 0) {
      feed.push({
        urgency: 'info',
        icon: '🌟',
        text: 'Add orders, inventory, and expenses to start seeing AI-powered insights here.',
        action: 'Create First Order',
        featureId: null,
        message: 'I want to create an order',
      });
    }

    return feed;
  }, [orders, inventory, expenses, today]);

  return (
    <div className="ai-priority-feed">
      {items.map((item, i) => (
        <motion.div
          key={i}
          className={`ai-priority-item ai-priority-item--${item.urgency}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          whileHover={{ scale: 1.01 }}
        >
          <span className="ai-priority-icon">{item.icon}</span>
          <span className="ai-priority-text">{item.text}</span>
          <button
            className="ai-priority-btn"
            onClick={() => {
              if (item.message) dispatchAI(item.message, null);
              else if (item.featureId) dispatchAI('', item.featureId);
              else if (item.route) window.dispatchEvent(new CustomEvent('dispatch-ai-command', { detail: { message: `Navigate to ${item.route}` } }));
            }}
          >
            {item.action}
          </button>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Main Component ── */
export default function AIAssistantHub() {
  const { orders = [], inventory = [], expenses = [], products = [] } = useData();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  // Real 7-day revenue chart
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const revenue = orders
        .filter(o => (o.paymentStatus === 'paid' || o.isPaid) && (o.createdAt || '').startsWith?.(dateStr))
        .reduce((s, o) => s + (o.total || 0), 0);
      days.push({ name: label, value: revenue });
    }
    return days;
  }, [orders]);

  const currentRevenue = chartData.reduce((s, d) => s + d.value, 0);
  const pendingCount = orders.filter(o => ['new', 'confirmed', 'in-progress'].includes(o.status)).length;

  // Real recent activity
  const recentActivity = useMemo(() => {
    return [...orders]
      .sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1)
      .slice(0, 3)
      .map(o => ({
        icon: ShoppingBag,
        title: `Order: ${o.product || 'Custom'}`,
        sub: o.customerName || o.customer || 'Unknown customer',
        time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
      }));
  }, [orders]);

  const handleInputSubmit = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      dispatchAI(e.target.value.trim(), null);
      e.target.value = '';
    }
  };

  return (
    <div className="ai-hub-container">
      <div className="ai-ambient-glow glow-1" />
      <div className="ai-ambient-glow glow-2" />

      <motion.div className="ai-hub-inner" variants={containerVariants} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="ai-hub-header-wrap" variants={itemVariants}>
          <div className="ai-hub-title-section">
            <span className="ai-hub-date">{today}</span>
            <h1 className="ai-hub-title">Intelligence</h1>
            <p className="ai-hub-subtitle">Professional bakery operations, managed by AI.</p>
          </div>
        </motion.div>

        <div className="ai-hub-grid">
          {/* ── Main Column ── */}
          <div className="ai-hub-main-col">

            {/* Chat Spotlight */}
            <motion.div className="ai-chat-container" variants={itemVariants}>
              <div className="spotlight-search">
                <Sparkles size={18} className="spotlight-icon" />
                <input type="text" placeholder="Ask Cream AI anything..." onKeyDown={handleInputSubmit} />
                <button className="ai-chat-send" onClick={() => dispatchAI('', 'run_bakery')}>
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className="ai-suggestions-pills">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="premium-pill"
                  onClick={() => dispatchAI('I want to create an order', null)}>Create order</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="premium-pill"
                  onClick={() => dispatchAI('', 'inventory_check')}>Check low stock</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="premium-pill"
                  onClick={() => dispatchAI('', 'coach_me')}>Weekly report</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="premium-pill"
                  onClick={() => dispatchAI('Generate descriptions for all my menu products', null)}>Menu descriptions</motion.button>
              </div>
            </motion.div>

            {/* Quick Action Grid */}
            <motion.div className="glass-panel" variants={itemVariants}>
              <h3 className="glass-panel-header">Quick Actions</h3>
              <div className="ai-features-grid">
                <div className="premium-feature-card" onClick={() => dispatchAI('I want to create an order', null)}>
                  <div className="premium-fc-icon"><ShoppingBag size={18} /></div>
                  <h4>Order Agent</h4>
                  <p>Process orders naturally.</p>
                </div>
                <div className="premium-feature-card" onClick={() => dispatchAI('', 'generate_recipe')}>
                  <div className="premium-fc-icon"><ClipboardCopy size={18} /></div>
                  <h4>Recipe Agent</h4>
                  <p>Scale recipes with precision.</p>
                </div>
                <div className="premium-feature-card" onClick={() => dispatchAI('', 'coach_me')}>
                  <div className="premium-fc-icon"><Calculator size={18} /></div>
                  <h4>Business Coach</h4>
                  <p>Real-time profit analysis.</p>
                </div>
                <div className="premium-feature-card" onClick={() => dispatchAI('', 'inventory_check')}>
                  <div className="premium-fc-icon"><Package size={18} /></div>
                  <h4>Inventory Agent</h4>
                  <p>Predictive stock management.</p>
                </div>
                <div className="premium-feature-card" onClick={() => dispatchAI('Give me a WhatsApp promotional campaign for my best sellers', null)}>
                  <div className="premium-fc-icon"><Mic size={18} /></div>
                  <h4>Marketing Agent</h4>
                  <p>Captions & campaigns.</p>
                </div>
                <div className="premium-feature-card" onClick={() => dispatchAI('Generate descriptions for all my menu products', null)}>
                  <div className="premium-fc-icon"><BarChart2 size={18} /></div>
                  <h4>Product Agent</h4>
                  <p>SEO & menu descriptions.</p>
                </div>
              </div>
            </motion.div>

            {/* Bottom Row */}
            <motion.div className="ai-bottom-row" variants={itemVariants}>
              {/* Real Recent Activity */}
              <div className="glass-panel">
                <h3 className="glass-panel-header">Recent Activity</h3>
                <div className="premium-activity-list">
                  {recentActivity.length === 0 ? (
                    <div style={{ padding: '16px 0', textAlign: 'center', opacity: 0.5, fontSize: '0.82rem' }}>
                      No orders yet. Create your first order to see activity here.
                    </div>
                  ) : recentActivity.map((act, i) => (
                    <div key={i} className="premium-activity-item">
                      <div className="premium-act-icon"><act.icon size={14} /></div>
                      <div className="premium-act-content">
                        <h5>{act.title}</h5>
                        <p>{act.sub}</p>
                      </div>
                      <span className="premium-act-time">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real Revenue Chart */}
              <div className="glass-panel" style={{ padding: '20px 20px 0 20px' }}>
                <h3 className="glass-panel-header">Performance Overview</h3>
                <div className="premium-stats-grid">
                  <div className="premium-stat-box">
                    <span>7-Day Revenue</span>
                    <strong>{currentRevenue > 0 ? `₹${currentRevenue.toLocaleString('en-IN')}` : '—'}</strong>
                  </div>
                  <div className="premium-stat-box">
                    <span>Active Orders</span>
                    <strong className={pendingCount > 0 ? 'text-success' : ''}>{pendingCount}</strong>
                  </div>
                </div>
                <div className="premium-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" fontSize={11} stroke="var(--text3)" tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)', fontSize: '0.8rem' }}
                        itemStyle={{ color: 'var(--text)' }}
                        formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* Voice Bar */}
            <motion.div className="premium-voice-bar" variants={itemVariants}>
              <div className="premium-voice-info">
                <h3>Voice Commands</h3>
                <p>Say "create order", "check stock", "show profit"</p>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className="premium-mic-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-drawer'))}>
                <Mic size={20} />
              </motion.button>
            </motion.div>
          </div>

          {/* ── Sidebar ── */}
          <div className="ai-hub-side-col">
            <motion.div variants={itemVariants}>
              <h3 className="glass-panel-header" style={{ paddingLeft: 8, marginBottom: 12 }}>
                AI Priority Feed
              </h3>
              <PriorityFeed orders={orders} inventory={inventory} expenses={expenses} />

              {/* Stats summary */}
              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: ShoppingBag, label: 'Total Orders', value: orders.length },
                  { icon: Users, label: 'Inventory Items', value: inventory.length },
                  { icon: Package, label: 'Products', value: products.length },
                  { icon: DollarSign, label: 'Expenses', value: expenses.length },
                ].map((stat, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <stat.icon size={14} style={{ opacity: 0.5 }} />
                    <strong style={{ fontSize: '1.3rem', fontWeight: 700 }}>{stat.value}</strong>
                    <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
