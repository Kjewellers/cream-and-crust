import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Camera, Plus, Loader2 } from 'lucide-react';
import { addRecipeToDB, updateRecipeInDB } from '../../services/db';
import { uploadToCloudinary } from '../../services/cloudinary';
import { showToast } from '../iOS';

const STEP_LABELS = ['Basic Info', 'Ingredients', 'Steps', 'Costing'];

const DEFAULT_INGS = [
  { name: 'All Purpose Flour', qty: '500', unit: 'g', cost: 20 },
  { name: 'Cocoa Powder',      qty: '60',  unit: 'g', cost: 30 },
  { name: 'Sugar',             qty: '350', unit: 'g', cost: 21 },
  { name: 'Butter',            qty: '200', unit: 'g', cost: 120 },
  { name: 'Milk',              qty: '200', unit: 'ml', cost: 12 },
  { name: 'Dark Chocolate',    qty: '150', unit: 'g', cost: 90 },
  { name: 'Baking Powder',     qty: '5',   unit: 'g', cost: 2 },
  { name: 'Baking Soda',       qty: '3',   unit: 'g', cost: 1 },
  { name: 'Salt',              qty: '2',   unit: 'g', cost: 0.5 },
  { name: 'Vanilla Extract',   qty: '5',   unit: 'ml', cost: 5 },
];

const DEFAULT_STEPS = [
  { title: 'Preheat Oven', desc: 'Preheat oven to 180°C. Grease and line the cake tin.', timer: '5 mins' },
  { title: 'Sieve Dry Ingredients', desc: 'Sieve flour, cocoa powder, baking soda and salt.', timer: '' },
  { title: 'Cream Butter & Sugar', desc: 'In a bowl, cream butter and sugar until light and fluffy.', timer: '' },
  { title: 'Add Vanilla', desc: 'Add vanilla extract and mix well.', timer: '' },
  { title: 'Add Dry Alternately', desc: 'Add dry ingredients alternately with milk. Mix gently.', timer: '' },
  { title: 'Pour & Bake', desc: 'Pour batter into tin and bake for 45 mins.', timer: '45 mins' },
];

const YIELD_OPTIONS = ['1 kg cake', '2 kg cake', '3 kg cake', '500g cake', '12 cupcakes', '24 cupcakes', '1 dozen brownies'];

export default function CreateRecipe({ onClose, existingRecipe }) {
  const isEditing = !!existingRecipe;
  const [step, setStep] = useState(1);
  const [scaleTo, setScaleTo] = useState('3 kg cake');
  const [data, setData] = useState({
    name: 'Chocolate Truffle Cake',
    category: 'Cakes',
    tags: ['Chocolate', 'Eggless', 'Popular'],
    difficulty: 'Medium',
    prepTime: '30 mins',
    bakeTime: '45 mins',
    coolTime: '2 hrs',
    yield: '1 kg cake',
    imageUrl: '',
    ingredients: DEFAULT_INGS,
    steps: DEFAULT_STEPS,
    sellPrice: 900,
    packaging: 40,
    gas: 25,
    labor: 80,
    platformFee: 5,
    other: 11,
    status: 'Draft',
    notes: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (existingRecipe) {
      setData(prev => ({ 
        ...prev, 
        ...existingRecipe, 
        tags: Array.isArray(existingRecipe.tags) ? existingRecipe.tags : prev.tags || [],
        ingredients: Array.isArray(existingRecipe.ingredients) && existingRecipe.ingredients.length ? existingRecipe.ingredients : DEFAULT_INGS, 
        steps: Array.isArray(existingRecipe.steps) && existingRecipe.steps.length ? existingRecipe.steps : DEFAULT_STEPS 
      }));
    }
  }, [existingRecipe]);

  const ingCost = data.ingredients.reduce((s, i) => s + Number(i.cost || 0), 0);
  const platformAmt = (ingCost + data.packaging + data.gas + data.labor + data.other) * (data.platformFee / 100);
  const totalCost = ingCost + data.packaging + data.gas + data.labor + platformAmt + data.other;
  const profit = Number(data.sellPrice) - totalCost;
  const margin = data.sellPrice ? (profit / data.sellPrice * 100) : 0;

  // Scaling
  const scaleMap = { '500g cake': 0.5, '1 kg cake': 1, '1.5 kg cake': 1.5, '2 kg cake': 2, '3 kg cake': 3, '12 cupcakes': 1, '24 cupcakes': 2, '1 dozen brownies': 1 };
  const origFactor = scaleMap[data.yield] || 1;
  const newFactor = scaleMap[scaleTo] || 1;
  const scaleFactor = (newFactor / origFactor).toFixed(2);

  const updateIng = (i, f, v) => { const arr = [...data.ingredients]; arr[i][f] = v; setData({ ...data, ingredients: arr }); };
  const removeIng = (i) => { const arr = [...data.ingredients]; arr.splice(i, 1); setData({ ...data, ingredients: arr }); };
  const addTag = (t) => { if (t && !data.tags.includes(t)) setData({ ...data, tags: [...data.tags, t] }); setTagInput(''); };
  const removeTag = (t) => setData({ ...data, tags: data.tags.filter(x => x !== t) });

  const save = async (publish = false) => {
    try {
      const final = { ...data, status: publish ? 'Published' : 'Draft', badge: isEditing ? data.badge : 'New' };
      const isSampleRecipe = existingRecipe?.id?.startsWith('sample-');
      if (isEditing && !isSampleRecipe) {
        // Update existing DB recipe
        await updateRecipeInDB(existingRecipe.id, final);
        showToast('Recipe Updated!', 'success');
        onClose({ ...final, id: existingRecipe.id });
      } else {
        // Create new DB record (also for sample recipe edits — they get a real DB ID)
        const newId = await addRecipeToDB(final);
        showToast(isEditing ? 'Recipe Saved!' : 'Recipe Created!', 'success');
        onClose({ ...final, id: newId });
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving recipe', 'error');
    }
  };

  const s = { fontSize: 13, fontWeight: 600, color: 'var(--rv-muted)', marginBottom: 8, display: 'block' };
  const inp = { width: '100%', padding: '12px 14px', border: '1px solid var(--rv-border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fcfcfc', boxSizing: 'border-box', outline: 'none' };
  const row = { marginBottom: 18 };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="rv-details" style={{ zIndex: 110 }}>
      {/* Header */}
      <div className="rv-wizard-header">
        <button className="rv-circle-btn" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{isEditing ? 'Edit Recipe' : 'Add New Recipe'}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STEP_LABELS.map((label, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 2, background: step > i ? 'var(--rv-pink)' : '#E5E7EB', transition: 'all 0.3s' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: step === i + 1 ? 'var(--rv-pink)' : 'var(--rv-muted)', marginTop: 4, textAlign: 'center' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rv-wizard-content">
        {/* STEP 1 — Basic Info */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Thumbnail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const url = await uploadToCloudinary(file);
                    setData({ ...data, imageUrl: url });
                    showToast('Image uploaded!', 'success');
                  } catch (err) {
                    showToast('Failed to upload image', 'error');
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <div onClick={() => fileInputRef.current?.click()}
                style={{ width: 120, height: 90, borderRadius: 12, border: '2px dashed var(--rv-pink)', background: 'var(--rv-pink-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                {uploading ? (
                  <Loader2 size={24} color="var(--rv-pink)" style={{ animation: 'spin 1s linear infinite' }} />
                ) : data.imageUrl ? (
                  <img src={data.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                ) : (
                  <><Camera size={28} color="var(--rv-pink)" /><div style={{ fontSize: 11, color: 'var(--rv-pink)', fontWeight: 600, marginTop: 4 }}>Thumbnail</div></>
                )}
              </div>
              {data.imageUrl && !uploading && <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: 6, fontSize: 12, color: 'var(--rv-pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change Image</button>}
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>

            <div style={row}><label style={s}>Recipe Name</label><input style={inp} value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Chocolate Truffle Cake" /></div>
            <div style={row}><label style={s}>Category</label>
              <select style={inp} value={data.category} onChange={e => setData({ ...data, category: e.target.value })}>
                {['Cakes', 'Cupcakes', 'Brownies', 'Desserts', 'Bread', 'Cookies'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={row}>
              <label style={s}>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {data.tags.map(t => (
                  <span key={t} onClick={() => removeTag(t)} style={{ background: 'var(--rv-pink)', color: '#fff', padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t} ×</span>
                ))}
                <input
                  style={{ ...inp, width: 120, padding: '5px 10px', display: 'inline-block' }}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag(tagInput)}
                  placeholder="+ Add tag"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div><label style={s}>Difficulty</label>
                <select style={inp} value={data.difficulty} onChange={e => setData({ ...data, difficulty: e.target.value })}>
                  {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div><label style={s}>Yield</label>
                <select style={inp} value={data.yield} onChange={e => setData({ ...data, yield: e.target.value })}>
                  {YIELD_OPTIONS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={s}>Prep Time</label><input style={inp} value={data.prepTime} onChange={e => setData({ ...data, prepTime: e.target.value })} placeholder="30 mins" /></div>
              <div><label style={s}>Baking Time</label><input style={inp} value={data.bakeTime} onChange={e => setData({ ...data, bakeTime: e.target.value })} placeholder="45 mins" /></div>
              <div><label style={s}>Cooling Time</label><input style={inp} value={data.coolTime} onChange={e => setData({ ...data, coolTime: e.target.value })} placeholder="2 hrs" /></div>
            </div>
          </motion.div>
        )}

        {/* STEP 2 — Ingredients */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 32px', gap: 6, marginBottom: 8, padding: '0 2px' }}>
              {['Ingredient', 'Quantity', 'Unit', 'Cost (₹)', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--rv-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {data.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 32px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <input style={{ ...inp, padding: '9px 8px', fontSize: 13 }} value={ing.name} onChange={e => updateIng(i, 'name', e.target.value)} placeholder="Flour" />
                <input style={{ ...inp, padding: '9px 6px', fontSize: 13 }} type="number" value={ing.qty} onChange={e => updateIng(i, 'qty', e.target.value)} />
                <select style={{ ...inp, padding: '9px 4px', fontSize: 13 }} value={ing.unit} onChange={e => updateIng(i, 'unit', e.target.value)}>
                  {['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp'].map(u => <option key={u}>{u}</option>)}
                </select>
                <input style={{ ...inp, padding: '9px 6px', fontSize: 13 }} type="number" value={ing.cost} onChange={e => updateIng(i, 'cost', e.target.value)} />
                <button onClick={() => removeIng(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => setData({ ...data, ingredients: [...data.ingredients, { name: '', qty: '', unit: 'g', cost: 0 }] })}
              style={{ color: 'var(--rv-pink)', background: 'none', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Ingredient
            </button>
            <div style={{ background: 'var(--rv-cream)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 8 }}>
              <span>Total Ingredients Cost</span>
              <span style={{ color: 'var(--rv-pink)' }}>₹{ingCost.toFixed(2)}</span>
            </div>
          </motion.div>
        )}

        {/* STEP 3 — Steps */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {data.steps.map((st, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--rv-pink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                <div style={{ flex: 1, background: '#fff', border: '1px solid var(--rv-border)', borderRadius: 12, padding: 14, boxShadow: 'var(--rv-shadow-sm)' }}>
                  <input style={{ ...inp, marginBottom: 8, fontWeight: 600 }} value={st.title} onChange={e => { const arr = [...data.steps]; arr[i].title = e.target.value; setData({ ...data, steps: arr }); }} placeholder="Step title..." />
                  <textarea style={{ ...inp, resize: 'none' }} rows={2} value={st.desc} onChange={e => { const arr = [...data.steps]; arr[i].desc = e.target.value; setData({ ...data, steps: arr }); }} placeholder="Instructions..." />
                  {st.timer ? <div style={{ fontSize: 12, color: 'var(--rv-pink)', fontWeight: 600, marginTop: 6 }}>⏱ {st.timer}</div> : null}
                </div>
                <button onClick={() => { const arr = [...data.steps]; arr.splice(i, 1); setData({ ...data, steps: arr }); }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, marginTop: 4 }}><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => setData({ ...data, steps: [...data.steps, { title: '', desc: '', timer: '' }] })}
              style={{ color: 'var(--rv-pink)', background: 'var(--rv-pink-light)', border: '1px dashed var(--rv-pink)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '12px 20px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={16} /> Add Step
            </button>
          </motion.div>
        )}

        {/* STEP 4 — Costing + Scaling */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Scaling Card */}
            <div style={{ background: 'var(--rv-cream)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>⚖️ Smart Scaling</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600, marginBottom: 4 }}>Original Yield</div>
                  <div style={{ background: '#fff', border: '1px solid var(--rv-border)', borderRadius: 8, padding: '10px 12px', fontWeight: 700 }}>{data.yield}</div>
                </div>
                <div style={{ fontSize: 20, color: 'var(--rv-pink)' }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600, marginBottom: 4 }}>New Yield</div>
                  <select style={{ ...inp, fontWeight: 700 }} value={scaleTo} onChange={e => setScaleTo(e.target.value)}>
                    {YIELD_OPTIONS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ background: 'var(--rv-pink)', color: '#fff', borderRadius: 8, padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: 16 }}>
                Scaling Factor: {scaleFactor}x
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', fontWeight: 700, fontSize: 12, color: 'var(--rv-muted)', padding: '8px 0', borderBottom: '1px solid var(--rv-border)', gap: 8 }}>
                  <div style={{ flex: 2 }}>Ingredient</div>
                  <div style={{ width: 70, textAlign: 'right' }}>Original</div>
                  <div style={{ width: 70, textAlign: 'right', color: 'var(--rv-pink)' }}>Scaled</div>
                </div>
                {data.ingredients.slice(0, 6).map((ing, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--rv-border)', fontSize: 13 }}>
                    <div style={{ flex: 2 }}>{ing.name}</div>
                    <div style={{ width: 70, textAlign: 'right', color: 'var(--rv-muted)' }}>{ing.qty} {ing.unit}</div>
                    <div style={{ width: 70, textAlign: 'right', fontWeight: 700 }}>{(Number(ing.qty) * scaleFactor).toFixed(0)} {ing.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div style={{ background: '#FFF5F7', borderRadius: 14, padding: 18, marginBottom: 16, border: '1px solid rgba(255,107,138,0.15)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--rv-pink)', marginBottom: 2 }}>Total Cost ({data.yield})</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--rv-dark)', marginBottom: 14 }}>₹{totalCost.toFixed(2)}</div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Cost Breakdown</div>
              {[
                ['Ingredients', ingCost],
                ['Packaging', data.packaging],
                ['Gas/Electricity', data.gas],
                ['Labor', data.labor],
                [`Platform Fee (${data.platformFee}%)`, platformAmt],
                ['Other Costs', data.other],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--rv-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(val).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <span>Total Cost</span><span>₹{totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={s}>Set Selling Price (₹)</label>
              <input style={{ ...inp, fontSize: 18, fontWeight: 700 }} type="number" value={data.sellPrice} onChange={e => setData({ ...data, sellPrice: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: profit >= 0 ? '#D1FAE5' : '#FEE2E2', borderRadius: 12, padding: '16px 20px' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--rv-muted)', fontWeight: 600 }}>Profit</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: profit >= 0 ? '#10B981' : '#EF4444' }}>₹{profit.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--rv-muted)', fontWeight: 600 }}>Profit Margin</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: profit >= 0 ? '#10B981' : '#EF4444' }}>{margin.toFixed(2)}%</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="rv-bottom-action" style={{ display: 'flex', gap: 12 }}>
        {step < 4
          ? <button className="rv-btn-primary" style={{ width: '100%' }} onClick={() => setStep(s => s + 1)}>Next: {STEP_LABELS[step]} →</button>
          : <>
              <button className="rv-btn-primary" style={{ flex: 1, background: '#F3F4F6', color: 'var(--rv-dark)', boxShadow: 'none' }} onClick={() => save(false)}>Save Draft</button>
              <button className="rv-btn-primary" style={{ flex: 2 }} onClick={() => save(true)}>Save Recipe 🎉</button>
            </>
        }
      </div>
    </motion.div>
  );
}
