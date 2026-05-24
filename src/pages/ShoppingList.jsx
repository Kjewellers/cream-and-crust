import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, ShoppingCart, Share2, CheckCircle2, Circle, Loader2, Info, ChevronRight, Sparkles, Receipt, RefreshCcw, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToShoppingList, addShoppingItemToDB, toggleShoppingItemInDB, deleteShoppingItemFromDB, subscribeToInventory, addExpenseToDB, updateInventoryStockInDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast, triggerHaptic } from '../components/iOS';
import { triggerConfetti, triggerFloatingReward } from '../components/DopamineKit';

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'cups', 'tbsp', 'tsp', 'dozen', 'packets'];

const QUICK_APPS = [
  {
    name: 'Blinkit',
    emoji: '💛',
    color: '#F8E000',
    textColor: '#1a1a00',
    deepLink: 'blinkit://search',
    webUrl: 'https://blinkit.com/',
    tagline: '10 min delivery'
  },
  {
    name: 'Zepto',
    emoji: '⚡',
    color: '#9B30FF',
    textColor: '#ffffff',
    deepLink: 'zepto://search',
    webUrl: 'https://www.zeptonow.com/',
    tagline: 'Instant grocery'
  },
  {
    name: 'Instamart',
    emoji: '🧡',
    color: '#FC8019',
    textColor: '#ffffff',
    deepLink: 'swiggy://search',
    webUrl: 'https://www.swiggy.com/instamart',
    tagline: 'Swiggy express'
  },
  {
    name: 'BigBasket',
    emoji: '🥦',
    color: '#84C225',
    textColor: '#ffffff',
    deepLink: 'bigbasket://search',
    webUrl: 'https://www.bigbasket.com/',
    tagline: 'Fresh & bulk'
  }
];

const QuickOrderApps = ({ searchQuery }) => {
  const handleOpen = (app) => {
    // Try deep link first (opens native app), fall back to web
    const webUrl = searchQuery
      ? `${app.webUrl}?q=${encodeURIComponent(searchQuery)}`
      : app.webUrl;
    window.open(webUrl, '_blank');
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '0 4px' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Order Online</span>
        <span style={{ fontSize: 11, background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>1 tap</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {QUICK_APPS.map((app) => (
          <motion.button
            key={app.name}
            whileTap={{ scale: 0.93 }}
            whileHover={{ scale: 1.04, y: -2 }}
            onClick={() => handleOpen(app)}
            style={{
              background: app.color,
              border: 'none',
              borderRadius: 16,
              padding: '14px 6px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              boxShadow: `0 4px 14px ${app.color}55`,
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{app.emoji}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: app.textColor, lineHeight: 1.2 }}>{app.name}</span>
            <span style={{ fontSize: '0.62rem', color: app.textColor, opacity: 0.75, lineHeight: 1 }}>{app.tagline}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
const CATEGORIES = ['Dairy', 'Dry Goods', 'Packaging', 'Vegetables', 'Fruits', 'Spices', 'Decorations', 'Other'];

const getEmojiForProduct = (name) => {
  if (!name) return '🛒';
  const n = String(name).toLowerCase();
  if (n.includes('butter')) return '🧈';
  if (n.includes('milk')) return '🥛';
  if (n.includes('egg')) return '🥚';
  if (n.includes('flour')) return '🌾';
  if (n.includes('sugar')) return '🧂';
  if (n.includes('chocolate') || n.includes('cocoa') || n.includes('choc')) return '🍫';
  if (n.includes('vanilla')) return '🌼';
  if (n.includes('fruit') || n.includes('berry') || n.includes('strawberry') || n.includes('apple')) return '🍎';
  if (n.includes('nut') || n.includes('almond') || n.includes('walnut') || n.includes('pistachio')) return '🥜';
  if (n.includes('cream')) return '🍦';
  if (n.includes('cheese')) return '🧀';
  if (n.includes('oil')) return '🛢️';
  if (n.includes('salt')) return '🧂';
  if (n.includes('box') || n.includes('pack')) return '📦';
  if (n.includes('bag')) return '🛍️';
  if (n.includes('cake') || n.includes('sponge')) return '🎂';
  if (n.includes('bread')) return '🍞';
  if (n.includes('cookie') || n.includes('biscuit')) return '🍪';
  if (n.includes('coffee')) return '☕';
  if (n.includes('water')) return '💧';
  if (n.includes('lemon') || n.includes('citrus')) return '🍋';
  return '🛒';
};

const ProcessItemModal = ({ item, inventory, onClose, onProcess }) => {
  const matchingInventory = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
  const [recordExpense, setRecordExpense] = useState(true);
  const [updateInventory, setUpdateInventory] = useState(!!matchingInventory);
  const [amount, setAmount] = useState('');

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 32 }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Process Purchase</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.95rem', marginBottom: 24 }}>
            You bought <strong>{item.name}</strong>. What would you like to do?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {/* Inventory Option */}
          <div 
            onClick={() => matchingInventory && setUpdateInventory(!updateInventory)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: updateInventory ? 'var(--cream)' : 'var(--bg)', cursor: matchingInventory ? 'pointer' : 'not-allowed', opacity: matchingInventory ? 1 : 0.6 }}
          >
            <div style={{ width: 24, height: 24, borderRadius: 6, border: '2px solid', borderColor: updateInventory ? 'var(--accent)' : 'var(--text3)', background: updateInventory ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {updateInventory && <CheckCircle2 size={16} color="white" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Update Inventory</div>
              {matchingInventory ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Add {item.qty || 1} {item.unit || ''} to existing stock ({matchingInventory.stock})</div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Item not found in Inventory</div>
              )}
            </div>
          </div>

          {/* Expense Option */}
          <div 
            style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: recordExpense ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setRecordExpense(!recordExpense)}>
              <div style={{ width: 24, height: 24, borderRadius: 6, border: '2px solid', borderColor: recordExpense ? '#34C759' : 'var(--text3)', background: recordExpense ? '#34C759' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {recordExpense && <CheckCircle2 size={16} color="white" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Record Expense</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Add to your financial accounts</div>
              </div>
            </div>
            
            {recordExpense && (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <span style={{ position: 'absolute', left: 14, top: 14, fontWeight: 700, color: 'var(--text)' }}>₹</span>
                <input 
                  type="number" 
                  inputMode="decimal"
                  autoFocus 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount paid" 
                  style={{ width: '100%', paddingLeft: 30, height: 48, borderRadius: 12, fontWeight: 800, fontSize: '1.2rem', background: 'white', border: '1px solid var(--border)' }} 
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, height: 48, borderRadius: 12 }}
            onClick={() => {
              if (recordExpense && !amount) return showToast('Enter expense amount', 'error');
              onProcess(recordExpense ? amount : null, updateInventory ? matchingInventory : null);
            }}
          >
            Apply Options
          </button>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, height: 48, borderRadius: 12 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const emptyForm = { name: '', qty: '', unit: 'kg', category: 'Dry Goods' };

const ItemRow = ({ item, onToggle, onPrompt, onDelete }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 20px', borderBottom: '1px solid var(--border)',
      background: item.bought ? 'rgba(0,0,0,0.02)' : 'var(--card)',
      transition: 'all 0.3s'
    }}
  >
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => onToggle(item, e)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: item.bought ? '#34C759' : 'var(--text3)', flexShrink: 0 }}
    >
      {item.bought ? <CheckCircle2 size={26} strokeWidth={2.5} /> : <Circle size={26} strokeWidth={2} />}
    </motion.button>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontWeight: 700, fontSize: '1.05rem',
        textDecoration: item.bought ? 'line-through' : 'none',
        color: item.bought ? 'var(--text3)' : 'var(--text)',
        transition: 'all 0.3s',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        {item.name} <span style={{ fontSize: '0.9em', opacity: item.bought ? 0.6 : 1 }}>{getEmojiForProduct(item.name)}</span>
      </div>
      {item.qty && (
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tag size={12} /> {item.qty} {item.unit}
        </div>
      )}
    </div>

    <div style={{ display: 'flex', gap: 8 }}>
      {item.bought && (
        <button
          onClick={() => onPrompt(item)}
          style={{ color: 'var(--accent)', background: 'var(--cream)', padding: '6px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Receipt size={14} /> Record Cost
        </button>
      )}
      <button
        className="btn-icon"
        onClick={() => onDelete(item.id)}
        style={{ color: 'rgba(255, 59, 48, 0.6)', width: 32, height: 32, background: 'none' }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  </motion.div>
);

export default function ShoppingList() {
  const [items, setItems]           = useState([]);
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showPrompt, setShowPrompt] = useState(null); // Item to prompt for expense conversion
  const [form, setForm]             = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const unsubItems = subscribeToShoppingList(
      (data) => { setItems(data); setLoading(false); },
      ()     => setLoading(false),
      currentUser.uid
    );
    const unsubInv = subscribeToInventory(
      (data) => setInventory(data),
      null,
      currentUser.uid
    );
    return () => { unsubItems(); unsubInv(); };
  }, [currentUser]);

  const pending = items.filter(i => !i.bought);
  const bought  = items.filter(i => i.bought);

  const lowStockCount = useMemo(() => {
    return inventory.filter(i => Number(i.stock) <= Number(i.minStock || 0)).length;
  }, [inventory]);

  const handleAdd = (ev) => {
    ev.preventDefault();
    if (!form.name) return showToast('Enter item name', 'error');
    setSubmitting(true);
    triggerHaptic('medium');

    const tempId = `temp-${Date.now()}`;
    
    // 1. Prepare Optimistic Data
    const optimisticItem = {
      id: tempId,
      ...form,
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      bought: false,
      isOptimistic: true
    };

    // 2. Update Local State Immediately
    setItems(prev => [optimisticItem, ...prev]);

    // 3. Close Modal Immediately
    setForm(emptyForm);
    setShowModal(false);
    triggerHaptic('success');

    // 4. Background Task
    const performSave = async () => {
      try {
        const finalData = { ...optimisticItem };
        delete finalData.id;
        delete finalData.isOptimistic;

        await addShoppingItemToDB(finalData);
        showToast('Saved ✓', 'success');
      } catch (err) {
        console.error(err);
        showToast('Save failed, try again', 'error');
        // Revert local state
        setItems(prev => prev.filter(i => i.id !== tempId));
      } finally {
        setSubmitting(false);
      }
    };

    performSave();
  };

  const handleToggle = async (item, e) => {
    try {
      const newStatus = !item.bought;
      await toggleShoppingItemInDB(item.id, newStatus);
      triggerHaptic(newStatus ? 'success' : 'light');
      
      if (newStatus) {
        // Dopamine burst on check-off!
        const cx = e?.clientX || window.innerWidth / 2;
        const cy = e?.clientY || window.innerHeight / 2;
        triggerConfetti(cx, cy, 60);
        triggerFloatingReward('✓ Bought!', cx, cy);
        setShowPrompt(item);
      }
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  const handleProcessItem = async (item, expenseAmount, inventoryItemToUpdate) => {
    try {
      let msg = '';
      if (expenseAmount) {
        await addExpenseToDB({
          description: `${item.name} (${item.qty}${item.unit})`,
          amount: Number(expenseAmount),
          category: item.category === 'Packaging' ? 'Packaging' : 'Ingredients',
          date: new Date().toISOString().split('T')[0],
          userId: currentUser.uid
        });
        msg += 'Expense recorded. ';
      }
      
      if (inventoryItemToUpdate) {
        const addedQty = Number(item.qty) || 1;
        const newStock = Number(inventoryItemToUpdate.stock || 0) + addedQty;
        await updateInventoryStockInDB(inventoryItemToUpdate.id, newStock);
        msg += `Inventory updated (+${addedQty}).`;
      }
      
      if (msg) showToast(msg, 'success');
      setShowPrompt(null);
    } catch {
      showToast('Failed to process item', 'error');
    }
  };

  const syncFromInventory = async () => {
    const lowStock = inventory.filter(i => Number(i.stock) <= Number(i.minStock || 0));
    if (lowStock.length === 0) return showToast('Inventory is healthy! ✨', 'info');
    
    triggerHaptic('medium');
    let added = 0;
    for (const invItem of lowStock) {
      // Check if already in shopping list
      if (!items.some(i => i.name.toLowerCase() === invItem.name.toLowerCase() && !i.bought)) {
        await addShoppingItemToDB({
          name: invItem.name,
          qty: (Number(invItem.minStock || 0) * 2) - Number(invItem.stock),
          unit: invItem.unit || 'kg',
          category: invItem.category || 'Dry Goods',
          userId: currentUser.uid
        });
        added++;
      }
    }
    showToast(added > 0 ? `Added ${added} items from Inventory` : 'Items already in list', 'success');
  };

  const handleShareWhatsApp = () => {
    if (pending.length === 0) return showToast('No items to share', 'error');
    const text = `🛒 *Shopping List — Cream & Crust*\n\n${pending.map(i => `• ${i.name}${i.qty ? ` (${i.qty} ${i.unit})` : ''}`).join('\n')}\n\n_Generated by Cream & Crust App_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Shopping List</h1>
            <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>Restock your supplies efficiently</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={handleShareWhatsApp} style={{ borderRadius: 14, color: '#25D366', borderColor: '#25D366' }}>
              <Share2 size={18} /> Share
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 14, padding: '12px 24px' }}>
              <Plus size={20} /> Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Quick Order Apps */}
      <QuickOrderApps searchQuery={pending.length > 0 ? pending.map(i => i.name).join(', ') : ''} />

      {/* Action Cards */}
      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={28} />
          </div>
          <div>
            <div className="stat-label">To Buy</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{pending.length} <span style={{ fontSize: '0.9rem', color: 'var(--text3)', fontWeight: 600 }}>items</span></div>
          </div>
        </div>

        <motion.div 
          whileTap={{ scale: 0.98 }}
          onClick={syncFromInventory}
          className="card" 
          style={{ 
            display: 'flex', alignItems: 'center', gap: 20, padding: '24px', 
            cursor: 'pointer', border: lowStockCount > 0 ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            background: lowStockCount > 0 ? 'linear-gradient(135deg, var(--bg2), var(--cream))' : 'var(--bg2)'
          }}
        >
          <div style={{ width: 54, height: 54, borderRadius: 16, background: lowStockCount > 0 ? 'rgba(181, 96, 106, 0.1)' : 'rgba(0,0,0,0.05)', color: lowStockCount > 0 ? 'var(--accent)' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCcw size={28} className={lowStockCount > 0 ? 'animate-spin-slow' : ''} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="stat-label">Smart Sync</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: lowStockCount > 0 ? 'var(--accent)' : 'var(--text)' }}>
              {lowStockCount > 0 ? `${lowStockCount} items low stock` : 'Inventory Healthy'}
            </div>
          </div>
          <ChevronRight size={20} color="var(--text3)" />
        </motion.div>
      </div>

      {/* Main List Area */}
      {loading ? (
        <div style={{ padding: 100, textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={40} color="var(--accent)" />
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: '5rem', marginBottom: 24 }}>🛒</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>List is empty</h2>
          <p style={{ color: 'var(--text3)', maxWidth: 350, margin: '12px auto 32px' }}>Everything looks stocked up! Or maybe it's time to plan your next market trip?</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '14px 32px', borderRadius: 16 }}>
            <Plus size={20} /> Add Your First Item
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Pending Section */}
          {pending.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '0 8px' }}>
                <Sparkles size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Need to Buy</h3>
                <span className="badge confirmed" style={{ padding: '2px 10px' }}>{pending.length}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {CATEGORIES.map(cat => {
                  const catItems = pending.filter(i => (i.category || 'Other') === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat} className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                      <div style={{ padding: '14px 20px', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat}</span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {catItems.map(item => <ItemRow key={item.id} item={item} onToggle={handleToggle} onPrompt={setShowPrompt} onDelete={deleteShoppingItemFromDB} />)}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bought Section */}
          {bought.length > 0 && (
            <div style={{ opacity: 0.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircle2 size={18} color="#34C759" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text2)' }}>Recently Bought</h3>
                </div>
                <button
                  onClick={async () => { if (window.confirm('Clear all bought items?')) bought.forEach(i => deleteShoppingItemFromDB(i.id)); }}
                  style={{ fontSize: 13, color: '#FF3B30', fontWeight: 700 }}
                >
                  Clear all
                </button>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'transparent', boxShadow: 'none' }}>
                <AnimatePresence mode="popLayout">
                  {bought.map(item => <ItemRow key={item.id} item={item} onToggle={handleToggle} onPrompt={setShowPrompt} onDelete={deleteShoppingItemFromDB} />)}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ y: '100%', opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="modal" 
              onClick={e => e.stopPropagation()} 
              style={{ maxWidth: 480, padding: 0, borderRadius: 28, overflow: 'hidden' }}
            >
              <div style={{ padding: '32px 32px 24px', background: 'linear-gradient(135deg, var(--bg2), var(--cream))', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Add Item</h2>
                    <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginTop: 4 }}>What are we missing today?</p>
                  </div>
                  <button className="btn-icon" onClick={() => setShowModal(false)} style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '50%' }}><X size={20} /></button>
                </div>
              </div>

              <form onSubmit={handleAdd} style={{ padding: 32, overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className="form-group">
                    <label className="form-label">Item Name</label>
                    <input required autoFocus placeholder="e.g. Premium Butter" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ height: 56, borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '1.1rem', fontWeight: 600 }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                      {CATEGORIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm({ ...form, category: c })}
                          style={{
                            padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                            background: form.category === c ? 'var(--text)' : 'var(--bg)',
                            color: form.category === c ? 'white' : 'var(--text2)',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input type="number" inputMode="decimal" min="0" step="0.1" placeholder="5" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} style={{ height: 50, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 800 }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={{ height: 50, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { label: 'Low', color: '#34C759' },
                        { label: 'Medium', color: '#FF9500' },
                        { label: 'Urgent', color: '#FF3B30' }
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setForm({ ...form, priority: p.label })}
                          style={{
                            flex: 1, padding: '12px 0', borderRadius: 14, fontSize: 13, fontWeight: 800,
                            border: form.priority === p.label ? `2px solid ${p.color}` : '1px solid var(--border)',
                            background: form.priority === p.label ? `${p.color}15` : 'white',
                            color: form.priority === p.label ? p.color : 'var(--text3)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 32 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 60, borderRadius: 20, fontSize: '1.1rem', fontWeight: 800, boxShadow: 'var(--shadow-accent)' }} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" /> : '+ Add to Shopping List'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Process Action Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <ProcessItemModal 
            item={showPrompt} 
            inventory={inventory}
            onClose={() => setShowPrompt(null)}
            onProcess={(amount, updateInv) => handleProcessItem(showPrompt, amount, updateInv)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

