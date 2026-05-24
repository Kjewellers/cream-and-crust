import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit2, MoreVertical, Trash2, CheckCircle2, Copy, Layers, ListOrdered, Scale, IndianRupee, StickyNote, ClipboardList, ShoppingBag } from 'lucide-react';
import CookingMode from './CookingMode';
import BatchScaler from './BatchScaler';
import RecipeExportTemplate from './RecipeExportTemplate';
import { showToast, triggerHaptic } from '../iOS';
import html2canvas from 'html2canvas';

const TABS = [
  { id: 'Ingredients', label: 'Ingredients', Icon: Layers },
  { id: 'Steps',       label: 'Steps',       Icon: ListOrdered },
  { id: 'Scaling',     label: 'Scaling',     Icon: Scale },
  { id: 'Costing',     label: 'Costing',     Icon: IndianRupee },
  { id: 'Notes',       label: 'Notes',       Icon: StickyNote },
];

export default function RecipeDetail({ recipe, onClose, onEdit, onDelete, onDuplicate, onShowChecklist, onShowInventory }) {
  const [tab, setTab] = useState('Ingredients');
  const [cooking, setCooking] = useState(false);
  const [yieldMult, setYieldMult] = useState(1);
  const [showScaler, setShowScaler] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [simPrice, setSimPrice] = useState(Number(recipe.sellPrice || 0));
  const [exporting, setExporting] = useState(false);
  const pdfRef = React.useRef();

  if (cooking) return (
    <CookingMode
      recipe={{ ...recipe, ingredients: (recipe.ingredients || []).map(i => ({ ...i, qty: Number(i.qty) * yieldMult })) }}
      onClose={() => setCooking(false)}
      onExit={() => { setCooking(false); onClose(); }}
      onFinished={() => setCooking(false)}
    />
  );

  const ingCost = (recipe.ingredients || []).reduce((sum, i) => sum + Number(i.cost || 0), 0);
  const totalScaledCost = ingCost * yieldMult;
  const overhead = (Number(recipe.packaging || 40) + Number(recipe.gas || 25) + Number(recipe.labor || 80) + Number(recipe.other || 11));
  const platformAmt = (totalScaledCost + overhead) * ((recipe.platformFee || 5) / 100);
  const totalCost = totalScaledCost + overhead + platformAmt;
  const sellPrice = Number(recipe.sellPrice || 0);
  const currentSellPrice = simPrice; // Interactive Profit Simulator
  const profit = currentSellPrice - totalCost;

  const allergens = [];
  const ingStr = JSON.stringify(recipe.ingredients || []).toLowerCase();
  if (ingStr.includes('nut') || ingStr.includes('almond') || ingStr.includes('peanut')) allergens.push('🥜 Nuts');
  if (ingStr.includes('milk') || ingStr.includes('cream') || ingStr.includes('butter')) allergens.push('🥛 Dairy');
  if (ingStr.includes('egg')) allergens.push('🥚 Eggs');
  if (ingStr.includes('flour') || ingStr.includes('wheat')) allergens.push('🌾 Gluten');

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="rv-details">

      {/* Hero */}
      <div className="rv-details-hero">
        <img src={recipe.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'} className="rv-details-img" alt="" onError={e => e.target.style.display = 'none'} />
        <div className="rv-details-overlay" />
        <div className="rv-details-topbar">
          <button className="rv-circle-btn" onClick={onClose}><ArrowLeft size={20} /></button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="rv-circle-btn" onClick={() => onEdit && onEdit(recipe)}><Edit2 size={18} /></button>
            <div style={{ position: 'relative' }}>
              <button className="rv-circle-btn" onClick={() => setMenuOpen(v => !v)}><MoreVertical size={20} /></button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    style={{ position: 'absolute', right: 0, top: 48, background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid var(--rv-border)', padding: 8, zIndex: 50, width: 170 }}>
                    <button onClick={() => { triggerHaptic('light'); onDuplicate && onDuplicate(recipe); setMenuOpen(false); }}
                      style={{ width: '100%', padding: '11px 12px', textAlign: 'left', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--rv-dark)', borderRadius: 8 }}>
                      <Copy size={16} color="var(--rv-muted)" /> Duplicate
                    </button>
                    {onShowInventory && (
                      <button onClick={() => { onShowInventory(); setMenuOpen(false); }}
                        style={{ width: '100%', padding: '11px 12px', textAlign: 'left', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--rv-dark)', borderRadius: 8 }}>
                        <Layers size={16} color="var(--rv-muted)" /> Inventory
                      </button>
                    )}
                    <div style={{ height: 1, background: 'var(--rv-border)', margin: '4px 0' }} />
                    <button onClick={() => { triggerHaptic('medium'); onDelete && onDelete(recipe.id); setMenuOpen(false); }}
                      style={{ width: '100%', padding: '11px 12px', textAlign: 'left', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#EF4444', borderRadius: 8 }}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rv-details-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div className="rv-details-title" style={{ marginBottom: 0, flex: 1, paddingRight: 8 }}>{recipe.name}</div>
          <div className={`rv-status-pill ${recipe.status === 'Published' ? 'published' : 'draft'}`}>{recipe.status || 'Draft'}</div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="rv-tag" style={{ background: 'var(--rv-pink)', color: '#fff' }}>🎂 {recipe.category}</span>
          <span className="rv-tag">{recipe.yield}</span>
          {recipe.difficulty && <span className="rv-tag">{recipe.difficulty}</span>}
          {allergens.map(a => <span key={a} className="rv-tag" style={{ background: '#FEF3C7', color: '#D97706' }}>{a}</span>)}
        </div>

        {/* Time chips */}
        {(recipe.prepTime || recipe.bakeTime) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {recipe.prepTime && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#059669' }}>⏱ Prep: {recipe.prepTime}</div>}
            {recipe.bakeTime && <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#D97706' }}>🔥 Bake: {recipe.bakeTime}</div>}
            {recipe.coolTime && <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563EB' }}>❄️ Cool: {recipe.coolTime}</div>}
          </div>
        )}

        {/* Icon Tabs */}
        <div className="rv-tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`rv-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer' }}>
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* INGREDIENTS TAB — with cost column */}
        {tab === 'Ingredients' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', fontWeight: 700, fontSize: 11, color: 'var(--rv-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0 8px', borderBottom: '1px solid var(--rv-border)', marginBottom: 4 }}>
              <div style={{ flex: 1 }}>Ingredient</div>
              <div style={{ width: 70, textAlign: 'right' }}>Qty</div>
              <div style={{ width: 50, textAlign: 'right', color: '#F59E0B' }}>₹ Cost</div>
            </div>
            {(recipe.ingredients || []).map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--rv-border)' }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{ing.name}</div>
                <div style={{ width: 70, fontSize: 13, color: 'var(--rv-muted)', textAlign: 'right', fontWeight: 600 }}>{ing.qty} {ing.unit}</div>
                <div style={{ width: 50, fontSize: 13, fontWeight: 700, textAlign: 'right', color: '#D97706' }}>₹{Number(ing.cost || 0).toFixed(2)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, padding: '14px 0 4px', fontSize: 15 }}>
              <span>Total Ingredients Cost</span>
              <span style={{ color: 'var(--rv-pink)' }}>₹{ingCost.toFixed(2)}</span>
            </div>
          </motion.div>
        )}

        {/* STEPS TAB */}
        {tab === 'Steps' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {(recipe.steps || []).map((s, i) => (
              <div key={i} className="rv-step-card">
                <div className="rv-step-num">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 15 }}>{s.title || `Step ${i + 1}`}</div>
                  <div className="rv-step-text" style={{ color: 'var(--rv-muted)' }}>{s.desc}</div>
                  {s.timer && <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--rv-pink-light)', color: 'var(--rv-pink)', borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>⏱ {s.timer}</div>}
                  {s.tip && <div style={{ marginTop: 6, fontSize: 12, background: '#FFFBEB', color: '#D97706', padding: '5px 10px', borderRadius: 6 }}>💡 {s.tip}</div>}
                </div>
              </div>
            ))}
            {!recipe.steps?.length && <div style={{ padding: 24, textAlign: 'center', color: 'var(--rv-muted)' }}>No steps added yet.</div>}
          </motion.div>
        )}

        {/* SCALING TAB */}
        {tab === 'Scaling' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'var(--rv-cream)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600 }}>Original Yield</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{recipe.yield}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--rv-muted)', fontWeight: 600, marginBottom: 4 }}>Scale to</div>
                  <button onClick={() => setShowScaler(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--rv-pink)', background: 'var(--rv-pink-light)', color: 'var(--rv-pink)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Scale size={16} /> {yieldMult}x
                  </button>
                </div>
              </div>
              <div style={{ background: 'var(--rv-pink)', color: '#fff', borderRadius: 8, padding: '10px', textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
                Current Scaling: {yieldMult.toFixed(2)}x
              </div>
            </div>

            <div style={{ display: 'flex', fontWeight: 800, fontSize: 12, color: 'var(--rv-muted)', padding: '0 0 10px', borderBottom: '1px solid var(--rv-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ flex: 1 }}>Ingredient</div>
              <div style={{ width: 80, textAlign: 'right' }}>Original</div>
              <div style={{ width: 80, textAlign: 'right', color: 'var(--rv-pink)' }}>Scaled</div>
            </div>
            {(recipe.ingredients || []).map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--rv-border)', fontSize: 14 }}>
                <div style={{ flex: 1, fontWeight: 500 }}>{ing.name}</div>
                <div style={{ width: 80, textAlign: 'right', color: 'var(--rv-muted)' }}>{ing.qty} {ing.unit}</div>
                <div style={{ width: 80, textAlign: 'right', fontWeight: 800, color: 'var(--rv-dark)' }}>{(Number(ing.qty) * yieldMult).toFixed(1)} {ing.unit}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* COSTING TAB */}
        {tab === 'Costing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {profit < 0 && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: 14, borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
                ⚠️ You're losing money on this recipe. Increase your selling price.
              </div>
            )}
            <div style={{ background: '#FFF5F7', border: '1px solid rgba(255,107,138,0.15)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Cost Breakdown ({recipe.yield})</div>
              {[
                ['Ingredients', ingCost * yieldMult],
                ['Packaging', recipe.packaging || 40],
                ['Gas/Electricity', recipe.gas || 25],
                ['Labor', recipe.labor || 80],
                [`Platform Fee (${recipe.platformFee || 5}%)`, platformAmt],
                ['Other Costs', recipe.other || 11],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--rv-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(val).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.08)', color: 'var(--rv-dark)' }}>
                <span>Total Cost</span><span>₹{totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700 }}>Simulated Price</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--rv-dark)' }}>₹{simPrice}</span>
              </div>
              <input type="range" min={Math.max(0, Math.floor(totalCost / 50) * 50)} max={Math.max(1000, sellPrice * 2)} step="10" value={simPrice} onChange={(e) => setSimPrice(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--rv-pink)' }} />
              <div style={{ fontSize: 11, color: 'var(--rv-muted)', textAlign: 'center', marginTop: 8 }}>Drag to simulate profit margins</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: profit >= 0 ? '#D1FAE5' : '#FEE2E2', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rv-muted)', marginBottom: 4 }}>PROFIT</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: profit >= 0 ? '#10B981' : '#EF4444' }}>₹{profit.toFixed(2)}</div>
              </div>
              <div style={{ flex: 1, background: profit >= 0 ? '#D1FAE5' : '#FEE2E2', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rv-muted)', marginBottom: 4 }}>MARGIN</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: profit >= 0 ? '#10B981' : '#EF4444' }}>{currentSellPrice ? ((profit / currentSellPrice) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* NOTES TAB */}
        {tab === 'Notes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: 20, borderRadius: 12, minHeight: 160 }}>
              <div style={{ fontWeight: 700, color: '#B45309', marginBottom: 10 }}>🔑 Kitchen Notes & Tips</div>
              <p style={{ color: '#92400E', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                {recipe.notes || "No notes added. Click 'Edit' to add kitchen secrets, storage tips, or supplier info."}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="rv-bottom-action" style={{ display: 'flex', gap: 10 }}>
        {onShowChecklist && (
          <button onClick={onShowChecklist} title="Checklist"
            style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--rv-pink-light)', border: '1.5px solid rgba(255,107,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ClipboardList size={20} color="var(--rv-pink)" />
          </button>
        )}
        <button className="rv-btn-primary"
          style={{ flex: 1, background: '#fff', color: 'var(--rv-pink)', border: '2px solid var(--rv-pink)', boxShadow: 'none' }}
          disabled={exporting}
          onClick={async () => {
            if (exporting) return;
            setExporting(true);
            showToast('Generating HD PDF...', 'info');
            try {
              const { jsPDF } = await import('jspdf');
              const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
              const imgData = canvas.toDataURL('image/jpeg', 0.95);
              const pdfWidth = 210; // A4 width in mm
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              
              // Use a custom page size matching the exact height of the rendered recipe
              // This creates a single continuous, scrollable PDF page without text getting cut off!
              const pdf = new jsPDF('p', 'mm', [pdfWidth, imgHeight]);
              
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);

              const safeName = recipe.name.replace(/[^a-zA-Z0-9]/g, '_');
              pdf.save(`${safeName}_Recipe.pdf`);
              showToast('PDF Exported Successfully! 🎉', 'success');
              triggerHaptic('success');
            } catch (err) {
              console.error(err);
              showToast('Export failed', 'error');
            } finally {
              setExporting(false);
            }
          }}>
          {exporting ? 'Generating...' : 'Export PDF'}
        </button>
        <button className="rv-btn-primary" style={{ flex: 2 }} onClick={() => setCooking(true)}>
          🍳 Start Baking
        </button>
      </div>

      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />}
      
      <RecipeExportTemplate recipe={recipe} ref={pdfRef} />
      
      <AnimatePresence>
        {showScaler && (
          <BatchScaler
            recipe={recipe}
            currentMult={yieldMult}
            onApply={(newYield) => setYieldMult(newYield)}
            onClose={() => setShowScaler(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
