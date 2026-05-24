import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, TrendingDown, IndianRupee, Filter, Loader2, ArrowUpRight, ArrowDownRight, Calendar, Tag, Store, Download, Paperclip, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToExpenses, addExpenseToDB, deleteExpenseFromDB, uploadReceiptToStorage } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { showToast, triggerHaptic } from '../components/iOS';
import { triggerConfetti, triggerFloatingReward } from '../components/DopamineKit';
import { formatCurrency, toISODate } from '../utils/date';
import { exportToCSV } from '../utils/exportUtils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORIES = ['Ingredients', 'Packaging', 'Utilities', 'Staff', 'Equipment', 'Marketing', 'Rent', 'Other'];

const CAT_COLORS = {
  Ingredients: '#D4714A',
  Packaging:   '#7C5BB5',
  Utilities:   '#2E7A5A',
  Staff:       '#C4783A',
  Equipment:   '#3A7AB5',
  Marketing:   '#B54A7C',
  Rent:        '#7A6555',
  Other:       '#5A7A55',
};

const emptyForm = { category: 'Ingredients', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0] };

export default function Expenses() {
  const [expenses, setExpenses]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [filterCat, setFilterCat]     = useState('All');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToExpenses(
      (data) => { setExpenses(data); setLoading(false); },
      ()     => setLoading(false),
      currentUser.uid
    );
    return () => unsub();
  }, [currentUser]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const catOk   = filterCat === 'All' || e.category === filterCat;
      const dStr    = toISODate(e.date || e.createdAt);
      const monthStr = dStr.slice(0, 7);
      const monthOk = !filterMonth || monthStr === filterMonth;
      return catOk && monthOk;
    });
  }, [expenses, filterCat, filterMonth]);

  const monthTotal = useMemo(() => filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [filtered]);
  
  const prevMonthTotal = useMemo(() => {
    if (!filterMonth) return 0;
    const d = new Date(filterMonth + '-01');
    d.setMonth(d.getMonth() - 1);
    const pmStr = d.toISOString().slice(0, 7);
    return expenses
      .filter(e => toISODate(e.date || e.createdAt).slice(0, 7) === pmStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, filterMonth]);

  const diff = monthTotal - prevMonthTotal;
  const isUp = diff > 0;

  const chartData = useMemo(() => {
    const dataByCat = CATEGORIES.map(cat => ({
      cat,
      total: filtered.filter(e => e.category === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    })).filter(c => c.total > 0);

    return {
      labels: dataByCat.map(c => c.cat),
      datasets: [{
        data: dataByCat.map(c => c.total),
        backgroundColor: dataByCat.map(c => CAT_COLORS[c.cat]),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [filtered]);

  const handleAdd = (ev) => {
    ev.preventDefault();
    if (!form.amount || !form.description) return showToast('Fill all fields', 'error');
    setSubmitting(true);
    triggerHaptic('medium');

    const tempId = `temp-${Date.now()}`;
    
    // 1. Prepare Optimistic Data
    const optimisticExpense = {
      id: tempId,
      ...form,
      amount: Number(form.amount),
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // 2. Update Local State Immediately
    setExpenses(prev => [optimisticExpense, ...prev]);

    // 3. Close Modal Immediately
    setForm(emptyForm);
    setReceiptFile(null);
    setShowModal(false);
    triggerHaptic('success');
    triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, 50);
    triggerFloatingReward('💰 Saved!', window.innerWidth / 2, window.innerHeight / 2);

    // 4. Background Task
    const performSave = async () => {
      try {
        let receiptUrl = '';
        if (receiptFile) {
          try {
            receiptUrl = await uploadReceiptToStorage(receiptFile);
          } catch (error) {
            console.error("Receipt upload failed:", error);
            showToast('Receipt upload failed, saving without it.', 'info');
          }
        }
        
        const finalData = { ...optimisticExpense, receiptUrl };
        delete finalData.id;
        delete finalData.isOptimistic;

        await addExpenseToDB(finalData);
        showToast('Saved ✓', 'success');
      } catch (err) {
        console.error(err);
        showToast('Save failed, try again', 'error');
        // Revert local state
        setExpenses(prev => prev.filter(e => e.id !== tempId));
      } finally {
        setSubmitting(false);
      }
    };

    performSave();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpenseFromDB(id);
      showToast('Deleted', 'info');
      triggerHaptic('light');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fade-in">
      {/* Header Area */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Expenses</h1>
            <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>Manage your bakery's financial health</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => exportToCSV(expenses, 'expenses_export')} style={{ padding: '12px 24px', borderRadius: 14 }}>
              <Download size={20} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '12px 24px', borderRadius: 14 }}>
              <Plus size={20} /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="content-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginBottom: 32 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 28, background: 'linear-gradient(135deg, var(--bg2), var(--cream))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total for {new Date(filterMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{formatCurrency(monthTotal)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', fontWeight: 600, color: isUp ? '#FF3B30' : '#34C759' }}>
                {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {formatCurrency(Math.abs(diff))} {isUp ? 'more' : 'less'} than last month
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={24} />
            </div>
          </div>
          
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.5)' }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {filtered.length > 0 ? (
            <div style={{ width: '100%', maxWidth: 160 }}>
              <Doughnut 
                key={`${filterMonth}-${filtered.length}`}
                data={chartData} 
                options={{ 
                  cutout: '70%', 
                  plugins: { legend: { display: false }, tooltip: { enabled: true } },
                  maintainAspectRatio: true
                }} 
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: '0.85rem' }}>No data to visualize</div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
        {['All', ...CATEGORIES].map(cat => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setFilterCat(cat); triggerHaptic('light'); }}
            style={{
              padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: filterCat === cat ? 'var(--text)' : 'var(--bg2)',
              color: filterCat === cat ? 'white' : 'var(--text2)',
              boxShadow: filterCat === cat ? 'var(--shadow)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
            <span style={{ color: 'var(--text3)' }}>Fetching records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>💰</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Clean slate!</h3>
            <p style={{ color: 'var(--text3)', maxWidth: 300, margin: '8px auto 0' }}>No expenses found for this period. Keep it up!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((e, idx) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 24px', borderBottom: '1px solid var(--border)',
                  background: 'var(--card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: `${CAT_COLORS[e.category] || '#888'}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0
                  }}>
                    {e.category === 'Ingredients' ? '🌾' : e.category === 'Packaging' ? '📦' :
                     e.category === 'Utilities' ? '💡' : e.category === 'Staff' ? '👤' :
                     e.category === 'Equipment' ? '🔧' : e.category === 'Marketing' ? '📣' :
                     e.category === 'Rent' ? '🏠' : '💰'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{e.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                      <span style={{ color: CAT_COLORS[e.category], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{e.category}</span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {e.date || e.createdAt?.slice(0, 10)}</span>
                      {e.vendor && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Store size={12} /> {e.vendor}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {e.receiptUrl && (
                    <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="btn-icon" style={{ color: 'var(--accent)', background: 'var(--cream)', width: 36, height: 36, borderRadius: 12 }}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>
                      {formatCurrency(e.amount)}
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(e.id)}
                    style={{ background: 'rgba(255, 59, 48, 0.08)', color: '#FF3B30', width: 36, height: 36, borderRadius: 12 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

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
              style={{ maxWidth: 520, padding: 0, borderRadius: 28, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
              {/* Premium Modal Header */}
              <div style={{ padding: '32px 32px 24px', background: 'linear-gradient(135deg, var(--bg2), var(--cream))', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Record Expense</h2>
                    <p style={{ color: 'var(--text3)', fontSize: '0.95rem', marginTop: 4 }}>Financial intelligence starts here</p>
                  </div>
                  <button className="btn-icon" onClick={() => setShowModal(false)} style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '50%', width: 40, height: 40 }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAdd} style={{ padding: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Amount Entry - Hero Focus */}
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Amount Spent</label>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)' }}>₹</span>
                      <input 
                        type="number" 
                        inputMode="decimal"
                        required 
                        autoFocus
                        placeholder="0" 
                        value={form.amount} 
                        onChange={e => setForm({ ...form, amount: e.target.value })} 
                        style={{ width: '180px', background: 'none', border: 'none', fontSize: '3.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--text)', outline: 'none' }} 
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">What was this for?</label>
                    <div style={{ position: 'relative' }}>
                      <Tag size={18} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text3)' }} />
                      <input required placeholder="e.g. Flour delivery, Utility bill" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ paddingLeft: 48, height: 56, borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)' }} />
                    </div>
                  </div>

                  {/* Category Selection - Visual Grid */}
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {CATEGORIES.map(cat => {
                        const isSelected = form.category === cat;
                        const icons = { Ingredients: '🌾', Packaging: '📦', Utilities: '💡', Staff: '👤', Equipment: '🔧', Marketing: '📣', Rent: '🏠', Other: '💰' };
                        return (
                          <motion.button
                            key={cat}
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={() => { setForm({ ...form, category: cat }); triggerHaptic('light'); }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                              padding: '12px 8px', borderRadius: 16, border: isSelected ? `2px solid ${CAT_COLORS[cat]}` : '2px solid transparent',
                              background: isSelected ? `${CAT_COLORS[cat]}15` : 'var(--bg)',
                              cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{icons[cat]}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? CAT_COLORS[cat] : 'var(--text2)', textTransform: 'capitalize' }}>{cat}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Vendor */}
                    <div className="form-group">
                      <label className="form-label">Vendor</label>
                      <div style={{ position: 'relative' }}>
                        <Store size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text3)' }} />
                        <input placeholder="Optional" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} style={{ paddingLeft: 40, height: 48, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 13 }} />
                      </div>
                    </div>
                    {/* Date */}
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <div style={{ position: 'relative' }}>
                        <Calendar size={16} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text3)' }} />
                        <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ paddingLeft: 40, height: 48, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 13 }} />
                      </div>
                    </div>
                  </div>

                  {/* Receipt Upload */}
                  <div className="form-group">
                    <label className="form-label">Receipt Photo / Bill</label>
                    <div style={{ position: 'relative' }}>
                      <Paperclip size={18} style={{ position: 'absolute', left: 16, top: 18, color: 'var(--text3)' }} />
                      <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files[0])} style={{ paddingLeft: 48, height: 56, borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)', paddingTop: 15 }} />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Cash', 'UPI', 'Card', 'Bank'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setForm({ ...form, paymentMethod: method })}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 700,
                            border: '1px solid var(--border)', cursor: 'pointer',
                            background: form.paymentMethod === method ? 'var(--text)' : 'white',
                            color: form.paymentMethod === method ? 'white' : 'var(--text2)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: 32 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 60, borderRadius: 20, fontSize: '1.1rem', fontWeight: 800, boxShadow: 'var(--shadow-accent)' }} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Record Expenditure'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

