import React, { useState } from 'react';
import './InteractiveActionCard.css';

const REQUIRED_FIELDS = {
  create_order: ['customer', 'product', 'size', 'price', 'advance', 'date', 'deliveryType', 'notes'],
  add_inventory: ['item', 'stock', 'unit', 'minStock', 'cost', 'expiryDate'],
  add_expense: ['title', 'amount', 'category', 'vendor', 'date'],
  add_customer: ['name', 'phone', 'address'],
  add_shopping_item: ['item', 'quantity', 'unit', 'notes']
};

const LABELS = {
  customer: 'Customer Name',
  product: 'Product',
  size: 'Size/Variant',
  price: 'Total Price (₹)',
  advance: 'Advance Paid (₹)',
  date: 'Delivery Date',
  deliveryType: 'Delivery Type',
  notes: 'Notes/Message',
  item: 'Item Name',
  stock: 'Stock Amount',
  quantity: 'Quantity',
  unit: 'Unit',
  minStock: 'Minimum Stock Level',
  cost: 'Cost (₹)',
  expiryDate: 'Expiry Date',
  title: 'Expense Title',
  amount: 'Amount (₹)',
  category: 'Category',
  vendor: 'Vendor Name',
  name: 'Customer Name',
  phone: 'Phone Number',
  address: 'Address'
};

const TYPES = {
  price: 'number',
  advance: 'number',
  amount: 'number',
  stock: 'number',
  minStock: 'number',
  cost: 'number',
  quantity: 'number',
  date: 'date',
  expiryDate: 'date',
  phone: 'tel'
};

const OPTIONS = {
  deliveryType: ['pickup', 'delivery'],
  unit: ['kg', 'g', 'pcs', 'ltr', 'ml', 'box'],
  category: ['Raw Materials', 'Packaging', 'Marketing', 'Logistics', 'Other']
};

export default function InteractiveActionCard({ action, onConfirm, executing, error, executed, customers = [], inventory = [], products = [] }) {
  const [formData, setFormData] = useState(action.data || {});

  const handleChange = (key, value) => {
    let updates = { [key]: value };

    // Smart Auto-fill Logic
    if (key === 'product') {
      const matchedProduct = products.find(p => p.name.toLowerCase() === value.toLowerCase());
      if (matchedProduct && !formData.price) {
        updates.price = matchedProduct.price;
      }
    }
    if (key === 'item') {
      const matchedItem = inventory.find(i => i.item.toLowerCase() === value.toLowerCase());
      if (matchedItem && !formData.cost) {
        updates.cost = matchedItem.cost;
        if (!formData.unit) updates.unit = matchedItem.unit;
      }
    }
    if (key === 'customer' || key === 'name') {
      const matchedCust = customers.find(c => c.name.toLowerCase() === value.toLowerCase());
      if (matchedCust) {
        if (!formData.phone && matchedCust.phone) updates.phone = matchedCust.phone;
        if (!formData.address && matchedCust.address) updates.address = matchedCust.address;
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleExecute = () => {
    onConfirm({
      ...action,
      data: formData
    });
  };

  // Determine which fields to show
  const fields = REQUIRED_FIELDS[action.type] || Object.keys(action.data || {});

  // For display summary if already executed
  if (executed) {
    return (
      <div className="ai-premium-executed">
        <div className="ai-premium-executed-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Action Completed
        </div>
        <div>
          {fields.map(key => (
            formData[key] && (
              <div key={key} className="ai-premium-summary-row">
                <span className="ai-premium-summary-label">{LABELS[key] || key}</span>
                <span className="ai-premium-summary-value">{formData[key]}</span>
              </div>
            )
          ))}
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="ai-premium-card">
      <div className="ai-premium-header">
        <div className="ai-premium-header-icon">✨</div>
        <span className="ai-premium-header-title">
          {action.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </span>
      </div>
      
      <div className="ai-premium-form-fields">
        {fields.map(key => {
          const value = formData[key] === null || formData[key] === undefined ? '' : formData[key];
          
          if (OPTIONS[key]) {
             return (
               <div key={key} className="ai-premium-field-group">
                 <label className="ai-premium-label">
                   {LABELS[key] || key}
                 </label>
                 <select
                   className="ai-premium-input"
                   value={value}
                   onChange={(e) => handleChange(key, e.target.value)}
                 >
                   <option value="">Select {LABELS[key]}</option>
                   {OPTIONS[key].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
               </div>
             )
          }

          return (
            <div key={key} className="ai-premium-field-group">
              <label className="ai-premium-label">
                {LABELS[key] || key}
              </label>
              <input
                className="ai-premium-input"
                type={TYPES[key] || 'text'}
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Enter ${LABELS[key] || key.toLowerCase()}...`}
                list={key === 'customer' || key === 'name' ? 'customersList' : key === 'product' ? 'productsList' : key === 'item' ? 'inventoryList' : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Datalists for Smart Autocomplete */}
      <datalist id="customersList">
        {customers.map(c => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="productsList">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      <datalist id="inventoryList">
        {inventory.map(i => <option key={i.id} value={i.item} />)}
      </datalist>

      <button  
        className="ai-premium-btn" 
        onClick={handleExecute}
        disabled={executing}
      >
        {executing ? (
          <>
            <div className="ai-premium-btn-loader" />
            Executing...
          </>
        ) : 'Confirm & Save'}
      </button>
      
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
    </div>
  );
}
