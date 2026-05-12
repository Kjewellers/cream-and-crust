import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ShoppingBag, Send, CheckCircle2, Loader2, MapPin, Calendar, Clock } from 'lucide-react';
import { getBusinessByUsername, addOrderToDB, addNotificationToDB } from '../services/db';
import { formatCurrency } from '../utils/date';
import { showToast, triggerHaptic } from '../components/iOS';

export default function PublicOrderForm() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [baker, setBaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    product: '',
    quantity: '1',
    date: '',
    time: '',
    instructions: '',
    address: ''
  });

  useEffect(() => {
    const fetchBaker = async () => {
      const data = await getBusinessByUsername(username);
      if (data) {
        setBaker(data);
      } else {
        showToast('Baker not found', 'error');
      }
      setLoading(false);
    };
    fetchBaker();
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    triggerHaptic('medium');

    try {
      const orderData = {
        customerName: form.name,
        phone: form.phone,
        product: form.product,
        quantity: form.quantity,
        deliveryDate: form.date,
        deliveryTime: form.time,
        notes: form.instructions,
        deliveryAddress: form.address,
        userId: baker.userId, // Link to baker
        status: 'new',
        via: 'Public Form',
        createdAt: new Date().toISOString()
      };

      await addOrderToDB(orderData);
      
      // Notify baker
      await addNotificationToDB({
        userId: baker.userId,
        title: 'New Order Received! 🎂',
        message: `${form.name} placed an order for ${form.product}`,
        type: 'order'
      });

      setSubmitted(true);
      triggerHaptic('success');
    } catch (error) {
      console.error(error);
      showToast('Failed to submit order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Loader2 className="animate-spin" size={32} color="var(--accent)" />
    </div>
  );

  if (!baker) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20 }}>🧁</div>
      <h2>Store Not Found</h2>
      <p style={{ color: 'var(--text3)', maxWidth: 300 }}>The baker you're looking for doesn't seem to have a public order form yet.</p>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>Go to Home</button>
    </div>
  );

  if (submitted) return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center', background: 'var(--bg)' }}
    >
      <div style={{ background: 'var(--cream)', padding: 40, borderRadius: 24, boxShadow: 'var(--shadow-xl)', maxWidth: 400, width: '100%' }}>
        <CheckCircle2 size={80} color="#2E7A5A" style={{ marginBottom: 24 }} />
        <h2 style={{ fontSize: '1.8rem', marginBottom: 12 }}>Order Placed!</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 30 }}>Your order has been sent to <strong>{baker.name}</strong>. They will contact you shortly to confirm.</p>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSubmitted(false)}>Place Another Order</button>
      </div>
    </motion.div>
  );

  return (
    <div className="public-page" style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--accent), var(--accent2))', 
        height: 180, 
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '0 20px 20px'
      }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 20, 
          background: 'white', 
          padding: 4, 
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {baker.logo && baker.logo.startsWith('data:image') ? (
            <img src={baker.logo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ fontSize: '2.5rem' }}>{baker.logo || '🧁'}</div>
          )}
        </div>
        <div style={{ marginLeft: 16, color: 'white', paddingBottom: 8 }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'white' }}>{baker.name}</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: 0 }}>{baker.tagline || 'Custom Cakes & More'}</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '-20px auto 0', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div className="card" style={{ padding: 24, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <ShoppingBag size={22} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Order Form</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Rahul Kapoor" />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="10-digit number" maxLength={10} />
            </div>

            <div className="form-group">
              <label className="form-label">What would you like to order?</label>
              <input required value={form.product} onChange={e => setForm({...form, product: e.target.value})} placeholder="e.g. Chocolate Truffle Cake, 1kg" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Delivery Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text3)' }} />
                  <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ paddingLeft: 40 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text3)' }} />
                  <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} style={{ paddingLeft: 40 }} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text3)' }} />
                <textarea required value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address for delivery" rows={2} style={{ paddingLeft: 40 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Special Instructions</label>
              <textarea value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} placeholder="Message on cake, allergies, etc." rows={3} />
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: 54, fontSize: '1.1rem', marginTop: 10 }}>
              {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Submit Order</>}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 30, color: 'var(--text3)', fontSize: '0.85rem' }}>
          Powered by <strong>Cream & Crust</strong>
        </div>
      </div>
    </div>
  );
}
