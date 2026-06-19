import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDeletedItems, restoreFromDB, permanentlyDeleteFromDB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast, Skeleton } from '../components/iOS';
import { format } from 'date-fns';

export default function RecycleBin() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      const deleted = await fetchDeletedItems(currentUser?.uid);
      setItems(deleted);
    } catch (e) {
      showToast('Failed to load recycle bin', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadItems();
    }
  }, [currentUser]);

  const handleRestore = async (item) => {
    try {
      await restoreFromDB(item._collection, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast('Item restored successfully', 'success');
    } catch (e) {
      showToast('Failed to restore item', 'error');
    }
  };

  const handlePermanentDelete = async (item) => {
    if (window.confirm('Are you absolutely sure? This cannot be undone.')) {
      try {
        await permanentlyDeleteFromDB(item._collection, item.id);
        setItems(prev => prev.filter(i => i.id !== item.id));
        showToast('Item permanently deleted', 'info');
      } catch (e) {
        showToast('Failed to delete item', 'error');
      }
    }
  };

  const emptyTrash = async () => {
    if (items.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete all ${items.length} items? This action cannot be reversed.`)) {
      setLoading(true);
      try {
        const promises = items.map(item => permanentlyDeleteFromDB(item._collection, item.id));
        await Promise.all(promises);
        setItems([]);
        showToast('Recycle bin emptied', 'success');
      } catch (e) {
        showToast('Failed to empty recycle bin completely', 'error');
        loadItems();
      } finally {
        setLoading(false);
      }
    }
  };

  const getCollectionLabel = (col) => {
    const map = {
      orders: 'Order',
      customers: 'Customer',
      products: 'Product',
      recipes: 'Recipe',
      inventory: 'Inventory Item',
      expenses: 'Expense',
      shoppingList: 'Shopping Item'
    };
    return map[col] || col;
  };

  const getItemTitle = (item) => {
    return item.name || item.item || item.description || item.customerName || `Unknown ${getCollectionLabel(item._collection)}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Recycle Bin</h1>
          <p>Recover deleted items or remove them permanently.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={loadItems} disabled={loading} style={{ gap: 8 }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={emptyTrash} disabled={loading || items.length === 0} style={{ gap: 8, background: 'var(--accent2)', color: 'white' }}>
            <Trash2 size={16} /> Empty Trash
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={80} radius={12} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', borderRadius: 16 }}>
          <Trash2 size={48} color="var(--text3)" style={{ marginBottom: 16 }} />
          <h3>Recycle Bin is Empty</h3>
          <p style={{ color: 'var(--text3)' }}>No deleted items found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(255, 171, 0, 0.1)', color: '#b27b00', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Items here will be kept safely until you choose to empty the trash.</span>
          </div>

          <AnimatePresence>
            {items.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  background: 'var(--bg)',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>
                      {getCollectionLabel(item._collection)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Deleted {item.deletedAt ? format(new Date(item.deletedAt), 'MMM d, h:mm a') : 'Unknown Date'}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {getItemTitle(item)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleRestore(item)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13, gap: 6 }}>
                    <RefreshCw size={14} /> Restore
                  </button>
                  <button onClick={() => handlePermanentDelete(item)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13, color: 'var(--accent2)', borderColor: 'var(--accent2)', gap: 6 }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
