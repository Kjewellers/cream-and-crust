import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CalendarDays, CreditCard, Inbox, ChevronRight, Search, X, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, subscribeToCustomers } from '../services/db';
import { formatDate, formatTime, formatCurrency, formatOrderNumber } from '../utils/date';
import { StatSkeleton, EmptyState, showToast, PullToRefresh, triggerHaptic } from '../components/iOS';
import { listContainer, listItem, statCard, cardTap } from '../utils/animations';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = listItem;

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState({ orders: [], customers: [] });
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    let ordersUnsub = () => {};
    let customersUnsub = () => {};
    
    ordersUnsub = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    });
    
    customersUnsub = subscribeToCustomers((newCust) => {
      setCustomers(newCust || []);
    });
    
    return () => {
      ordersUnsub();
      customersUnsub();
    };
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults({ orders: [], customers: [] });
      return;
    }
    const q = search.toLowerCase();
    const filteredOrders = orders.filter(o => 
      String(o.orderId || o.id).toLowerCase().includes(q) || 
      (typeof o.customer === 'object' ? o.customer?.name : (o.customerName || o.customer || '')).toLowerCase().includes(q) ||
      (o.product || '').toLowerCase().includes(q)
    );
    const filteredCustomers = customers.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.phone || '').includes(q)
    );
    setSearchResults({ orders: filteredOrders, customers: filteredCustomers });
  }, [search, orders, customers]);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.onstart = () => {
      setIsListening(true);
      triggerHaptic('medium');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      setIsListening(false);
      triggerHaptic('success');
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Time and Date logic
  const now = new Date();
  const hours = now.getHours();
  let greeting = 'Good Evening 🌸';
  if (hours < 12) greeting = 'Good Morning 🌸';
  else if (hours < 17) greeting = 'Good Afternoon 🌸';
  
  const formattedDate = formatDate(now); // "09 May 2026"

  // Analytics logic
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const safeOrders = orders.filter(o => o != null);
  
  const todayOrders = safeOrders.filter(o => {
    const d = o.deliveryDate || o.date || (o.createdAt && String(o.createdAt).split('T')[0]);
    return d === todayStr;
  });
  
  const tomorrowOrders = safeOrders.filter(o => {
    const d = o.deliveryDate || o.date || (o.createdAt && String(o.createdAt).split('T')[0]);
    return d === tomorrowStr;
  });

  const unpaidOrders = safeOrders.filter(o => o.isPaid === false || String(o.paymentStatus).toLowerCase() !== 'paid');
  const pendingPaymentsAmount = unpaidOrders.reduce((sum, o) => sum + (Number(o.balanceDue) || Number(o.totalAmount) || Number(o.total) || 0), 0);
  const pendingPaymentsOrdersCount = unpaidOrders.length;

  const totalOrdersCount = safeOrders.length;

  // Inactive customers (no orders > 30 days)
  const inactiveDateStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inactiveCustomers = customers.filter(c => c.lastOrder && c.lastOrder < inactiveDateStr);

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, color: 'pink' },
    { label: "Tomorrow's Orders", value: tomorrowOrders.length, icon: CalendarDays, color: 'green' },
    { label: 'Pending Payments', value: formatCurrency(pendingPaymentsAmount), icon: CreditCard, color: 'orange' },
    { label: 'Total Orders', value: totalOrdersCount, icon: Inbox, color: 'purple' },
  ];

  const renderMiniCard = (o) => {
    const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
    const time = formatTime(o.deliveryTime || o.time || '10:00');
    const product = o.cakeFlavour || o.product || (o.items && o.items[0]?.name) || 'Custom Order';
    const size = o.cakeWeight || o.size || (o.items && o.items[0]?.size) || '';
    const address = typeof o.customer === 'object' ? o.customer?.address : o.deliveryAddress;
    const loc = address ? address.split(',')[0] : 'Pickup';
    const due = Number(o.balanceDue) || 0;
    
    return (
      <div key={o.id} style={{ padding: '12px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600 }}>🎂 {cName}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text2)', fontWeight: 600 }}>{time}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '8px' }}>
          {product} {size ? `· ${size}` : ''}
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
          <span>📍 {loc}</span>
          {due > 0 && <span style={{ color: '#C45A52', fontWeight: 600 }}>💰 {formatCurrency(due)} due</span>}
        </div>
      </div>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PullToRefresh onRefresh={async () => {
        await new Promise(r => setTimeout(r, 800));
        showToast('Dashboard updated', 'info');
      }}>
        <motion.div variants={item} className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{greeting}</h1>
            <p>{formattedDate}</p>
          </div>
          <div style={{ position: 'relative', width: '40%', minWidth: 200 }} className="desktop-only">
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input 
              placeholder="Global search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ width: '100%', paddingLeft: 40, borderRadius: 20, height: 40, paddingRight: 40 }}
            />
            <button 
              onClick={handleVoiceInput}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: isListening ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer' }}
            >
              <Mic size={18} className={isListening ? 'pulse' : ''} />
            </button>
          </div>
        </motion.div>

        {/* Mobile Search */}
        <motion.div variants={item} className="mobile-only" style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input 
              placeholder="Search orders, customers..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ width: '100%', paddingLeft: 40, borderRadius: 20, height: 44, paddingRight: 40 }}
            />
            <button 
              onClick={handleVoiceInput}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: isListening ? 'var(--accent)' : 'var(--text3)', cursor: 'pointer' }}
            >
              <Mic size={20} className={isListening ? 'pulse' : ''} />
            </button>
          </div>
        </motion.div>

        {/* Search Results Overlay */}
        <AnimatePresence>
          {search && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 10 }}
              style={{ 
                position: 'absolute', top: 180, left: 20, right: 20, zIndex: 100,
                background: 'var(--bg2)', borderRadius: 16, boxShadow: 'var(--shadow-xl)',
                padding: 20, border: '1px solid var(--border)', maxHeight: '70vh', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Search Results</h3>
                <button className="btn-icon" onClick={() => setSearch('')}><X size={18} /></button>
              </div>

              {searchResults.orders.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10 }}>ORDERS</div>
                  {searchResults.orders.map(o => (
                    <div key={o.id} onClick={() => navigate('/orders')} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600 }}>{formatOrderNumber(o, orders)} · {typeof o.customer === 'object' ? o.customer?.name : (o.customerName || o.customer)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{o.product} · {formatDate(o.date)}</div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.customers.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10 }}>CUSTOMERS</div>
                  {searchResults.customers.map(c => (
                    <div key={c.id} onClick={() => navigate('/customers')} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.orders.length === 0 && searchResults.customers.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>No results found for "{search}"</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Banners */}
        <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {pendingPaymentsOrdersCount > 0 && pendingPaymentsAmount > 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(232,168,124,0.15)', borderLeft: '4px solid var(--accent)', borderRadius: '4px', color: '#C4783A', fontWeight: 600, fontSize: '0.9rem' }}>
              💰 {formatCurrency(pendingPaymentsAmount)} pending from {pendingPaymentsOrdersCount} orders
            </div>
          )}
          {tomorrowOrders.length > 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(184,224,210,0.15)', borderLeft: '4px solid var(--mint)', borderRadius: '4px', color: '#3D8B6A', fontWeight: 600, fontSize: '0.9rem' }}>
              📅 {tomorrowOrders.length} deliveries tomorrow
            </div>
          )}
          {inactiveCustomers.length > 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(197,180,227,0.15)', borderLeft: '4px solid var(--lavender)', borderRadius: '4px', color: '#7C5BB5', fontWeight: 600, fontSize: '0.9rem' }}>
              👤 {inactiveCustomers.length} customers inactive 30+ days
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="stats-grid">
          {loading ? (
            <>{[...Array(4)].map((_, i) => <StatSkeleton key={i} />)}</>
          ) : stats.map(s => (
            <motion.div
              variants={statCard}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
              whileTap={{ scale: 0.97 }}
              className={`stat-card ${s.color}`}
              key={s.label}
              style={{ cursor: 'default' }}
            >
              <div className={`stat-icon ${s.color}`}><s.icon size={20} /></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="content-grid">
          <motion.div variants={item} className="card">
            <h3 style={{ marginBottom: '16px' }}>Today's Deliveries</h3>
            {todayOrders.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                No deliveries today 🎂<br/>Enjoy your day!
              </div>
            ) : (
              todayOrders.map(renderMiniCard)
            )}

            <h3 style={{ margin: '24px 0 16px' }}>Tomorrow's Deliveries</h3>
            {tomorrowOrders.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text3)', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                No deliveries tomorrow 📅
              </div>
            ) : (
              tomorrowOrders.map(renderMiniCard)
            )}
          </motion.div>

          <motion.div variants={item} className="card table-card">
            <div className="table-header">
              <h3>Recent Orders</h3>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/orders')}>View All <ChevronRight size={14} /></button>
            </div>
            <div style={{ overflowX: 'auto' }} className="desktop-only">
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Fetching orders...</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeOrders.slice(0, 5).map(o => {
                      const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
                      const dDate = formatDate(o.createdAt || o.date || new Date());
                      const totalNum = Number(o.totalAmount) || Number(o.total) || 0;
                      const orderId = formatOrderNumber(o, safeOrders);

                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600 }}>{orderId}</td>
                          <td style={{ fontWeight: 500 }}>{cName}</td>
                          <td style={{ fontSize: '0.85rem' }}>{dDate}</td>
                          <td><span className={`badge ${String(o.status || 'new').toLowerCase()}`}>{o.status || 'new'}</span></td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(totalNum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mobile-only">
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Fetching orders...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {safeOrders.slice(0, 5).map(o => {
                    const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
                    const totalNum = Number(o.totalAmount) || Number(o.total) || 0;
                    const orderId = formatOrderNumber(o, safeOrders);
                    const dDate = formatDate(o.createdAt || o.date || new Date());
                    
                    return (
                      <div key={o.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{orderId}</span>
                          <span className={`badge ${String(o.status || 'new').toLowerCase()}`}>{o.status || 'new'}</span>
                        </div>
                        <div style={{ fontWeight: 600 }}>{cName}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>{dDate}</div>
                          <div style={{ fontWeight: 700 }}>{formatCurrency(totalNum)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </PullToRefresh>
    </motion.div>
  );
}
