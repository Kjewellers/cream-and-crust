import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Camera,
  Loader2,
  ExternalLink,
  Share,
  UtensilsCrossed,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  subscribeToProducts,
  addProductToDB,
  updateProductInDB,
  deleteProductFromDB,
  subscribeToRecipes,
  subscribeToBusiness,
} from '../services/db';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Skeleton, showToast, BottomSheet } from '../components/iOS';
import { triggerConfetti, triggerFloatingReward } from '../components/DopamineKit';
import { formatCurrency } from '../utils/date';
import { uploadToCloudinary } from '../services/cloudinary';
import { toWebP } from '../utils/imagePipeline';
import ModuleTour from '../components/ModuleTour';
import { productsTourSteps } from '../components/tours/productsTour';
import AnimatedDemo from '../components/AnimatedDemo';
import { productsDemoScenes } from '../components/demos/productsDemo';

const DEFAULT_CATEGORIES = ['All', 'Cakes', 'Cupcakes', 'Brownies', 'Cookies', 'Dessert Boxes'];

export default function Products() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'Cakes',
    basePrice: '',
    costPrice: '',
    recipeId: '',
    flavors: '',
    prepTime: '',
    emoji: '🎂',
    variants: '',
    bestseller: false,
    featureInPortfolio: true,
    season: 'All Year',
    weight: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCatInput, setNewCatInput] = useState('');
  const fileInputRef = useRef();
  const newCatRef = useRef();
  const isSavingRef = useRef(false);

  useEffect(() => {
    const handleOpenModal = () => setShowModal(true);
    window.addEventListener('open-new-product-modal', handleOpenModal);
    return () => window.removeEventListener('open-new-product-modal', handleOpenModal);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (newProducts) => {
        setProducts(newProducts);
        setLoading(false);

        // Auto-extract custom categories from Firestore products
        if (newProducts && newProducts.length > 0) {
          const extraCats = newProducts
            .map((p) => p.category)
            .filter((cat) => cat && !DEFAULT_CATEGORIES.includes(cat));
          if (extraCats.length > 0) {
            setCustomCategories((prev) => Array.from(new Set([...prev, ...extraCats])));
          }
        }
      },
      (error) => {
        console.error('Products subscription error:', error);
        setLoading(false);
      },
      currentUser?.uid
    );

    const recipesUnsub = subscribeToRecipes(
      (newRecipes) => {
        setRecipes(newRecipes || []);
      },
      null,
      currentUser?.uid
    );

    const bizUnsub = subscribeToBusiness(
      (biz) => {
        setBusiness(biz);
      },
      null,
      currentUser?.uid
    );

    return () => {
      unsubscribe();
      recipesUnsub();
      bizUnsub();
    };
  }, []);

  const handleShareMenu = () => {
    if (!business?.username) {
      showToast('Set a username in Settings first', 'warning');
      navigate('/profile');
      return;
    }
    const url = `${window.location.origin}/menu/${business.username}`;
    navigator.clipboard.writeText(url);
    showToast('Menu link copied! 🍽️', 'success');
  };

  const handleToggleMenu = async (product) => {
    const next = !product.menuHidden;
    // Optimistic update
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, menuHidden: next } : p)));
    try {
      await updateProductInDB(product.id, { menuHidden: next });
      showToast(next ? 'Hidden from menu' : 'Visible on menu 🍽️', next ? 'info' : 'success');
    } catch {
      // revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, menuHidden: product.menuHidden } : p))
      );
      showToast('Failed to update', 'error');
    }
  };

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])
  );

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const compressImage = async (file) => {
    // Prefer WebP (smaller, faster) with a downscale to <= 2048px longest edge
    // so oversized photos never crash Safari. Falls back to the legacy JPEG
    // canvas path if WebP conversion is unavailable on the device.
    try {
      return await toWebP(file, { maxEdge: 1280, quality: 0.8 });
    } catch {
      // Fall through to JPEG.
    }
    return new Promise((resolve, reject) => {
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to create blob from canvas'));
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setUploading(true);

    const tempId = editingId || `temp-${Date.now()}`;
    const currentImageUrl = editingId ? products.find((p) => p.id === editingId)?.imageUrl : null;

    // 1. Prepare Optimistic Data
    const optimisticData = {
      id: tempId,
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
      featureInPortfolio: form.featureInPortfolio,
      season: form.season || 'All Year',
      weight: form.weight || '',
      description: form.description || '',
      imageUrl: imagePreview || currentImageUrl, // Use local preview optimistically
      userId: currentUser?.uid || null,
      updatedAt: new Date().toISOString(),
      createdAt: editingId
        ? products.find((p) => p.id === editingId)?.createdAt
        : new Date().toISOString(),
      isOptimistic: true, // Marker to handle cleanup if needed
    };

    // 2. Update Local State Immediately
    if (editingId) {
      setProducts((prev) => prev.map((p) => (p.id === editingId ? optimisticData : p)));
    } else {
      setProducts((prev) => [optimisticData, ...prev]);
    }

    // 3. Close Modal Immediately
    closeModal();

    // 4. Background Task
    const performSave = async () => {
      try {
        let finalImageUrl = currentImageUrl;

        if (imageFile) {
          try {
            finalImageUrl = await uploadToCloudinary(imageFile);
          } catch (error) {
            console.error('❌ Upload error details:', error);
            showToast(`Photo upload failed. Saving without photo.`, 'error');
          }
        }

        const productData = { ...optimisticData, imageUrl: finalImageUrl };
        delete productData.id;
        delete productData.isOptimistic;

        if (editingId) {
          await updateProductInDB(editingId, productData);
          showToast('Saved ✓', 'success');
        } else {
          await addProductToDB(productData);
          showToast('Saved ✓', 'success');
          triggerConfetti(window.innerWidth / 2, window.innerHeight / 3, 80);
          triggerFloatingReward('🎉 Added!', window.innerWidth / 2, window.innerHeight / 3);
        }
      } catch (error) {
        console.error('Save product error:', error);
        showToast(`Save failed, try again`, 'error');
        // Revert local state on error
        if (editingId) {
          // Hard to revert perfectly without a deep copy, but the subscription will eventually fix it
          // For now, just let the subscription fix it on next sync
        } else {
          setProducts((prev) => prev.filter((p) => p.id !== tempId));
        }
      } finally {
        setUploading(false);
        isSavingRef.current = false;
      }
    };

    performSave();
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
      bestseller: product.bestseller,
      featureInPortfolio: product.featureInPortfolio ?? true,
      season: product.season || 'All Year',
      weight: product.weight || '',
      description: product.description || '',
    });
    setImagePreview(product.imageUrl);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setShowAdvanced(false);
    setForm({
      name: '',
      category: 'Cakes',
      basePrice: '',
      costPrice: '',
      recipeId: '',
      flavors: '',
      prepTime: '',
      emoji: '🎂',
      variants: '',
      bestseller: false,
      featureInPortfolio: true,
      season: 'All Year',
      weight: '',
      description: '',
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const autoGenerateDescription = async () => {
    if (!form.name || !form.category) {
      showToast('Please enter a product name and category first.', 'warning');
      return;
    }
    
    // We can't send local blob URLs to the backend, so we need to convert the imageFile to base64 if it exists
    let base64Image = null;
    if (imageFile) {
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve(reader.result);
      });
    } else if (imagePreview && imagePreview.startsWith('http')) {
      base64Image = imagePreview; // Cloudinary URL
    }

    try {
      showToast('✨ AI is writing description...', 'info');
      const data = await api.describeProduct({
        name: form.name,
        category: form.category,
        image: base64Image
      });
      setForm(prev => ({ ...prev, description: data.description }));
      showToast('✨ Description generated!', 'success');
    } catch (err) {
      console.error(err);
      showToast('😔 Failed to generate description.', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>Product Catalog</h1>
          <p>Visual showcase of your bakery menu</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/menu-builder')}
            style={{ gap: 8 }}
          >
            <UtensilsCrossed size={16} /> <span className="desktop-only">Menu Builder</span>
          </button>
          <button className="btn btn-outline" onClick={handleShareMenu} style={{ gap: 8 }}>
            <Share size={16} /> <span className="desktop-only">Share Menu</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text3)' }}
          />
          <input
            placeholder="Search catalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* ── Auto-Season Detection Logic ── */}
      {(() => {
        const getSeason = () => {
          const month = new Date().getMonth();
          if (month >= 2 && month <= 4) return { name: 'Spring', emoji: '🌸' };
          if (month >= 5 && month <= 7) return { name: 'Summer', emoji: '☀️' };
          if (month >= 8 && month <= 9) return { name: 'Monsoon', emoji: '🌧️' };
          if (month === 10) return { name: 'Autumn', emoji: '🍁' };
          if (month === 11) return { name: 'Festive', emoji: '🎁' };
          return { name: 'Winter', emoji: '❄️' };
        };
        const currentSeason = getSeason();
        const seasonalProducts = products.filter((p) => p.season === currentSeason.name);

        if (seasonalProducts.length > 0 && !search && activeCategory === 'All') {
          return (
            <div style={{ padding: '0 0 20px', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 4px',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                  {currentSeason.emoji} Current Season: {currentSeason.name}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '0 4px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
                className="no-scrollbar"
              >
                {seasonalProducts.map((sp) => (
                  <div
                    key={sp.id}
                    onClick={() => openEdit(sp)}
                    style={{
                      width: 140,
                      flexShrink: 0,
                      cursor: 'pointer',
                      position: 'relative',
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: 'var(--glass)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      boxShadow: 'var(--shadow-lg)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <div
                      style={{
                        height: 100,
                        background: 'var(--bg2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                      }}
                    >
                      {sp.imageUrl ? (
                        <img
                          src={sp.imageUrl}
                          alt={sp.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        sp.emoji
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: 2,
                        }}
                      >
                        {sp.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                        {formatCurrency(sp.basePrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Category Filter */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 16,
          marginBottom: 8,
          scrollbarWidth: 'none',
        }}
      >
        {categories.map((cat) => (
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
              boxShadow: activeCategory === cat ? '0 4px 12px rgba(181,96,106,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="product-grid">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={320} radius={16} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg2)',
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🍩</div>
          <h3>No products found</h3>
          <p style={{ color: 'var(--text3)' }}>
            Try searching for something else or add a new product.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className="product-card"
                style={{ opacity: p.menuHidden ? 0.75 : 1 }}
              >
                <div
                  className="product-img"
                  style={{
                    backgroundImage: p.imageUrl ? `linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.6) 100%), url("${p.imageUrl}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'var(--bg)',
                    height: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4rem',
                    position: 'relative',
                  }}
                >
                  {!p.imageUrl && p.emoji}
                  {p.bestseller && (
                    <span className="product-bestseller" style={{ 
                      top: 10, left: 10, 
                      background: 'linear-gradient(135deg, var(--gold), #fcd34d)', 
                      color: '#451a03', 
                      boxShadow: '0 4px 12px rgba(212, 160, 80, 0.4)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      padding: '4px 10px',
                    }}>
                      Bestseller
                    </span>
                  )}
                  {/* Menu visibility badge on image */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleToggleMenu(p)}
                    title={
                      p.menuHidden
                        ? 'Hidden from menu — tap to show'
                        : 'Visible on menu — tap to hide'
                    }
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 9px',
                      borderRadius: 99,
                      border: 'none',
                      cursor: 'pointer',
                      background: p.menuHidden ? 'rgba(0,0,0,0.55)' : 'rgba(16,185,129,0.9)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.62rem',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      transition: 'background 0.2s',
                    }}
                  >
                    {p.menuHidden ? (
                      <>
                        <EyeOff size={11} /> Hidden
                      </>
                    ) : (
                      <>
                        <Eye size={11} /> On Menu
                      </>
                    )}
                  </motion.button>
                </div>
                <div className="product-body" style={{ padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{p.name}</h4>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-icon"
                        style={{ width: 32, height: 32 }}
                        onClick={() => openEdit(p)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: 32, height: 32, color: 'var(--accent2)' }}
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 12 }}>
                    {p.category}
                  </div>

                  <div
                    className="product-footer"
                    style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 700,
                        }}
                      >
                        Starting from
                      </div>
                      <div className="product-price" style={{ fontSize: '1.2rem' }}>
                        {formatCurrency(p.basePrice)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {p.costPrice > 0 && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#2E7A5A',
                            marginBottom: 2,
                          }}
                        >
                          {Math.round(((p.basePrice - p.costPrice) / p.basePrice) * 100)}% Margin
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--accent)',
                          background: 'rgba(181,96,106,0.1)',
                          padding: '4px 10px',
                          borderRadius: 8,
                        }}
                      >
                        {p.weight || p.variants || 'Standard'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <BottomSheet open={showModal} onClose={closeModal} title={editingId ? 'Edit Product' : 'Add New Product'}>
            <form
              onSubmit={handleSaveProduct}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {/* PHOTO SECTION - BIG & BOLD */}
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 20,
                    background: 'var(--bg)',
                    border: '2px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: '0.2s',
                    borderColor: imagePreview ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {uploading ? (
                    <Loader2 className="animate-spin" size={32} color="var(--accent)" />
                  ) : imagePreview ? (
                    <img
                      src={imagePreview}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <Camera size={40} color="var(--text3)" />
                      <span
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--text3)',
                          fontWeight: 600,
                          marginTop: 10,
                        }}
                      >
                        Tap to upload photo
                      </span>
                    </>
                  )}
                </div>
                {imagePreview && !uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* CORE FIELDS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Identity & Details</h4>
                </div>
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text3)' }}
                  >
                    PRODUCT NAME
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Belgian Chocolate Cake"
                    style={{ fontSize: '1.1rem', height: 50, borderRadius: 14 }}
                  />
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label
                      className="form-label"
                      style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text3)', margin: 0 }}
                    >
                      DESCRIPTION (OPTIONAL)
                    </label>
                    <button
                      type="button"
                      onClick={autoGenerateDescription}
                      style={{
                        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 2px 8px rgba(181,96,106,0.3)',
                      }}
                    >
                      ✨ Auto-Generate
                    </button>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Mouth-watering description of your product..."
                    rows={3}
                    style={{ fontSize: '1rem', padding: '12px 14px', borderRadius: 14, width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label
                      className="form-label"
                      style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text3)' }}
                    >
                      CATEGORY
                    </label>

                    {/* All available categories as pill buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {[...DEFAULT_CATEGORIES.slice(1), ...customCategories].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setForm({ ...form, category: cat })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 99,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            background: form.category === cat ? 'var(--accent)' : 'var(--bg2)',
                            color: form.category === cat ? 'white' : 'var(--text2)',
                            boxShadow:
                              form.category === cat ? '0 2px 8px rgba(181,96,106,0.3)' : 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Add custom category inline */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        ref={newCatRef}
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = newCatInput.trim();
                            if (!trimmed) return;
                            if (
                              [...DEFAULT_CATEGORIES, ...customCategories].some(
                                (c) => c.toLowerCase() === trimmed.toLowerCase()
                              )
                            ) {
                              setForm({ ...form, category: trimmed });
                            } else {
                              setCustomCategories((prev) => [...prev, trimmed]);
                              setForm({ ...form, category: trimmed });
                            }
                            setNewCatInput('');
                          }
                        }}
                        placeholder="Add missing category… (press Enter)"
                        style={{ flex: 1, height: 40, fontSize: '0.82rem', borderRadius: 12 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newCatInput.trim();
                          if (!trimmed) {
                            newCatRef.current?.focus();
                            return;
                          }
                          if (
                            ![...DEFAULT_CATEGORIES, ...customCategories].some(
                              (c) => c.toLowerCase() === trimmed.toLowerCase()
                            )
                          ) {
                            setCustomCategories((prev) => [...prev, trimmed]);
                          }
                          setForm({ ...form, category: trimmed });
                          setNewCatInput('');
                        }}
                        style={{
                          flexShrink: 0,
                          height: 40,
                          padding: '0 14px',
                          borderRadius: 12,
                          border: 'none',
                          background: 'var(--accent)',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label
                      className="form-label"
                      style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text3)' }}
                    >
                      PRICE (₹)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      required
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      placeholder="0"
                      style={{ height: 50, fontSize: '1.1rem', fontWeight: 700, borderRadius: 14 }}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label
                      className="form-label"
                      style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text3)' }}
                    >
                      WEIGHT (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      placeholder="e.g. 500g, 1kg"
                      style={{ height: 50, fontSize: '1.1rem', fontWeight: 700, borderRadius: 14 }}
                    />
                  </div>
                </div>
              </div>

              {/* ADVANCED TOGGLE */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  background: 'var(--bg2)',
                  border: 'none',
                  padding: '16px',
                  borderRadius: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text2)' }}>
                  {showAdvanced
                    ? 'Hide Optional Details'
                    : 'Show More Details (Recipe, Cost, etc.)'}
                </span>
                <Plus
                  size={18}
                  style={{ transform: showAdvanced ? 'rotate(45deg)' : 'none', transition: '0.2s' }}
                />
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    <div className="form-group" style={{ marginTop: 8 }}>
                      <label className="form-label">Linked Recipe</label>
                      <select
                        value={form.recipeId}
                        onChange={(e) => setForm({ ...form, recipeId: e.target.value })}
                        style={{ height: 50, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}
                      >
                        <option value="">No Recipe Linked</option>
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Cost Price (₹)</label>
                        <input
                          type="number"
                          value={form.costPrice}
                          onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                          placeholder="0"
                          style={{ height: 50, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Weight/Variants</label>
                        <input
                          value={form.variants}
                          onChange={(e) => setForm({ ...form, variants: e.target.value })}
                          placeholder="0.5kg"
                          style={{ height: 50, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Season (Optional)</label>
                      <select
                        value={form.season}
                        onChange={(e) => setForm({ ...form, season: e.target.value })}
                        style={{ height: 50, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}
                      >
                        <option value="All Year">All Year</option>
                        <option value="Spring">Spring 🌸</option>
                        <option value="Summer">Summer ☀️</option>
                        <option value="Monsoon">Monsoon 🌧️</option>
                        <option value="Autumn">Autumn 🍁</option>
                        <option value="Winter">Winter ❄️</option>
                        <option value="Festive">Festive 🎁</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Bestseller toggle */}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, bestseller: !form.bestseller })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          borderRadius: 16,
                          border: 'none',
                          cursor: 'pointer',
                          background: form.bestseller ? 'rgba(245,158,11,0.1)' : 'var(--bg2)',
                          outline: form.bestseller
                            ? '1.5px solid rgba(245,158,11,0.4)'
                            : '1.5px solid var(--border)',
                          transition: 'all 0.18s',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '1.4rem' }}>⭐</span>
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: form.bestseller ? '#B45309' : 'var(--text)',
                              }}
                            >
                              Mark as Bestseller
                            </div>
                            <div
                              style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}
                            >
                              Highlighted badge on menu & catalog
                            </div>
                          </div>
                        </div>
                        {/* Toggle pill */}
                        <div
                          style={{
                            width: 46,
                            height: 26,
                            borderRadius: 99,
                            flexShrink: 0,
                            background: form.bestseller ? '#F59E0B' : 'var(--border)',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 3,
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              background: 'white',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                              left: form.bestseller ? 23 : 3,
                              transition: 'left 0.2s',
                            }}
                          />
                        </div>
                      </button>

                      {/* Show on Menu toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, featureInPortfolio: !form.featureInPortfolio })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          borderRadius: 16,
                          border: 'none',
                          cursor: 'pointer',
                          background: form.featureInPortfolio
                            ? 'rgba(181,96,106,0.08)'
                            : 'var(--bg2)',
                          outline: form.featureInPortfolio
                            ? '1.5px solid rgba(181,96,106,0.3)'
                            : '1.5px solid var(--border)',
                          transition: 'all 0.18s',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '1.4rem' }}>🍽️</span>
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: form.featureInPortfolio ? 'var(--accent)' : 'var(--text)',
                              }}
                            >
                              Show on Public Menu
                            </div>
                            <div
                              style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}
                            >
                              Include this product in your public menu
                            </div>
                          </div>
                        </div>
                        {/* Toggle pill */}
                        <div
                          style={{
                            width: 46,
                            height: 26,
                            borderRadius: 99,
                            flexShrink: 0,
                            background: form.featureInPortfolio ? 'var(--accent)' : 'var(--border)',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 3,
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              background: 'white',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                              left: form.featureInPortfolio ? 23 : 3,
                              transition: 'left 0.2s',
                            }}
                          />
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: 60,
                    borderRadius: 20,
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  {uploading ? (
                    <Loader2 className="animate-spin" />
                  ) : editingId ? (
                    'Update Product'
                  ) : (
                    'Add to Catalog'
                  )}
                </button>
              </div>
            </form>
      </BottomSheet>
      <AnimatedDemo moduleId="products" title="How to Add Products" scenes={productsDemoScenes} />
    </motion.div>
  );
}
