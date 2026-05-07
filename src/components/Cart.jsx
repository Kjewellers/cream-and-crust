import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../App';
import { api } from '../api';

export default function Cart() {
  const { cart, setCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + item.size.price * item.qty, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Your cart is empty!');
    
    setSubmitting(true);
    try {
      const orderData = {
        customer: form,
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          size: item.size.label,
          price: item.size.price,
          qty: item.qty
        })),
        total: cartTotal,
        status: 'new',
        paymentStatus: 'pending'
      };
      
      await api.createOrder(orderData);
      setCart([]);
      alert('Order placed successfully! We will contact you soon.');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Your Cart is Empty</h2>
        <button className="btn btn-primary" onClick={() => navigate('/menu')} style={{ marginTop: '2rem' }}>
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <div>
        <h2>Your Order</h2>
        <div style={{ marginTop: '2rem' }}>
          {cart.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{item.product.name}</strong>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Size: {item.size.label}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Qty: {item.qty}</div>
              </div>
              <div style={{ fontWeight: 'bold' }}>
                ₹{item.size.price * item.qty}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', fontSize: '1.25rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span>₹{cartTotal}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Checkout details</h2>
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              required
              type="text" 
              className="form-input" 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number (WhatsApp)</label>
            <input 
              required
              type="tel" 
              className="form-input" 
              value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Address (Optional for Pickup)</label>
            <textarea 
              className="form-input" 
              rows="3"
              value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
            ></textarea>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={submitting}>
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
