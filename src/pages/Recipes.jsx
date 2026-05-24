import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus, Search, TrendingUp, Clock, AlertTriangle, SlidersHorizontal, ChevronDown, X, BookOpen, Scale, IndianRupee, Package, Link, Menu } from 'lucide-react';
import { subscribeToRecipes, deleteRecipeFromDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/iOS';
import RecipeDetail from '../components/recipes/RecipeDetail';
import CreateRecipe from '../components/recipes/CreateRecipe';
import RecipeOrderIntegration from '../components/recipes/RecipeOrderIntegration';
import RecipeInventoryLinkage from '../components/recipes/RecipeInventoryLinkage';
import RecipeChecklist from '../components/recipes/RecipeChecklist';
import MyCaptures from '../components/recipes/MyCaptures';
import WebImporter from '../components/recipes/WebImporter';
import { ChefHat, Book, Camera, Search as SearchIcon, ShoppingCart, DownloadCloud } from 'lucide-react';
import '../pages/RecipesStyles.css';

const CATEGORIES = ['All', 'Cakes', 'Cupcakes', 'Brownies', 'Desserts'];
const CAT_EMOJI = { All: '🍽️', Cakes: '🎂', Cupcakes: '🧁', Brownies: '🍫', Desserts: '🍮' };
const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'cost_asc', label: 'Cost ↑' },
  { value: 'cost_desc', label: 'Cost ↓' },
  { value: 'profit', label: 'Profit ↑' },
];

const SAMPLE_RECIPES = [
  {
    id: 'sample-1', name: 'Chocolate Truffle Cake', category: 'Cakes',
    tags: ['Chocolate', 'Eggless', 'Popular'], difficulty: 'Medium',
    prepTime: '30 mins', bakeTime: '45 mins', coolTime: '2 hrs', yield: '1 kg cake',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    sellPrice: 900, status: 'Published', badge: 'Popular',
    ingredients: [
      { name: 'All Purpose Flour', qty: '500', unit: 'g', cost: 20 },
      { name: 'Cocoa Powder', qty: '60', unit: 'g', cost: 30 },
      { name: 'Sugar', qty: '350', unit: 'g', cost: 21 },
      { name: 'Butter', qty: '200', unit: 'g', cost: 120 },
      { name: 'Milk', qty: '200', unit: 'ml', cost: 12 },
      { name: 'Dark Chocolate', qty: '150', unit: 'g', cost: 90 },
      { name: 'Baking Powder', qty: '5', unit: 'g', cost: 2 },
      { name: 'Baking Soda', qty: '3', unit: 'g', cost: 1 },
      { name: 'Salt', qty: '2', unit: 'g', cost: 0.5 },
      { name: 'Vanilla Extract', qty: '5', unit: 'ml', cost: 5 },
    ],
    steps: [
      { title: 'Preheat Oven', desc: 'Preheat oven to 180°C. Grease and line the cake tin.', timer: '5 mins' },
      { title: 'Sieve Dry Ingredients', desc: 'Sieve flour, cocoa powder, baking soda and salt.' },
      { title: 'Cream Butter & Sugar', desc: 'In a bowl, cream butter and sugar until light and fluffy.' },
      { title: 'Add Vanilla', desc: 'Add vanilla extract and mix well.' },
      { title: 'Combine Alternately', desc: 'Add dry ingredients alternately with milk. Mix gently.' },
      { title: 'Pour & Bake', desc: 'Pour batter into tin and bake for 45 mins.', timer: '45 mins' },
    ],
    notes: 'Store in cool place. Use 70% dark chocolate for best results.',
    packaging: 40, gas: 25, labor: 80, platformFee: 5, other: 11,
  },
  {
    id: 'sample-2', name: 'Red Velvet Cake', category: 'Cakes',
    tags: ['Eggless', 'Classic'], difficulty: 'Medium',
    prepTime: '25 mins', bakeTime: '40 mins', coolTime: '1.5 hrs', yield: '1 kg cake',
    imageUrl: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=400',
    sellPrice: 850, status: 'Published', badge: 'Popular',
    ingredients: [
      { name: 'All Purpose Flour', qty: '400', unit: 'g', cost: 16 },
      { name: 'Cocoa Powder', qty: '20', unit: 'g', cost: 10 },
      { name: 'Sugar', qty: '300', unit: 'g', cost: 18 },
      { name: 'Butter', qty: '180', unit: 'g', cost: 108 },
      { name: 'Buttermilk', qty: '240', unit: 'ml', cost: 15 },
      { name: 'Red Food Color', qty: '30', unit: 'ml', cost: 20 },
    ],
    steps: [
      { title: 'Preheat', desc: 'Preheat oven to 175°C.' },
      { title: 'Mix Dry', desc: 'Combine flour, cocoa, salt.' },
      { title: 'Cream', desc: 'Cream butter and sugar until fluffy.' },
      { title: 'Combine', desc: 'Alternately add flour and buttermilk.' },
      { title: 'Bake', desc: 'Bake for 40 mins at 175°C.' },
    ],
    packaging: 40, gas: 25, labor: 80, platformFee: 5, other: 11,
  },
  {
    id: 'sample-3', name: 'Vanilla Cupcakes', category: 'Cupcakes',
    tags: ['Eggless', 'Kids Favorite'], difficulty: 'Easy',
    prepTime: '20 mins', bakeTime: '22 mins', coolTime: '30 mins', yield: '12 pcs',
    imageUrl: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400',
    sellPrice: 480, status: 'Published',
    ingredients: [
      { name: 'All Purpose Flour', qty: '250', unit: 'g', cost: 10 },
      { name: 'Sugar', qty: '200', unit: 'g', cost: 12 },
      { name: 'Butter', qty: '120', unit: 'g', cost: 72 },
      { name: 'Vanilla Extract', qty: '10', unit: 'ml', cost: 10 },
      { name: 'Baking Powder', qty: '8', unit: 'g', cost: 3 },
      { name: 'Milk', qty: '150', unit: 'ml', cost: 9 },
    ],
    steps: [
      { title: 'Preheat', desc: 'Preheat oven to 180°C.' },
      { title: 'Mix', desc: 'Cream butter and sugar, then add vanilla.' },
      { title: 'Fold', desc: 'Fold in dry ingredients alternately with milk.' },
      { title: 'Bake', desc: 'Fill liners 2/3 full and bake 22 mins.' },
    ],
    packaging: 25, gas: 15, labor: 60, platformFee: 5, other: 5,
  },
];

// Card with long-press to reveal delete button (no drag interception)
function DeletableCard({ children, onDelete, onClick }) {
  const [showDel, setShowDel] = useState(false);
  const longPressTimer = useRef(null);

  const handlePointerDown = () => { longPressTimer.current = setTimeout(() => setShowDel(true), 600); };
  const clearTimer = () => clearTimeout(longPressTimer.current);

  return (
    <div style={{ position: 'relative' }} onPointerDown={handlePointerDown} onPointerUp={clearTimer} onPointerLeave={clearTimer}>
      <div onClick={onClick} style={{ cursor: 'pointer' }}>{children}</div>
      <AnimatePresence>
        {showDel && (
          <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); setShowDel(false); onDelete(); }}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(239,68,68,0.4)', fontSize: 16 }}>
            ✕
          </motion.button>
        )}
      </AnimatePresence>
      {showDel && <div onClick={() => setShowDel(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />}
    </div>
  );
}




// Highlight matching text
function Highlight({ text, query }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(255,107,138,0.25)', color: 'var(--rv-pink)', borderRadius: 3, padding: '0 2px' }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function Recipes() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [recipes, setRecipes] = useState(SAMPLE_RECIPES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showSort, setShowSort] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('library');
  const [showSidebar, setShowSidebar] = useState(false);
  const undoRef = useRef(null);
  const searchRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Subscribe to DB recipes, deduplicate
  useEffect(() => {
    if (!currentUser) return;
    const sampleIds = new Set(SAMPLE_RECIPES.map(r => r.id));
    const unsub = subscribeToRecipes((dbRecipes) => {
      const fresh = dbRecipes.filter(r => !sampleIds.has(r.id));
      setRecipes([...SAMPLE_RECIPES, ...fresh]);
    }, null, currentUser.uid);
    return () => unsub();
  }, [currentUser]);

  // ── Dynamic Time-Based Greeting ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Compute category counts
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? recipes.length : recipes.filter(r => r.category === cat).length;
    return acc;
  }, {});

  // Filter + sort
  const getIngCost = (r) => (r.ingredients || []).reduce((s, i) => s + Number(i.cost || 0), 0);
  const getProfit = (r) => Number(r.sellPrice || 0) - getIngCost(r) - (r.packaging || 40) - (r.labor || 80) - (r.gas || 25) - (r.other || 11);

  const filtered = recipes
    .filter(r => !deletedIds.has(r.id))
    .filter(r => activeCategory === 'All' || r.category === activeCategory)
    .filter(r => !debouncedSearch || r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || (r.tags || []).some(t => t.toLowerCase().includes(debouncedSearch.toLowerCase())) || (r.ingredients || []).some(ing => ing.name.toLowerCase().includes(debouncedSearch.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'cost_asc') return getIngCost(a) - getIngCost(b);
      if (sortBy === 'cost_desc') return getIngCost(b) - getIngCost(a);
      if (sortBy === 'profit') return getProfit(b) - getProfit(a);
      return 0;
    });

  const handleDelete = useCallback((id) => {
    setDeletedIds(prev => new Set([...prev, id]));
    if (selectedRecipe?.id === id) setSelectedRecipe(null);

    // Undo toast
    if (undoRef.current) clearTimeout(undoRef.current);
    showToast('Recipe deleted — Undo?', 'error');

    undoRef.current = setTimeout(() => {
      if (!id.startsWith('sample-')) {
        deleteRecipeFromDB(id).catch(() => {});
      }
    }, 4000);
  }, [selectedRecipe]);

  const handleDuplicate = (recipe) => {
    const dup = { ...recipe, id: 'dup-' + Date.now(), name: recipe.name + ' (Copy)', status: 'Draft', badge: null };
    setRecipes(prev => [dup, ...prev]);
    showToast('Recipe duplicated!', 'success');
    setSelectedRecipe(null);
  };

  const FEATURE_ICONS = [
    { icon: <BookOpen size={20} color="var(--accent)" />, label: 'Recipe Creation', bg: 'var(--accent-lt)', modal: null },
    { icon: <ShoppingCart size={20} color="#E11D48" />, label: 'Shopping List', bg: '#FFF1F2', action: 'navigate-shopping' },
    { icon: <Scale size={20} color="#8B5CF6" />, label: 'Smart Scaling', bg: '#F5F3FF', modal: null },
    { icon: <IndianRupee size={20} color="#F59E0B" />, label: 'Costing & Profit', bg: '#FFFBEB', modal: null },
    { icon: <Package size={20} color="#10B981" />, label: 'Inventory Linkage', bg: '#ECFDF5', modal: 'inventory' },
    { icon: <Link size={20} color="#3B82F6" />, label: 'Order Integration', bg: '#EFF6FF', modal: 'integration' },
  ];

  const mostOrdered = recipes.find(r => r.badge === 'Popular')?.name?.split(' ').slice(0, 2).join(' ') || 'Chocolate';
  const lowStockCount = 1;

  // ── Seasonal Discovery Logic ──
  const getSeason = () => {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return { name: 'Summer', emoji: '☀️', query: 'Mango' }; // Mar-May
    if (month >= 5 && month <= 8) return { name: 'Monsoon', emoji: '🌧️', query: 'Chocolate' }; // Jun-Sep
    return { name: 'Winter', emoji: '❄️', query: 'Plum' }; // Oct-Feb
  };
  const currentSeason = getSeason();
  const seasonalPick = recipes.find(r => r.name.toLowerCase().includes(currentSeason.query.toLowerCase())) || recipes[0];


  return (
    <div className="rv-layout">
      {/* ── DESKTOP SIDEBAR ── */}
      <div className="rv-sidebar">
        <div className="rv-sidebar-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--rv-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
            <ChevronLeft size={16} /> Back to App
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🧁</span> Recipe Studio
          </div>
        </div>
        <button className={`rv-sidebar-item ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>
          <Book size={18} /> Library
        </button>
        <button className={`rv-sidebar-item ${activeTab === 'importer' ? 'active' : ''}`} onClick={() => setActiveTab('importer')}>
          <DownloadCloud size={18} /> Web Importer
        </button>
        <button className="rv-sidebar-item" onClick={() => navigate('/shopping-list')}>
          <ShoppingCart size={18} /> Shopping List ↗
        </button>
        <button className={`rv-sidebar-item ${activeTab === 'captures' ? 'active' : ''}`} onClick={() => setActiveTab('captures')}>
          <Camera size={18} /> Captures
        </button>
        <button className={`rv-sidebar-item ${activeTab === 'kitchen' ? 'active' : ''}`} onClick={() => setActiveTab('kitchen')}>
          <ChefHat size={18} /> Kitchen Mode
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="rv-main-content">
        <div className="rv" style={{ minHeight: '100%', paddingBottom: 80 }}>
          {/* ── APP TABS RENDERING ── */}
          {activeTab === 'captures' && (
            <MyCaptures userId={currentUser?.uid} />
          )}

          {activeTab === 'importer' && (
            <WebImporter onImport={(data) => { setEditRecipe(data); setShowCreate(true); setActiveTab('library'); }} />
          )}

          {activeTab === 'kitchen' && (
            <div style={{ padding: '64px 20px', textAlign: 'center' }}>
              <ChefHat size={48} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Kitchen Mode</h2>
              <p style={{ color: 'var(--rv-muted)', fontSize: 15 }}>Select a recipe from the library to enter Kitchen Mode.</p>
              <button className="rv-btn-primary" onClick={() => setActiveTab('library')} style={{ marginTop: 24, width: 'auto', padding: '12px 24px', margin: '24px auto 0' }}>Go to Library</button>
            </div>
          )}

      {activeTab === 'library' && (
        <>
          {/* ── IOS LARGE TITLE HEADER ── */}
          <div className="rv-header" style={{ paddingTop: 44, paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="rv-greeting">Recipes</div>
              <div className="rv-subtitle" style={{ marginBottom: 0 }}>{recipes.length} items • {getGreeting()}</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setEditRecipe(null); setShowCreate(true); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--rv-pink-light)', color: 'var(--rv-pink)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Plus size={20} />
              </button>
              <button onClick={() => setShowSidebar(true)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F2F2F7', color: 'var(--rv-dark)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* ── QUICK ACTION ICONS (HORIZONTAL) ── */}
          <div style={{ padding: '0 20px 16px', display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {FEATURE_ICONS.map(f => (
              <div key={f.label} onClick={() => f.action === 'navigate-shopping' ? navigate('/shopping-list') : f.modal && setActiveModal(f.modal)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, width: 64 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', textAlign: 'center', lineHeight: 1.2 }}>{f.label}</div>
              </div>
            ))}
          </div>

          {/* ── METRICS GRID ── */}
          <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: 12, border: '0.5px solid rgba(60,60,67,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} color="var(--rv-pink)" /> Top Recipe</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>{mostOrdered}</div>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: 12, border: '0.5px solid rgba(60,60,67,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} onClick={() => setActiveModal('inventory')}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} color="#F59E0B" /> Low Stock</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{lowStockCount} items</div>
            </div>
          </div>

      {/* ── SEASONAL DISCOVERY ── */}
      {seasonalPick && !debouncedSearch && activeCategory === 'All' && (
        <div className="rv-seasonal-section">
          <div className="rv-seasonal-header">
            <span>{currentSeason.emoji} {currentSeason.name} Pick</span>
            <button className="rv-view-all">See more</button>
          </div>
          <DeletableCard onDelete={() => handleDelete(seasonalPick.id)} onClick={() => setSelectedRecipe(seasonalPick)}>
            <div className="rv-seasonal-card">
              <img src={seasonalPick.imageUrl} alt={seasonalPick.name} className="rv-seasonal-img" />
              <div className="rv-seasonal-info">
                <div className="rv-seasonal-title">{seasonalPick.name}</div>
                <div className="rv-seasonal-meta">{seasonalPick.yield} • ₹{getIngCost(seasonalPick).toFixed(0)} cost</div>
              </div>
            </div>
          </DeletableCard>
        </div>
      )}

      {/* ── SEARCH + SORT ── */}
      <div className="rv-search-wrapper glassmorphic-sticky">
        <div className="rv-search-bar" style={{ flex: 1 }}>
          <Search size={16} color="var(--rv-muted)" />
          <input
            ref={searchRef}
            placeholder="Search recipes or tags…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rv-muted)', display: 'flex', alignItems: 'center' }}>
              <X size={15} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSort(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: showSort ? 'var(--rv-pink)' : '#fff', color: showSort ? '#fff' : 'var(--rv-dark)', border: '1.5px solid', borderColor: showSort ? 'var(--rv-pink)' : 'var(--rv-border)', borderRadius: 20, padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: 'var(--rv-shadow-sm)' }}
          >
            <SlidersHorizontal size={14} />
            <ChevronDown size={13} />
          </button>
          {showSort && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', right: 0, top: 44, background: '#fff', border: '1px solid var(--rv-border)', borderRadius: 12, boxShadow: 'var(--rv-shadow-md)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: sortBy === opt.value ? 'var(--rv-pink-light)' : 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: sortBy === opt.value ? 700 : 500, color: sortBy === opt.value ? 'var(--rv-pink)' : 'var(--rv-dark)' }}>
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── FILTER TABS with counts ── */}
      <div className="rv-filter-tabs-container">
        <div className="rv-filter-tabs">
          {CATEGORIES.map(cat => (
            <button key={cat} className={`rv-filter-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {CAT_EMOJI[cat]} {cat}
              {categoryCounts[cat] > 0 && (
                <span style={{ background: activeCategory === cat ? 'rgba(255,255,255,0.3)' : 'var(--rv-pink-light)', color: activeCategory === cat ? '#fff' : 'var(--rv-pink)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800, marginLeft: 2 }}>
                  {categoryCounts[cat]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST HEADER ── */}
      <div className="rv-list-header">
        <span className="rv-section-title">
          My Recipes
          {debouncedSearch && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--rv-muted)', marginLeft: 8 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {sortBy !== 'default' && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--rv-pink)', background: 'var(--rv-pink-light)', padding: '3px 8px', borderRadius: 10 }}>
              {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            </span>
          )}
          <button className="rv-view-all">View all</button>
        </div>
      </div>

      {/* ── RECIPE LIST ── */}
      <div className="rv-list">
        <AnimatePresence mode="popLayout">
          {filtered.map((recipe, idx) => (
            <motion.div key={recipe.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, height: 0 }} transition={{ delay: Math.min(idx * 0.04, 0.2) }}>
              <DeletableCard onDelete={() => handleDelete(recipe.id)} onClick={() => setSelectedRecipe(recipe)}>
                <div className="rv-card">
                  <img
                    src={recipe.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200'}
                    className="rv-card-thumb" alt={recipe.name}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200'; }}
                  />
                  <div className="rv-card-info">
                    <div className="rv-card-title">
                      <Highlight text={recipe.name} query={debouncedSearch} />
                    </div>
                    <div className="rv-card-meta">
                      <span>{recipe.yield}</span>
                      {recipe.tags?.[0] && <><span className="rv-card-meta-dot" /><span className="rv-tag-inline"><Highlight text={recipe.tags[0]} query={debouncedSearch} /></span></>}
                      {recipe.tags?.[1] && <span className="rv-tag-inline"><Highlight text={recipe.tags[1]} query={debouncedSearch} /></span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                      {recipe.badge && <div className="rv-card-badge most-used">⭐ {recipe.badge}</div>}
                      <div style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600 }}>
                        ₹{getIngCost(recipe).toFixed(0)} cost
                      </div>
                      {getProfit(recipe) > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--rv-green)', fontWeight: 700 }}>
                          +₹{getProfit(recipe).toFixed(0)} profit
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--rv-muted)" style={{ flexShrink: 0 }} />
                </div>
              </DeletableCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '64px 20px' }}>
            <div className="rv-empty-icon-wrapper">
              {debouncedSearch ? <Search size={32} color="var(--rv-muted)" /> : <BookOpen size={32} color="var(--rv-pink)" />}
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--rv-dark)' }}>
              {debouncedSearch ? `No results for "${debouncedSearch}"` : `No ${activeCategory} recipes yet`}
            </div>
            <div style={{ fontSize: 14, color: 'var(--rv-muted)', marginBottom: 24, lineHeight: 1.6 }}>
              {debouncedSearch ? 'Try a different keyword or clear your search' : 'Start building your professional recipe vault.'}
            </div>
            {debouncedSearch
              ? <button onClick={() => setSearchQuery('')} style={{ background: 'var(--rv-pink-light)', color: 'var(--rv-pink)', border: 'none', borderRadius: 20, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Clear Search</button>
              : <button onClick={() => setShowCreate(true)} style={{ background: 'var(--rv-pink-gradient)', color: '#fff', border: 'none', borderRadius: 20, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: 'var(--rv-shadow-pink)' }}>+ Add New Recipe</button>
            }
          </motion.div>
        )}
      </div>

      {/* Removed the sticky bottom Add button. It is now at the top right of the header, Native iOS style. */}
      </>
      )}

      {/* ── SIDEBAR DRAWER ── */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 120 }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 280, background: '#fff', zIndex: 130, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '44px 20px 20px', borderBottom: '1px solid var(--rv-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>Studio Menu</div>
                <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={24} color="var(--rv-muted)" /></button>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'library', label: 'Recipe Library', icon: <Book size={20} /> },
                  { id: 'importer', label: 'Web Importer', icon: <DownloadCloud size={20} /> },
                  { id: 'shopping', label: 'Shopping List', icon: <ShoppingCart size={20} /> },
                  { id: 'captures', label: 'My Captures', icon: <Camera size={20} /> }
                ].map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id); setShowSidebar(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 12, background: activeTab === item.id ? 'var(--rv-pink-light)' : 'transparent', color: activeTab === item.id ? 'var(--rv-pink)' : 'var(--rv-dark)', border: 'none', cursor: 'pointer', fontWeight: activeTab === item.id ? 700 : 600, fontSize: 16, textAlign: 'left', transition: 'all 0.2s' }}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetail key="detail" recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            onEdit={(r) => { setSelectedRecipe(null); setEditRecipe(r); setShowCreate(true); }}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onShowInventory={() => setActiveModal('inventory')}
            onShowChecklist={() => { setActiveModal('checklist'); }}
          />
        )}
        {showCreate && (
          <CreateRecipe key="create" existingRecipe={editRecipe} onClose={() => { setShowCreate(false); setEditRecipe(null); }} />
        )}
        {activeModal === 'inventory' && <RecipeInventoryLinkage key="inventory" onClose={() => setActiveModal(null)} />}
        {activeModal === 'integration' && <RecipeOrderIntegration key="integration" onClose={() => setActiveModal(null)} />}
        {activeModal === 'checklist' && <RecipeChecklist key="checklist" recipe={selectedRecipe} onClose={() => setActiveModal(null)} />}
      </AnimatePresence>

      {/* Sort backdrop */}
      {showSort && <div onClick={() => setShowSort(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
        </div>
      </div>
    </div>
  );
}
