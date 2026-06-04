import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Clock, Scale, Share2, Plus, Copy, Calculator, BookOpen, Lightbulb, Settings2, MoreVertical, Leaf } from 'lucide-react';
import { showToast } from '../iOS';

const SEASONS_BASE = [
  { id: 'Spring', name: 'Spring', icon: '🌸' },
  { id: 'Summer', name: 'Summer', icon: '☀️' },
  { id: 'Monsoon', name: 'Monsoon', icon: '🌧️' },
  { id: 'Autumn', name: 'Autumn', icon: '🍁' },
  { id: 'Winter', name: 'Winter', icon: '❄️', isNew: true },
  { id: 'Festive', name: 'Festive', icon: '🎁' }
];

const TOOLS = [
  { id: 'create', name: 'Create New Recipe', icon: <BookOpen size={20} /> },
  { id: 'duplicate', name: 'Duplicate Recipe', icon: <Copy size={20} /> },
  { id: 'scale', name: 'Smart Scaling', icon: <Scale size={20} /> },
  { id: 'cost', name: 'Cost Calculator', icon: <Calculator size={20} /> },
  { id: 'share', name: 'Share Recipe', icon: <Share2 size={20} /> },
  { id: 'add', name: 'Add to Collection', icon: <BookOpen size={20} /> }
];

export default function SeasonalRecipes({ recipes, getIngCost, onSelectRecipe, onAddRecipe }) {
  const [activeSeason, setActiveSeason] = useState('Winter');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate real counts
  const seasons = SEASONS_BASE.map(s => ({
    ...s,
    count: recipes.filter(r => r.season === s.id).length
  }));

  // Filter recipes by selected season
  const filteredRecipes = recipes.filter(r => r.season === activeSeason);

  const handleToolClick = (toolId) => {
    if (toolId === 'create') {
      onAddRecipe();
    } else if (toolId === 'scale') {
      showToast('Select a recipe first to use Smart Scaling', 'error');
    } else if (toolId === 'cost') {
      showToast('Select a recipe first to use Cost Calculator', 'error');
    } else {
      showToast('Coming soon in next update!', 'success');
    }
  };

  return (
    <div className="page-container" style={{ background: 'linear-gradient(135deg, #FDFBFB 0%, #FFF5F7 100%)', minHeight: '100vh', padding: '32px 20px', fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>
      <style>{`
        .page-container {
          position: relative;
          overflow: hidden;
        }
        .page-container::before {
          content: '';
          position: absolute;
          top: -20%;
          left: -10%;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, rgba(232,106,140,0.08) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
        }
        .hero-banner {
          flex-direction: row;
          background: rgba(255, 255, 255, 0.4) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .hero-img-container {
          position: absolute;
          width: 55%;
          right: 0;
          height: 100%;
        }
        .hero-content {
          max-width: 55%;
          padding: 48px;
        }
        .hero-title {
          font-size: 3.8rem;
          background: linear-gradient(90deg, #3A2E2E 0%, #E86A8C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tools-header {
          flex-direction: row;
        }
        .season-card {
          min-width: 130px;
          padding: 24px 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .season-card.active {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 2px solid #E86A8C !important;
          box-shadow: 0 16px 32px rgba(232, 106, 140, 0.15) !important;
        }
        .recipe-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 28px;
        }
        .recipe-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.03);
          border: 1px solid rgba(255,255,255,0.8);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .recipe-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 48px rgba(232, 106, 140, 0.12);
          border: 1px solid rgba(232,106,140,0.3);
        }
        .recipe-card-img-container {
          position: relative;
          height: 220px;
          overflow: hidden;
        }
        .recipe-card-img-container img {
          transition: transform 0.5s ease;
        }
        .recipe-card:hover .recipe-card-img-container img {
          transform: scale(1.05);
        }
        .recipe-card-content {
          padding: 24px;
          position: relative;
        }
        .recipe-card-title {
          margin: 0 0 12px;
          font-size: 1.15rem;
          color: #2D2323;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .recipe-card-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .recipe-tag {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        @media (max-width: 768px) {
          .page-container {
            padding: 20px 16px !important;
          }
          .hero-banner {
            flex-direction: column-reverse;
          }
          .hero-img-container {
            position: relative !important;
            width: 100% !important;
            height: 220px;
          }
          .hero-content {
            max-width: 100% !important;
            padding: 32px 24px !important;
          }
          .hero-title {
            font-size: 2.6rem !important;
          }
          .tools-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 16px;
          }
          .tools-btn {
            width: 100%;
            justify-content: center;
          }
          .header-title {
            font-size: 2.2rem !important;
          }
          .season-card {
            min-width: 100px !important;
            padding: 16px 12px !important;
            border-radius: 18px !important;
          }
          .season-icon-text {
            font-size: 2.2rem !important;
          }
          .recipe-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .recipe-card {
            border-radius: 20px !important;
          }
          .recipe-card-img-container {
            height: 140px !important;
          }
          .recipe-card-content {
            padding: 16px !important;
          }
          .recipe-card-title {
            font-size: 0.95rem !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .recipe-card-meta {
            gap: 8px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            margin-bottom: 16px !important;
          }
          .recipe-card-meta > div {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ marginBottom: 32 }}
      >
        <h1 className="header-title" style={{ fontSize: '3rem', fontFamily: '"Playfair Display", serif', color: '#2D2323', margin: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', letterSpacing: '-0.03em' }}>
          Seasonal Recipes 
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Leaf size={38} color="#E86A8C" style={{ filter: 'drop-shadow(0 4px 8px rgba(232,106,140,0.3))' }} />
          </motion.div>
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#6B5E5E', margin: '8px 0 0', maxWidth: '80%', fontWeight: 500 }}>
          Celebrate every season with special recipes that bring joy to every occasion.
        </p>
      </motion.div>

      {/* SEARCH BAR */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        style={{ position: 'relative', marginBottom: 40, display: 'flex', alignItems: 'center' }}
      >
        <Search size={22} color="#E86A8C" style={{ position: 'absolute', left: 24, zIndex: 1 }} />
        <input 
          type="text" 
          placeholder="Search seasonal recipes by name, ingredient, or tag..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '20px 20px 20px 60px', 
            borderRadius: 99, 
            border: '2px solid rgba(255,255,255,0.8)', 
            background: 'rgba(255,255,255,0.6)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            fontSize: '1.05rem',
            color: '#2D2323',
            boxShadow: '0 8px 32px rgba(232, 106, 140, 0.08)',
            outline: 'none',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.background = '#fff';
            e.target.style.border = '2px solid rgba(232, 106, 140, 0.4)';
            e.target.style.boxShadow = '0 12px 40px rgba(232, 106, 140, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.6)';
            e.target.style.border = '2px solid rgba(255,255,255,0.8)';
            e.target.style.boxShadow = '0 8px 32px rgba(232, 106, 140, 0.08)';
          }}
        />
        <div style={{ position: 'absolute', right: 8, background: '#FFF1F5', borderRadius: 99, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Settings2 size={20} color="#E86A8C" />
        </div>
      </motion.div>

      {/* SEASON CARDS */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        style={{ display: 'flex', gap: 20, marginBottom: 48, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {seasons.map((s, idx) => {
          const isActive = activeSeason === s.id;
          return (
            <motion.div 
              key={s.id}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              onClick={() => setActiveSeason(s.id)}
              className={`season-card ${isActive ? 'active' : ''}`}
              style={{
                flex: '0 0 auto',
                borderRadius: 24,
                background: isActive ? 'linear-gradient(135deg, #fff 0%, #FFF5F7 100%)' : 'rgba(255, 255, 255, 0.5)',
                border: isActive ? '2px solid #E86A8C' : '2px solid rgba(255,255,255,0.8)',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: isActive ? '0 16px 40px rgba(232, 106, 140, 0.2)' : '0 4px 16px rgba(0,0,0,0.03)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            >
              {s.isNew && (
                <div style={{ position: 'absolute', top: -10, right: -10, background: 'linear-gradient(135deg, #FF6B6B 0%, #E86A8C 100%)', color: '#fff', padding: '4px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, border: '2px solid #fff', boxShadow: '0 4px 12px rgba(232, 106, 140, 0.3)', letterSpacing: '0.05em' }}>NEW</div>
              )}
              <div className="season-icon-text" style={{ fontSize: '3rem', marginBottom: 16, filter: isActive ? 'drop-shadow(0 8px 16px rgba(232, 106, 140, 0.2))' : 'none', transition: 'all 0.3s' }}>
                {s.icon}
              </div>
              <div className="season-title-text" style={{ fontWeight: 800, color: isActive ? '#E86A8C' : '#4A3B3B', fontSize: '1.1rem', marginBottom: 4 }}>
                {s.name}
              </div>
              <div className="season-count-text" style={{ color: isActive ? '#E86A8C' : '#9B8E8E', fontSize: '0.85rem', fontWeight: isActive ? 700 : 600, opacity: isActive ? 0.9 : 0.7 }}>
                {s.count} Recipes
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* HERO BANNER */}
      <div className="hero-banner" style={{ 
        position: 'relative', 
        borderRadius: 24, 
        overflow: 'hidden', 
        marginBottom: 48,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 20px 40px rgba(232, 106, 140, 0.1)',
        minHeight: 280
      }}>
        <div className="hero-img-container" style={{ top: 0, right: 0, bottom: 0, zIndex: 0 }}>
          <img 
            src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80" 
            alt="Hero Cake" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          {/* Gradient overlay to blend image seamlessly */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #FFF1F5 0%, transparent 40%)' }} />
        </div>
        
        <div className="hero-content" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'inline-block', 
            background: 'rgba(232, 106, 140, 0.15)', 
            color: '#E86A8C', 
            padding: '6px 16px', 
            borderRadius: 20, 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            letterSpacing: '0.05em',
            marginBottom: 24 
          }}>
            <span style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>❄️</span> WINTER SPECIAL
          </div>
          <h2 className="hero-title" style={{ 
            fontFamily: '"Playfair Display", serif', 
            color: '#3A2E2E', 
            lineHeight: 1.1, 
            margin: '0 0 16px',
            textShadow: '0 2px 4px rgba(255,255,255,0.8)'
          }}>
            Cozy Bakes,<br/>Warm Hearts
          </h2>
          <p style={{ color: '#6B5E5E', fontSize: '1rem', lineHeight: 1.5, marginBottom: 32, maxWidth: 320 }}>
            Indulge in rich flavors and heartwarming bakes perfect for the season of love.
          </p>
          <button style={{ 
            background: '#E86A8C', 
            color: '#fff', 
            border: 'none', 
            padding: '14px 28px', 
            borderRadius: 30, 
            fontSize: '1rem', 
            fontWeight: 700, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 20px rgba(232, 106, 140, 0.3)',
            transition: 'transform 0.2s'
          }}>
            Explore Winter Recipes →
          </button>
        </div>
      </div>

      {/* RECIPE GRID */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.5rem', fontFamily: '"Playfair Display", serif', color: '#3A2E2E', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeSeason} Recipes 
            <span style={{ background: '#FFF1F5', color: '#E86A8C', padding: '4px 10px', borderRadius: 12, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif', fontWeight: 800 }}>
              {filteredRecipes.length}
            </span>
          </h3>
          <button style={{ background: 'none', border: 'none', color: '#E86A8C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.95rem' }}>
            View All →
          </button>
        </div>

        <div className="recipe-grid">
          {filteredRecipes.map((r, i) => (
            <motion.div 
              key={r.id || i}
              whileHover={{ y: -5 }}
              onClick={() => onSelectRecipe(r)}
              className="recipe-card"
            >
              <div className="recipe-card-img-container">
                <img src={r.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Heart Button */}
                <button className="heart-btn" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', color: '#E86A8C' }}>
                  <Heart size={16} />
                </button>
                
                {/* Badge */}
                {(r.badge || (i === 0 ? 'Bestseller' : i === 1 ? 'New' : null)) && (
                  <div className="badge-label" style={{ 
                    position: 'absolute', 
                    bottom: -12, 
                    left: 16, 
                    background: i === 0 ? '#FFF1F5' : '#F0F5FF', 
                    color: i === 0 ? '#E86A8C' : '#3B82F6', 
                    padding: '4px 12px', 
                    borderRadius: 12, 
                    fontSize: '0.75rem', 
                    fontWeight: 800,
                    border: '2px solid #fff',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
                  }}>
                    {r.badge || (i === 0 ? 'Bestseller' : 'New')}
                  </div>
                )}
              </div>
              
              <div className="recipe-card-content">
                <h4 className="recipe-card-title">{r.name}</h4>
                
                <div className="recipe-card-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B5E5E', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Clock size={14} /> {r.prepTime || '60 mins'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B5E5E', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Scale size={14} /> {r.yield || '1 kg'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="recipe-tags-container" style={{ display: 'flex', gap: 8 }}>
                    {(r.tags || ['Chocolate', 'Premium']).slice(0, 2).map((tag, idx) => (
                      <span key={tag} className="recipe-tag" style={{ 
                        background: idx === 0 ? '#FFF1F5' : '#F5F3FF', 
                        color: idx === 0 ? '#E86A8C' : '#8B5CF6'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <MoreVertical size={16} color="#9B8E8E" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SEASONAL TOOLS */}
      <div style={{ marginBottom: 40 }}>
        <div className="tools-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: '"Playfair Display", serif', color: '#3A2E2E', margin: '0 0 4px' }}>Seasonal Tools</h3>
            <p style={{ margin: 0, color: '#9B8E8E', fontSize: '0.85rem' }}>Everything you need for seasonal baking</p>
          </div>
          <button className="tools-btn" style={{ background: '#fff', color: '#E86A8C', border: '1.5px solid rgba(232, 106, 140, 0.4)', padding: '10px 20px', borderRadius: 24, fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <BookOpen size={16} /> Recipe Planner
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
          {TOOLS.map(t => (
            <div key={t.id} onClick={() => handleToolClick(t.id)} style={{ 
              flex: 1, 
              minWidth: 140, 
              background: '#fff', 
              borderRadius: 20, 
              padding: '24px 16px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              border: '1px solid rgba(232, 106, 140, 0.05)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              cursor: 'pointer'
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#FFF1F5', color: '#E86A8C', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                {t.icon}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3A2E2E' }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BAKER'S TIP */}
      <div style={{ background: '#FFF1F5', borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 16px rgba(232, 106, 140, 0.1)' }}>
          <Lightbulb size={24} color="#E86A8C" />
        </div>
        <div style={{ zIndex: 1 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#E86A8C', fontWeight: 800 }}>Baker's Tip</h4>
          <p style={{ margin: 0, color: '#3A2E2E', fontSize: '0.95rem', fontWeight: 500 }}>
            Use seasonal ingredients for the best flavor and cost efficiency.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div style={{ position: 'absolute', right: 20, bottom: -10, opacity: 0.1, fontSize: '6rem', fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>
          🥣
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={onAddRecipe}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          background: '#E86A8C',
          color: '#fff',
          border: 'none',
          padding: '16px 24px',
          borderRadius: 40,
          fontSize: '1rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 12px 32px rgba(232, 106, 140, 0.4)',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        <Plus size={20} /> Add Recipe
      </button>

    </div>
  );
}
