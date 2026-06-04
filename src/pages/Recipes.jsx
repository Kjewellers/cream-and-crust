import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  TrendingUp,
  Clock,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  X,
  BookOpen,
  Scale,
  IndianRupee,
  Package,
  Link,
  Menu,
  Trash2,
} from 'lucide-react';
import { subscribeToRecipes, deleteRecipeFromDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/iOS';
import ModuleTour from '../components/ModuleTour';
import { recipesTourSteps } from '../components/tours/recipesTour';
import AnimatedDemo from '../components/AnimatedDemo';
import { recipesDemoScenes } from '../components/demos/recipesDemo';
import RecipeDetail from '../components/recipes/RecipeDetail';
import RecipeErrorBoundary from '../components/recipes/RecipeErrorBoundary';
import CreateRecipe from '../components/recipes/CreateRecipe';
import RecipeOrderIntegration from '../components/recipes/RecipeOrderIntegration';
import RecipeInventoryLinkage from '../components/recipes/RecipeInventoryLinkage';
import RecipeChecklist from '../components/recipes/RecipeChecklist';
import MyCaptures from '../components/recipes/MyCaptures';
import WebImporter from '../components/recipes/WebImporter';
import SeasonalRecipes from '../components/recipes/SeasonalRecipes';
import ShoppingList from './ShoppingList';
import {
  ChefHat,
  Book,
  Camera,
  Search as SearchIcon,
  ShoppingCart,
  DownloadCloud,
  Leaf,
} from 'lucide-react';
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
    id: 'sample-1',
    name: 'Chocolate Truffle Cake',
    category: 'Cakes',
    tags: ['Chocolate', 'Eggless', 'Popular'],
    difficulty: 'Medium',
    prepTime: '30 mins',
    bakeTime: '45 mins',
    coolTime: '2 hrs',
    yield: '1 kg cake',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    sellPrice: 900,
    status: 'Published',
    badge: 'Popular',
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
      {
        title: 'Preheat Oven',
        desc: 'Preheat oven to 180°C. Grease and line the cake tin.',
        timer: '5 mins',
      },
      { title: 'Sieve Dry Ingredients', desc: 'Sieve flour, cocoa powder, baking soda and salt.' },
      {
        title: 'Cream Butter & Sugar',
        desc: 'In a bowl, cream butter and sugar until light and fluffy.',
      },
      { title: 'Add Vanilla', desc: 'Add vanilla extract and mix well.' },
      {
        title: 'Combine Alternately',
        desc: 'Add dry ingredients alternately with milk. Mix gently.',
      },
      {
        title: 'Pour & Bake',
        desc: 'Pour batter into tin and bake for 45 mins.',
        timer: '45 mins',
      },
    ],
    notes: 'Store in cool place. Use 70% dark chocolate for best results.',
    packaging: 40,
    gas: 25,
    labor: 80,
    platformFee: 5,
    other: 11,
  },
  {
    id: 'sample-2',
    name: 'Red Velvet Cake',
    category: 'Cakes',
    tags: ['Eggless', 'Classic'],
    difficulty: 'Medium',
    prepTime: '25 mins',
    bakeTime: '40 mins',
    coolTime: '1.5 hrs',
    yield: '1 kg cake',
    imageUrl: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=400',
    sellPrice: 850,
    status: 'Published',
    badge: 'Popular',
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
    packaging: 40,
    gas: 25,
    labor: 80,
    platformFee: 5,
    other: 11,
  },
  {
    id: 'sample-3',
    name: 'Vanilla Cupcakes',
    category: 'Cupcakes',
    tags: ['Eggless', 'Kids Favorite'],
    difficulty: 'Easy',
    prepTime: '20 mins',
    bakeTime: '22 mins',
    coolTime: '30 mins',
    yield: '12 pcs',
    imageUrl: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400',
    sellPrice: 480,
    status: 'Published',
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
    packaging: 25,
    gas: 15,
    labor: 60,
    platformFee: 5,
    other: 5,
  },
];

// Highlight matching text
function Highlight({ text, query }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark
        style={{
          background: 'rgba(255,107,138,0.25)',
          color: 'var(--rv-pink)',
          borderRadius: 3,
          padding: '0 2px',
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function Recipes() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [recipes, setRecipes] = useState([]);
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
  // Keep a ref to selectedRecipe to avoid stale closures in handleDelete
  const selectedRecipeRef = useRef(null);
  const [cachedRecipe, setCachedRecipe] = useState(null);

  useEffect(() => {
    selectedRecipeRef.current = selectedRecipe;
    if (selectedRecipe) setCachedRecipe(selectedRecipe);
  }, [selectedRecipe]);

  // Safe wrapper — never set a bad recipe object, log when one is tapped
  const openRecipe = useCallback((recipe) => {
    if (!recipe || typeof recipe !== 'object') {
      console.warn('[Recipes] openRecipe called with invalid recipe:', recipe);
      return;
    }
    if (!recipe.id) {
      console.warn('[Recipes] openRecipe: recipe has no id, opening anyway:', recipe);
    }
    // Normalise: ensure ingredients/steps are always arrays so RecipeDetail
    // doesn't crash on .map / .reduce of undefined.
    const safe = {
      ...recipe,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    };
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.log('[Recipes] opening recipe:', safe.id, safe.name);
    }
    setSelectedRecipe(safe);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Subscribe to DB recipes, deduplicate
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToRecipes(
      (dbRecipes) => {
        setRecipes(dbRecipes);
      },
      null,
      currentUser.uid
    );
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
    acc[cat] = cat === 'All' ? recipes.length : recipes.filter((r) => r.category === cat).length;
    return acc;
  }, {});

  // Filter + sort
  const getIngCost = (r) =>
    (Array.isArray(r.ingredients) ? r.ingredients : []).reduce(
      (s, i) => s + Number(i.cost || 0),
      0
    );
  const getProfit = (r) =>
    Number(r.sellPrice || 0) -
    getIngCost(r) -
    (r.packaging || 40) -
    (r.labor || 80) -
    (r.gas || 25) -
    (r.other || 11);

  const filtered = recipes
    .filter((r) => !deletedIds.has(r.id))
    .filter((r) => activeCategory === 'All' || r.category === activeCategory)
    .filter(
      (r) =>
        !debouncedSearch ||
        (r.name && r.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (Array.isArray(r.tags) ? r.tags : []).some(
          (t) => typeof t === 'string' && t.toLowerCase().includes(debouncedSearch.toLowerCase())
        ) ||
        (Array.isArray(r.ingredients) ? r.ingredients : []).some(
          (ing) =>
            ing &&
            typeof ing.name === 'string' &&
            ing.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
    )
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'cost_asc') return getIngCost(a) - getIngCost(b);
      if (sortBy === 'cost_desc') return getIngCost(b) - getIngCost(a);
      if (sortBy === 'profit') return getProfit(b) - getProfit(a);
      return 0;
    });

  const handleDelete = useCallback((id) => {
    setDeletedIds((prev) => new Set([...prev, id]));
    // Use ref to avoid stale closure — always close detail if this recipe is open
    if (selectedRecipeRef.current?.id === id) setSelectedRecipe(null);

    // Undo toast
    if (undoRef.current) clearTimeout(undoRef.current);
    showToast('Recipe deleted — Undo?', 'error');

    undoRef.current = setTimeout(() => {
      // Delete from DB for any real (non-sample) recipe
      if (!id.startsWith('sample-') && !id.startsWith('dup-')) {
        deleteRecipeFromDB(id).catch(() => {});
      }
    }, 4000);
  }, []);

  const handleDuplicate = (recipe) => {
    const dup = {
      ...recipe,
      id: 'dup-' + Date.now(),
      name: recipe.name + ' (Copy)',
      status: 'Draft',
      badge: null,
    };
    setRecipes((prev) => [dup, ...prev]);
    showToast('Recipe duplicated!', 'success');
    setSelectedRecipe(null);
  };

  const FEATURE_ICONS = [
    {
      icon: <BookOpen size={20} color="var(--accent)" />,
      label: 'Recipe Creation',
      bg: 'var(--accent-lt)',
      modal: null,
    },
    {
      icon: <ShoppingCart size={20} color="#E11D48" />,
      label: 'Shopping List',
      bg: '#FFF1F2',
      action: 'tab-shopping',
    },
    {
      icon: <Scale size={20} color="#8B5CF6" />,
      label: 'Smart Scaling',
      bg: '#F5F3FF',
      modal: null,
    },
    {
      icon: <IndianRupee size={20} color="#F59E0B" />,
      label: 'Costing & Profit',
      bg: '#FFFBEB',
      modal: null,
    },
    {
      icon: <Package size={20} color="#10B981" />,
      label: 'Inventory Linkage',
      bg: '#ECFDF5',
      modal: 'inventory',
    },
    {
      icon: <Link size={20} color="#3B82F6" />,
      label: 'Order Integration',
      bg: '#EFF6FF',
      modal: 'integration',
    },
  ];

  const publishedCount = recipes.filter(
    (r) => String(r.status || '').toLowerCase() === 'published'
  ).length;
  const draftCount = recipes.filter((r) => String(r.status || '').toLowerCase() === 'draft').length;
  const avgCost = recipes.length
    ? recipes.reduce((sum, r) => sum + getIngCost(r), 0) / recipes.length
    : 0;
  const topMarginRecipe = recipes
    .filter((r) => Number(r.sellPrice || 0) > 0)
    .sort((a, b) => getProfit(b) - getProfit(a))[0];
  const topMetricLabel = topMarginRecipe
    ? topMarginRecipe.name.split(' ').slice(0, 2).join(' ')
    : recipes.length
      ? `${publishedCount} Published`
      : 'Add first recipe';

  // ── Auto-Season Detection Logic ──
  const getSeason = () => {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 5) return { name: 'Mango', emoji: '🥭' }; // Mar-Jun
    if (month >= 6 && month <= 8) return { name: 'Peach', emoji: '🍑' }; // Jul-Sep
    if (month >= 9 && month <= 10) return { name: 'Apple', emoji: '🍎' }; // Oct-Nov
    return { name: 'Strawberry', emoji: '🍓' }; // Dec-Feb
  };
  const getRecipeSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 5) return { name: 'Summer', emoji: '☀️' };
    if (month >= 6 && month <= 8) return { name: 'Monsoon', emoji: '🌧️' };
    if (month >= 9 && month <= 10) return { name: 'Autumn', emoji: '🍁' };
    return { name: 'Winter', emoji: '❄️' };
  };
  const currentSeason = getRecipeSeason();

  // Find all recipes matching the current season
  const seasonalRecipes = recipes.filter(
    (r) =>
      String(r.season || r.seasonalFruit || '').toLowerCase() === currentSeason.name.toLowerCase()
  );

  return (
    <div className="rv-layout">
      {/* ── DESKTOP SIDEBAR ── */}
      <div className="rv-sidebar">
        <div
          className="rv-sidebar-logo"
          style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: 'var(--rv-muted)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              padding: 0,
            }}
          >
            <ChevronLeft size={16} /> Back to App
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🧁</span> Recipe Studio
          </div>
        </div>
        <button
          className={`rv-sidebar-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <Book size={18} /> Library
        </button>
        <button
          className={`rv-sidebar-item ${activeTab === 'seasonal' ? 'active' : ''}`}
          onClick={() => setActiveTab('seasonal')}
          style={{
            color: activeTab === 'seasonal' ? 'var(--rv-pink)' : '',
            background: activeTab === 'seasonal' ? 'var(--rv-pink-light)' : '',
          }}
        >
          <Leaf size={18} /> Seasonal Hub
        </button>
        <button
          className={`rv-sidebar-item ${activeTab === 'importer' ? 'active' : ''}`}
          onClick={() => setActiveTab('importer')}
        >
          <DownloadCloud size={18} /> Web Importer
        </button>
        <button
          className={`rv-sidebar-item ${activeTab === 'shopping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shopping')}
        >
          <ShoppingCart size={18} /> Shopping List
        </button>
        <button
          className={`rv-sidebar-item ${activeTab === 'captures' ? 'active' : ''}`}
          onClick={() => setActiveTab('captures')}
        >
          <Camera size={18} /> Captures
        </button>
        <button
          className={`rv-sidebar-item ${activeTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => setActiveTab('kitchen')}
        >
          <ChefHat size={18} /> Kitchen Mode
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="rv-main-content" style={{ background: 'var(--bg)' }}>
        <div
          className="rv"
          style={{ minHeight: '100%', paddingBottom: 80, background: 'var(--bg)' }}
        >
          {/* ── SUB-TAB HEADER (back to library) ── */}
          {activeTab !== 'library' && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 12px',
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderBottom: '1px solid var(--rv-border, rgba(60,60,67,0.08))',
              }}
            >
              <button
                onClick={() => setActiveTab('library')}
                aria-label="Back to library"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  border: '1px solid var(--rv-border, rgba(60,60,67,0.1))',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--rv-dark, #1C1C1E)',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  color: 'var(--rv-dark, #1C1C1E)',
                }}
              >
                {activeTab === 'seasonal' && 'Seasonal Hub'}
                {activeTab === 'captures' && 'My Captures'}
                {activeTab === 'importer' && 'Web Importer'}
                {activeTab === 'kitchen' && 'Kitchen Mode'}
                {activeTab === 'shopping' && 'Shopping List'}
              </div>
            </div>
          )}

          {/* ── APP TABS RENDERING ── */}
          {activeTab === 'seasonal' && (
            <SeasonalRecipes
              recipes={recipes}
              getIngCost={getIngCost}
              onSelectRecipe={openRecipe}
              onAddRecipe={() => {
                setEditRecipe(null);
                setShowCreate(true);
              }}
            />
          )}

          {activeTab === 'captures' && <MyCaptures userId={currentUser?.uid} />}

          {activeTab === 'shopping' && (
            <RecipeErrorBoundary onClose={() => setActiveTab('library')}>
              <ShoppingList />
            </RecipeErrorBoundary>
          )}

          {activeTab === 'importer' && (
            <WebImporter
              onImport={(data) => {
                setEditRecipe(data);
                setShowCreate(true);
                setActiveTab('library');
              }}
            />
          )}

          {activeTab === 'kitchen' && (
            <div style={{ padding: '64px 20px', textAlign: 'center' }}>
              <ChefHat size={48} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Kitchen Mode</h2>
              <p style={{ color: 'var(--rv-muted)', fontSize: 15 }}>
                Select a recipe from the library to enter Kitchen Mode.
              </p>
              <button
                className="rv-btn-primary"
                onClick={() => setActiveTab('library')}
                style={{
                  marginTop: 24,
                  width: 'auto',
                  padding: '12px 24px',
                  margin: '24px auto 0',
                }}
              >
                Go to Library
              </button>
            </div>
          )}

          {activeTab === 'library' && (
            <>
              {/* ── PREMIUM HERO HEADER ── */}
              <div className="rv-hero">
                <div className="rv-hero-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rv-hero-eyebrow">{getGreeting()}</div>
                    <div className="rv-hero-title">Recipe Studio</div>
                    <div className="rv-hero-subtitle">
                      {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in your vault
                      {publishedCount > 0 ? ` \u00B7 ${publishedCount} published` : ''}
                    </div>
                  </div>
                  <div className="rv-hero-actions">
                    <button
                      className="rv-hero-icon-btn"
                      onClick={() => searchRef.current?.focus()}
                      aria-label="Search"
                      type="button"
                    >
                      <Search size={18} />
                    </button>
                    <button
                      className="rv-hero-icon-btn"
                      onClick={() => setShowSidebar(true)}
                      aria-label="Menu"
                      type="button"
                    >
                      <Menu size={18} />
                    </button>
                  </div>
                </div>
                <div className="rv-hero-cta-row">
                  <button
                    className="rv-hero-cta-primary"
                    onClick={() => {
                      setEditRecipe(null);
                      setShowCreate(true);
                    }}
                    type="button"
                  >
                    <Plus size={18} /> Create Recipe
                  </button>
                  <button
                    className="rv-hero-cta-outline"
                    onClick={() => setActiveTab('importer')}
                    type="button"
                  >
                    <DownloadCloud size={18} /> Import from web
                  </button>
                </div>
              </div>

              {/* ── QUICK ACTION ICONS — premium pill bar ── */}
              <div className="rv-quick-actions">
                {FEATURE_ICONS.map((f) => (
                  <button
                    key={f.label}
                    className="rv-quick-action"
                    onClick={() =>
                      f.action === 'tab-shopping'
                        ? setActiveTab('shopping')
                        : f.modal && setActiveModal(f.modal)
                    }
                    type="button"
                  >
                    <div className="rv-quick-action-icon" style={{ background: f.bg }}>
                      {f.icon}
                    </div>
                    <div className="rv-quick-action-label">{f.label}</div>
                  </button>
                ))}
              </div>

              {/* ── METRICS GRID ── */}
              <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
                <div
                  style={{
                    flex: 1,
                    background: '#fff',
                    borderRadius: 10,
                    padding: 12,
                    border: '0.5px solid rgba(60,60,67,0.1)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#8E8E93',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <TrendingUp size={12} color="var(--rv-pink)" />{' '}
                    {topMarginRecipe ? 'Best Margin' : 'Library'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>
                    {topMetricLabel}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: '#fff',
                    borderRadius: 10,
                    padding: 12,
                    border: '0.5px solid rgba(60,60,67,0.1)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                  onClick={() => setActiveModal('inventory')}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#8E8E93',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <AlertTriangle size={12} color="#F59E0B" />{' '}
                    {recipes.length ? 'Avg Cost' : 'Drafts'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>
                    {recipes.length
                      ? `₹${avgCost.toFixed(0)}`
                      : `${draftCount} draft${draftCount === 1 ? '' : 's'}`}
                  </div>
                </div>
              </div>

              {/* ── SEASONAL SPECIALS CAROUSEL ── */}
              {seasonalRecipes.length > 0 && !debouncedSearch && activeCategory === 'All' && (
                <div style={{ padding: '0 0 20px', overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0 20px',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--rv-dark)' }}>
                      {currentSeason.emoji} Current Season: {currentSeason.name}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '0 20px',
                      overflowX: 'auto',
                      scrollbarWidth: 'none',
                    }}
                    className="no-scrollbar"
                  >
                    {seasonalRecipes.map((sr) => (
                      <div
                        key={sr.id}
                        onClick={() => openRecipe(sr)}
                        style={{
                          width: 140,
                          flexShrink: 0,
                          cursor: 'pointer',
                          position: 'relative',
                          borderRadius: 16,
                          overflow: 'hidden',
                          background: '#fff',
                          boxShadow: 'var(--rv-shadow-md)',
                          border: '1px solid rgba(255,255,255,0.8)',
                        }}
                      >
                        <div style={{ height: 100, background: 'var(--rv-pink-light)' }}>
                          <img
                            src={
                              sr.imageUrl ||
                              'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200'
                            }
                            alt={sr.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200';
                            }}
                          />
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 13,
                              color: 'var(--rv-dark)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginBottom: 2,
                            }}
                          >
                            {sr.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600 }}>
                            ₹{getIngCost(sr).toFixed(0)} cost
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--rv-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSort((v) => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: showSort ? 'var(--rv-pink)' : '#fff',
                      color: showSort ? '#fff' : 'var(--rv-dark)',
                      border: '1.5px solid',
                      borderColor: showSort ? 'var(--rv-pink)' : 'var(--rv-border)',
                      borderRadius: 20,
                      padding: '8px 12px',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: 'var(--rv-shadow-sm)',
                    }}
                  >
                    <SlidersHorizontal size={14} />
                    <ChevronDown size={13} />
                  </button>
                  {showSort && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 44,
                        background: '#fff',
                        border: '1px solid var(--rv-border)',
                        borderRadius: 12,
                        boxShadow: 'var(--rv-shadow-md)',
                        zIndex: 50,
                        minWidth: 160,
                        overflow: 'hidden',
                      }}
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSort(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            background: sortBy === opt.value ? 'var(--rv-pink-light)' : 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: sortBy === opt.value ? 700 : 500,
                            color: sortBy === opt.value ? 'var(--rv-pink)' : 'var(--rv-dark)',
                          }}
                        >
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
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`rv-filter-tab ${activeCategory === cat ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {CAT_EMOJI[cat]} {cat}
                      {categoryCounts[cat] > 0 && (
                        <span
                          style={{
                            background:
                              activeCategory === cat
                                ? 'rgba(255,255,255,0.3)'
                                : 'var(--rv-pink-light)',
                            color: activeCategory === cat ? '#fff' : 'var(--rv-pink)',
                            borderRadius: 10,
                            padding: '1px 6px',
                            fontSize: 11,
                            fontWeight: 800,
                            marginLeft: 2,
                          }}
                        >
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
                  {debouncedSearch && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--rv-muted)',
                        marginLeft: 8,
                      }}
                    >
                      {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sortBy !== 'default' && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--rv-pink)',
                        background: 'var(--rv-pink-light)',
                        padding: '3px 8px',
                        borderRadius: 10,
                      }}
                    >
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                    </span>
                  )}
                  <button
                    className="rv-view-all"
                    onClick={() => {
                      setActiveCategory('All');
                      setSearchQuery('');
                      setSortBy('default');
                    }}
                  >
                    View all
                  </button>
                </div>
              </div>

              {/* ── RECIPE LIST ── */}
              <div className="rv-list">
                <AnimatePresence mode="popLayout">
                  {filtered.map((recipe, idx) => (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, height: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.2) }}
                    >
                      <div style={{ position: 'relative' }}>
                        <div
                          className="rv-card"
                          onClick={() => openRecipe(recipe)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img
                            src={
                              recipe.imageUrl ||
                              'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200'
                            }
                            className="rv-card-thumb"
                            alt={recipe.name}
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200';
                            }}
                          />
                          <div className="rv-card-info">
                            <div className="rv-card-title">
                              <Highlight text={recipe.name} query={debouncedSearch} />
                            </div>
                            <div className="rv-card-meta">
                              <span>{recipe.yield}</span>
                              {recipe.tags?.[0] && (
                                <>
                                  <span className="rv-card-meta-dot" />
                                  <span className="rv-tag-inline">
                                    <Highlight text={recipe.tags[0]} query={debouncedSearch} />
                                  </span>
                                </>
                              )}
                              {recipe.tags?.[1] && (
                                <span className="rv-tag-inline">
                                  <Highlight text={recipe.tags[1]} query={debouncedSearch} />
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 5,
                              }}
                            >
                              {recipe.badge && (
                                <div className="rv-card-badge most-used">⭐ {recipe.badge}</div>
                              )}
                              <div
                                style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600 }}
                              >
                                ₹{getIngCost(recipe).toFixed(0)} cost
                              </div>
                              {getProfit(recipe) > 0 && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--rv-green)',
                                    fontWeight: 700,
                                  }}
                                >
                                  +₹{getProfit(recipe).toFixed(0)} profit
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                              flexShrink: 0,
                              paddingRight: 4,
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDelete(recipe.id);
                              }}
                              style={{
                                background: 'rgba(239,68,68,0.1)',
                                color: '#EF4444',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                            <ChevronRight size={18} color="var(--rv-muted)" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {filtered.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', padding: '64px 20px' }}
                  >
                    <div className="rv-empty-icon-wrapper">
                      {debouncedSearch ? (
                        <Search size={32} color="var(--rv-muted)" />
                      ) : (
                        <BookOpen size={32} color="var(--rv-pink)" />
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 18,
                        marginBottom: 8,
                        color: 'var(--rv-dark)',
                      }}
                    >
                      {debouncedSearch
                        ? `No results for "${debouncedSearch}"`
                        : `No ${activeCategory} recipes yet`}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: 'var(--rv-muted)',
                        marginBottom: 24,
                        lineHeight: 1.6,
                      }}
                    >
                      {debouncedSearch
                        ? 'Try a different keyword or clear your search'
                        : 'Start building your professional recipe vault.'}
                    </div>
                    {debouncedSearch ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          background: 'var(--rv-pink-light)',
                          color: 'var(--rv-pink)',
                          border: 'none',
                          borderRadius: 20,
                          padding: '10px 20px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        Clear Search
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowCreate(true)}
                        style={{
                          background: 'var(--rv-pink-gradient)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 20,
                          padding: '12px 24px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: 14,
                          boxShadow: 'var(--rv-shadow-pink)',
                        }}
                      >
                        + Add New Recipe
                      </button>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Removed the sticky bottom Add button. It is now at the top right of the header, Native iOS style. */}
            </>
          )}
        </div>

        {/* ── SIDEBAR DRAWER ── */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSidebar(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 120,
                }}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 280,
                  background: '#fff',
                  zIndex: 130,
                  boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '44px 20px 20px',
                    borderBottom: '1px solid var(--rv-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 20 }}>Studio Menu</div>
                  <button
                    onClick={() => setShowSidebar(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <X size={24} color="var(--rv-muted)" />
                  </button>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'library', label: 'Recipe Library', icon: <Book size={20} /> },
                    { id: 'seasonal', label: 'Seasonal Hub', icon: <Leaf size={20} /> },
                    { id: 'importer', label: 'Web Importer', icon: <DownloadCloud size={20} /> },
                    { id: 'shopping', label: 'Shopping List', icon: <ShoppingCart size={20} /> },
                    { id: 'captures', label: 'My Captures', icon: <Camera size={20} /> },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowSidebar(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: '16px',
                        borderRadius: 12,
                        background: activeTab === item.id ? 'var(--rv-pink-light)' : 'transparent',
                        color: activeTab === item.id ? 'var(--rv-pink)' : 'var(--rv-dark)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: activeTab === item.id ? 700 : 600,
                        fontSize: 16,
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
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
          {selectedRecipe && !showCreate && (
            <RecipeErrorBoundary
              key={`detail-${selectedRecipe.id || 'unknown'}`}
              onClose={() => setSelectedRecipe(null)}
            >
              <RecipeDetail
                recipe={selectedRecipe}
                onClose={() => setSelectedRecipe(null)}
                onDelete={handleDelete}
                onEdit={(r) => {
                  setEditRecipe(r);
                  setShowCreate(true);
                  setSelectedRecipe(null);
                }}
                onShowInventory={() => setActiveModal('inventory')}
                onShowChecklist={() => {
                  setActiveModal('checklist');
                }}
              />
            </RecipeErrorBoundary>
          )}
          {showCreate && (
            <CreateRecipe
              key="create"
              existingRecipe={editRecipe}
              onClose={(savedRecipe) => {
                setShowCreate(false);
                setEditRecipe(null);
                // After save, show the updated recipe in the detail view
                if (savedRecipe) {
                  setSelectedRecipe(savedRecipe);
                }
              }}
            />
          )}
          {activeModal === 'inventory' && (
            <RecipeInventoryLinkage key="inventory" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'integration' && (
            <RecipeOrderIntegration key="integration" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'checklist' && (
            <RecipeChecklist
              key="checklist"
              recipe={selectedRecipe}
              onClose={() => setActiveModal(null)}
            />
          )}
        </AnimatePresence>

        {/* Sort backdrop */}
        {showSort && (
          <div
            onClick={() => setShowSort(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
        )}
      </div>
      <AnimatedDemo moduleId="recipes" title="Your Recipe Vault" scenes={recipesDemoScenes} />
    </div>
  );
}
