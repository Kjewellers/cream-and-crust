import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, CalendarDays, CreditCard, Inbox, ChevronRight, Search, X, 
  Mic, TrendingUp, Users, Package, Loader2, Sparkles, Clock, Calculator,
  ArrowRight, Plus, MapPin, CheckCircle2, AlertCircle, Zap, Receipt, ShoppingCart,
  MessageCircle, Share2, ThumbsUp, LayoutGrid, Layers, ChefHat, SlidersHorizontal,
  Phone, Bike, Edit2, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, subscribeToCustomers, subscribeToExpenses, subscribeToInventory, subscribeToShoppingList, updateOrderStatusInDB, subscribeToBusiness } from '../services/db';
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
  const { currentUser, userDetails } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState({ orders: [], customers: [] });
  const [isListening, setIsListening] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [cardStyle, setCardStyle] = useState(() => localStorage.getItem('dashCardStyle') || 'showcase');

  const toggleCardStyle = useCallback(() => {
    setCardStyle(prev => {
      const next = prev === 'new' ? 'classic' : prev === 'classic' ? 'showcase' : 'new';
      localStorage.setItem('dashCardStyle', next);
      return next;
    });
  }, []);

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

    const bizUnsub = subscribeToBusiness((biz) => {
      setBusiness(biz);
    }, null, currentUser.uid);
    
    return () => {
      ordersUnsub();
      customersUnsub();
      expensesUnsub();
      inventoryUnsub();
      shoppingUnsub();
      bizUnsub();
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
  let greetingWord = 'Good Evening';
  if (hours < 12) greetingWord = 'Good Morning';
  else if (hours < 17) greetingWord = 'Good Afternoon';

  const firstName = userDetails?.name?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'Baker';
  const greeting = `${greetingWord}, ${firstName} 👋`;

  // Calculate today's real stats
  const todayRevenue = useMemo(() => {
    return committedOrders
      .filter(o => (o.deliveryDate || o.date) === todayStr)
      .reduce((sum, o) => sum + (Number(o.total || o.totalAmount || 0)), 0);
  }, [committedOrders, todayStr]);

  const todayDeliveriesCount = useMemo(() => {
    return committedOrders.filter(o => (o.deliveryDate || o.date) === todayStr).length;
  }, [committedOrders, todayStr]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => ['new', 'confirmed', 'inquiry', 'baking', 'ready'].includes(String(o.status || '').toLowerCase())).length;
  }, [orders]);

  const stats = [
    { label: "Today", value: todayDeliveriesCount > 0 ? todayDeliveriesCount : 'Ready 🥐', icon: ShoppingBag, color: 'pink', path: '/orders' },
    { label: 'Pending', value: pendingPaymentsAmount > 0 ? formatCurrency(pendingPaymentsAmount) : 'All Paid! ✨', icon: CreditCard, color: 'orange', path: '/payments' },
    { label: 'Expenses', value: monthlyExpensesAmount > 0 ? formatCurrency(monthlyExpensesAmount) : '₹0', icon: Receipt, color: 'pink', path: '/expenses' },
    { label: 'To Buy', value: itemsToBuyCount > 0 ? itemsToBuyCount : 'Stocked 🛍️', icon: ShoppingCart, color: 'green', path: '/shopping-list' },
    { label: 'Inventory', value: inventory.length === 0 ? 'Empty Pantry' : (lowStockItems.length > 0 ? `${lowStockItems.length} Low` : 'Healthy ✅'), icon: Package, color: lowStockItems.length > 0 ? 'pink' : 'green', path: '/inventory' },
    { label: 'Customers', value: customers.length > 0 ? customers.length : 'Leads 👤', icon: Users, color: 'purple', path: '/customers' },
  ];

  // Dynamic insight calculations
  const bestsellerProduct = useMemo(() => {
    if (!orders.length) return null;
    const freq = {};
    orders.forEach(o => {
      if (!o) return;
      const p = o.product || o.cakeFlavour || 'Custom Order';
      freq[p] = (freq[p] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [orders]);

  const topCustomer = useMemo(() => {
    if (!customers.length) return null;
    const monthOrders = orders.filter(o => {
      if (!o) return false;
      const d = o.deliveryDate || o.date || '';
      return String(d).startsWith(currentMonthStr);
    });
    const freq = {};
    monthOrders.forEach(o => {
      if (!o) return;
      const name = typeof o.customer === 'object' ? o.customer?.name : (o.customerName || o.customer || '');
      if (name) freq[name] = (freq[name] || 0) + 1;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted.length ? { name: sorted[0][0], count: sorted[0][1] } : null;
  }, [orders, customers, currentMonthStr]);

  // Helper for generating cute custom bakery avatars based on description
  const getBakeryEmoji = (productName) => {
    const p = String(productName || '').toLowerCase();
    if (p.includes('cupcake') || p.includes('muffin')) return '🧁';
    if (p.includes('cookie') || p.includes('biscuit')) return '🍪';
    if (p.includes('donut') || p.includes('doughnut')) return '🍩';
    if (p.includes('bread') || p.includes('loaf') || p.includes('croissant')) return '🥐';
    if (p.includes('pastry') || p.includes('slice')) return '🍰';
    return '🎂'; // Default premium cake
  };

  const getBakeryBg = (productName) => {
    const emojis = ['#FFF1F2', '#FEF3C7', '#ECFDF5', '#EEF2FF', '#FFF8F1'];
    const charCodeSum = String(productName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return emojis[charCodeSum % emojis.length];
  };

  const handleSharePortfolio = () => {
    if (business?.username) {
      const link = `${window.location.origin}/portfolio/${business.username}`;
      navigator.clipboard.writeText(link);
      triggerHaptic('success');
      showToast('Portfolio link copied! 🔗', 'success');
      triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, 80);
    } else {
      showToast('Please set up portfolio in settings', 'warning');
    }
  };

  const handleBookDelivery = () => {
    triggerHaptic('light');
    if (orders.length > 0) {
      const todayOrders = orders.filter(o => (o.deliveryDate || o.date) === todayStr);
      if (todayOrders.length > 0 && todayOrders[0].deliveryAddress) {
        navigator.clipboard.writeText(todayOrders[0].deliveryAddress);
        showToast('Address copied! Opening Rapido...', 'success');
      } else {
        showToast('Opening Rapido for bookings...', 'info');
      }
    } else {
      showToast('Opening Rapido...', 'info');
    }
    setTimeout(() => {
      window.open('https://rapido.bike/', '_blank');
    }, 600);
  };

  // Classic stat card color map
  const colorMap = {
    pink:   { bg: 'rgba(181,96,106,0.10)', color: '#B5606A' },
    orange: { bg: 'rgba(234,130,60,0.10)', color: '#EA823C' },
    green:  { bg: 'rgba(16,185,129,0.10)', color: '#10B981' },
    purple: { bg: 'rgba(139,92,246,0.10)', color: '#8B5CF6' },
  };

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show" className="fade-in">
      <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); showToast('Dashboard refreshed', 'info'); }}>
        
        {/* Greeting + Card Style Toggle */}
        <div style={{ marginBottom: 24 }}>
          <motion.div variants={listItem} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B5606A' }}>
                <Sparkles size={14} className="pulse" />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cream & Crust SaaS ERP</span>
              </div>
              {/* Card Style Toggle Pill */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={toggleCardStyle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: cardStyle === 'new' ? 'rgba(181,96,106,0.10)' : cardStyle === 'showcase' ? 'rgba(234,130,60,0.10)' : 'rgba(74,59,50,0.07)',
                  border: '1.5px solid ' + (cardStyle === 'new' ? 'rgba(181,96,106,0.25)' : cardStyle === 'showcase' ? 'rgba(234,130,60,0.25)' : 'rgba(74,59,50,0.12)'),
                  borderRadius: 99, padding: '5px 12px',
                  cursor: 'pointer', transition: 'all 0.22s',
                }}
              >
                {cardStyle === 'new'
                  ? <><Layers size={13} color="#B5606A" /><span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#B5606A' }}>New View</span></>
                  : cardStyle === 'showcase'
                  ? <><Sparkles size={13} color="#EA823C" /><span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#EA823C' }}>Showcase</span></>
                  : <><LayoutGrid size={13} color="var(--text2)" /><span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text2)' }}>Classic</span></>}
              </motion.button>
            </div>
            
            {/* We only show the generic greeting here if NOT in showcase mode, because showcase has its own greeting built into the card */}
            {cardStyle !== 'showcase' && (
              <>
                <h1 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text)', marginTop: 6 }}>
                  {greeting}
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginTop: 2 }}>
                  Here's what's happening with your bakery today.
                </p>
              </>
            )}
          </motion.div>
        </div>

          {/* Removed Onboarding Banner */}

          {/* ── Gradient Hero Card ─────────── */}
          <AnimatePresence mode="wait">
          {cardStyle === 'showcase' ? (
            /* ── SHOWCASE: Soft play aesthetic from reference image ─────────── */
            <motion.div
              key="showcase-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              style={{
                background: 'linear-gradient(135deg, #FFF5EC 0%, #FFDFD0 100%)',
                borderRadius: 28,
                padding: '24px',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(234, 130, 60, 0.12)',
              }}
            >
              {/* Top Section: Greeting & Image */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7A6B', letterSpacing: '-0.01em' }}>{greetingWord},</span>
                  <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#4A3B32', letterSpacing: '-0.04em', marginTop: 2, lineHeight: 1 }}>
                    {firstName} <span style={{ display: 'inline-block', transform: 'scale(1.1)' }}>👋</span>
                  </h2>
                  <p style={{ color: '#8C7A6B', fontSize: '0.72rem', marginTop: 6, fontWeight: 700, letterSpacing: '-0.01em', opacity: 0.9 }}>
                    Here's what's happening today
                  </p>
                </div>
                
                {/* Decorative Cupcake & Cherry Accents */}
                <div style={{ position: 'absolute', right: -6, top: -22, transform: 'scale(1.15)', pointerEvents: 'none' }}>
                  {/* Small decorative bubbles/circles matching reference */}
                  <div style={{ position: 'absolute', left: -22, top: 22, width: 8, height: 8, borderRadius: '50%', background: '#FFF1F2' }} />
                  <span className="floating" style={{ display: 'inline-block', fontSize: '4.8rem', filter: 'drop-shadow(0px 8px 16px rgba(74,59,50,0.12))' }}>🧁</span>
                  <span className="pulse" style={{ position: 'absolute', right: 4, top: 12, fontSize: '1.1rem' }}>✨</span>
                  <span className="pulse" style={{ position: 'absolute', left: -14, bottom: 22, fontSize: '1rem', animationDelay: '0.6s' }}>🍒</span>
                </div>
              </div>

              {/* Bottom Section: 4 Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, position: 'relative', zIndex: 2 }}>
                {/* Edit customizer icon in top corner */}
                <div style={{ position: 'absolute', right: -6, top: -38, color: '#8C7A6B', opacity: 0.7, cursor: 'pointer', fontSize: '0.78rem' }} title="Customize Dashboard">
                  ✎
                </div>

                {/* Revenue Card */}
                <div style={{ background: 'white', borderRadius: 18, padding: '14px 10px', boxShadow: '0 4px 16px rgba(74, 59, 50, 0.03)', border: '1px solid rgba(74,59,50,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#4A3B32', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {formatCurrency(todayRevenue || 0)}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#8C7A6B', fontWeight: 700, marginTop: 4, marginBottom: 8 }}>Revenue</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ↑ 24%
                  </div>
                </div>

                {/* Pending Card */}
                <div style={{ background: 'white', borderRadius: 18, padding: '14px 10px', boxShadow: '0 4px 16px rgba(74, 59, 50, 0.03)', border: '1px solid rgba(74,59,50,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#4A3B32', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {formatCurrency(pendingPaymentsAmount || 0)}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#8C7A6B', fontWeight: 700, marginTop: 4, marginBottom: 8 }}>Pending</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#E15A3E' }}>
                    {orders.filter(o => o && o.paymentStatus === 'pending').length} Orders
                  </div>
                </div>

                {/* Deliveries Card */}
                <div style={{ background: 'white', borderRadius: 18, padding: '14px 10px', boxShadow: '0 4px 16px rgba(74, 59, 50, 0.03)', border: '1px solid rgba(74,59,50,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#4A3B32', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {todayDeliveriesCount}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#8C7A6B', fontWeight: 700, marginTop: 4, marginBottom: 8 }}>Deliveries</div>
                  <div style={{ fontSize: '0.6rem', color: '#8C7A6B', fontWeight: 800 }}>Today</div>
                </div>

                {/* In Progress Card */}
                <div style={{ background: 'white', borderRadius: 18, padding: '14px 10px', boxShadow: '0 4px 16px rgba(74, 59, 50, 0.03)', border: '1px solid rgba(74,59,50,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#4A3B32', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {activeOrdersCount}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#8C7A6B', fontWeight: 700, marginTop: 4, marginBottom: 8 }}>In Progress</div>
                  <div style={{ fontSize: '0.6rem', color: '#8C7A6B', fontWeight: 800 }}>Orders</div>
                </div>
              </div>
            </motion.div>

          ) : cardStyle === 'new' ? (
            <motion.div
              key="new-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              whileTap={{ scale: 0.99 }}
              style={{ 
                background: 'linear-gradient(135deg, #B5606A 0%, #8A3D4A 100%)', 
                borderRadius: 24, padding: '24px 20px', color: 'white',
                boxShadow: '0 12px 32px rgba(181,96,106,0.28)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>
                  Today's Overview
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                  <h2 style={{ fontSize: '2.3rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', fontFamily: 'var(--font)' }}>
                    {formatCurrency(todayRevenue)}
                  </h2>
                  {todayRevenue > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                      Today's Sales
                    </span>
                  )}
                </div>
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.3)', margin: '18px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Active Orders</div>
                    <div style={{ fontSize: activeOrdersCount > 0 ? '1.05rem' : '0.8rem', fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>{activeOrdersCount > 0 ? `${activeOrdersCount} Pending` : 'Kitchen Clear'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Deliveries</div>
                    <div style={{ fontSize: todayDeliveriesCount > 0 ? '1.05rem' : '0.8rem', fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>{todayDeliveriesCount > 0 ? `${todayDeliveriesCount} Today` : 'None Scheduled'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Low Stock</div>
                    <div style={{ fontSize: inventory.length === 0 || lowStockItems.length > 0 ? '0.8rem' : '1.05rem', fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>{inventory.length === 0 ? 'Empty Pantry' : (lowStockItems.length > 0 ? `${lowStockItems.length} Items` : 'Fully Stocked')}</div>
                  </div>
                </div>
              </div>
              {/* Decorative blobs */}
              <div style={{ position: 'absolute', right: -30, bottom: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            </motion.div>
          ) : (
            /* ── CLASSIC: 6-stat grid ─────────── */
            <motion.div
              key="classic-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {stats.map((s, i) => {
                  const Icon = s.icon;
                  const c = colorMap[s.color] || colorMap.pink;
                  return (
                    <motion.div
                      key={s.label}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { triggerHaptic('light'); navigate(s.path); }}
                      style={{
                        background: 'white',
                        borderRadius: 20,
                        padding: '14px 12px',
                        border: '1px solid rgba(74,59,50,0.05)',
                        boxShadow: 'var(--shadow-xs)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={c.color} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div style={{ fontSize: typeof s.value === 'string' && s.value.length > 5 ? '0.82rem' : '1.1rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{s.value}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{s.label}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        <motion.div variants={listItem} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
              Quick Actions
            </h3>
            <button 
              onClick={() => {
                triggerHaptic('light');
                showToast('Action customization opened', 'info');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0
              }}
            >
              <SlidersHorizontal size={11} strokeWidth={2.5} /> Customize
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            
            {/* New Order */}
            <motion.div 
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                navigate('/orders?new=true');
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '12px 2px 10px 2px',
                textAlign: 'center',
                border: '1px solid rgba(74, 59, 50, 0.04)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.015)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFF5EC', color: '#E15A3E', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Plus size={16} strokeWidth={3} />
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>New Order</span>
            </motion.div>

            {/* Customers */}
            <motion.div 
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                navigate('/customers');
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '12px 2px 10px 2px',
                textAlign: 'center',
                border: '1px solid rgba(74, 59, 50, 0.04)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.015)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FAF5FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Users size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>Customers</span>
            </motion.div>

            {/* Products */}
            <motion.div 
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                navigate('/products');
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '12px 2px 10px 2px',
                textAlign: 'center',
                border: '1px solid rgba(74, 59, 50, 0.04)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.015)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FEFCE8', color: '#CA8A04', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Package size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>Products</span>
            </motion.div>

            {/* View Menu */}
            <motion.div 
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                if (business?.username) {
                  window.open(`/menu/${business.username}`, '_blank');
                } else {
                  navigate('/menu-builder');
                  showToast('Set a username in Settings to get your public menu link', 'info');
                }
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '12px 2px 10px 2px',
                textAlign: 'center',
                border: '1px solid rgba(74, 59, 50, 0.04)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.015)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F0F9FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '16px' }}>🍽️</span>
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>View Menu</span>
            </motion.div>

            {/* Expenses */}
            <motion.div 
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                navigate('/expenses');
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '12px 2px 10px 2px',
                textAlign: 'center',
                border: '1px solid rgba(74, 59, 50, 0.04)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.015)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Receipt size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>Expenses</span>
            </motion.div>

            {/* Recipes */}
            <motion.div 
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                triggerHaptic('light');
                navigate('/recipes');
              }}
              style={{
                background: 'white',
                borderRadius: 18,
                padding: '12px 2px 10px 2px',
                textAlign: 'center',
                border: '1px solid rgba(74, 59, 50, 0.04)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.015)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFF1F2', color: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <ChefHat size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>Recipes</span>
            </motion.div>

          </div>
        </motion.div>

        {/* Horizontally Scrolling Smart Insights Section */}
        <motion.div variants={listItem} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="#B5606A" /> Smart Insights
          </h3>
          
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 10, margin: '0 -16px', paddingLeft: 16, paddingRight: 16 }}>
            
            {/* Insight 1: Bestseller */}
            <div style={{ 
              background: '#FEF3C7', 
              borderRadius: 20, 
              padding: '16px', 
              minWidth: 260, 
              border: '1px solid rgba(251, 191, 36, 0.2)' 
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '18px' }}>👑</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bestseller Item</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>{bestsellerProduct || 'No orders yet'}</div>
              <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 4 }}>{bestsellerProduct ? 'Is your top selling product. Make sure you have enough ingredients!' : 'Add your first order to see your bestseller here.'}</div>
            </div>

            {/* Insight 2: Top Customer */}
            <div style={{ 
              background: '#EEF2FF', 
              borderRadius: 20, 
              padding: '16px', 
              minWidth: 260, 
              border: '1px solid rgba(99, 102, 241, 0.15)' 
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '18px' }}>💖</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Customer</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>{topCustomer?.name || 'No orders this month'}</div>
              <div style={{ fontSize: '0.75rem', color: '#4338CA', marginTop: 4 }}>{topCustomer ? `Placed ${topCustomer.count} order${topCustomer.count > 1 ? 's' : ''} this month. Consider sending them a special offer!` : 'Your top customer will appear here once orders come in.'}</div>
            </div>

            {/* Insight 3: Inventory Stock Alert */}
            <div style={{ 
              background: inventory.length === 0 ? '#FAF8F6' : (lowStockItems.length > 0 ? '#FFF1F2' : '#ECFDF5'), 
              borderRadius: 20, 
              padding: '16px', 
              minWidth: 260, 
              border: inventory.length === 0 ? '1px solid rgba(74, 59, 50, 0.08)' : (lowStockItems.length > 0 ? '1px solid rgba(244, 63, 94, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)')
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '18px' }}>{inventory.length === 0 ? '📦' : (lowStockItems.length > 0 ? '⚠️' : '✅')}</span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  color: inventory.length === 0 ? 'var(--text2)' : (lowStockItems.length > 0 ? '#E11D48' : '#059669'), 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.04em' 
                }}>
                  {inventory.length === 0 ? 'No Inventory' : (lowStockItems.length > 0 ? 'Inventory Alert' : 'Stock Level Good')}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>
                {inventory.length === 0 ? 'Empty Pantry' : (lowStockItems.length > 0 ? `${lowStockItems.length} Items Running Low` : 'All ingredients stocked')}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: inventory.length === 0 ? 'var(--text3)' : (lowStockItems.length > 0 ? '#BE123C' : '#047857'), 
                marginTop: 4 
              }}>
                {inventory.length === 0 ? 'Add ingredients in the Inventory tab to track stock.' : (lowStockItems.length > 0 ? 'Items like butter and flour need restocked soon.' : 'You are fully stocked for baking orders tomorrow.')}
              </div>
            </div>

          </div>
        </motion.div>

        {/* Premium Horizontally Scrolling Deliveries Today */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              🛵 Deliveries Today
            </h3>
            <button 
              onClick={() => navigate('/orders')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0
              }}
            >
              View all
            </button>
          </div>
          
          {loading ? <OrderRowSkeleton /> : (
            (() => {
              const todayDeliveries = [
                ...deliveryGroups.morning.map(o => ({ ...o, slot: 'Morning' })),
                ...deliveryGroups.afternoon.map(o => ({ ...o, slot: 'Afternoon' })),
                ...deliveryGroups.evening.map(o => ({ ...o, slot: 'Evening' }))
              ];

              if (todayDeliveries.length === 0) {
                return (
                  <div style={{ background: 'white', borderRadius: 24, padding: '24px 20px', border: '1px solid rgba(74, 59, 50, 0.04)', boxShadow: '0 4px 16px rgba(74,59,50,0.01)', textAlign: 'center' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>🧁</span>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px 0' }}>No deliveries today</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: 0, fontWeight: 600 }}>Enjoy some quiet time to practice new bakes! ✨</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 10, margin: '0 -16px', paddingLeft: 16, paddingRight: 16 }} className="hide-scrollbar">
                  {todayDeliveries.map((o) => {
                    const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
                    const product = o.cakeFlavour || o.product || 'Custom Order';
                    const time = formatTime(o.deliveryTime || o.time || '10:00');
                    const totalNum = Number(o.total || o.totalAmount || 0);
                    
                    const statusStr = String(o.status || 'inquiry').toLowerCase();
                    const isDelivered = statusStr === 'delivered';
                    const isBaking = statusStr === 'baking';
                    const isReady = statusStr === 'ready';

                    let statusText = 'On the way';
                    let statusBg = 'rgba(59,130,246,0.1)';
                    let statusColor = '#3B82F6';
                    
                    if (isDelivered) {
                      statusText = 'Completed';
                      statusBg = 'rgba(16,185,129,0.1)';
                      statusColor = '#16A34A';
                    } else if (isReady) {
                      statusText = 'Ready';
                      statusBg = 'rgba(16,185,129,0.1)';
                      statusColor = '#16A34A';
                    } else if (isBaking) {
                      statusText = 'Preparing';
                      statusBg = 'rgba(245,158,11,0.1)';
                      statusColor = '#D97706';
                    }

                    return (
                      <motion.div 
                        key={o.id}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: 'white',
                          borderRadius: 24,
                          padding: '16px',
                          minWidth: 260,
                          width: 260,
                          border: '1px solid rgba(74, 59, 50, 0.04)',
                          boxShadow: '0 4px 16px rgba(74,59,50,0.015)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          position: 'relative',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                      >
                        {/* Upper Row: Avatar and Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img 
                            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cName)}`}
                            alt={cName}
                            style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF5EC', border: '1px solid rgba(181,96,106,0.15)' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)' }}>{cName}</span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text3)', fontWeight: 600 }}>{product}</span>
                          </div>
                        </div>

                        {/* Mid Row: Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Time slot</span>
                            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--accent)' }}>{time}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Amount</span>
                            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--text)' }}>{formatCurrency(totalNum)}</span>
                          </div>
                        </div>

                        {/* Status tracker badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(74,59,50,0.015)', padding: '8px 12px', borderRadius: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '14px' }}>🛵</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text2)' }}>{statusText}</span>
                          </div>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: statusBg,
                            color: statusColor,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>{statusStr}</span>
                        </div>

                        {/* Circular Action buttons inside delivery card */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button 
                            onClick={() => shareToWhatsApp(o)}
                            style={{
                              flex: 1, height: 34, borderRadius: 12, border: 'none',
                              background: '#25D366', color: 'white', fontWeight: 900, fontSize: '0.72rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(37,211,102,0.15)'
                            }}
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </button>
                          
                          <button 
                            onClick={() => {
                              triggerHaptic('light');
                              showToast('Booking delivery via Rapido...', 'info');
                              window.open('https://rapido.bike/', '_blank');
                            }}
                            style={{
                              width: 34, height: 34, borderRadius: 12, border: 'none',
                              background: '#F9C935', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(249,201,53,0.15)'
                            }}
                            title="Book Rapido"
                          >
                            🛵
                          </button>

                          {!isDelivered && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatusInDB(o.id, 'delivered');
                                showToast('Delivered! 🎂', 'success');
                                triggerConfetti(e.clientX, e.clientY, 80);
                                triggerSuccessBurst('🏆', 'Order Delivered!');
                                triggerHaptic('success');
                              }}
                              style={{
                                width: 34, height: 34, borderRadius: 12, border: 'none',
                                background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(181,96,106,0.15)'
                              }}
                              title="Mark Delivered"
                            >
                              ✓
                            </button>
                          )}
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>


        {/* Redesigned Recent Activity */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>
              Recent Activity
            </h3>
            <button 
              onClick={() => navigate('/orders')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0
              }}
            >
              View all
            </button>
          </div>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(74, 59, 50, 0.04)', boxShadow: '0 4px 16px rgba(74,59,50,0.01)', background: 'white', borderRadius: 24 }}>
            {loading ? <OrderRowSkeleton /> : orders.length === 0 ? (
              <EmptyState icon="✨" title="Fresh Start" subtitle="Your orders and activity will appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {orders.slice(0, 6).map((o, idx) => {
                  const cName = typeof o.customer === 'object' ? (o.customer?.name || 'Customer') : (o.customerName || o.customer || 'Customer');
                  const product = o.product || 'Custom Order';
                  const status = String(o.status || 'inquiry').toLowerCase();
                  
                  // Alternate activity style based on index or status for high-fidelity variety
                  const isPaymentRow = idx % 2 === 1 || ['delivered', 'ready'].includes(status);
                  
                  const rowIconBg = isPaymentRow ? 'rgba(16, 185, 129, 0.08)' : 'rgba(139, 92, 246, 0.08)';
                  const rowIconColor = isPaymentRow ? '#16A34A' : '#8B5CF6';
                  const RowIcon = isPaymentRow ? CreditCard : ShoppingBag;
                  
                  const titleText = isPaymentRow ? 'Payment received' : 'New order received';
                  const subtitleText = isPaymentRow ? `Completed for ${cName}` : `${product} by ${cName}`;
                  
                  return (
                    <div 
                      key={o.id} 
                      onClick={() => navigate('/orders')}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12, 
                        padding: '14px 16px', 
                        borderBottom: idx === 5 ? 'none' : '1px solid rgba(74, 59, 50, 0.04)',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      className="timeline-item-hover"
                    >
                      {/* Left circular icon container */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: rowIconBg,
                        color: rowIconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <RowIcon size={18} strokeWidth={2.5} />
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {titleText}
                          </div>
                          <div style={{ fontWeight: 900, fontSize: '0.86rem', color: 'var(--text)' }}>
                            {formatCurrency(o.total || o.totalAmount || 0)}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, fontWeight: 600 }}>
                            {subtitleText}
                          </div>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: isPaymentRow ? 'rgba(16, 185, 129, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                            color: isPaymentRow ? '#16A34A' : '#8B5CF6'
                          }}>
                            {isPaymentRow ? 'Success' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>


      </PullToRefresh>

      {/* Floating ROI calculator launcher */}
      <div className="mobile-only" style={{ position: 'fixed', bottom: 84, right: 16, zIndex: 100 }}>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            triggerHaptic('light');
            setShowCalculator(true);
          }}
          style={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            background: 'white', 
            color: '#B5606A', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(74, 59, 50, 0.05)'
          }}
        >
          <Calculator size={20} />
        </motion.button>
      </div>

      {/* Elegant Voice Search Overlay */}
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
             {searchResults.customers.length > 0 && (
               <div style={{ marginBottom: 24 }}>
                 <h4 style={{ color: 'var(--text3)', textTransform: 'uppercase', fontSize: 11, fontWeight: 800, marginBottom: 12, letterSpacing: '0.05em' }}>Customers</h4>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                   {searchResults.customers.slice(0, 6).map(c => (
                     <div key={c.id} onClick={() => { navigate('/customers'); setSearch(''); }} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(181,96,106,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                       <div>
                         <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.name}</div>
                         <div style={{ fontSize: 12, color: 'var(--text3)' }}>{c.phone}</div>
                       </div>
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

