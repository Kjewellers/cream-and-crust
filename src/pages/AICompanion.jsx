import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Brain, Check, ClipboardCopy, Megaphone, Mic, MicOff,
  Package, Pencil, Receipt, RefreshCw, Search, Send, Sparkles, TrendingUp,
  X, Zap, ShoppingBag, Users, PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../api';
import { INTENTS } from '../ai/actionSchemas';
import { executeServiceAction } from '../ai/serviceLayer';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import './AICompanion.css';

/* ── Constants ─────────────────────────────────────────────────── */
const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const ACTION_INTENT_MAP = {
  create_order: INTENTS.CREATE_ORDER,
  update_order_status: INTENTS.UPDATE_ORDER_STATUS,
  delete_order: INTENTS.DELETE_ORDER,
  add_inventory: INTENTS.ADD_INVENTORY,
  update_inventory_stock: INTENTS.UPDATE_INVENTORY_STOCK,
  delete_inventory: INTENTS.DELETE_INVENTORY,
  add_customer: INTENTS.ADD_CUSTOMER,
  delete_customer: INTENTS.DELETE_CUSTOMER,
  add_expense: INTENTS.ADD_EXPENSE,
  delete_expense: INTENTS.DELETE_EXPENSE,
  add_shopping_item: INTENTS.ADD_SHOPPING_ITEM,
  toggle_shopping_item: INTENTS.TOGGLE_SHOPPING_ITEM,
  delete_shopping_item: INTENTS.DELETE_SHOPPING_ITEM,
  add_product: INTENTS.ADD_PRODUCT,
  delete_product: INTENTS.DELETE_PRODUCT,
  add_recipe: INTENTS.ADD_RECIPE,
  delete_recipe: INTENTS.DELETE_RECIPE,
  add_memory: INTENTS.ADD_MEMORY,
  delete_memory: INTENTS.DELETE_MEMORY,
  send_whatsapp_invoice: INTENTS.SEND_WHATSAPP_INVOICE,
};

const SUCCESS_MESSAGES = {
  create_order: 'Order created successfully! 🎂',
  add_customer: 'Customer added! 👤',
  add_inventory: 'Inventory updated! 📦',
  add_expense: 'Expense recorded! 💰',
  add_shopping_item: 'Added to shopping list! 🛒',
  update_order_status: 'Order status updated! ✅',
  add_product: 'Product added to catalog! 🧁',
  add_recipe: 'Recipe saved! 📖',
  add_memory: "Got it! I'll remember this. 🧠",
  delete_memory: 'Memory deleted.',
};

/* ── Helpers ───────────────────────────────────────────────────── */
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function mapActionData(type, data) {
  const d = { ...data };
  if (type === 'create_order') {
    if (d.customer && !d.customerName) d.customerName = d.customer;
    if (d.address && !d.deliveryAddress) d.deliveryAddress = d.address;
    if (!d.qty) d.qty = d.quantity || 1;
    if (!d.deliveryType) d.deliveryType = 'pickup';
  }
  if (type === 'add_memory' && !d.note && typeof data === 'string') d.note = data;
  return d;
}

function trimContext(list, max = 40) {
  return Array.isArray(list) ? list.filter(Boolean).slice(0, max) : [];
}

/* ── UI Components ─────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="ai-message assistant">
      <div className="ai-message-body" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '12px 16px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text3)' }}>Thinking</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  );
}

function ConfirmationCard({ action, onEdit, onConfirm, onCancel, loading }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(action?.data || {});

  useEffect(() => { setDraft(action?.data || {}); }, [action]);
  if (!action) return null;

  const label = action.type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Action';
  const entries = Object.entries(draft).filter(([, v]) => v != null && v !== '');

  return (
    <div className="ai-confirmation-card">
      <div className="ai-confirmation-head">
        <div>
          <span className="ai-confirmation-label">⚡ Review Action</span>
          <h4>{label}</h4>
        </div>
        <button type="button" className="ai-icon-btn" onClick={() => setEditing((p) => !p)}>
          <Pencil size={15} />
        </button>
      </div>
      <div className="ai-confirmation-fields">
        {entries.map(([key, val]) => (
          <div key={key} className="ai-confirmation-field">
            <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</span>
            {editing ? (
              <input value={draft[key] ?? ''} onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))} />
            ) : (
              <strong>{String(val)}</strong>
            )}
          </div>
        ))}
      </div>
      <div className="ai-confirmation-actions">
        {editing && <button className="ai-btn-secondary" onClick={() => { onEdit(draft); setEditing(false); }}>Save edits</button>}
        <button className="ai-btn-secondary" onClick={onCancel} disabled={loading}><X size={15} /> Cancel</button>
        <button className="ai-btn-primary" onClick={() => onConfirm(draft)} disabled={loading}><Check size={15} /> Confirm</button>
      </div>
    </div>
  );
}

function GatheringForm({ extracted, missing, onSubmit, disabled }) {
  const [formData, setFormData] = useState({ ...extracted });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="ai-gathering-form" onSubmit={handleSubmit}>
      <div className="ai-gf-header">
        <Sparkles size={14} color="var(--accent)" />
        <h4>Complete Details</h4>
      </div>
      <div className="ai-gf-fields">
        {Object.entries(extracted).map(([k, v]) => (
          <div className="ai-gf-field" key={k}>
            <label>{k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</label>
            <input name={k} value={formData[k] ?? v} onChange={handleChange} disabled={disabled} />
          </div>
        ))}
        {missing.map((k) => (
          <div className="ai-gf-field missing" key={k}>
            <label>{k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} *</label>
            <input name={k} value={formData[k] || ''} onChange={handleChange} required disabled={disabled} placeholder="Required" />
          </div>
        ))}
      </div>
      {!disabled && (
        <button type="submit" className="ai-gf-submit">
          <Check size={14} /> Submit Details
        </button>
      )}
    </form>
  );
}

function InsightRenderer({ insights }) {
  if (!insights) return null;
  const { type } = insights;

  if (type === 'recipe_generator' && insights.recipe) {
    const { recipe } = insights;
    return (
      <div className="ai-insight-card recipe">
        <h4><ClipboardCopy size={14} /> {recipe.name}</h4>
        <div className="ai-recipe-meta">
          <span>Yield: {recipe.yield}</span>
          <span>Prep: {recipe.prepTime}</span>
          <span>Cost: ₹{recipe.cost}</span>
        </div>
        <h5>Ingredients</h5>
        <ul className="ai-recipe-list">
          {recipe.ingredients.map((ing, i) => <li key={i}>{ing.qty}{ing.unit} {ing.item}</li>)}
        </ul>
        <h5>Steps</h5>
        <ol className="ai-recipe-list">
          {recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </div>
    );
  }

  if (type === 'bakery_coach') {
    return (
      <div className="ai-insight-card coach">
        <h4><TrendingUp size={14} /> Business Health</h4>
        <div className="ai-coach-stats">
          <div className="ai-stat-box"><span>Revenue</span><strong>₹{insights.revenue}</strong></div>
          <div className="ai-stat-box"><span>Profit</span><strong>₹{insights.profit}</strong></div>
        </div>
        <div className="ai-coach-lists">
          <div className="ai-coach-list">
            <h5>🏆 Best Sellers</h5>
            {insights.bestSellers.map(b => <span key={b}>{b}</span>)}
          </div>
          <div className="ai-coach-list">
            <h5>📉 Weak Products</h5>
            {insights.weakProducts.map(w => <span key={w}>{w}</span>)}
          </div>
        </div>
        <div className="ai-coach-advice">
          <Brain size={14} /> <p>{insights.advice}</p>
        </div>
      </div>
    );
  }

  if (type === 'inventory_assistant') {
    return (
      <div className="ai-insight-card inventory">
        <h4><Package size={14} /> Stock Report</h4>
        {insights.summary && <p className="ai-inventory-summary">{insights.summary}</p>}
        {insights.shortages?.length > 0 && (
          <div className="ai-inventory-section critical">
            <h5>🔴 Critical Shortages</h5>
            {insights.shortages.map((s, i) => <div key={i}><strong>{s.item}</strong> ({s.stock}) - <em>{s.reason}</em></div>)}
          </div>
        )}
        {insights.expiring?.length > 0 && (
          <div className="ai-inventory-section warning">
            <h5>🟡 Expiring Soon</h5>
            {insights.expiring.map((s, i) => <div key={i}><strong>{s.item}</strong> - <em>{s.date}</em></div>)}
          </div>
        )}
      </div>
    );
  }

  if (type === 'smart_search' && insights.results?.length > 0) {
    return (
      <div className="ai-insight-card search">
        <h4><Search size={14} /> Search Results ({insights.totalCount || insights.results.length})</h4>
        <div className="ai-search-results">
          {insights.results.map((res, i) => (
            <div key={i} className="ai-search-result-item" style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
              {Object.entries(res).map(([k, v]) => {
                if (!v || typeof v === 'object') return null;
                return (
                  <div key={k} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</strong>
                    <span>{String(v)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'chart' && insights.data?.length > 0) {
    const ChartComponent = insights.chartType === 'line' ? LineChart : ReBarChart;
    const DataComponent = insights.chartType === 'line' ? Line : Bar;
    return (
      <div className="ai-insight-card chart">
        <h4><BarChart3 size={14} /> Data Visualization</h4>
        <div style={{ width: '100%', height: 200, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={insights.data}>
              <XAxis dataKey="name" fontSize={11} stroke="var(--text3)" tickLine={false} axisLine={false} />
              <YAxis fontSize={11} stroke="var(--text3)" tickLine={false} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <DataComponent type="monotone" dataKey="value" fill="var(--accent)" stroke="var(--accent)" radius={[4, 4, 0, 0]} strokeWidth={2} />
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'product_descriptions' && insights.items?.length > 0) {
    return (
      <div className="ai-insight-card product-desc">
        <h4><ClipboardCopy size={14} /> Generated Descriptions ({insights.items.length} products)</h4>
        {insights.items.map((item, i) => (
          <div key={i} className="ai-product-desc-card">
            <div className="ai-product-desc-header">
              <strong>{item.name}</strong>
              <button className="ai-desc-copy-btn" type="button"
                onClick={() => navigator.clipboard.writeText(item.description || '').catch(() => {})}>
                <ClipboardCopy size={13} /> Copy
              </button>
            </div>
            <p className="ai-product-desc-text">{item.description}</p>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'marketing_campaign' && insights.message) {
    return (
      <div className="ai-insight-card marketing">
        <h4><Megaphone size={14} /> Campaign Ready</h4>
        <p className="ai-marketing-message">{insights.message}</p>
        {insights.hashtags?.length > 0 && (
          <div className="ai-hashtags">
            {insights.hashtags.map((tag, i) => <span key={i} className="ai-hashtag">{tag}</span>)}
          </div>
        )}
        <button className="ai-btn-primary" style={{ marginTop: 12 }} type="button"
          onClick={() => navigator.clipboard.writeText(insights.message).catch(() => {})}>
          <ClipboardCopy size={14} /> Copy Message
        </button>
      </div>
    );
  }

  if (type === 'payment_status') {
    return (
      <div className="ai-insight-card payment">
        <h4><Receipt size={14} /> Pending Payments</h4>
        <div className="ai-payment-summary">
          <span>Total Pending</span>
          <strong style={{ color: 'var(--danger, #ef4444)' }}>₹{(insights.pendingAmount || 0).toLocaleString('en-IN')}</strong>
        </div>
        {insights.pendingOrders?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {insights.pendingOrders.map((o, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'var(--bg)', marginBottom: 4, border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                <span>{o.customer}</span>
                <strong>₹{(o.amount || 0).toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback for default insights
  return (
    <div className="ai-insight-card default">
      <strong>Insight:</strong> {insights.summary || insights.advice || 'See details above.'}
    </div>
  );
}

function RealThinkingProcess({ steps }) {
  if (!steps || !steps.length) return null;
  return (
    <details className="ai-cot-accordion" open>
      <summary className="ai-cot-summary">
        <Brain size={13} />
        <span>AI Reasoning</span>
      </summary>
      <div className="ai-thinking-steps">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            className="ai-thinking-step"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <span className="ai-step-check">✓</span>
            <span>{String(step).replace(/^[✓✔✅]\s*/, '')}</span>
          </motion.div>
        ))}
      </div>
    </details>
  );
}

function ActionButtonBar({ buttons, onNavigate, onDispatch }) {
  if (!buttons || buttons.length === 0) return null;
  const handleClick = (btn) => {
    if (btn.action === 'navigate') onNavigate(btn.value);
    else if (btn.action === 'dispatch') onDispatch(btn.value);
    else if (btn.action === 'copy') navigator.clipboard.writeText(btn.value || '').catch(() => {});
  };
  return (
    <div className="ai-action-buttons">
      {buttons.map((btn, i) => (
        <button
          key={i}
          className={`ai-action-btn ai-action-btn--${btn.action || 'default'}`}
          onClick={() => handleClick(btn)}
          type="button"
        >
          {btn.action === 'navigate' && <Zap size={12} />}
          {btn.action === 'copy' && <ClipboardCopy size={12} />}
          {btn.action === 'dispatch' && <ShoppingBag size={12} />}
          {btn.label}
        </button>
      ))}
    </div>
  );
}

function MemoryDeck({ memories, onClose, onDelete }) {
  return (
    <motion.div 
      className="ai-memory-deck"
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
    >
      <div className="ai-memory-header">
        <h3><Brain size={18} /> Persistent Memories</h3>
        <button className="ai-icon-btn" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="ai-memory-list">
        {memories.length === 0 ? (
          <div className="ai-memory-empty">
            <Brain size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
            <p>No memories saved yet. Ask me to remember something!</p>
          </div>
        ) : (
          memories.map(m => (
            <div key={m.id} className="ai-memory-card">
              <div>
                <p>{m.note}</p>
                <span className="ai-memory-date">ID: {m.id.substring(0, 8)}</span>
              </div>
              <button className="ai-icon-btn" style={{ flexShrink: 0, width: 30, height: 30 }} onClick={() => onDelete(m.id)}>
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

/* ── Main Drawer Component ─────────────────────────────────────── */
export function AICompanionDrawer() {
  const { currentUser } = useAuth();
  const data = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const feedRef = useRef(null);
  const recognitionRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeAgent, setActiveAgent] = useState(null);
  const [listening, setListening] = useState(false);
  const [showMemoryDeck, setShowMemoryDeck] = useState(false);
  const [undoAction, setUndoAction] = useState(null);

  // Global event listener to toggle drawer and dispatch commands
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleDispatch = (e) => {
      setIsOpen(true);
      if (e.detail) {
        // slight delay to ensure drawer is open and ready
        setTimeout(() => sendMessage(e.detail.message || '', e.detail.featureId || null), 100);
      }
    };
    window.addEventListener('toggle-ai-drawer', handleToggle);
    window.addEventListener('dispatch-ai-command', handleDispatch);
    return () => {
      window.removeEventListener('toggle-ai-drawer', handleToggle);
      window.removeEventListener('dispatch-ai-command', handleDispatch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Context-aware suggestions based on current route
  const suggestions = useMemo(() => {
    const path = location.pathname;
    const base = [
      { id: 'run_bakery', icon: Brain, label: 'Run My Bakery' },
      { id: 'coach_me', icon: TrendingUp, label: 'Coach Me' },
    ];
    if (path.includes('orders')) return [...base, { id: 'create_order', label: 'Create Order', intent: true }, { id: 'unpaid_orders', label: 'Unpaid Orders' }];
    if (path.includes('inventory')) return [...base, { id: 'inventory_check', label: 'Stock Report' }, { id: 'add_inventory', label: 'Add Item', intent: true }];
    if (path.includes('expenses')) return [...base, { id: 'add_expense', label: 'Log Expense', intent: true }, { id: 'coach_me', label: 'Business Health' }];
    if (path.includes('recipes')) return [...base, { id: 'generate_recipe', label: 'Generate Recipe', intent: true }];
    if (path.includes('customers')) return [...base, { id: 'add_customer', label: 'Add Customer', intent: true }, { id: 'marketing_campaign', label: 'Marketing Ideas' }];
    return [...base, { id: 'create_order', label: 'Create Order', intent: true }, { id: 'add_expense', label: 'Log Expense', intent: true }];
  }, [location.pathname]);

  const dataContext = useMemo(() => ({
    orders: trimContext(data.orders, 50).map((o) => ({
      id: o.id, orderId: o.orderId, customerName: o.customerName || o.customer?.name || o.customer,
      product: o.product, total: o.total, status: o.status, paymentStatus: o.paymentStatus, 
      deliveryDate: o.deliveryDate, createdAt: o.createdAt
    })),
    customers: trimContext(data.customers, 30).map((c) => ({ id: c.id, name: c.name, phone: c.phone, totalOrders: c.totalOrders })),
    inventory: trimContext(data.inventory, 50).map((i) => ({ id: i.id, item: i.item, stock: i.stock, unit: i.unit, minStock: i.minStock })),
    expenses: trimContext(data.expenses, 30).map((e) => ({ id: e.id, title: e.title, amount: e.amount, category: e.category })),
    products: trimContext(data.products, 30).map((p) => ({ id: p.id, name: p.name, price: p.price })),
    memories: trimContext(data.memories || []).map((m) => ({ id: m.id, note: m.note })),
  }), [data]);

  useEffect(() => {
    if (isOpen) feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingAction, loading, isOpen]);

  useEffect(() => {
    if (!SpeechRecognition) return undefined;
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || '';
      if (transcript) sendMessage(transcript);
    };
    recognitionRef.current = rec;
    return () => rec.abort?.();
  }, []);

  const append = (msg) => setMessages((prev) => [...prev, { time: nowTime(), ...msg }]);

  const sendMessage = async (textOverride, featureId) => {
    const text = String(textOverride ?? input).trim();
    if ((!text && !featureId) || loading) return;
    setInput('');

    if (text) append({ role: 'user', type: 'text', text });
    if (featureId && !text) append({ role: 'user', type: 'text', text: `🚀 Trigger: ${suggestions.find((s) => s.id === featureId)?.label || featureId}` });

    setLoading(true);
    try {
      const result = await api.chatAI({
        message: text || undefined,
        feature: featureId || 'companion',
        context: dataContext,
        history: chatHistory.slice(-6),
      });

      setChatHistory((prev) => [...prev, ...(text ? [{ role: 'user', content: text }] : []), { role: 'ai', content: result.response || '' }].slice(-12));
      if (result.agent) setActiveAgent(result.agent);

      if (result.action && (result.action.confirmRequired || result.action.confirmationRequired)) {
        setPendingAction(result.action);
        append({ role: 'assistant', type: 'text', text: result.response, agent: result.agent, thoughtProcess: result.thoughtProcess });
      } else if (result.state === 'gathering' && (Object.keys(result.extracted || {}).length > 0 || (result.missing || []).length > 0)) {
        append({ 
          role: 'assistant', type: 'gathering', text: result.response, 
          extracted: result.extracted || {}, missing: result.missing || [], 
          agent: result.agent, thoughtProcess: result.thoughtProcess 
        });
      } else if (result.insights) {
        const intent = result.insights.intent;
        if (intent === 'navigate') {
          navigate(result.insights.to);
          append({ role: 'assistant', type: 'text', text: `Taking you to ${result.insights.to}... 🧭`, agent: result.agent });
        } else if (intent === 'change_theme') {
          if (result.insights.theme === 'dark') document.body.classList.add('dark-theme');
          else document.body.classList.remove('dark-theme');
          append({ role: 'assistant', type: 'text', text: `Switched to ${result.insights.theme} mode! 🌗`, agent: result.agent });
        } else if (intent === 'open_modal') {
          window.dispatchEvent(new CustomEvent(`open-${result.insights.modal}-modal`));
          append({ role: 'assistant', type: 'text', text: `Opening the form for you! 🎛️`, agent: result.agent });
        } else if (intent === 'export_data') {
          let exportData = [];
          if (result.insights.target === 'orders') exportData = dataContext.orders;
          else if (result.insights.target === 'expenses') exportData = dataContext.expenses;
          else if (result.insights.target === 'customers') exportData = dataContext.customers;
          
          if (exportData && exportData.length > 0) {
            const keys = Object.keys(exportData[0]).join(',');
            const rows = exportData.map(r => Object.values(r).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\\n');
            const blob = new Blob([keys + '\\n' + rows], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${result.insights.target}_export.csv`;
            a.click();
            append({ role: 'assistant', type: 'text', text: `Exported ${result.insights.target} successfully! 📥`, agent: result.agent });
          } else {
            append({ role: 'assistant', type: 'text', text: `No data found to export for ${result.insights.target}.`, agent: result.agent });
          }
        } else {
          append({ role: 'assistant', type: 'insight', text: result.response, insights: result.insights, agent: result.agent, thoughtProcess: result.thoughtProcess, buttons: result.buttons });
        }
      } else {
        append({ role: 'assistant', type: 'text', text: result.response, agent: result.agent, thoughtProcess: result.thoughtProcess, buttons: result.buttons });
      }
    } catch (err) {
      append({ role: 'assistant', type: 'text', text: '😔 AI is temporarily unavailable.', agent: 'System' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (editedData) => {
    if (!pendingAction || loading) return;
    setLoading(true);
    try {
      const type = pendingAction.type;
      const intent = ACTION_INTENT_MAP[type];
      const mapped = mapActionData(type, editedData || pendingAction.data);
      
      if (type === 'send_whatsapp_invoice') {
         const orderId = mapped.orderId;
         const order = dataContext.orders.find(o => o.id === orderId || o.orderId === orderId);
         if (!order) throw new Error("Order not found in memory.");
         const phone = order.phone || dataContext.customers?.find(c => c.name === order.customerName)?.phone;
         if (!phone) throw new Error("No phone number found for this customer.");
         
         const text = `*INVOICE - ${order.orderId || order.id}*\n*Item:* ${order.product}\n*Total:* ₹${order.total}\n*Status:* ${order.paymentStatus}\n\nThank you for choosing Cream & Crust!`;
         window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
         
         setPendingAction(null);
         append({ role: 'assistant', type: 'text', text: 'Opening WhatsApp with the invoice now!', agent: activeAgent });
         setLoading(false);
         return;
      }

      // Setup Undo context
      let undoIntent = null;
      if (type === 'create_order') undoIntent = INTENTS.DELETE_ORDER;
      if (type === 'add_expense') undoIntent = INTENTS.DELETE_EXPENSE;
      if (type === 'add_inventory') undoIntent = INTENTS.DELETE_INVENTORY;
      
      const resId = await executeServiceAction({ intent, data: mapped }, dataContext);
      
      if (undoIntent && resId) {
        setUndoAction({ intent: undoIntent, data: { orderId: resId, expenseId: resId, itemId: resId }, label: SUCCESS_MESSAGES[type] });
        setTimeout(() => setUndoAction(null), 10000); // 10s buffer
      }

      setPendingAction(null);
      try { window.dispatchEvent(new CustomEvent('trigger-confetti')); } catch (_) {}
      append({ role: 'assistant', type: 'text', text: SUCCESS_MESSAGES[type] || '✅ Done!', agent: activeAgent });
    } catch (err) {
      append({ role: 'assistant', type: 'text', text: `❌ ${err.message}`, agent: 'System' });
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!SpeechRecognition) return append({ role: 'assistant', type: 'text', text: 'Voice not supported.' });
    listening ? recognitionRef.current?.stop?.() : recognitionRef.current?.start?.();
  };

  if (!currentUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ai-drawer-overlay" onClick={() => setIsOpen(false)}>
          <motion.div
            className="ai-drawer"
            initial={{ x: '100%', y: window.innerWidth <= 700 ? '100%' : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: window.innerWidth <= 700 ? 0 : '100%', y: window.innerWidth <= 700 ? '100%' : 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-drawer-header">
              <div className="ai-header-left">
                <span className="ai-kicker"><Sparkles size={14} /> Intelligence</span>
                <h2>Cream AI</h2>
              </div>
              <div className="ai-header-actions">
                <button className="ai-icon-btn" onClick={() => setShowMemoryDeck(true)} title="Memory Deck"><Brain size={16} /></button>
                <button className="ai-icon-btn" onClick={() => { setMessages([]); setChatHistory([]); setPendingAction(null); }} title="New Chat"><RefreshCw size={16} /></button>
                <button className="ai-icon-btn" onClick={() => setIsOpen(false)} title="Close"><X size={20} /></button>
              </div>
            </div>

            <div className="ai-suggestions-bar">
              {suggestions.map((s) => (
                <button key={s.id} className="ai-suggestion-btn" onClick={() => sendMessage(s.intent ? `I want to ${s.label.toLowerCase()}` : '', s.intent ? null : s.id)} disabled={loading}>
                  {s.intent ? <PlusCircle size={14} /> : s.icon && <s.icon size={14} />} {s.label}
                </button>
              ))}
            </div>

            <div className="ai-feed" ref={feedRef}>
              {messages.length === 0 && (
                <div className="ai-welcome">
                  <div className="ai-welcome-emoji">🧠</div>
                  <h3>How can I help?</h3>
                  <p>I can create orders, log expenses, update inventory, or give you business insights based on the page you're on.</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div className={`ai-message ${msg.role}`} key={`${msg.time}_${i}`}>
                  {msg.thoughtProcess && <RealThinkingProcess steps={msg.thoughtProcess} />}
                  <div className="ai-message-body">
                    {msg.text && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>}
                    {msg.type === 'insight' && <InsightRenderer insights={msg.insights} />}
                    {msg.type === 'gathering' && (
                      <GatheringForm 
                        extracted={msg.extracted} 
                        missing={msg.missing} 
                        disabled={i !== messages.length - 1} 
                        onSubmit={(data) => sendMessage(`Here are the filled details: ${JSON.stringify(data)}`)} 
                      />
                    )}
                    {msg.buttons?.length > 0 && (
                      <ActionButtonBar
                        buttons={msg.buttons}
                        onNavigate={(path) => { navigate(path); setIsOpen(false); }}
                        onDispatch={(val) => sendMessage(val)}
                      />
                    )}
                  </div>
                  <div className="ai-message-meta">
                    {msg.agent && <span className="ai-agent-badge">{msg.agent}</span>}
                    <span>{msg.time}</span>
                  </div>
                </div>
              ))}

              {pendingAction && (
                <div className="ai-message assistant">
                  <ConfirmationCard action={pendingAction} loading={loading} onEdit={(d) => setPendingAction((p) => ({ ...p, data: d }))} onConfirm={handleConfirm} onCancel={() => setPendingAction(null)} />
                </div>
              )}

              {loading && <TypingIndicator />}
            </div>

            <form className="ai-compose" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
              <button type="button" className={`ai-voice-btn ${listening ? 'listening' : ''}`} onClick={toggleVoice}>
                {listening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a command..." autoComplete="off" />
              <button type="submit" className="ai-send-btn" disabled={!input.trim() || loading}>
                <Send size={18} />
              </button>
            </form>

            {/* Action Recovery Buffer */}
            <AnimatePresence>
              {undoAction && (
                <motion.div className="ai-undo-toast" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
                  <span className="ai-undo-text">{undoAction.label}</span>
                  <button className="ai-undo-btn" onClick={async () => {
                    setUndoAction(null);
                    try {
                      await executeServiceAction({ intent: undoAction.intent, data: undoAction.data });
                      append({ role: 'assistant', type: 'text', text: 'Action successfully undone. ↩️', agent: 'System' });
                    } catch(e) {}
                  }}>Undo</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Memory Deck */}
            <AnimatePresence>
              {showMemoryDeck && (
                <MemoryDeck 
                  memories={dataContext.memories} 
                  onClose={() => setShowMemoryDeck(false)}
                  onDelete={async (id) => {
                    await executeServiceAction({ intent: INTENTS.DELETE_MEMORY, data: { memoryId: id } });
                  }}
                />
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Exported AI Manager ────────────────────────────────────────── */
export default function AICompanionManager() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  return (
    <>
      <AIFloatingSummoner />
      <AICompanionDrawer />
    </>
  );
}

function AIFloatingSummoner() {
  return (
    <button type="button" className="ai-floating-bubble" aria-label="Open Cream AI"
      onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-drawer'))}
    >
      <Sparkles size={24} />
    </button>
  );
}
