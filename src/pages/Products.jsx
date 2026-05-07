import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToProducts, addProductToDB } from '../services/db';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Cakes', basePrice: '', flavors: '', prepTime: '', emoji: '🎂', variants: '', bestseller: false });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToProducts((newProducts) => {
      setProducts(newProducts);
      setLoading(false);
    }, (error) => {
      console.error("Products subscription error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()));

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const productData = {
      name: form.name,
      category: form.category,
      basePrice: Number(form.basePrice),
      flavors: form.flavors,
      prepTime: form.prepTime,
      variants: form.variants || 'Regular',
      emoji: form.emoji,
      bestseller: form.bestseller,
      imageUrl: null
    };

    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        productData.imageUrl = reader.result;
        await addProductToDB(productData);
        closeModal();
      };
      reader.readAsDataURL(imageFile);
    } else {
      await addProductToDB(productData);
      closeModal();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ name: '', category: 'Cakes', basePrice: '', flavors: '', prepTime: '', emoji: '🎂', variants: '', bestseller: false });
    setImageFile(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Product Catalog</h1><p>Manage your bakery menu and pricing in real-time</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Add Product</button>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 400, position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text3)' }} />
        <input placeholder="Search products or categories..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 40 }} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading menu...</div>
      ) : (
        <div className="product-grid">
          <AnimatePresence>
            {filtered.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} layout className="product-card">
                <div className="product-img" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {!p.imageUrl && p.emoji}
                  {p.bestseller && <span className="product-bestseller">Bestseller</span>}
                </div>
                <div className="product-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4>{p.name}</h4>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" style={{ width: 28, height: 28 }}><Edit2 size={14} /></button>
                    </div>
                  </div>
                  <p>{p.category} · Prep: {p.prepTime}</p>
                  <p style={{ fontSize: '0.75rem', marginBottom: 16 }}>Flavors: {p.flavors}</p>
                  
                  <div className="product-footer">
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Starts from</div>
                      <div className="product-price">₹{p.basePrice}</div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{p.variants}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>Add New Product</h2>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Upload Product Photo</label>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ background: 'var(--bg)', padding: '8px' }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4 }}>Optional. If skipped, the Emoji Icon will be used.</div>
                </div>
                <div className="form-group full"><label className="form-label">Product Name</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>Cakes</option><option>Cupcakes</option><option>Brownies</option><option>Cookies</option><option>Dessert Boxes</option></select></div>
                <div className="form-group"><label className="form-label">Base Price (₹)</label><input type="number" required value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Variants (Weights/Sizes)</label><input placeholder="e.g. 0.5kg, 1kg" value={form.variants} onChange={e => setForm({...form, variants: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Available Flavors</label><input placeholder="e.g. Chocolate, Vanilla" value={form.flavors} onChange={e => setForm({...form, flavors: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Prep Time</label><input placeholder="e.g. 24h" value={form.prepTime} onChange={e => setForm({...form, prepTime: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Emoji Icon</label><input placeholder="e.g. 🍰" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} /></div>
                <div className="form-group full">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={form.bestseller} onChange={e => setForm({...form, bestseller: e.target.checked})} /> Mark as Bestseller
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Product</button>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
