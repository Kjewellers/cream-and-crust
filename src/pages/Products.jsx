import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Camera, Filter, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { subscribeToProducts, addProductToDB, updateProductInDB, deleteProductFromDB, subscribeToRecipes } from '../services/db';
import { storage } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Skeleton, showToast } from '../components/iOS';
import { triggerConfetti, triggerFloatingReward } from '../components/DopamineKit';
import { formatCurrency } from '../utils/date';

const DEFAULT_CATEGORIES = ['All', 'Cakes', 'Cupcakes', 'Brownies', 'Cookies', 'Dessert Boxes'];

export default function Products() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Cakes', basePrice: '', costPrice: '', recipeId: '', flavors: '', prepTime: '', emoji: '🎂', variants: '', bestseller: false });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    const unsubscribe = subscribeToProducts((newProducts) => {
      setProducts(newProducts);
      setLoading(false);
    }, (error) => {
      console.error("Products subscription error:", error);
      setLoading(false);
    }, currentUser?.uid);

    const recipesUnsub = subscribeToRecipes((newRecipes) => {
      setRecipes(newRecipes || []);
    });

    return () => {
      unsubscribe();
      recipesUnsub();
    };
  }, []);

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map(p => p.category)]));

  const filtered = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        };
      };
    });
  };

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
        try {
          const compressedBlob = await compressImage(imageFile);
          const uid = currentUser?.uid || 'anonymous';
          const fileName = `products/${uid}/${Date.now()}_prod.jpg`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, compressedBlob);
          imageUrl = await getDownloadURL(storageRef);
        } catch (error) {
          console.error("Storage error:", error);
          showToast('Failed to upload photo. Saving text only.', 'error');
        }
      }

      const productData = {
        name: form.name,
        category: form.category,
        basePrice: Number(form.basePrice),
        costPrice: Number(form.costPrice || 0),
        recipeId: form.recipeId || null,
        flavors: form.flavors,
        prepTime: form.prepTime,
        variants: form.variants || 'Regular',
        emoji: form.emoji,
        bestseller: form.bestseller,
        imageUrl: imageUrl || null,
        userId: currentUser?.uid || null,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateProductInDB(editingId, productData);
        showToast('Product updated! ✅', 'success');
      } else {
        await addProductToDB({ ...productData, createdAt: new Date().toISOString() });
        showToast('Product added! 🎂', 'success');
        triggerConfetti(window.innerWidth / 2, window.innerHeight / 3, 80);
        triggerFloatingReward('🎉 Added!', window.innerWidth / 2, window.innerHeight / 3);
      }
      closeModal();
    } catch (error) {
      console.error('Save product error:', error);
      showToast(`Failed to save: ${error.message}`, 'error');
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
        console.error('Delete error:', error);
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
      costPrice: product.costPrice || '',
      recipeId: product.recipeId || '',
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
    setShowAdvanced(false);
    setForm({ name: '', category: 'Cakes', basePrice: '', costPrice: '', recipeId: '', flavors: '', prepTime: '', emoji: '🎂', variants: '', bestseller: false });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Product Catalog</h1><p>Visual showcase of your bakery menu</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={18} /> Add Product</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text3)' }} />
          <input placeholder="Search catalog..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 40 }} />
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
                <div className="product-img" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--bg)', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 12 }}>{p.category}</div>
                  
                  <div className="product-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Starting from</div>
                      <div className="product-price" style={{ fontSize: '1.2rem' }}>{formatCurrency(p.basePrice)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {p.costPrice > 0 && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7A5A', marginBottom: 2 }}>
                          {Math.round(((p.basePrice - p.costPrice) / p.basePrice) * 100)}% Margin
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(212,113,74,0.1)', padding: '4px 10px', borderRadius: 8 }}>{p.variants || 'Standard'}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Catalog Photo</label>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    style={{ 
                      width: '100%', 
                      height: 180, 
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
                    {uploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Loader2 className="animate-spin" size={32} color="var(--accent)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 8 }}>Uploading...</span>
                      </div>
                    ) : imagePreview ? (
                      <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <Camera size={32} color="var(--text3)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 8 }}>Tap to upload product photo</span>
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

                <div className="form-group"><label className="form-label">Price (₹)</label><input type="number" required value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} placeholder="0" /></div>
                
                {/* Advanced Options Toggle */}
                <div className="form-group full" style={{ marginTop: 10 }}>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline" 
                    style={{ width: '100%', borderStyle: 'dashed', justifyContent: 'space-between' }}
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide Advanced Details' : 'Show Advanced Details (Recipe, Costs, etc.)'}
                    <Plus size={14} style={{ transform: showAdvanced ? 'rotate(45deg)' : 'none', transition: '0.2s' }} />
                  </button>
                </div>

                {showAdvanced && (
                  <>
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="form-group full">
                      <label className="form-label">Linked Recipe (Auto-calculates Cost)</label>
                      <select 
                        value={form.recipeId} 
                        onChange={e => {
                          const recipeId = e.target.value;
                          const recipe = recipes.find(r => r.id === recipeId);
                          const cost = recipe ? (recipe.ingredients?.reduce((s, i) => s + Number(i.cost || 0), 0) + Number(recipe.packagingCost || 0) + Number(recipe.laborCost || 0)) : form.costPrice;
                          setForm({...form, recipeId, costPrice: cost});
                        }}
                      >
                        <option value="">No Recipe Linked</option>
                        {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </motion.div>

                    <div className="form-group"><label className="form-label">Cost Price (₹)</label><input type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} placeholder="e.g. 250" /></div>
                    
                    <div className="form-group"><label className="form-label">Weight/Variants</label><input placeholder="0.5kg, 1kg" value={form.variants} onChange={e => setForm({...form, variants: e.target.value})} /></div>
                    
                    <div className="form-group"><label className="form-label">Prep Time</label><input placeholder="e.g. 24h" value={form.prepTime} onChange={e => setForm({...form, prepTime: e.target.value})} /></div>
                    
                    <div className="form-group"><label className="form-label">Emoji (Fallback)</label><input placeholder="🎂" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} /></div>

                    <div className="form-group full"><label className="form-label">Available Flavors</label><input placeholder="Chocolate, Red Velvet, Vanilla..." value={form.flavors} onChange={e => setForm({...form, flavors: e.target.value})} /></div>
                    
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 28 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                        <input type="checkbox" style={{ width: 20, height: 20 }} checked={form.bestseller} onChange={e => setForm({...form, bestseller: e.target.checked})} />
                        Bestseller Product
                      </label>
                    </div>
                  </>
                )}
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
