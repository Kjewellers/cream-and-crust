import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Calculator, Lock, Plus, X, Trash2, ChevronLeft, Camera, FileText, Image, Mic, MicOff, Search, ShoppingCart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToRecipes, addRecipeToDB, updateRecipeInDB, deleteRecipeFromDB, addShoppingItemToDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Skeleton, showToast, PullToRefresh, triggerHaptic } from '../components/iOS';
import { formatCurrency } from '../utils/date';

// ─── PASSCODE SCREEN ──────────────────────────────────────────
function PasscodeScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const savedPin = localStorage.getItem('recipe_pin');

  const handleKey = (val) => {
    if (val === 'del') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + String(val);
    setPin(next);
    if (next.length === 4) {
      if (!savedPin) { localStorage.setItem('recipe_pin', next); onUnlock(); }
      else if (next === savedPin) { onUnlock(); }
      else { setShake(true); setTimeout(() => { setPin(''); setShake(false); }, 600); }
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
      <motion.div animate={shake ? { x: [-12,12,-10,10,-6,6,0] } : {}} transition={{ duration:0.5 }} style={{ textAlign:'center', marginBottom:40 }}>
        <Lock size={52} color="var(--accent)" style={{ marginBottom:16 }} />
        <h2 style={{ marginBottom:6 }}>{savedPin ? 'Enter Passcode' : 'Set a Passcode'}</h2>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Your secret recipes are protected 🔒</p>
        <div style={{ display:'flex', gap:18, justifyContent:'center', marginTop:28 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:14, height:14, borderRadius:'50%', background: pin.length > i ? 'var(--accent)' : 'var(--border)', transition:'background 0.2s' }} />
          ))}
        </div>
      </motion.div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, maxWidth:260 }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'del'].map((k,i) => (
          <div key={i} style={{ display:'flex', justifyContent:'center' }}>
            {k !== '' && (
              <motion.button whileTap={{ scale:0.88 }} onClick={() => handleKey(k)}
                style={{ width:72, height:72, borderRadius:'50%', background:'var(--card)', border:'1px solid var(--border)', fontSize:22, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-xs)' }}>
                {k === 'del' ? <X size={18}/> : k}
              </motion.button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RECIPE DETAIL MODAL ──────────────────────────────────────
function RecipeDetail({ recipe, onClose, onDelete }) {
  const { currentUser } = useAuth();
  const [addingToShop, setAddingToShop] = useState(false);

  const handleAddToShoppingList = async () => {
    if (!recipe.ingredients?.length) return;
    setAddingToShop(true);
    triggerHaptic('medium');
    try {
      for (const ing of recipe.ingredients) {
        await addShoppingItemToDB({
          name: ing.name,
          qty: '',
          unit: 'kg',
          category: 'Other',
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      showToast(`Added ${recipe.ingredients.length} items to Shopping List!`, 'success');
      triggerHaptic('success');
    } catch (e) {
      showToast('Failed to add items', 'error');
    } finally {
      setAddingToShop(false);
    }
  };

  return (
    <AnimatePresence>
      {recipe && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', zIndex:300 }} />
          <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', stiffness:320, damping:30 }}
            style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--bg2)', borderRadius:'28px 28px 0 0', zIndex:301, maxHeight:'92vh', overflowY:'auto', padding:'0 20px 40px' }}>
            <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 8px' }}>
              <div style={{ width:36, height:5, borderRadius:3, background:'rgba(0,0,0,0.18)' }} />
            </div>
            {recipe.imageUrl && (
              <div style={{ margin:'0 -20px', height:220, overflow:'hidden', marginBottom:20 }}>
                <img src={recipe.imageUrl} alt={recipe.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}
            {!recipe.imageUrl && (
              <div style={{ height:120, background:'linear-gradient(135deg,var(--cream),var(--rose))', borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4rem', marginBottom:20 }}>🧁</div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <h2 style={{ fontSize:'1.5rem' }}>{recipe.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddToShoppingList} disabled={addingToShop} style={{ background:'var(--accent-lt)', border:'none', borderRadius:10, padding:'8px 12px', color:'var(--accent)', cursor:'pointer', display:'flex', gap:6, alignItems:'center', fontSize:13, fontWeight:600 }}>
                  {addingToShop ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14}/>}
                  Shop
                </button>
                <button onClick={() => { onDelete(recipe.id); onClose(); }} style={{ background:'rgba(196,87,74,0.12)', border:'none', borderRadius:10, padding:'8px 12px', color:'var(--accent2)', cursor:'pointer', display:'flex', gap:6, alignItems:'center', fontSize:13, fontWeight:600 }}>
                  <Trash2 size={14}/> Delete
                </button>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, marginBottom:20 }}>
              {recipe.yield && <span style={{ background:'var(--cream)', padding:'4px 12px', borderRadius:99, fontSize:13, fontWeight:600 }}>🎂 Yields {recipe.yield}</span>}
              {recipe.prep && <span style={{ background:'var(--cream)', padding:'4px 12px', borderRadius:99, fontSize:13, fontWeight:600 }}>⏱ {recipe.prep}</span>}
            </div>
            {recipe.description && <p style={{ color:'var(--text2)', fontSize:15, lineHeight:1.7, marginBottom:24 }}>{recipe.description}</p>}
            {recipe.ingredients?.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <h4 style={{ marginBottom:12, fontSize:'1rem' }}>🛒 Ingredients</h4>
                <div style={{ background:'var(--bg)', borderRadius:'var(--radius-sm)', padding:16 }}>
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i < recipe.ingredients.length-1 ? '1px solid var(--border)' : 'none', fontSize:14 }}>
                      <span>{ing.name}</span>
                      {ing.cost > 0 && <span style={{ fontWeight:600, color:'var(--accent)' }}>₹{ing.cost}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recipe.steps?.length > 0 && (
              <div>
                <h4 style={{ marginBottom:12, fontSize:'1rem' }}>📋 Method</h4>
                {recipe.steps.filter(s => s.trim()).map((step, i) => (
                  <div key={i} style={{ display:'flex', gap:14, marginBottom:16, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>{i+1}</div>
                    <p style={{ fontSize:14, lineHeight:1.7, color:'var(--text2)', margin:0, paddingTop:4 }}>{step}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── ADD RECIPE MODAL ─────────────────────────────────────────
function AddRecipeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', yield:'', prep:'', description:'' });
  const [ingredients, setIngredients] = useState([{ name:'', cost:'' }]);
  const [steps, setSteps] = useState(['']);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const { currentUser } = useAuth();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl = null;
    if (imageFile) {
      try {
        const fd = new FormData();
        fd.append('image', imageFile);
        const res = await fetch('/api/upload', { method:'POST', body:fd });
        const data = await res.json();
        if (data.url) imageUrl = data.url;
      } catch(err) { console.error('Image upload failed', err); }
    }
    const recipe = {
      ...form,
      imageUrl,
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      ingredients: ingredients.filter(i => i.name.trim()).map(i => ({ name:i.name, cost:Number(i.cost)||0 })),
      steps: steps.filter(s => s.trim())
    };
    await onSave(recipe);
    setUploading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
        className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:600 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0 }}>📖 New Recipe</h2>
          <button onClick={onClose} className="btn-icon"><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Photo upload */}
          <div onClick={() => fileRef.current?.click()}
            style={{ width:'100%', height:160, background: imagePreview ? 'transparent' : 'linear-gradient(135deg,var(--cream),var(--rose))', borderRadius:'var(--radius)', border:'2px dashed var(--border)', cursor:'pointer', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, position:'relative' }}>
            {imagePreview ? <img src={imagePreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (
              <div style={{ textAlign:'center', color:'var(--text3)' }}><Camera size={28} style={{ marginBottom:8 }}/><div style={{ fontSize:13, fontWeight:600 }}>Tap to add photo</div></div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display:'none' }}/>

          <div className="form-grid">
            <div className="form-group"><label className="form-label">Recipe Name*</label><input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Chocolate Truffle Cake"/></div>
            <div className="form-group"><label className="form-label">Yields</label><input value={form.yield} onChange={e => setForm({...form, yield:e.target.value})} placeholder="e.g. 1 kg cake"/></div>
            <div className="form-group"><label className="form-label">Prep Time</label><input value={form.prep} onChange={e => setForm({...form, prep:e.target.value})} placeholder="e.g. 3 hours"/></div>
          </div>
          <div className="form-group full"><label className="form-label">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Brief description of this recipe…"/></div>

          {/* Ingredients */}
          <div style={{ marginBottom:20 }}>
            <label className="form-label" style={{ marginBottom:10, display:'block' }}>Ingredients & Costs</label>
            {ingredients.map((ing, idx) => (
              <div key={idx} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input placeholder="Ingredient name" value={ing.name} onChange={e => { const a=[...ingredients]; a[idx].name=e.target.value; setIngredients(a); }} style={{ flex:2 }}/>
                <input type="number" placeholder="₹ Cost" value={ing.cost} onChange={e => { const a=[...ingredients]; a[idx].cost=e.target.value; setIngredients(a); }} style={{ flex:1 }}/>
                <button type="button" className="btn-icon" style={{ flexShrink:0 }} onClick={() => setIngredients(ingredients.filter((_,i)=>i!==idx))}><X size={14}/></button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setIngredients([...ingredients, {name:'',cost:''}])}>+ Add Ingredient</button>
          </div>

          {/* Steps */}
          <div style={{ marginBottom:24 }}>
            <label className="form-label" style={{ marginBottom:10, display:'block' }}>Method / Steps</label>
            {steps.map((step, idx) => (
              <div key={idx} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0, marginTop:10 }}>{idx+1}</div>
                <textarea rows={2} placeholder={`Step ${idx+1}…`} value={step} onChange={e => { const a=[...steps]; a[idx]=e.target.value; setSteps(a); }} style={{ flex:1 }}/>
                <button type="button" className="btn-icon" style={{ flexShrink:0, marginTop:8 }} onClick={() => setSteps(steps.filter((_,i)=>i!==idx))}><X size={14}/></button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setSteps([...steps, ''])}>+ Add Step</button>
          </div>

          <button type="submit" disabled={uploading} className="btn btn-primary" style={{ width:'100%' }}>
            {uploading ? '⏳ Saving...' : '✅ Save Recipe'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [view, setView] = useState('book'); // 'book' | 'calculator'
  const [search, setSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [calcRecipeId, setCalcRecipeId] = useState(null);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToRecipes(r => { 
      setRecipes(r); 
      setLoading(false); 
    }, currentUser.uid);
    return () => unsub();
  }, [currentUser]);

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.onstart = () => {
      setIsListening(true);
      triggerHaptic('medium');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      setIsListening(false);
      triggerHaptic('success');
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const filteredRecipes = recipes.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase()) || 
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const calcRecipe = recipes.find(r => r.id === calcRecipeId) || recipes[0];
  useEffect(() => {
    if (calcRecipe) {
      setSellingPrice(calcRecipe.sellingPrice || 0);
      setPackagingCost(calcRecipe.packagingCost || 0);
      setLaborCost(calcRecipe.laborCost || 0);
    }
  }, [calcRecipe?.id]);

  const ingredientCost = calcRecipe?.ingredients?.reduce((s, i) => s + Number(i.cost||0), 0) || 0;
  const totalCost = ingredientCost + Number(packagingCost) + Number(laborCost);
  const netProfit = sellingPrice - totalCost;
  const margin = sellingPrice > 0 ? ((netProfit/sellingPrice)*100).toFixed(1) : 0;

  const handleSaveRecipe = async (recipe) => {
    try { 
      await addRecipeToDB({ ...recipe, userId: currentUser.uid }); 
      showToast('Recipe saved!', 'success'); 
    } catch(e) { 
      showToast('Failed to save', 'error'); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recipe?')) return;
    await deleteRecipeFromDB(id);
    showToast('Recipe deleted', 'info');
  };

  const handleSaveCosts = async () => {
    if (!calcRecipe) return;
    await updateRecipeInDB(calcRecipe.id, { sellingPrice:Number(sellingPrice), packagingCost:Number(packagingCost), laborCost:Number(laborCost) });
    showToast('Costs saved!', 'success');
  };

  if (!isUnlocked) return <PasscodeScreen onUnlock={() => setIsUnlocked(true)} />;

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}>
      <PullToRefresh onRefresh={async () => {
        await new Promise(r => setTimeout(r, 800));
        showToast('Recipes updated', 'info');
      }}>
        {/* Header */}
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1>Recipe Vault 🔐</h1>
            <p>Your secret recipes & profit calculator</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className={`btn btn-sm ${view==='book'?'btn-primary':'btn-outline'}`} onClick={() => { setView('book'); triggerHaptic('light'); }}><BookOpen size={16}/> Recipe Book</button>
            <button className={`btn btn-sm ${view==='calculator'?'btn-primary':'btn-outline'}`} onClick={() => { setView('calculator'); triggerHaptic('light'); }}><Calculator size={16}/> Profit Calc</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
            {[...Array(4)].map((_,i) => <Skeleton key={i} height={200} radius={16}/>)}
          </div>
        ) : view === 'book' ? (
          <>
            {/* Search Bar with Voice */}
            <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
              <div style={{ flex:1, position:'relative' }}>
                <Search size={18} style={{ position:'absolute', left:14, top:13, color:'var(--text3)' }} />
                <input 
                  placeholder="Search recipes..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  style={{ width:'100%', paddingLeft:40, paddingRight:40 }} 
                />
                <button 
                  onClick={handleVoiceInput}
                  style={{ position:'absolute', right:10, top:8, background:'none', border:'none', color: isListening ? 'var(--accent)' : 'var(--text3)', cursor:'pointer' }}
                >
                  {isListening ? <Mic size={20} className="pulse" /> : <Mic size={20} />}
                </button>
              </div>
              <button className="btn btn-primary btn-sm desktop-only" onClick={() => setShowAddModal(true)}><Plus size={15}/> Add Recipe</button>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0 }}>{filteredRecipes.length} Recipes</h3>
            </div>
            {filteredRecipes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
                <div style={{ fontSize:'4rem', marginBottom:16 }}>📖</div>
                <h3>No recipes found</h3>
                <p style={{ marginBottom:24, fontSize:14 }}>Try another search or add a new recipe</p>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={16}/> Add Recipe</button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
                {filteredRecipes.map(r => (
                  <motion.div key={r.id} whileTap={{ scale:0.97 }} onClick={() => setSelectedRecipe(r)}
                    style={{ background:'var(--card)', borderRadius:'var(--radius)', overflow:'hidden', boxShadow:'var(--shadow)', border:'1px solid var(--border)', cursor:'pointer', transition:'box-shadow 0.2s' }}>
                    {/* Card image */}
                    <div style={{ height:140, background:'linear-gradient(135deg,var(--cream),var(--rose))', overflow:'hidden', position:'relative' }}>
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={r.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem' }}>🧁</div>
                      }
                      {r.steps?.length > 0 && (
                        <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.55)', color:'white', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:600 }}>
                          📋 {r.steps.length} steps
                        </div>
                      )}
                    </div>
                    {/* Card body */}
                    <div style={{ padding:'14px 16px' }}>
                      <h4 style={{ marginBottom:4, fontSize:'1rem' }}>{r.name}</h4>
                      {r.description && <p style={{ fontSize:13, color:'var(--text3)', marginBottom:10, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{r.description}</p>}
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {r.yield && <span style={{ fontSize:11, fontWeight:600, background:'var(--cream)', padding:'2px 8px', borderRadius:99, color:'var(--text2)' }}>🎂 {r.yield}</span>}
                        {r.prep && <span style={{ fontSize:11, fontWeight:600, background:'var(--cream)', padding:'2px 8px', borderRadius:99, color:'var(--text2)' }}>⏱ {r.prep}</span>}
                        {r.ingredients?.length > 0 && <span style={{ fontSize:11, fontWeight:600, background:'var(--accent-lt)', padding:'2px 8px', borderRadius:99, color:'var(--accent)' }}>₹{r.ingredients.reduce((s,i)=>s+Number(i.cost||0),0)} cost</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Profit Calculator */
          <div className="content-grid">
            <div className="card">
              <h3 style={{ marginBottom:20 }}>Profit Calculator</h3>
              <div className="form-group">
                <label className="form-label">Select Recipe</label>
                <select value={calcRecipeId || calcRecipe?.id || ''} onChange={e => { setCalcRecipeId(e.target.value); triggerHaptic('light'); }}>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {calcRecipe && (
                <>
                  <div style={{ background:'var(--bg)', borderRadius:'var(--radius-sm)', padding:16, marginBottom:20 }}>
                    <div style={{ fontWeight:700, marginBottom:12 }}>Ingredient Breakdown</div>
                    {calcRecipe.ingredients?.map((ing,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
                        <span>{ing.name}</span><span style={{ fontWeight:600 }}>₹{ing.cost}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, paddingTop:8 }}>
                      <span>Ingredient Total</span><span>{formatCurrency(ingredientCost)}</span>
                    </div>
                  </div>
                  <div className="form-group"><label className="form-label">Packaging Cost (₹)</label><input type="number" value={packagingCost} onChange={e => setPackagingCost(e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">Labor Cost (₹)</label><input type="number" value={laborCost} onChange={e => setLaborCost(e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">Selling Price (₹)</label><input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)}/></div>
                  <button className="btn btn-outline" style={{ width:'100%', marginBottom:20 }} onClick={handleSaveCosts}>💾 Save to Recipe</button>
                  <div style={{ padding:20, background:'linear-gradient(135deg,var(--accent),var(--accent2))', borderRadius:'var(--radius)', color:'white' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                      <div><div style={{ fontSize:12, opacity:0.8 }}>Total Cost</div><div style={{ fontSize:'1.4rem', fontWeight:700 }}>{formatCurrency(totalCost)}</div></div>
                      <div style={{ textAlign:'right' }}><div style={{ fontSize:12, opacity:0.8 }}>Net Profit</div><div style={{ fontSize:'1.4rem', fontWeight:700 }}>{formatCurrency(netProfit)}</div></div>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
                      <div style={{ fontSize:12, opacity:0.85 }}>Profit Margin</div>
                      <div style={{ fontSize:'2.5rem', fontWeight:800 }}>{margin}%</div>
                      <div style={{ fontSize:12, opacity:0.8 }}>{margin >= 40 ? '🟢 Healthy' : margin >= 20 ? '🟡 Moderate' : '🔴 Low — review costs'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </PullToRefresh>

      {/* FAB for mobile */}
      <motion.button whileTap={{ scale:0.9 }} className="fab" onClick={() => setShowAddModal(true)}>
        <Plus size={22}/>
      </motion.button>

      {/* Recipe Detail Sheet */}
      <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} onDelete={handleDelete}/>

      {/* Add Recipe Modal */}
      <AnimatePresence>
        {showAddModal && <AddRecipeModal onClose={() => setShowAddModal(false)} onSave={handleSaveRecipe}/>}
      </AnimatePresence>
    </motion.div>
  );
}
