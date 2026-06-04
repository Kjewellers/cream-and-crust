import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { printInvoice } from '../utils/invoice';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { business } = useAuth();
  const [tab, setTab] = useState('dashboard'); // dashboard, orders, products
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product Form State
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', description: '', sizes: [{label: 'Regular', price: ''}], image: null, imageUrl: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getAnalytics(), api.getOrders(), api.getProducts()])
      .then(([analyticsRes, ordersRes, productsRes]) => {
        setData(analyticsRes);
        setOrders(ordersRes);
        setProducts(productsRes);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalImageUrl = formData.imageUrl;

      if (formData.image) {
        const uploadRes = await api.uploadImage(formData.image);
        if (uploadRes.success) {
          finalImageUrl = uploadRes.url;
        }
      }

      const productPayload = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        sizes: formData.sizes.map(s => ({ label: s.label, price: Number(s.price) })),
        imageUrl: finalImageUrl,
        available: true,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, productPayload);
      } else {
        await api.createProduct(productPayload);
      }
      
      setShowProductForm(false);
      setEditingProduct(null);
      fetchData(); // Refresh data
    } catch (err) {
      alert('Error saving product');
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await api.deleteProduct(id);
      fetchData();
    }
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price || '',
      sizes: product.sizes && product.sizes.length > 0 ? product.sizes : [{label: 'Regular', price: product.price}],
      image: null,
      imageUrl: product.imageUrl || ''
    });
    setShowProductForm(true);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading Admin...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Admin Panel</h1>
        <div className="admin-tabs" style={{ display: 'flex', gap: '1rem' }}>
          <button className={`btn ${tab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('dashboard')}>Dashboard</button>
          <button className={`btn ${tab === 'orders' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('orders')}>Orders</button>
          <button className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('products')}>Products</button>
        </div>
      </div>

      {tab === 'dashboard' && data && (
        <>
          <div className="product-grid" style={{ marginBottom: '3rem' }}>
            <div className="card"><h3>Today's Orders</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-chocolate)' }}>{data.todayOrders}</p></div>
            <div className="card"><h3>Today's Revenue</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-chocolate)' }}>₹{data.todayRevenue}</p></div>
            <div className="card"><h3>Total Customers</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-chocolate)' }}>{data.totalCustomers}</p></div>
            <div className="card"><h3>Pending Orders</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-chocolate)' }}>{data.pendingOrders}</p></div>
          </div>
          <div className="card">
            <h3>Top Products</h3>
            <ul style={{ listStyle: 'none', marginTop: '1rem' }}>
              {data.topProducts.map((p, i) => (
                <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.name}</span><strong>{p.count} sold</strong>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'orders' && (
        <div className="card">
          <h2>Order History</h2>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #C8956C', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 0' }}>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>{order.id}</td>
                    <td><div>{order.customer.name}</div><div style={{ fontSize: '0.8rem', color: '#666' }}>{order.customer.phone}</div></td>
                    <td>{new Date(order.createdAt || order.date).toLocaleDateString()}</td>
                    <td>₹{order.total}</td>
                    <td>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: order.paymentStatus === 'paid' ? '#E8F5E9' : '#FFF3E0', color: order.paymentStatus === 'paid' ? '#2E7D32' : '#E65100' }}>
                        {order.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => printInvoice(order, business)}>Print Bill</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'products' && !showProductForm && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Product Catalog</h2>
            <button className="btn btn-primary" onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', price: '', description: '', sizes: [{label: 'Regular', price: ''}], image: null, imageUrl: '' });
              setShowProductForm(true);
            }}>+ Add Product</button>
          </div>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #C8956C', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 0' }}>Image</th><th>Name</th><th>Base Price</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem 0' }}>
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} /> : <div style={{ fontSize: '24px' }}>{product.emoji || '🧁'}</div>}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{product.name}</td>
                    <td>₹{product.price}</td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => openEditForm(product)}>Edit</button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'red', borderColor: 'red' }} onClick={() => handleDeleteProduct(product.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'products' && showProductForm && (
        <div className="card">
          <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleProductSubmit} style={{ marginTop: '2rem', maxWidth: '600px' }}>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Base Price (₹)</label>
              <input required type="number" className="form-input" value={formData.price} onChange={e => {
                const val = e.target.value;
                const newSizes = [...formData.sizes];
                newSizes[0].price = val;
                setFormData({...formData, price: val, sizes: newSizes});
              }} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea required className="form-input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>

            <div className="form-group" style={{ padding: '1rem', border: '1px dashed #ccc', borderRadius: '8px' }}>
              <label className="form-label">Product Image</label>
              {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', marginBottom: '1rem', borderRadius: '8px' }} />}
              <input type="file" accept="image/*" onChange={e => setFormData({...formData, image: e.target.files[0]})} style={{ width: '100%' }} />
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Upload a JPEG or PNG photo of the product.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary">Save Product</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProductForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
