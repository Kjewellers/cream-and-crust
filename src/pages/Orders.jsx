import React, { useState, useEffect } from 'react';
import { Plus, Search, MessageCircle, Check, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, subscribeToCustomers, addOrderToDB, updateOrderStatusInDB, addCustomerToDB } from '../services/db';
import { shareToWhatsApp } from '../services/whatsapp';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, formatCurrency, formatOrderNumber } from '../utils/date';
import {
  OrderRowSkeleton, EmptyState, showToast,
  SegmentedControl, SwipeRow, BottomSheet,
  PullToRefresh, shareContent, triggerHaptic
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

function OrderRow({ o, allOrders, onAdvance, onWhatsApp, onCustomerClick, onRapido, onOrderClick }) {
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
          <motion.button whileTap={{ scale: 0.86 }} className="btn-icon" title="Book Rapido" onClick={(e) => { e.stopPropagation(); onRapido(o); }}
            style={{ background: '#F9C935', color: '#000', width: 34, height: 34, borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
            🛵
          </motion.button>
        </div>
      </td>
    </motion.tr>
  );
}

function MobileOrderCard({ o, allOrders, onAdvance, onWhatsApp, onCustomerClick, onRapido, onOrderClick }) {
  const cName = typeof o.customer === 'object'
    ? (o.customer?.name || 'Customer')
    : (o.customerName || o.customer || 'Customer');
  const pName = o.product || (o.items && o.items[0]?.name) || 'Custom Order';
  const totalNum = Number(o.total) || Number(o.totalAmount) || 0;
  const advNum   = Number(o.advance) || 0;
  const isPaid   = advNum >= totalNum && totalNum > 0;
  const orderId  = formatOrderNumber(o, allOrders);
  const isDelivered = String(o.status).toLowerCase() === 'delivered';

  return (
    <motion.div variants={listItem} layout>
      <SwipeRow
        onWhatsApp={() => onWhatsApp(o)}
      >
        <div style={{ padding: '14px 4px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => onOrderClick(o)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{orderId}</div>
              <div 
                onClick={(e) => { e.stopPropagation(); onCustomerClick(o); }}
                style={{ fontWeight: 600, fontSize: 15, marginTop: 2, cursor: 'pointer', display: 'inline-block', borderBottom: '1px dashed var(--border)' }}
              >
                {cName}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 1 }}>{pName}</div>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {formatDate(o.date || o.createdAt)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: isPaid ? '#2E7A5A' : 'var(--accent2)' }}>
                {isPaid ? '✓ Fully Paid' : `${formatCurrency(advNum)} adv · ${formatCurrency(totalNum - advNum)} due`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(totalNum)}</div>
              {!isDelivered && (
                <motion.button whileTap={{ scale: 0.86 }}
                  onClick={(e) => { e.stopPropagation(); onAdvance(o); }}
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} />
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.86 }}
                onClick={(e) => { e.stopPropagation(); onRapido(o); }}
                style={{ width: 36, height: 36, borderRadius: 10, background: '#F9C935', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🛵
              </motion.button>
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
  const { currentUser, isCustomer } = useAuth();

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

  const filtered = (orders || []).filter(o => {
    if (!o) return false;
    const searchLower = search.toLowerCase();
    const c = o.customer;
    const customerName = typeof c === 'object' ? (c?.name || '') : String(c || '');
    const matchesSearch = !search || customerName.toLowerCase().includes(searchLower) || String(o.orderId || o.id || '').toLowerCase().includes(searchLower) || (o.product || '').toLowerCase().includes(searchLower);
    const matchesFilter = filter === 'all' || String(o.status).toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const updateStatus = async (o) => {
    const idx = statusFlow.indexOf(String(o.status).toLowerCase());
    if (idx < statusFlow.length - 1) {
      const next = statusFlow[idx + 1];
      await updateOrderStatusInDB(o.id, next);
      triggerHaptic('medium');
      showToast(`Order ${o.orderId || '#'} → ${next.charAt(0).toUpperCase() + next.slice(1)}`, 'success');
    }
  };

  const handleWhatsApp = (o) => {
    shareToWhatsApp(o);
    showToast('Opening WhatsApp...', 'info', 2000);
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
        
        <div className="form-group full">
          <label className="form-label">Balance Due (₹)</label>
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontWeight: 700, color: '#C4574A' }}>
             ₹{Math.max(0, (Number(form.total) || 0) - (Number(form.advance) || 0)).toLocaleString('en-IN')}
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
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: '0 auto', animation: 'fade-in 0.3s ease-out' }}>
        <div style={{ background: 'var(--cream)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40 }}>🧁</div>
            <h2 style={{ margin: '10px 0 0', color: 'var(--accent2)' }}>Order Confirmed</h2>
            <div style={{ color: 'var(--text3)' }}>{o.orderId}</div>
          </div>
          
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{o.customer}</div>
            <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>{o.phone}</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>DATE</div>
                <div style={{ fontWeight: 600 }}>{formatDate(o.date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>TIME</div>
                <div style={{ fontWeight: 600 }}>{formatTime(o.time) || 'TBD'}</div>
              </div>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>PRODUCT</div>
              <div style={{ fontWeight: 600 }}>{o.product} {o.size ? `· ${o.size}` : ''}</div>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>DELIVERY ADDRESS</div>
              <div style={{ fontWeight: 600 }}>{o.deliveryAddress || 'Pickup'}</div>
              {o.mapsLink && <a href={o.mapsLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>📍 View on Maps</a>}
            </div>
            
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>TOTAL</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{formatCurrency(o.total)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => handleWhatsApp(o)} style={{ display: 'flex', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', border: 'none' }}>
              <MessageCircle size={18} /> Share on WhatsApp
            </button>
            {o.deliveryAddress && (
              <button className="btn btn-primary" onClick={() => handleRapidoBooking(o)} style={{ display: 'flex', justifyContent: 'center', gap: 8, background: '#F9C935', color: '#000', border: 'none' }}>
                🛵 Book Rapido
              </button>
            )}
            <button className="btn btn-outline" onClick={() => window.print()} style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              📥 Download Card
            </button>
            <button className="btn btn-outline" onClick={() => setGeneratedOrderCard(null)} style={{ display: 'flex', justifyContent: 'center', gap: 8, border: 'none', color: 'var(--text2)' }}>
              👁️ View All Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.08 } } }} initial="hidden" animate="show">
      {/* Header */}
      <motion.div
        variants={listItem}
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1>Orders</h1>
          <p>Manage all your bakery orders in real-time</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          className="btn btn-primary desktop-only"
          onClick={() => setShowModal(true)}
          style={{ flexShrink: 0 }}
        >
          <Plus size={18} /> New Order
        </motion.button>
      </motion.div>

      {/* Search + Filter */}
      <motion.div variants={listItem} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.2s' }} />
          <motion.input
            animate={{ boxShadow: searchFocused ? '0 0 0 4px rgba(212,113,74,0.14)' : '0 0 0 0px rgba(212,113,74,0)' }}
            transition={{ duration: 0.22 }}
            placeholder="Search orders, customers, products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ paddingLeft: 42, paddingRight: search ? 40 : 14 }}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'var(--text3)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
              >
                <X size={11} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Segmented Control (desktop) */}
        <div className="desktop-only" style={{ overflowX: 'auto' }}>
          <SegmentedControl options={segOptions} value={filter} onChange={setFilter} />
        </div>
        {/* Pill filters (mobile) */}
        <div className="mobile-only">
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {segOptions.map(opt => (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.92 }}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: filter === opt.value ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
                color: filter === opt.value ? 'white' : 'var(--text2)',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </motion.button>
          ))}
          </div>
        </div>
      </motion.div>

      {/* Table — desktop */}
      <motion.div variants={listItem} className="card desktop-only" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🎂" title="No orders yet" subtitle="Create your first order to get started. Swipe left on mobile to reveal quick actions." action={() => setShowModal(true)} actionLabel="+ New Order" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Product</th>
                  <th>Delivery</th><th>Status</th><th>Payment</th><th>Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={listContainer} initial="hidden" animate="show">
                <AnimatePresence>
                  {filtered.map(o => (
                    <OrderRow key={o.id} o={o} allOrders={orders} onAdvance={updateStatus} onWhatsApp={handleWhatsApp} onRapido={handleRapidoBooking} onCustomerClick={openCustomerProfile} onOrderClick={setGeneratedOrderCard} />
                  ))}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Card list — mobile */}
      <motion.div variants={listItem} className="mobile-only">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          [...Array(4)].map((_, i) => <OrderRowSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="🎂" title="No orders yet" subtitle="Tap + to create your first order." action={() => setShowModal(true)} actionLabel="+ New Order" />
        ) : (
          <motion.div variants={listContainer} initial="hidden" animate="show">
            <AnimatePresence>
              {filtered.map(o => (
                <MobileOrderCard key={o.id} o={o} allOrders={orders} onAdvance={updateStatus} onWhatsApp={handleWhatsApp} onRapido={handleRapidoBooking} onCustomerClick={openCustomerProfile} onOrderClick={setGeneratedOrderCard} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        </div>
      </motion.div>

      {/* FAB */}
      <motion.button
        variants={fabVariants}
        initial="hidden"
        animate="show"
        whileTap={{ scale: 0.88 }}
        className="fab"
        onClick={() => setShowModal(true)}
      >
        <Plus size={22} />
      </motion.button>

      {/* Desktop Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay desktop-only" onClick={() => setShowModal(false)}>
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="modal"
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <h2>New Order</h2>
                <motion.button whileTap={{ scale: 0.9 }} className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></motion.button>
              </div>
              {modalForm}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet on Mobile */}
      <div className="mobile-only">
        <BottomSheet open={showModal} onClose={() => setShowModal(false)} title="New Order">
          {modalForm}
        </BottomSheet>
      </div>

      {/* Customer Profile Modal */}
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
                <div style={{ flex: 1, background: 'var(--cream)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>LIFETIME SPENT</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent2)', marginTop: 6 }}>{formatCurrency(selectedCustomerProfile.totalSpent || 0)}</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
