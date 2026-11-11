import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Link as LinkIcon,
  Trash2,
  ChefHat,
  Book,
  Camera,
  ShoppingCart,
  DownloadCloud,
  Leaf,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { subscribeToRecipes, deleteRecipeFromDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/iOS';
import AnimatedDemo from '../components/AnimatedDemo';
import { recipesDemoScenes } from '../components/demos/recipesDemo';
import RecipeDetail from '../components/recipes/RecipeDetail';
import RecipeErrorBoundary from '../components/recipes/RecipeErrorBoundary';
import CreateRecipe from '../components/recipes/CreateRecipe';
import RecipeOrderIntegration from '../components/recipes/RecipeOrderIntegration';
import RecipeInventoryLinkage from '../components/recipes/RecipeInventoryLinkage';
import RecipeChecklist from '../components/recipes/RecipeChecklist';
import CookingMode from '../components/recipes/CookingMode';
import MyCaptures from '../components/recipes/MyCaptures';
import WebImporter from '../components/recipes/WebImporter';
import SeasonalRecipes from '../components/recipes/SeasonalRecipes';
import ShoppingList from './ShoppingList';
import '../pages/RecipesStyles.css';

const CATEGORIES = ['All', 'Cakes', 'Cupcakes', 'Brownies', 'Desserts'];
const CAT_EMOJI = { All: '🍽️', Cakes: '🎂', Cupcakes: '🧁', Brownies: '🍫', Desserts: '🍮' };
const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'cost_asc', label: 'Cost: Low to High' },
  { value: 'cost_desc', label: 'Cost: High to Low' },
  { value: 'profit', label: 'Profit Margin (High)' },
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

// Highlight matching search text
function Highlight({ text, query }) {
  if (!query || !text) return <span>{text || ''}</span>;
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
  const [cookingRecipe, setCookingRecipe] = useState(null);
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('library');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('cream_recipe_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const undoRef = useRef(null);
  const searchRef = useRef(null);
  const selectedRecipeRef = useRef(null);

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('cream_recipe_view_mode', mode);
    } catch {}
  };

  useEffect(() => {
    selectedRecipeRef.current = selectedRecipe;
  }, [selectedRecipe]);

  // Lock background body scroll when an overlay / sheet / dialog is active
  useEffect(() => {
    const isOverlayOpen = Boolean(
      selectedRecipe || showCreate || activeModal || cookingRecipe
    );
    if (!isOverlayOpen || typeof window === 'undefined') return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const origOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origPosition = document.body.style.position;
    const origTop = document.body.style.top;
    const origWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.top = origTop;
      document.body.style.width = origWidth;
      try {
        window.scrollTo(0, scrollY);
      } catch (_) {}
    };
  }, [selectedRecipe, showCreate, activeModal, cookingRecipe]);

  // Safe recipe opener
  const openRecipe = useCallback((recipe) => {
    if (!recipe || typeof recipe !== 'object') {
      console.warn('[Recipes] openRecipe: invalid recipe', recipe);
      return;
    }
    const safe = {
      ...recipe,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    };
    setSelectedRecipe(safe);
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Subscribe to Firestore DB recipes
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToRecipes(
      (dbRecipes) => {
        setRecipes(dbRecipes && dbRecipes.length ? dbRecipes : SAMPLE_RECIPES);
      },
      null,
      currentUser.uid
    );
    return () => unsub();
  }, [currentUser]);

  // Category Counts
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? recipes.length : recipes.filter((r) => r.category === cat).length;
    return acc;
  }, {});

  // Cost and Profit calculations
  const getIngCost = (r) =>
    (Array.isArray(r.ingredients) ? r.ingredients : []).reduce(
      (s, i) => s + Number(i.cost || 0),
      0
    );

  const getProfit = (r) =>
    Number(r.sellPrice || 0) -
    getIngCost(r) -
    Number(r.packaging || 40) -
    Number(r.labor || 80) -
    Number(r.gas || 25) -
    Number(r.other || 11);

  // Filtered and Sorted Recipes
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
    if (selectedRecipeRef.current?.id === id) setSelectedRecipe(null);

    if (undoRef.current) clearTimeout(undoRef.current);
    showToast('Recipe deleted — Undo?', 'error');

    undoRef.current = setTimeout(() => {
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

  // Metrics
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

  // Auto-Season Detection
  const getRecipeSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return { name: 'Spring', emoji: '🌸', fruit: 'Berry' };
    if (month >= 5 && month <= 7) return { name: 'Summer', emoji: '☀️', fruit: 'Mango' };
    if (month >= 8 && month <= 9) return { name: 'Monsoon', emoji: '🌧️', fruit: 'Peach' };
    if (month === 10) return { name: 'Autumn', emoji: '🍁', fruit: 'Apple' };
    return { name: 'Winter', emoji: '❄️', fruit: 'Strawberry' };
  };
  const currentSeason = getRecipeSeason();
  const seasonalRecipes = recipes.filter(
    (r) =>
      String(r.season || r.seasonalFruit || '').toLowerCase() === currentSeason.name.toLowerCase() ||
      String(r.name || '').toLowerCase().includes(currentSeason.fruit.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="recipes-page fade-in"
    >
      {/* ── SUB-TAB HEADER (when browsing a sub-tool) ── */}
      {activeTab !== 'library' ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0 16px',
              borderBottom: '1px solid var(--border)',
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setActiveTab('library')}
              aria-label="Back to Recipe Library"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} /> Back to Library
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {activeTab === 'seasonal' && '🍓 Seasonal Recipe Hub'}
              {activeTab === 'captures' && '📸 Kitchen Photo Captures'}
              {activeTab === 'importer' && '📥 Web Recipe Importer'}
              {activeTab === 'shopping' && '🛒 Bakery Shopping List'}
            </div>
            <div style={{ width: 40 }} />
          </div>

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
        </div>
      ) : (
        /* ── RECIPE STUDIO LIBRARY VIEW ── */
        <>
          {/* Header Row */}
          <div className="recipes-header">
            <div className="recipes-header-info">
              <div className="recipes-eyebrow">
                <Sparkles size={12} /> Bakery Production & Formulas
              </div>
              <h1 className="recipes-title">Recipe Studio</h1>
              <div className="recipes-subtitle">
                <span>{recipes.length} {recipes.length === 1 ? 'formula' : 'formulas'}</span>
                <span>·</span>
                <span style={{ color: 'var(--rv-green)', fontWeight: 700 }}>
                  {publishedCount} published
                </span>
                <span>·</span>
                <span
                  style={{
                    background: 'var(--accent-lt)',
                    color: 'var(--accent)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {currentSeason.emoji} {currentSeason.name} Active
                </span>
              </div>
            </div>

            <div className="recipes-header-actions">
              {/* View Mode Toggle (Grid vs List) */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg2)',
                  borderRadius: 12,
                  padding: 3,
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => toggleViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                  style={{
                    background: viewMode === 'grid' ? '#fff' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text3)',
                    border: 'none',
                    borderRadius: 9,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => toggleViewMode('list')}
                  title="List View"
                  aria-label="List View"
                  style={{
                    background: viewMode === 'list' ? '#fff' : 'transparent',
                    color: viewMode === 'list' ? 'var(--accent)' : 'var(--text3)',
                    border: 'none',
                    borderRadius: 9,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <List size={16} />
                </button>
              </div>

              {/* Web Importer Quick Button */}
              <button
                className="btn btn-outline"
                onClick={() => setActiveTab('importer')}
                style={{ gap: 6, fontSize: 13 }}
                type="button"
              >
                <DownloadCloud size={16} />
                <span className="desktop-only">Web Import</span>
              </button>

              {/* Add New Recipe Primary Action */}
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditRecipe(null);
                  setShowCreate(true);
                }}
                style={{ gap: 6, fontSize: 13 }}
                type="button"
              >
                <Plus size={16} /> Add Recipe
              </button>
            </div>
          </div>

          {/* Sub-Navigation Ribbon (Tabs) */}
          <div className="recipes-subnav">
            <button
              className={`recipes-subnav-btn ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => setActiveTab('library')}
              type="button"
            >
              <Book size={15} /> All Recipes ({recipes.length})
            </button>
            <button
              className={`recipes-subnav-btn ${activeTab === 'seasonal' ? 'active' : ''}`}
              onClick={() => setActiveTab('seasonal')}
              type="button"
            >
              <Leaf size={15} /> Seasonal Hub {seasonalRecipes.length > 0 && `(${seasonalRecipes.length})`}
            </button>
            <button
              className={`recipes-subnav-btn ${activeTab === 'shopping' ? 'active' : ''}`}
              onClick={() => setActiveTab('shopping')}
              type="button"
            >
              <ShoppingCart size={15} /> Shopping List
            </button>
            <button
              className={`recipes-subnav-btn ${activeTab === 'importer' ? 'active' : ''}`}
              onClick={() => setActiveTab('importer')}
              type="button"
            >
              <DownloadCloud size={15} /> Web Importer
            </button>
            <button
              className={`recipes-subnav-btn ${activeTab === 'captures' ? 'active' : ''}`}
              onClick={() => setActiveTab('captures')}
              type="button"
            >
              <Camera size={15} /> My Captures
            </button>
            <button
              className="recipes-subnav-btn"
              onClick={() => setActiveModal('inventory')}
              type="button"
            >
              <Package size={15} /> Inventory Link
            </button>
          </div>

          {/* High-Density Metrics Strip (3 Cards) */}
          <div className="recipes-metrics-strip">
            <div className="recipes-metric-card">
              <div>
                <div className="recipes-metric-label">Formulas in Studio</div>
                <div className="recipes-metric-val">{recipes.length} Total</div>
                <div className="recipes-metric-sub">{publishedCount} active · {draftCount} drafts</div>
              </div>
              <div className="recipes-metric-icon" style={{ background: 'var(--accent-lt)', color: 'var(--accent)' }}>
                <BookOpen size={20} />
              </div>
            </div>

            <div
              className="recipes-metric-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveModal('inventory')}
              title="View Inventory Linkage"
            >
              <div>
                <div className="recipes-metric-label">Avg. Batch Cost</div>
                <div className="recipes-metric-val">₹{avgCost.toFixed(0)}</div>
                <div className="recipes-metric-sub">Auto-calculated from raw items</div>
              </div>
              <div className="recipes-metric-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <IndianRupee size={20} />
              </div>
            </div>

            <div className="recipes-metric-card">
              <div>
                <div className="recipes-metric-label">Highest Margin Formula</div>
                <div className="recipes-metric-val" style={{ color: 'var(--rv-green)' }}>
                  {topMarginRecipe ? topMarginRecipe.name.split(' ').slice(0, 2).join(' ') : '—'}
                </div>
                <div className="recipes-metric-sub">
                  {topMarginRecipe ? `+₹${getProfit(topMarginRecipe).toFixed(0)} net margin` : 'Add first recipe'}
                </div>
              </div>
              <div className="recipes-metric-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                <TrendingUp size={20} />
              </div>
            </div>
          </div>

          {/* Search, Sort and Filter Row */}
          <div className="recipes-controls-row">
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text3)',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchRef}
                placeholder="Search recipe by name, ingredients, or tags…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 36px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  fontSize: 14,
                  color: 'var(--text)',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear Search"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSort((v) => !v)}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: sortBy !== 'default' ? 'var(--accent-lt)' : 'var(--card)',
                  color: sortBy !== 'default' ? 'var(--accent)' : 'var(--text)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <SlidersHorizontal size={14} />
                <span>
                  {sortBy === 'default'
                    ? 'Sort'
                    : SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <ChevronDown size={13} />
              </button>

              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 42,
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    minWidth: 180,
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
                        padding: '10px 14px',
                        textAlign: 'left',
                        background: sortBy === opt.value ? 'var(--accent-lt)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: sortBy === opt.value ? 800 : 500,
                        color: sortBy === opt.value ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 14,
              marginBottom: 10,
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeCategory === cat ? 'var(--accent)' : 'var(--bg2)',
                  color: activeCategory === cat ? '#fff' : 'var(--text2)',
                  boxShadow: activeCategory === cat ? '0 2px 8px rgba(181,96,106,0.3)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                <span>{CAT_EMOJI[cat]}</span>
                <span>{cat}</span>
                {categoryCounts[cat] > 0 && (
                  <span
                    style={{
                      background:
                        activeCategory === cat ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
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

          {/* Recipe List / Grid Section */}
          <div style={{ marginBottom: 40 }}>
            {viewMode === 'grid' ? (
              /* ── RESPONSIVE GRID VIEW ── */
              <div className="recipes-grid">
                <AnimatePresence mode="popLayout">
                  {filtered.map((recipe) => (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.18 }}
                      className="recipe-grid-card"
                      onClick={() => openRecipe(recipe)}
                    >
                      {/* Media container */}
                      <div className="recipe-card-media">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            className="recipe-card-img"
                            alt={recipe.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: 44 }}>
                            {CAT_EMOJI[recipe.category] || '🧁'}
                          </div>
                        )}

                        {/* Category tag */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            background: 'rgba(255, 255, 255, 0.92)',
                            backdropFilter: 'blur(8px)',
                            color: 'var(--text)',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 8,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          }}
                        >
                          {CAT_EMOJI[recipe.category] || '🧁'} {recipe.category}
                        </div>

                        {/* Badge / Status */}
                        {recipe.badge ? (
                          <div
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'rgba(245, 158, 11, 0.95)',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '3px 7px',
                              borderRadius: 8,
                            }}
                          >
                            ⭐ {recipe.badge}
                          </div>
                        ) : recipe.status === 'Draft' ? (
                          <div
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'rgba(107, 114, 128, 0.9)',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '3px 7px',
                              borderRadius: 8,
                            }}
                          >
                            Draft
                          </div>
                        ) : null}

                        {/* Quick Cook button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCookingRecipe(recipe);
                          }}
                          title="Open Kitchen Cooking Mode"
                          aria-label="Start Cooking"
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 20,
                            padding: '5px 11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 800,
                            boxShadow: '0 4px 12px rgba(181, 96, 106, 0.4)',
                            cursor: 'pointer',
                          }}
                        >
                          <ChefHat size={13} /> Cook
                        </button>
                      </div>

                      {/* Card Body */}
                      <div className="recipe-card-body">
                        <div className="recipe-card-title">
                          <Highlight text={recipe.name} query={debouncedSearch} />
                        </div>

                        <div className="recipe-card-badges">
                          {recipe.yield && (
                            <span className="recipe-badge-chip">⚖️ {recipe.yield}</span>
                          )}
                          {(recipe.bakeTime || recipe.prepTime) && (
                            <span className="recipe-badge-chip">
                              ⏱️ {recipe.bakeTime || recipe.prepTime}
                            </span>
                          )}
                          {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                            <span className="recipe-badge-chip">
                              🥣 {recipe.ingredients.length} items
                            </span>
                          )}
                        </div>

                        {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 4,
                              flexWrap: 'wrap',
                              marginBottom: 10,
                            }}
                          >
                            {recipe.tags.slice(0, 2).map((t, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--accent)',
                                  background: 'var(--accent-lt)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="recipe-card-financials">
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                              Cost: ₹{getIngCost(recipe).toFixed(0)} · Sell: ₹{recipe.sellPrice || 0}
                            </div>
                            {getProfit(recipe) > 0 ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: 'var(--rv-green)',
                                  marginTop: 2,
                                }}
                              >
                                +₹{getProfit(recipe).toFixed(0)} margin
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--text3)',
                                  marginTop: 2,
                                }}
                              >
                                Break-even / Draft
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(recipe.id);
                              }}
                              title="Delete Recipe"
                              aria-label="Delete"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text3)',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRecipe(recipe);
                              }}
                              style={{
                                background: 'var(--bg2)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: '5px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--text)',
                                cursor: 'pointer',
                              }}
                            >
                              View →
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              /* ── HIGH-DENSITY LIST VIEW ── */
              <div className="recipes-list">
                <AnimatePresence mode="popLayout">
                  {filtered.map((recipe) => (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="recipe-list-card"
                      onClick={() => openRecipe(recipe)}
                    >
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          className="recipe-list-thumb"
                          alt={recipe.name}
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                      ) : (
                        <div
                          className="recipe-list-thumb"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 26,
                            background: 'var(--accent-lt)',
                          }}
                        >
                          {CAT_EMOJI[recipe.category] || '🧁'}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                            {recipe.category}
                          </span>
                          {recipe.yield && (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                              · {recipe.yield}
                            </span>
                          )}
                          {recipe.status === 'Draft' && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                background: 'var(--bg2)',
                                padding: '1px 5px',
                                borderRadius: 4,
                              }}
                            >
                              DRAFT
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <Highlight text={recipe.name} query={debouncedSearch} />
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                          Cost ₹{getIngCost(recipe).toFixed(0)} · Sell ₹{recipe.sellPrice || 0}
                        </div>
                        {getProfit(recipe) > 0 ? (
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--rv-green)' }}>
                            +₹{getProfit(recipe).toFixed(0)}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>₹0</div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCookingRecipe(recipe);
                          }}
                          title="Cook"
                          aria-label="Cook"
                          style={{
                            background: 'var(--accent-lt)',
                            color: 'var(--accent)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <ChefHat size={14} /> Cook
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(recipe.id);
                          }}
                          title="Delete"
                          aria-label="Delete"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text3)',
                            padding: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Empty State */}
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: 'var(--card)',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: 'var(--accent-lt)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    color: 'var(--accent)',
                  }}
                >
                  <BookOpen size={28} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                  {debouncedSearch
                    ? `No recipes found for "${debouncedSearch}"`
                    : `No ${activeCategory === 'All' ? '' : activeCategory} recipes yet`}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text2)',
                    marginBottom: 20,
                    maxWidth: 380,
                    margin: '0 auto 20px',
                  }}
                >
                  {debouncedSearch
                    ? 'Check spelling or try a broader keyword to find matching bakery formulas.'
                    : 'Create your first formula with ingredient scaling and automatic profit calculation.'}
                </div>
                {debouncedSearch ? (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('All');
                    }}
                  >
                    Clear Filter
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditRecipe(null);
                      setShowCreate(true);
                    }}
                  >
                    <Plus size={16} /> Create Recipe
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* Sort Backdrop Dismiss */}
      {showSort && (
        <div
          onClick={() => setShowSort(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
        />
      )}

      {/* ── STANDARDIZED MODAL PORTALS (Instagram / Airbnb style scrim & centering) ── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {cookingRecipe && (
              <CookingMode
                key="cooking"
                recipe={cookingRecipe}
                onClose={() => setCookingRecipe(null)}
                onExit={() => setCookingRecipe(null)}
                onFinished={() => setCookingRecipe(null)}
              />
            )}

            {(selectedRecipe || showCreate || activeModal) && !cookingRecipe && (
              <div className="rv-modal-overlay">
                <div
                  className="rv-modal-backdrop"
                  onClick={() => {
                    setSelectedRecipe(null);
                    setShowCreate(false);
                    setActiveModal(null);
                  }}
                />

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
                      onDuplicate={handleDuplicate}
                      onShowInventory={() => setActiveModal('inventory')}
                      onShowChecklist={() => setActiveModal('checklist')}
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
              </div>
            )}
          </>,
          document.body
        )}

      <AnimatedDemo moduleId="recipes" title="Your Recipe Vault" scenes={recipesDemoScenes} />
    </motion.div>
  );
}
