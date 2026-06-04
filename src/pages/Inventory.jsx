import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDown,
  X,
  Plus,
  Lock,
  ShoppingCart,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  Tag,
  Info,
  RefreshCcw,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  subscribeToInventory,
  addInventoryToDB,
  updateInventoryStockInDB,
  updateInventoryFieldsInDB,
  addShoppingItemToDB,
  deleteInventoryFromDB,
  addExpenseToDB,
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Skeleton, showToast, triggerHaptic, EmptyState, PressButton } from '../components/iOS';
import { IndianRupee, Store, Calendar as CalendarIcon } from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import { inventoryTourSteps } from '../components/tours/inventoryTour';
import AnimatedDemo from '../components/AnimatedDemo';
import { inventoryDemoScenes } from '../components/demos/inventoryDemo';

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'boxes', 'packets'];
const CATS = ['Ingredients', 'Packaging', 'Decor', 'Supplies', 'Other'];

const QUICK_APPS = [
  {
    name: 'Blinkit',
    emoji: '💛',
    color: '#F8E000',
    textColor: '#1a1a00',
    webUrl: 'https://blinkit.com/',
    tagline: '10 min delivery',
  },
  {
    name: 'Zepto',
    emoji: '⚡',
    color: '#9B30FF',
    textColor: '#ffffff',
    webUrl: 'https://www.zeptonow.com/',
    tagline: 'Instant grocery',
  },
  {
    name: 'Instamart',
    emoji: '🧡',
    color: '#FC8019',
    textColor: '#ffffff',
    webUrl: 'https://www.swiggy.com/instamart',
    tagline: 'Swiggy express',
  },
  {
    name: 'BigBasket',
    emoji: '🥦',
    color: '#84C225',
    textColor: '#ffffff',
    webUrl: 'https://www.bigbasket.com/',
    tagline: 'Fresh & bulk',
  },
];

const QuickOrderApps = () => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        Order Online
      </span>
      <span
        style={{
          fontSize: 11,
          background: 'var(--accent)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: 20,
          fontWeight: 700,
        }}
      >
        1 tap
      </span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {QUICK_APPS.map((app) => (
        <motion.button
          key={app.name}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.04, y: -2 }}
          onClick={() => window.open(app.webUrl, '_blank')}
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
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{app.emoji}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: app.textColor }}>
            {app.name}
          </span>
          <span style={{ fontSize: '0.62rem', color: app.textColor, opacity: 0.75 }}>
            {app.tagline}
          </span>
        </motion.button>
      ))}
    </div>
  </div>
);

export default function Inventory() {
  const { currentUser } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // All, Low, Healthy

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [addingToShop, setAddingToShop] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    item: '',
    stock: '',
    minStock: '',
    unit: 'kg',
    category: 'Ingredients',
    cost: '',
    vendor: '',
    expiryDate: '',
  });
  const [restockForm, setRestockForm] = useState({
    amount: '',
    cost: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const days = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return days <= 7 && days >= 0;
  };

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToInventory(
      (items) => {
        setInventory(items);
        setLoading(false);
      },
      null,
      currentUser.uid
    );
    return () => unsubscribe();
  }, [currentUser]);

  const filteredItems = useMemo(() => {
    let list = inventory.filter((i) => (i.item || '').toLowerCase().includes(search.toLowerCase()));
    if (filter === 'Low') return list.filter((i) => Number(i.stock) <= Number(i.minStock || 0));
    if (filter === 'Healthy') return list.filter((i) => Number(i.stock) > Number(i.minStock || 0));
    if (filter === 'Expiring')
      return list.filter((i) => isExpired(i.expiryDate) || isExpiringSoon(i.expiryDate));
    return list;
  }, [inventory, search, filter]);

  const lowStockCount = inventory.filter((i) => Number(i.stock) <= Number(i.minStock || 0)).length;
  const expiringCount = inventory.filter(
    (i) => isExpired(i.expiryDate) || isExpiringSoon(i.expiryDate)
  ).length;

  const handleAddItem = async (e) => {
    e.preventDefault();
    triggerHaptic('medium');
    try {
      const payload = {
        item: addForm.item,
        stock: Number(addForm.stock),
        minStock: Number(addForm.minStock),
        unit: addForm.unit,
        category: addForm.category,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
      };
      if (addForm.expiryDate) payload.expiryDate = addForm.expiryDate;
      const invId = await addInventoryToDB(payload);

      // Optional Expense
      if (addForm.cost && Number(addForm.cost) > 0) {
        await addExpenseToDB({
          description: `Initial Stock: ${addForm.item}`,
          amount: Number(addForm.cost),
          category: addForm.category === 'Packaging' ? 'Packaging' : 'Ingredients',
          vendor: addForm.vendor,
          date: new Date().toISOString().split('T')[0],
          userId: currentUser.uid,
        });
      }

      showToast('Item & Expense added!', 'success');
      setShowAddModal(false);
      setAddForm({
        item: '',
        stock: '',
        minStock: '',
        unit: 'kg',
        category: 'Ingredients',
        cost: '',
        vendor: '',
        expiryDate: '',
      });
    } catch {
      showToast('Failed to add', 'error');
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    triggerHaptic('medium');
    try {
      const updates = { stock: Number(selectedItem.stock) + Number(restockForm.amount) };
      if (restockForm.expiryDate) updates.expiryDate = restockForm.expiryDate;

      await updateInventoryFieldsInDB(selectedItem.id, updates);

      // Automatic Expense Recording
      if (restockForm.cost && Number(restockForm.cost) > 0) {
        await addExpenseToDB({
          description: `Restock: ${selectedItem.item} (${restockForm.amount}${selectedItem.unit})`,
          amount: Number(restockForm.cost),
          category: selectedItem.category === 'Packaging' ? 'Packaging' : 'Ingredients',
          vendor: restockForm.vendor,
          date: restockForm.date,
          userId: currentUser.uid,
        });
        showToast('Restocked & Expense Recorded! 💸', 'success');
      } else {
        showToast('Restocked!', 'success');
      }

      setShowRestockModal(false);
      setRestockForm({
        amount: '',
        cost: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        expiryDate: '',
      });
      setSelectedItem(null);
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  const handleAddToShoppingList = async (inv) => {
    setAddingToShop(inv.id);
    triggerHaptic('light');
    try {
      const needed = Number(inv.minStock || 0) * 2 - Number(inv.stock);
      await addShoppingItemToDB({
        name: inv.item,
        qty: needed > 0 ? needed.toString() : '5',
        unit: inv.unit,
        category: inv.category || 'Ingredients',
        userId: currentUser.uid,
      });
      showToast('Added to Shopping List!', 'success');
    } catch {
      showToast('Failed to add', 'error');
    } finally {
      setAddingToShop(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item from inventory?')) return;
    try {
      await deleteInventoryFromDB(id);
      showToast('Deleted', 'info');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      {/* Header Section */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
              Inventory
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>
              Track your raw materials & stock health
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ borderRadius: 14, padding: '12px 24px' }}
            >
              <Plus size={20} /> Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Quick Order Apps */}
      <QuickOrderApps />

      {/* Controls & Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
        <div
          style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 0' }}
          className="no-scrollbar"
        >
          {['All', 'Low', 'Expiring', 'Healthy'].map((t) => (
            <PressButton
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? 'badge confirmed' : 'badge'}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                border: 'none',
                background: filter === t ? 'var(--accent)' : 'var(--bg2)',
                color: filter === t ? 'white' : 'var(--text3)',
              }}
            >
              {t} {t === 'Low' && lowStockCount > 0 && `(${lowStockCount})`}
              {t === 'Expiring' && expiringCount > 0 && `(${expiringCount})`}
            </PressButton>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text3)',
            }}
          />
          <input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 50,
              paddingLeft: 48,
              borderRadius: 16,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              fontSize: '1rem',
            }}
          />
        </div>
      </div>

      {loading ? (
        <div
          className="content-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={180} radius={24} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No items found"
          subtitle="Try a different search or add a new item."
        />
      ) : (
        <div
          className="content-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const isLow = Number(item.stock) <= Number(item.minStock || 0);
              const health = Math.min(
                100,
                Math.max(0, (Number(item.stock) / (Number(item.minStock || 1) * 2)) * 100)
              );
              const expired = isExpired(item.expiryDate);
              const expiring = isExpiringSoon(item.expiryDate);

              return (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="card"
                  style={{
                    padding: 24,
                    borderRadius: 24,
                    border: isLow || expired ? '1.5px solid #FF3B30' : '1px solid var(--border)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: isLow || expired ? '#FFF5F5' : '#F0FDF4',
                        color: isLow || expired ? '#FF3B30' : '#22C55E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Package size={24} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <PressButton
                        onClick={() => handleDelete(item.id)}
                        style={{
                          padding: 6,
                          color: 'var(--text3)',
                          background: 'none',
                          border: 'none',
                        }}
                      >
                        <Trash2 size={16} />
                      </PressButton>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: 'var(--text)',
                        marginBottom: 4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.item}
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                    >
                      <span
                        className="badge"
                        style={{ fontSize: 10, background: 'var(--bg2)', color: 'var(--text3)' }}
                      >
                        {item.category || 'Ingredients'}
                      </span>
                      {isLow && (
                        <span className="badge baking" style={{ fontSize: 10 }}>
                          LOW STOCK
                        </span>
                      )}
                      {expired && (
                        <span
                          className="badge"
                          style={{ fontSize: 10, background: '#FF3B30', color: 'white' }}
                        >
                          EXPIRED
                        </span>
                      )}
                      {!expired && expiring && (
                        <span
                          className="badge"
                          style={{ fontSize: 10, background: '#FF9500', color: 'white' }}
                        >
                          EXPIRING SOON
                        </span>
                      )}
                    </div>
                    {item.expiryDate && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text3)',
                          marginTop: 6,
                          fontWeight: 600,
                        }}
                      >
                        Exp:{' '}
                        {new Date(item.expiryDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                        {item.stock}{' '}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                          {item.unit}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>
                        Min: {item.minStock} {item.unit}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 6,
                        background: 'var(--bg2)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${health}%` }}
                        style={{
                          height: '100%',
                          background: isLow ? '#FF3B30' : '#22C55E',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <PressButton
                      onClick={() => {
                        setSelectedItem(item);
                        setShowRestockModal(true);
                      }}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        background: 'var(--accent)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <RefreshCcw size={16} /> Restock
                    </PressButton>
                    {isLow && (
                      <PressButton
                        onClick={() => handleAddToShoppingList(item)}
                        disabled={addingToShop === item.id}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'rgba(181,96,106,0.1)',
                          color: 'var(--accent)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {addingToShop === item.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <ShoppingCart size={18} />
                        )}
                      </PressButton>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 480, padding: 32, borderRadius: 24 }}
            >
              <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.6rem' }}>
                New Inventory Item
              </h2>
              <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginBottom: 24 }}>
                Define stock levels and initial cost
              </p>

              <form onSubmit={handleAddItem}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group full">
                    <label className="form-label">Item Name</label>
                    <input
                      required
                      autoFocus
                      placeholder="e.g. Belgian Chocolate"
                      value={addForm.item}
                      onChange={(e) => setAddForm({ ...addForm, item: e.target.value })}
                      style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Current Stock</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        required
                        value={addForm.stock}
                        onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                        style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Min Alert</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        required
                        value={addForm.minStock}
                        onChange={(e) => setAddForm({ ...addForm, minStock: e.target.value })}
                        style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        value={addForm.category}
                        onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                        style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                      >
                        {CATS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <select
                        value={addForm.unit}
                        onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                        style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                      >
                        {UNITS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expiry Date (Optional)</label>
                    <div style={{ position: 'relative' }}>
                      <CalendarIcon
                        size={16}
                        style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text3)' }}
                      />
                      <input
                        type="date"
                        value={addForm.expiryDate}
                        onChange={(e) => setAddForm({ ...addForm, expiryDate: e.target.value })}
                        style={{
                          paddingLeft: 40,
                          height: 50,
                          borderRadius: 12,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          width: '100%',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--accent)',
                      marginBottom: 4,
                    }}
                  >
                    <IndianRupee size={14} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                      Financial Tracking (Optional)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Initial Cost (₹)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={addForm.cost}
                        onChange={(e) => setAddForm({ ...addForm, cost: e.target.value })}
                        style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vendor</label>
                      <input
                        placeholder="e.g. Amazon"
                        value={addForm.vendor}
                        onChange={(e) => setAddForm({ ...addForm, vendor: e.target.value })}
                        style={{ height: 50, borderRadius: 12, background: 'var(--bg)' }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: 54,
                    borderRadius: 16,
                    marginTop: 24,
                    fontSize: '1rem',
                    fontWeight: 800,
                  }}
                >
                  Create Item & Record Cost
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {showRestockModal && selectedItem && (
          <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 440, padding: 0, borderRadius: 28, overflow: 'hidden' }}
            >
              <div
                style={{
                  padding: '32px 32px 24px',
                  background: 'linear-gradient(135deg, var(--bg2), var(--cream))',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '20px',
                    background: 'var(--accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  <RefreshCcw size={32} />
                </div>
                <h2
                  style={{
                    fontWeight: 900,
                    marginBottom: 4,
                    fontSize: '1.6rem',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Restock {selectedItem.item}
                </h2>
                <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>
                  Current balance: {selectedItem.stock} {selectedItem.unit}
                </p>
              </div>

              <form onSubmit={handleRestock} style={{ padding: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Quantity to Add ({selectedItem.unit})</label>
                    <div style={{ position: 'relative' }}>
                      <Package
                        size={18}
                        style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text3)' }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        autoFocus
                        placeholder="0.00"
                        value={restockForm.amount}
                        onChange={(e) => setRestockForm({ ...restockForm, amount: e.target.value })}
                        style={{
                          height: 50,
                          paddingLeft: 48,
                          borderRadius: 14,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Total Cost (₹)</label>
                      <div style={{ position: 'relative' }}>
                        <IndianRupee
                          size={16}
                          style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text3)' }}
                        />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={restockForm.cost}
                          onChange={(e) => setRestockForm({ ...restockForm, cost: e.target.value })}
                          style={{
                            height: 46,
                            paddingLeft: 36,
                            borderRadius: 12,
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            fontWeight: 700,
                          }}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        value={restockForm.date}
                        onChange={(e) => setRestockForm({ ...restockForm, date: e.target.value })}
                        style={{
                          height: 46,
                          borderRadius: 12,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          fontSize: 12,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Vendor (Optional)</label>
                      <div style={{ position: 'relative' }}>
                        <Store
                          size={16}
                          style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text3)' }}
                        />
                        <input
                          placeholder="Where did you buy this?"
                          value={restockForm.vendor}
                          onChange={(e) =>
                            setRestockForm({ ...restockForm, vendor: e.target.value })
                          }
                          style={{
                            height: 46,
                            paddingLeft: 36,
                            borderRadius: 12,
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            fontSize: 13,
                          }}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Expiry Date</label>
                      <div style={{ position: 'relative' }}>
                        <CalendarIcon
                          size={16}
                          style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text3)' }}
                        />
                        <input
                          type="date"
                          value={restockForm.expiryDate}
                          onChange={(e) =>
                            setRestockForm({ ...restockForm, expiryDate: e.target.value })
                          }
                          style={{
                            height: 46,
                            paddingLeft: 36,
                            borderRadius: 12,
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            fontSize: 13,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: 56,
                    borderRadius: 16,
                    marginTop: 24,
                    fontSize: '1rem',
                    fontWeight: 800,
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  Update Stock & Record Expense
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatedDemo moduleId="inventory" title="Track Your Stock" scenes={inventoryDemoScenes} />
    </motion.div>
  );
}
