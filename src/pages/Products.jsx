import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Camera, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToProducts, addProductToDB, updateProductInDB, deleteProductFromDB } from '../services/db';
import { Skeleton, showToast } from '../components/iOS';
import { formatCurrency } from '../utils/date';

const DEFAULT_CATEGORIES = ['All', 'Cakes', 'Cupcakes', 'Brownies', 'Cookies', 'Dessert Boxes'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Cakes', basePrice: '', flavors: '', prepTime: '', emoji: '🎂', variants: '', bestseller: false });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

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

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map(p => p.category)]));

  const filtered = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = editingId ? products.find(p => p.id === editingId)?.imageUrl : null;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          imageUrl = `http://localhost:3001${data.url}`;
        }
      }

      const productData = {
        name: form.name,
        category: form.category,
        basePrice: Number(form.basePrice),
        flavors: form.flavors,
        prepTime: form.prepTime,
        variants: form.variants || 'Regular',
        emoji: form.emoji,
        bestseller: form.bestseller,
        imageUrl
      };

      if (editingId) {
        await updateProductInDB(editingId, productData);
        showToast('Product updated!', 'success');
      } else {
        await addProductToDB(productData);
        showToast('Product added!', 'success');
      }
      closeModal();
    } catch (error) {
      console.error("Save product error:", error);
      showToast('Failed to save product', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProductFromDB(id);
        showToast('Product deleted', 'info');
      } catch (error) {
        showToast('Failed to delete', 'error');
      }
    }
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      basePrice: product.basePrice,
      flavors: product.flavors,
      prepTime: product.prepTime,
      variants: product.variants,
      emoji: product.emoji,
      bestseller: product.bestseller
    });
    setImagePreview(product.imageUrl);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', category: 'Cakes', basePrice: '', flavors: '', prepTime: '', emoji: '🎂', variants: '', bestseller: false });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Product Catalog</h1><p>Manage your bakery menu and categories in real-time</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Add Product</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text3)' }} />
          <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 40 }} />
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 8, scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
              background: activeCategory === cat ? 'var(--accent)' : 'var(--bg2)',
              color: activeCategory === cat ? 'white' : 'var(--text2)',
              boxShadow: activeCategory === cat ? '0 4px 12px rgba(212,113,74,0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="product-grid">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={320} radius={16} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', borderRadius: 16 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🍩</div>
          <h3>No products found</h3>
          <p style={{ color: 'var(--text3)' }}>Try searching for something else or add a new product.</p>
        </div>
      ) : (
        <div className="product-grid">
          <AnimatePresence>
            {filtered.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout className="product-card">
                <div className="product-img" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
                  {!p.imageUrl && p.emoji}
                  {p.bestseller && <span className="product-bestseller" style={{ top: 12, left: 12 }}>Bestseller</span>}
                </div>
                <div className="product-body" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{p.name}</h4>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button className="btn-icon" style={{ width: 32, height: 32, color: 'var(--accent2)' }} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 8 }}>{p.category} · Prep: {p.prepTime}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: 16, height: 32, overflow: 'hidden' }}>{p.flavors}</p>
                  
                  <div className="product-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Starting from</div>
                      <div className="product-price" style={{ fontSize: '1.2rem' }}>{formatCurrency(p.basePrice)}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(212,113,74,0.1)', padding: '4px 10px', borderRadius: 8 }}>{p.variants}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Product Photo</label>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    style={{ 
                      width: '100%', 
                      height: 160, 
                      borderRadius: 12, 
                      background: 'var(--bg)', 
                      border: '2px dashed var(--border)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <Camera size={32} color="var(--text3)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 8 }}>Tap to upload</span>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                <div className="form-group full"><label className="form-label">Product Name</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Dreamy Vanilla Cake" /></div>
                
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {DEFAULT_CATEGORIES.slice(1).map(cat => <option key={cat}>{cat}</option>)}
                    {!DEFAULT_CATEGORIES.includes(form.category) && <option>{form.category}</option>}
                  </select>
                </div>

                <div className="form-group"><label className="form-label">Base Price (₹)</label><input type="number" required value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} placeholder="0" /></div>
                
                <div className="form-group"><label className="form-label">Weight/Variants</label><input placeholder="0.5kg, 1kg" value={form.variants} onChange={e => setForm({...form, variants: e.target.value})} /></div>
                
                <div className="form-group"><label className="form-label">Prep Time</label><input placeholder="e.g. 24h" value={form.prepTime} onChange={e => setForm({...form, prepTime: e.target.value})} /></div>
                
                <div className="form-group full"><label className="form-label">Available Flavors</label><input placeholder="Chocolate, Red Velvet, Vanilla..." value={form.flavors} onChange={e => setForm({...form, flavors: e.target.value})} /></div>
                
                <div className="form-group"><label className="form-label">Emoji Icon (Fallback)</label><input placeholder="🎂" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} /></div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 28 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    <input type="checkbox" style={{ width: 20, height: 20 }} checked={form.bestseller} onChange={e => setForm({...form, bestseller: e.target.checked})} />
                    Bestseller Product
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ flex: 1 }}>
                  {uploading ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
                </button>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
