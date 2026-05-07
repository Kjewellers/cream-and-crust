import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, ArrowDown, X, Plus, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToInventory, addInventoryToDB, updateInventoryStockInDB } from '../services/db';
import { useSubscription } from '../context/SubscriptionContext';

export default function Inventory() {
  const { isPro } = useSubscription();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({ item: '', stock: '', min: '', unit: 'kg' });
  const [restockAmount, setRestockAmount] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToInventory((items) => {
      setInventory(items);
      setLoading(false);
    }, (error) => {
      console.error("Inventory fetch error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setShowAddModal(false);
    
    const newItem = {
      item: addForm.item,
      stock: Number(addForm.stock),
      min: Number(addForm.min),
      unit: addForm.unit
    };
    setAddForm({ item: '', stock: '', min: '', unit: 'kg' });
    
    try {
      await addInventoryToDB(newItem);
    } catch (error) {
      console.error("Failed to add inventory item", error);
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const newStock = Number(selectedItem.stock) + Number(restockAmount);
    
    setShowRestockModal(false);
    try {
      await updateInventoryStockInDB(selectedItem.id, newStock);
      setRestockAmount('');
      setSelectedItem(null);
    } catch (error) {
      console.error("Failed to restock item", error);
    }
  };

  const lowStockItems = inventory.filter(inv => inv.stock <= inv.min);

  return (
    <motion.div className="fade-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'relative' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h1>Inventory Management</h1><p>Track raw materials and packaging</p></div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} disabled={!isPro}><Package size={18} /> Add New Item</button>
      </div>



      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading inventory...</div>
      ) : (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div className="stat-card pink">
              <div className="stat-icon pink"><AlertTriangle size={20} /></div>
              <div className="stat-label">Low Stock Alerts</div>
              <div className="stat-value">{lowStockItems.length} items</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green"><Package size={20} /></div>
              <div className="stat-label">Total Items Tracked</div>
              <div className="stat-value">{inventory.length}</div>
            </div>
          </div>

          <div className="card table-card">
            <div className="table-header">
              <h3>Raw Materials & Supplies</h3>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Current Stock</th>
                    <th>Min. Threshold</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)' }}>No inventory items found.</td>
                    </tr>
                  ) : inventory.map((inv) => {
                    const isLow = inv.stock <= inv.min;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{inv.item}</td>
                        <td style={{ color: isLow ? 'var(--accent2)' : 'inherit', fontWeight: isLow ? 700 : 500 }}>
                          {inv.stock} {inv.unit}
                        </td>
                        <td style={{ color: 'var(--text3)' }}>{inv.min} {inv.unit}</td>
                        <td>
                          {isLow ? 
                            <span className="badge baking" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12}/> Low Stock</span> : 
                            <span className="badge ready">In Stock</span>
                          }
                        </td>
                        <td>
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => { setSelectedItem(inv); setShowRestockModal(true); }}
                            disabled={!isPro}
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>Add Inventory Item</h2>
                <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleAddItem}>
                <div className="form-group full">
                  <label className="form-label">Item Name</label>
                  <input required value={addForm.item} onChange={e => setAddForm({...addForm, item: e.target.value})} placeholder="e.g. All Purpose Flour" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Initial Stock</label>
                    <input type="number" step="0.01" required value={addForm.stock} onChange={e => setAddForm({...addForm, stock: e.target.value})} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Threshold</label>
                    <input type="number" step="0.01" required value={addForm.min} onChange={e => setAddForm({...addForm, min: e.target.value})} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select required value={addForm.unit} onChange={e => setAddForm({...addForm, unit: e.target.value})} className="form-input">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="boxes">boxes</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>Add Item</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Restock Modal */}
        {showRestockModal && selectedItem && (
          <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>Restock {selectedItem.item}</h2>
                <button className="btn-icon" onClick={() => setShowRestockModal(false)}><X size={18} /></button>
              </div>
              <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Current Stock</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{selectedItem.stock} {selectedItem.unit}</div>
              </div>
              <form onSubmit={handleRestock}>
                <div className="form-group full">
                  <label className="form-label">Add Amount ({selectedItem.unit})</label>
                  <input type="number" step="0.01" required value={restockAmount} onChange={e => setRestockAmount(e.target.value)} placeholder={`e.g. 5`} autoFocus />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>Update Stock</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
