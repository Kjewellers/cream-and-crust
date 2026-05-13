import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, CalendarDays, CreditCard, Inbox, ChevronRight, Search, X, 
  Mic, TrendingUp, Users, Package, Loader2, Sparkles, Clock, Calculator,
  ArrowRight, Plus, MapPin, CheckCircle2, AlertCircle, Zap, Receipt, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, subscribeToCustomers, subscribeToExpenses, subscribeToInventory, subscribeToShoppingList, updateOrderStatusInDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, formatCurrency, formatOrderNumber } from '../utils/date';
import { calculatePendingPayments } from '../utils/finance';
import { StatSkeleton, OrderRowSkeleton, EmptyState, showToast, PullToRefresh, triggerHaptic, SwipeRow } from '../components/iOS';
import { shareToWhatsApp } from '../services/whatsapp';
import { listContainer, listItem, statCard } from '../utils/animations';
import ProfitCalculator from '../components/ProfitCalculator';
import { triggerConfetti, triggerSuccessBurst } from '../components/DopamineKit';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState({ orders: [], customers: [] });
  const [isListening, setIsListening] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    if (!currentUser) return;

    const ordersUnsub = subscribeToOrders((newOrders) => {
      setOrders(newOrders || []);
      setLoading(false);
    }, currentUser.uid);
    
    const customersUnsub = subscribeToCustomers((newCust) => {
      setCustomers(newCust || []);
    }, null, currentUser.uid);

    const expensesUnsub = subscribeToExpenses((newExp) => {
      setExpenses(newExp || []);
    }, null, currentUser.uid);

    const inventoryUnsub = subscribeToInventory((items) => {
      setInventory(items || []);
    }, null, currentUser.uid);

    const shoppingUnsub = subscribeToShoppingList((items) => {
      setShoppingItems(items || []);
    }, null, currentUser.uid);
    
    return () => {
      ordersUnsub();
      customersUnsub();
      expensesUnsub();
      inventoryUnsub();
      shoppingUnsub();
    };
  }, [currentUser]);

  // --- Derived Data ---
  const { amount: pendingPaymentsAmount } = calculatePendingPayments(orders.filter(o => o != null));
  
  const committedOrders = useMemo(() => orders.filter(o => {
    const s = String(o.status || '').toLowerCase();
    return s !== 'cancelled' && s !== 'inquiry';
  }), [orders]);

  const currentMonthStr = now.toISOString().slice(0, 7);
  const monthlyExpensesAmount = useMemo(() => {
    return expenses.filter(e => {
      const d = e.date || (e.createdAt && String(e.createdAt));
      return d && String(d).includes(currentMonthStr);
    }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, currentMonthStr]);

  const itemsToBuyCount = shoppingItems.filter(i => !i.bought).length;

  const deliveryGroups = useMemo(() => {
    const today = committedOrders.filter(o => (o.deliveryDate || o.date) === todayStr);
    
    const groups = { morning: [], afternoon: [], evening: [] };
    today.forEach(o => {
      const time = o.deliveryTime || '12:00';
      const hour = parseInt(time.split(':')[0]);
      if (hour < 12) groups.morning.push(o);
      else if (hour < 17) groups.afternoon.push(o);
      else groups.evening.push(o);
    });
    return groups;
  }, [committedOrders, todayStr]);

  const tomorrowOrders = committedOrders.filter(o => (o.deliveryDate || o.date) === tomorrowStr);
  const lowStockItems = inventory.filter(inv => Number(inv.stock) <= Number(inv.minStock || 0));

  // --- Search Logic ---
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
    if (!SpeechRecognition) return showToast('Voice search not supported', 'error');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.onstart = () => { setIsListening(true); triggerHaptic('medium'); };
    recognition.onresult = (event) => {
      setSearch(event.results[0][0].transcript);
      setIsListening(false);
      triggerHaptic('success');
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const hours = now.getHours();
  let greeting = 'Good Evening 🌸';
  if (hours < 12) greeting = 'Good Morning 🌸';
  else if (hours < 17) greeting = 'Good Afternoon 🌸';

  const stats = [
    { label: "Today", value: committedOrders.filter(o => (o.deliveryDate || o.date) === todayStr).length, icon: ShoppingBag, color: 'pink', path: '/orders' },
    { label: 'Pending', value: formatCurrency(pendingPaymentsAmount), icon: CreditCard, color: 'orange', path: '/payments' },
    { label: 'Expenses', value: formatCurrency(monthlyExpensesAmount), icon: Receipt, color: 'pink', path: '/expenses' },
    { label: 'To Buy', value: itemsToBuyCount, icon: ShoppingCart, color: 'green', path: '/shopping-list' },
    { label: 'Inventory', value: lowStockItems.length, icon: Package, color: lowStockItems.length > 0 ? 'pink' : 'green', path: '/inventory' },
    { label: 'Customers', value: customers.length, icon: Users, color: 'purple', path: '/customers' },
  ];

  const DeliverySection = ({ title, icon: Icon, items }) => (
    items.length > 0 && (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text2)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Icon size={14} /> {title} — {items.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((o, idx) => {
            const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
            const product = o.cakeFlavour || o.product || 'Custom Order';
            const time = formatTime(o.deliveryTime || o.time || '10:00');
            const due = (Number(o.total || 0)) - (Number(o.advance || 0));

            return (
              <motion.div key={o.id} whileTap={{ scale: 0.98 }}>
                <SwipeRow onWhatsApp={() => shareToWhatsApp(o)}>
                  <div className="card" style={{ padding: '16px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer' }} onClick={() => navigate('/orders')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{cName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text2)', marginTop: 2 }}>{product}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>{time}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                          {o.deliveryAddress ? <MapPin size={10} /> : '🏠'} {o.deliveryAddress ? 'Delivery' : 'Pickup'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                      {due > 0 ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent2)' }}>⚠️ Balance</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent2)' }}>{formatCurrency(due)}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2E7A5A' }}>✅ Paid in full</div>
                      )}
                      
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          updateOrderStatusInDB(o.id, 'delivered'); 
                          showToast('Delivered! 📦', 'success');
                          // MEGA dopamine burst!
                          triggerConfetti(e.clientX, e.clientY, 120);
                          triggerSuccessBurst('🏆', 'Order Delivered!');
                          triggerHaptic('success');
                        }} 
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2E7A5A', color: 'white', padding: '6px 12px', borderRadius: 12, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <CheckCircle2 size={14} /> Mark Delivered
                      </button>
                    </div>
                  </div>
                </SwipeRow>
              </motion.div>
            );
          })}
        </div>
      </div>
    )
  );

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show" className="fade-in">
      <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); showToast('Dashboard refreshed', 'info'); }}>
        
        {/* Premium Header */}
        <div style={{ marginBottom: 32 }}>
          <motion.div variants={listItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 8 }}>
                <img src="/logo.png" alt="Logo" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Premium Baker Edition</span>
              </div>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{greeting}</h1>
              <p style={{ color: 'var(--text2)', fontSize: '1rem', marginTop: 4 }}>{formatDate(now)}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowCalculator(true)}
                style={{ padding: '0 16px', height: 44, borderRadius: 16 }}
              >
                <Calculator size={18} /> <span className="desktop-only" style={{ marginLeft: 6 }}>ROI Calc</span>
              </button>
              <div className="desktop-only" style={{ position: 'relative', width: 280 }}>
                <div style={{ 
                  position: 'relative', background: 'var(--bg2)', borderRadius: 16, 
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px'
                }}>
                  <Search size={18} color="var(--text3)" />
                  <input 
                    placeholder="Search everything..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    style={{ background: 'none', border: 'none', height: 44, padding: '0 8px', fontSize: '14px' }} 
                  />
                  <button onClick={handleVoiceInput} style={{ color: 'var(--text3)' }}>
                    {isListening ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smart Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            <AnimatePresence>
              {lowStockItems.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate('/inventory')}
                  style={{ 
                    padding: '16px 20px', borderRadius: 20, 
                    background: 'linear-gradient(135deg, #FFF5F5, #FFF0F0)', 
                    border: '1px solid #FFE0E0', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FF3B30', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#B01000' }}>Inventory Alert</div>
                    <div style={{ fontSize: '0.85rem', color: '#C04030' }}>{lowStockItems.length} items are running low. Tap to restock.</div>
                  </div>
                  <ArrowRight size={20} color="#FF3B30" />
                </motion.div>
              )}
              {deliveryGroups.morning.length + deliveryGroups.afternoon.length + deliveryGroups.evening.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  style={{ 
                    padding: '16px 20px', borderRadius: 20, 
                    background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)', 
                    border: '1px solid #BAE6FD',
                    display: 'flex', alignItems: 'center', gap: 16
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0284C7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0369A1' }}>Daily Briefing</div>
                    <div style={{ fontSize: '0.85rem', color: '#075985' }}>You have {deliveryGroups.morning.length + deliveryGroups.afternoon.length + deliveryGroups.evening.length} deliveries scheduled for today.</div>
                  </div>
                  <div style={{ width: 1, height: 24, background: '#BAE6FD' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0369A1' }}>{Math.round((committedOrders.filter(o => o.status === 'delivered' && (o.deliveryDate || o.date) === todayStr).length / (deliveryGroups.morning.length + deliveryGroups.afternoon.length + deliveryGroups.evening.length || 1)) * 100)}%</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#075985', textTransform: 'uppercase' }}>Done</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats Bar */}
          <div className="stats-grid" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            {loading ? [...Array(6)].map((_, i) => <StatSkeleton key={i} />) : stats.map(s => (
              <motion.div variants={statCard} whileTap={{ scale: 0.95 }} className={`stat-card ${s.color}`} key={s.label} onClick={() => navigate(s.path || '/')}>
                <div className={`stat-icon ${s.color}`}><s.icon size={18} /></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: s.label.includes('Pending') || s.label === 'Expenses' ? '1.1rem' : '1.6rem' }}>{s.value}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Deliveries & Activity */}
        <div className="content-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          <motion.div variants={listItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Deliveries Today</h3>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/orders')}>All Orders</button>
            </div>
            
            {loading ? <OrderRowSkeleton /> : (
              (deliveryGroups.morning.length + deliveryGroups.afternoon.length + deliveryGroups.evening.length === 0) ? (
                <EmptyState icon="🧁" title="No deliveries today" subtitle="Take this time to experiment with new recipes!" />
              ) : (
                <>
                  <DeliverySection title="Morning Slot" icon={Clock} items={deliveryGroups.morning} />
                  <DeliverySection title="Afternoon Slot" icon={Clock} items={deliveryGroups.afternoon} />
                  <DeliverySection title="Evening Slot" icon={Clock} items={deliveryGroups.evening} />
                </>
              )
            )}

            {tomorrowOrders.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--text3)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  <CalendarDays size={14} /> Coming Up Tomorrow
                </div>
                {tomorrowOrders.slice(0, 3).map(o => (
                   <div key={o.id} style={{ padding: '12px 16px', background: 'var(--bg2)', borderRadius: 14, marginBottom: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                     <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{typeof o.customer === 'object' ? o.customer?.name : o.customerName}</div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>{o.product}</div>
                   </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={listItem}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Recent Activity</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loading ? <OrderRowSkeleton /> : orders.length === 0 ? (
                <EmptyState icon="✨" title="Fresh Start" subtitle="Your orders and activity will appear here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {orders.slice(0, 8).map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{typeof o.customer === 'object' ? o.customer?.name : o.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>{o.product}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{formatCurrency(o.total || 0)}</div>
                        <span className={`badge ${String(o.status || 'new').toLowerCase()}`} style={{ fontSize: '9px', padding: '2px 8px' }}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </PullToRefresh>

      {/* Floating Action Button Group (Mobile Optimized) */}
      <div className="mobile-only" style={{ position: 'fixed', bottom: 100, right: 20, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100 }}>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/orders')}
          style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: 'white', boxShadow: 'var(--shadow-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {search && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', padding: '20px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button className="btn-icon" onClick={() => setSearch('')}><X size={20} /></button>
                <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 12, padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                   <Search size={18} color="var(--text3)" />
                   <input autoFocus value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'none', border: 'none', height: 44, padding: '0 8px', flex: 1 }} />
                </div>
             </div>
             {searchResults.orders.length > 0 && (
               <div style={{ marginBottom: 24 }}>
                 <h4 style={{ color: 'var(--text3)', textTransform: 'uppercase', fontSize: 11, fontWeight: 800, marginBottom: 12, letterSpacing: '0.05em' }}>Orders</h4>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                   {searchResults.orders.slice(0, 8).map(o => (
                     <div key={o.id} onClick={() => { navigate('/orders'); setSearch(''); }} className="card" style={{ padding: 16 }}>
                       <div style={{ fontWeight: 700 }}>{o.product}</div>
                       <div style={{ fontSize: 12, color: 'var(--text3)' }}>{typeof o.customer === 'object' ? o.customer?.name : o.customerName} · {formatDate(o.date)}</div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
              {searchResults.customers.length === 0 && searchResults.orders.length === 0 && (
               <EmptyState icon="🔍" title="No results" subtitle={`We couldn't find anything matching "${search}"`} />
             )}
          </motion.div>
        )}
      </AnimatePresence>

      <ProfitCalculator open={showCalculator} onClose={() => setShowCalculator(false)} />
    </motion.div>
  );
}

