import React, { useState, useEffect } from 'react';
import { BookOpen, Calculator, Lock, Plus, X, ArrowRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToRecipes, addRecipeToDB } from '../services/db';
import { useSubscription } from '../context/SubscriptionContext';

export default function Recipes() {
  const { isPro } = useSubscription();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCosting, setShowCosting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [sellingPrice, setSellingPrice] = useState(1500);

  const [form, setForm] = useState({ name: '', yield: '', prep: '' });
  const [ingredients, setIngredients] = useState([{ name: '', cost: '' }]);

  useEffect(() => {
    const unsubscribe = subscribeToRecipes((newRecipes) => {
      setRecipes(newRecipes);
      setLoading(false);
      
      setSelectedRecipeId(currentId => {
        if (!currentId && newRecipes.length > 0) return newRecipes[0].id;
        return currentId;
      });
    });
    return () => unsubscribe();
  }, []);

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];
  const totalCost = selectedRecipe?.ingredients?.reduce((sum, item) => sum + Number(item.cost || 0), 0) || 0;
  const netProfit = sellingPrice - totalCost;
  const profitMargin = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100).toFixed(1) : 0;

  const handleAddIngredient = () => setIngredients([...ingredients, { name: '', cost: '' }]);
  const handleIngredientChange = (index, field, value) => {
    const newIngs = [...ingredients];
    newIngs[index][field] = value;
    setIngredients(newIngs);
  };
  const handleRemoveIngredient = (index) => {
    const newIngs = [...ingredients];
    newIngs.splice(index, 1);
    setIngredients(newIngs);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    const validIngredients = ingredients.filter(i => i.name.trim() !== '' && i.cost !== '');
    const newRecipe = {
      name: form.name,
      yield: form.yield,
      prep: form.prep,
      ingredients: validIngredients.map(i => ({ name: i.name, cost: Number(i.cost) }))
    };
    
    setShowAddModal(false);
    setForm({ name: '', yield: '', prep: '' });
    setIngredients([{ name: '', cost: '' }]);
    
    try {
      await addRecipeToDB(newRecipe);
    } catch (error) {
      console.error("Failed to save recipe:", error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ position: 'relative' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>Recipes & Costing</h1>
          <p>Secure vault for your recipes and real-time profit margin calculator</p>
        </div>
        <button className={`btn ${showCosting ? 'btn-outline' : 'btn-primary'}`} onClick={() => setShowCosting(!showCosting)} disabled={!isPro}>
          <Calculator size={18} /> {showCosting ? 'Hide Calculator' : 'Open Cost Calculator'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading recipe vault...</div>
      ) : (
        <div className="content-grid" style={{ gridTemplateColumns: showCosting ? '1.2fr 1fr' : '1fr' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Secret Recipe Vault</h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowAddModal(true)} disabled={!isPro}><Plus size={14} /> Add Recipe</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: showCosting ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {recipes.map((recipe) => (
                <div 
                  key={recipe.id}
                  style={{ 
                    padding: 16, 
                    border: selectedRecipeId === recipe.id && showCosting ? '2px solid var(--accent)' : '1px solid var(--border)', 
                    borderRadius: 'var(--radius-sm)', 
                    cursor: 'pointer',
                    background: selectedRecipeId === recipe.id && showCosting ? 'var(--cream)' : 'var(--bg2)'
                  }} 
                  className="hover-effect"
                  onClick={() => { if(isPro) { setSelectedRecipeId(recipe.id); setShowCosting(true); } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ color: 'var(--text)', marginBottom: 4 }}>{recipe.name}</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 10 }}>₹{recipe.ingredients.reduce((s, i) => s + i.cost, 0)} cost</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Yields: {recipe.yield} · Prep: {recipe.prep}</div>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {showCosting && selectedRecipe && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="card" 
                style={{ background: 'var(--cream)', border: '1px solid var(--accent)', height: 'fit-content' }}
              >
                <h3 style={{ marginBottom: 20 }}>Profit Calculator</h3>
                <div className="form-group">
                  <label className="form-label">Selected Recipe</label>
                  <select className="form-input" value={selectedRecipeId || ''} onChange={e => setSelectedRecipeId(e.target.value)}>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                
                <div style={{ background: 'white', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
                  {selectedRecipe?.ingredients?.map((ing, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8 }}>
                      <span>{ing.name}</span><span style={{ fontWeight: 600 }}>₹{ing.cost}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <span>Total Cost</span><span>₹{totalCost}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price (₹)</label>
                  <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="form-input" />
                </div>

                <div style={{ padding: 20, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 'var(--radius-sm)', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Profit Margin</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{profitMargin}%</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Net Profit</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>₹{netProfit}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal" onClick={e => e.stopPropagation()}>
              <h2>Add Recipe</h2>
              <form onSubmit={handleSaveRecipe}>
                <div className="form-group"><label className="form-label">Name</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Yield</label><input required value={form.yield} onChange={e => setForm({...form, yield: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Prep Time</label><input required value={form.prep} onChange={e => setForm({...form, prep: e.target.value})} /></div>
                
                {ingredients.map((ing, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input placeholder="Ingredient" value={ing.name} onChange={e => handleIngredientChange(idx, 'name', e.target.value)} style={{ flex: 2 }} />
                    <input type="number" placeholder="Cost" value={ing.cost} onChange={e => handleIngredientChange(idx, 'cost', e.target.value)} style={{ flex: 1 }} />
                    <button type="button" onClick={() => handleRemoveIngredient(idx)}>×</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={handleAddIngredient}>+ Add Ingredient</button>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20 }}>Save Recipe</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
