import React, { useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Loader2, Star, Leaf, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../../components/iOS';
import { uploadToCloudinary } from '../../services/cloudinary';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell from './MenuBuilderShell';

function ProductCard({ product, categories, onUpdate, onUpload, uploadingId }) {
  const fileRef = useRef(null);
  const isUploading = uploadingId === product.id;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="card"
      style={{ padding: 0, borderRadius: 20, overflow: 'hidden' }}
    >
      {/* Image + basic info row */}
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Image */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: 90, height: 90, flexShrink: 0,
            background: 'var(--bg)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
          ) : product.imageUrl ? (
            <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Camera size={18} color="var(--text3)" />
              <span style={{ fontSize: '0.58rem', color: 'var(--text3)', fontWeight: 700 }}>Add Photo</span>
            </div>
          )}
          {product.imageUrl && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s'
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <Camera size={16} color="white" />
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={e => onUpload(product, e.target.files?.[0])} style={{ display: 'none' }} />

        {/* Name + price + visibility toggle */}
        <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
          <input
            defaultValue={product.name || ''}
            onBlur={e => onUpdate(product, { name: e.target.value })}
            placeholder="Product name"
            style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 700 }}>₹</span>
              <input
                type="number"
                defaultValue={product.basePrice || product.price || ''}
                onBlur={e => onUpdate(product, { basePrice: Number(e.target.value) })}
                placeholder="0"
                style={{ paddingLeft: 24, width: '100%', fontWeight: 800 }}
              />
            </div>
            <button
              type="button"
              onClick={() => onUpdate(product, { menuHidden: !product.menuHidden })}
              style={{
                flexShrink: 0, padding: '5px 10px', borderRadius: 99, border: 'none', cursor: 'pointer',
                background: product.menuHidden ? 'rgba(0,0,0,0.06)' : 'rgba(16,185,129,0.1)',
                color: product.menuHidden ? 'var(--text3)' : '#10B981',
                fontWeight: 800, fontSize: '0.68rem',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              {product.menuHidden ? <><EyeOff size={11} /> Hidden</> : <><Eye size={11} /> Visible</>}
            </button>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '8px 14px', border: 'none', borderTop: '1px solid var(--border)',
          background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', color: 'var(--text2)', fontSize: '0.75rem', fontWeight: 700
        }}
      >
        <span>More details</span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.div>
      </button>

      {/* Expanded fields */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)' }}>
              <textarea
                defaultValue={product.description || product.flavors || ''}
                onBlur={e => onUpdate(product, { description: e.target.value })}
                placeholder="Description (flavours, ingredients…)"
                rows={2}
                style={{ resize: 'vertical', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  defaultValue={product.weight || product.variants || ''}
                  onBlur={e => onUpdate(product, { weight: e.target.value })}
                  placeholder="Weight / Size"
                  style={{ flex: 1 }}
                />
                <select
                  defaultValue={product.menuCategory || product.category || categories[0]?.name || ''}
                  onChange={e => onUpdate(product, { menuCategory: e.target.value })}
                  style={{ flex: 1 }}
                >
                  {categories.map(cat => <option key={cat.id || cat.name} value={cat.name}>{cat.emoji || ''} {cat.name}</option>)}
                </select>
              </div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'bestseller', icon: <Star size={12} />, label: 'Bestseller', color: '#F59E0B' },
                  { key: 'eggless', icon: <Leaf size={12} />, label: 'Eggless', color: '#10B981' },
                ].map(badge => (
                  <button
                    key={badge.key}
                    type="button"
                    onClick={() => onUpdate(product, { [badge.key]: !product[badge.key] })}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: product[badge.key] ? badge.color + '18' : 'var(--bg)',
                      color: product[badge.key] ? badge.color : 'var(--text3)',
                      fontWeight: 800, fontSize: '0.72rem', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 5,
                      outline: product[badge.key] ? `1.5px solid ${badge.color}40` : '1.5px solid var(--border)',
                    }}
                  >
                    {badge.icon} {badge.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MenuProducts() {
  const { menu, products, loading, saveProduct } = useMenuBuilderData();
  const [uploadingId, setUploadingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const categories = menu.categories || [];

  const updateProduct = async (product, patch) => {
    await saveProduct(product.id, patch);
    showToast('Saved ✓', 'success');
  };

  const uploadImage = async (product, file) => {
    if (!file) return;
    setUploadingId(product.id);
    try {
      const imageUrl = await uploadToCloudinary(file);
      await updateProduct(product, { imageUrl });
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const filtered = filter === 'all' ? products
    : filter === 'visible' ? products.filter(p => !p.menuHidden)
    : filter === 'hidden' ? products.filter(p => p.menuHidden)
    : products.filter(p => (p.menuCategory || p.category) === filter);

  if (loading) return (
    <MenuBuilderShell title="Menu Products" subtitle="Control which products appear on your menu.">
      <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>
    </MenuBuilderShell>
  );

  return (
    <MenuBuilderShell title="Menu Products" subtitle="Tap a product to edit its menu details.">
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -16px', padding: '0 16px 14px', marginBottom: 4 }}>
        {[
          { key: 'all', label: `All (${products.length})` },
          { key: 'visible', label: '👁 Visible' },
          { key: 'hidden', label: '🙈 Hidden' },
          ...categories.map(c => ({ key: c.name, label: `${c.emoji || ''} ${c.name}` })),
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: filter === f.key ? 'var(--accent)' : 'var(--bg2)',
              color: filter === f.key ? 'white' : 'var(--text2)',
              fontWeight: 800, fontSize: '0.72rem', whiteSpace: 'nowrap',
              boxShadow: filter === f.key ? 'var(--shadow-accent)' : 'none',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            categories={categories}
            onUpdate={updateProduct}
            onUpload={uploadImage}
            uploadingId={uploadingId}
          />
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🍰</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {products.length === 0 ? 'No products yet' : 'No products match this filter'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              {products.length === 0 ? 'Add products in the Products module first, then customise their menu details here.' : 'Try selecting a different filter above.'}
            </div>
          </div>
        )}
      </div>
    </MenuBuilderShell>
  );
}
