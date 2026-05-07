import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, MessageCircle, Printer, ChevronDown, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToOrders, addOrderToDB, updateOrderStatusInDB } from '../services/db';
import { shareToWhatsApp } from '../services/whatsapp';
import { useAuth } from '../context/AuthContext';

const statusFlow = ['inquiry', 'confirmed', 'baking', 'ready', 'delivered'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer: '', phone: '', instagram: '', product: '', flavor: '', size: '', date: '', time: '', type: 'delivery', notes: '', total: '', advance: '' });

  const { currentUser, isCustomer } = useAuth();

  useEffect(() => {
    // If the user is a customer, only fetch their orders. Admin fetches all.
    const userIdFilter = isCustomer ? currentUser?.uid : null;
    const unsubscribe = subscribeToOrders((newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    }, userIdFilter);
    return () => unsubscribe();
  }, [isCustomer, currentUser]);

  const filtered = orders.filter(o => {
    const searchLower = search.toLowerCase();
    const matchesSearch = o.customer?.toLowerCase().includes(searchLower) || o.id?.toLowerCase().includes(searchLower);
    const matchesFilter = filter === 'all' || o.status === filter;
    return matchesSearch && matchesFilter;
  });

  const updateStatus = async (id, currentStatus) => {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx < statusFlow.length - 1) {
      await updateOrderStatusInDB(id, statusFlow[idx + 1]);
    }
  };

  const addOrder = async (e) => {
    e.preventDefault();
    const newOrder = { 
      ...form, 
      status: 'inquiry', 
      advance: Number(form.advance) || 0, 
      total: Number(form.total) || 0, 
      via: form.instagram ? 'Instagram' : 'WhatsApp',
      orderId: `CC-${String(orders.length + 101).padStart(3, '0')}`,
      userId: currentUser?.uid || null
    };
    await addOrderToDB(newOrder);
    setShowModal(false);
    setForm({ customer: '', phone: '', instagram: '', product: '', flavor: '', size: '', date: '', time: '', type: 'delivery', notes: '', total: '', advance: '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Orders</h1><p>Manage all your bakery orders in real-time</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> New Order</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text3)' }} />
          <input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 40 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', ...statusFlow].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card table-card">
        {loading ? (
           <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Connecting to database...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Delivery</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(o => (
                    <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} layout>
                      <td><div style={{ fontWeight: 600 }}>{o.orderId || o.id.slice(0, 5)}</div><div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>via {o.via === 'Instagram' ? '📷' : '💬'} {o.via}</div></td>
                      <td><div style={{ fontWeight: 500 }}>{o.customer}</div><div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{o.phone}</div></td>
                      <td><div>{o.product}</div><div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{o.flavor} · {o.size}</div></td>
                      <td><div style={{ fontSize: '0.85rem' }}>{o.date}</div><div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{o.time} · {o.type}</div></td>
                      <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                      <td><div style={{ fontWeight: 600 }}>₹{o.total?.toLocaleString()}</div><div style={{ fontSize: '0.72rem', color: o.advance >= o.total ? '#3D8B6A' : 'var(--accent2)' }}>{o.advance >= o.total ? '✓ Paid' : `₹${o.advance} adv`}</div></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {o.status !== 'delivered' && <button className="btn-icon" title="Next Status" onClick={() => updateStatus(o.id, o.status)}><Check size={16} /></button>}
                          <button className="btn-icon" title="Send WhatsApp Invoice" onClick={() => shareToWhatsApp(o)} style={{ color: '#25D366' }}>
                            <MessageCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setShowModal(true)}><Plus /></button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>New Order</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addOrder}>
              <div className="form-grid">
                <div className="form-group full"><label className="form-label">Customer Name</label><input required value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Instagram</label><input placeholder="@username" value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Product</label><input required value={form.product} onChange={e => setForm({...form, product: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Flavor</label><input value={form.flavor} onChange={e => setForm({...form, flavor: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Size / Weight</label><input value={form.size} onChange={e => setForm({...form, size: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Delivery Date</label><input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Time</label><input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Total Amount (₹)</label><input type="number" required value={form.total} onChange={e => setForm({...form, total: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Advance Paid (₹)</label><input type="number" value={form.advance} onChange={e => setForm({...form, advance: e.target.value})} /></div>
                <div className="form-group full"><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} style={{ width: '100%' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Order</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
