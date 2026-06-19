/**
 * OrderForm — Premium 3-step order creation form for Cream & Crust.
 *
 * Step 1: Customer (name, phone, occasion, delivery type, address)
 * Step 2: Order Items + Delivery (items array, date, time, urgency, instructions)
 * Step 3: Payment & Review (pricing breakdown, payment method, summary)
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  MapPin,
  Plus,
  Truck,
  Store,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Calendar,
  Clock,
  Check,
  Camera,
  X,
} from 'lucide-react';


const OCCASIONS = ['Birthday', 'Wedding', 'Anniversary', 'Baby Shower', 'Festival', 'Custom'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'];

const DEFAULT_ITEM = {
  name: '',
  category: '',
  size: '1kg',
  quantity: '1',
  unitPrice: '',
  flavor: '',
  eggless: false,
  notes: '',
  recipeId: '',
};
export default function OrderForm({
  form,
  setForm,
  onSubmit,
  editingOrderId,
  savedCategories,
  setSavedCategories,
  currentUser,
  showToast,
  hasOrders,
  recipeList = [],
}) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [expandedItems, setExpandedItems] = useState([0]);
  const [referenceImage, setReferenceImage] = useState(null);
  const photoInputRef = useRef(null);

  // Auto-add one empty item if items array is empty on mount
  useEffect(() => {
    if (!form.items || form.items.length === 0) {
      setForm((prev) => ({ ...prev, items: [{ ...DEFAULT_ITEM }] }));
      setExpandedItems([0]);
    }
  }, []);


  // Pricing calculations
  const pricing = useMemo(() => {
    const items = form.items || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);
    const discountAmt =
      form.discountType === 'percent'
        ? Math.round((subtotal * (Number(form.discount) || 0)) / 100)
        : Number(form.discount) || 0;
    const grandTotal = Math.max(0, subtotal - discountAmt);
    const advance = Number(form.advance) || 0;
    const balanceDue = Math.max(0, grandTotal - advance);
    const paymentStatus =
      advance >= grandTotal && grandTotal > 0 ? 'Paid' : advance > 0 ? 'Partially Paid' : 'Pending';
    return { subtotal, discountAmt, grandTotal, advance, balanceDue, paymentStatus };
  }, [form.items, form.discount, form.discountType, form.advance]);

  // Sync form.total with calculated grandTotal
  useEffect(() => {
    const gt = String(pricing.grandTotal || '');
    if (form.total !== gt) {
      setForm((prev) => ({ ...prev, total: gt }));
    }
  }, [pricing.grandTotal]);

  // Sync form.product, form.size, and form.recipeId with first item (backward compat)
  useEffect(() => {
    const items = form.items || [];
    if (items.length > 0) {
      const first = items[0];
      const updates = {};
      if (first.name && form.product !== first.name) updates.product = first.name;
      if (first.size && form.size !== first.size) updates.size = first.size;
      if (first.recipeId !== undefined && form.recipeId !== first.recipeId)
        updates.recipeId = first.recipeId || '';
      if (Object.keys(updates).length > 0) {
        setForm((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [form.items]);

  // Item summary for badge
  const itemSummary = useMemo(() => {
    const items = form.items || [];
    const count = items.filter((i) => i.name).length;
    return { count, total: pricing.subtotal };
  }, [form.items, pricing.subtotal]);

  // Rush order detection
  const isRushOrder = useMemo(() => {
    if (!form.date || !form.time) return false;
    const deliveryDate = new Date(`${form.date}T${form.time}`);
    const now = new Date();
    return deliveryDate - now < 24 * 60 * 60 * 1000 && deliveryDate > now;
  }, [form.date, form.time]);

  // Phone auto-format
  const handlePhoneChange = useCallback(
    (val) => {
      const digits = val.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, phone: digits }));
    },
    [setForm]
  );

  // Validation
  const validateStep = (s) => {
    if (s === 1) {
      if (!form.customer.trim()) {
        showToast('Customer name is required', 'error');
        return false;
      }
      if (!form.phone || form.phone.length !== 10) {
        showToast('Valid 10-digit phone required', 'error');
        return false;
      }
      if (!form.date) {
        showToast('Delivery date is required', 'error');
        return false;
      }
      if (!form.time) {
        showToast('Delivery time is required', 'error');
        return false;
      }
      return true;
    }
    if (s === 2) {
      const items = form.items || [];
      const valid = items.some((i) => i.name.trim() && Number(i.unitPrice) > 0);
      if (!valid) {
        showToast('Add at least one item with name and price', 'error');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) {
      setDirection(1);
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  // Item management
  const updateItem = (idx, field, value) => {
    const items = [...(form.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    setForm((prev) => ({ ...prev, items }));
  };

  const addItem = () => {
    const items = [...(form.items || []), { ...DEFAULT_ITEM }];
    setForm((prev) => ({ ...prev, items }));
    setExpandedItems((prev) => [...prev, items.length - 1]);
  };

  const removeItem = (idx) => {
    const items = (form.items || []).filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, items: items.length ? items : [{ ...DEFAULT_ITEM }] }));
    setExpandedItems((prev) => prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)));
  };

  const duplicateItem = (idx) => {
    const items = [...(form.items || [])];
    items.splice(idx + 1, 0, { ...items[idx] });
    setForm((prev) => ({ ...prev, items }));
    setExpandedItems((prev) => [...prev, idx + 1]);
  };

  const toggleExpand = (idx) => {
    setExpandedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  // Step labels for progress indicator
  const STEP_LABELS = ['Customer Info', 'Order Items', 'Review'];

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* Progress bar — 3 steps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 14,
          padding: '0 4px',
        }}
      >
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background:
                    step >= s ? 'linear-gradient(135deg, #B5606A, #D4A050)' : 'rgba(74,59,50,0.08)',
                  color: step >= s ? '#fff' : 'var(--text3, #BFAFA0)',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: step >= s ? '0 3px 10px rgba(181,96,106,0.25)' : 'none',
                }}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: step >= s ? 'var(--accent, #B5606A)' : 'var(--text3, #BFAFA0)',
                  marginTop: 3,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                }}
              >
                {STEP_LABELS[s - 1]}
              </span>
            </div>
            {s < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  margin: '0 6px',
                  marginBottom: 14,
                  background:
                    step > s ? 'linear-gradient(90deg, #B5606A, #D4A050)' : 'rgba(74,59,50,0.08)',
                  transition: 'all 0.3s ease',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        {/* ═══ STEP 1: Customer ═══ */}
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Let's get to know your customer</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: 0 }}>Tell us who this delicious order is for</p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <FormField icon={<User size={14} />} label="CUSTOMER NAME" required>
                <input
                  name="cc_customer_name_entry"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  placeholder="Enter customer name"
                  style={inputStyle}
                />
              </FormField>
              <FormField icon={<Phone size={14} />} label="PHONE NUMBER" required>
                <input
                  name="cc_customer_phone_entry"
                  autoComplete="new-password"
                  value={form.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Enter 10 digit number"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  style={inputStyle}
                />
              </FormField>
            </div>

            <SectionHeader title="Occasion" />
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
              {OCCASIONS.map((occ) => (
                <Chip
                  key={occ}
                  active={form.occasion === occ}
                  onClick={() => setForm({ ...form, occasion: form.occasion === occ ? '' : occ })}
                  label={occ}
                />
              ))}
            </div>

            <SectionHeader title="Delivery Type" />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <ToggleChip
                active={form.deliveryType === 'delivery'}
                onClick={() => setForm({ ...form, deliveryType: 'delivery' })}
                icon={<Truck size={14} />}
                label="Delivery"
              />
              <ToggleChip
                active={form.deliveryType === 'pickup'}
                onClick={() => setForm({ ...form, deliveryType: 'pickup' })}
                icon={<Store size={14} />}
                label="Pickup"
              />
            </div>

            {form.deliveryType === 'delivery' && (
              <>
                <FormField icon={<MapPin size={14} />} label="Address">
                  <input
                    value={form.deliveryAddress}
                    onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                    placeholder="Full delivery address"
                    style={inputStyle}
                  />
                </FormField>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <FormField label="Landmark">
                    <input
                      value={form.landmark}
                      onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                      placeholder="Near..."
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="City">
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City"
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Pincode">
                    <input
                      value={form.pincode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                        })
                      }
                      placeholder="000000"
                      style={inputStyle}
                    />
                  </FormField>
                </div>
              </>
            )}

            {/* Delivery Schedule — moved to step 1 */}
            <div
              style={{
                borderTop: '1px solid rgba(74,59,50,0.07)',
                paddingTop: 16,
              }}
            >
              <SectionHeader title="WHEN'S THIS SWEET TREAT DUE?" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <FormField icon={<Calendar size={14} />} label="Date" required>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={inputStyle}
                  />
                </FormField>
                <FormField icon={<Clock size={14} />} label="Time" required>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              {isRushOrder && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    marginBottom: 12,
                    background:
                      'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,107,53,0.03))',
                    border: '1px solid rgba(255,107,53,0.2)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#E85D2A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  🔥 Rush Order — Less than 24 hours away
                </div>
              )}

              {form.deliveryType === 'delivery' && (
                <FormField label="Delivery Instructions (optional)">
                  <textarea
                    value={form.mapsLink || ''}
                    onChange={(e) => setForm({ ...form, mapsLink: e.target.value })}
                    placeholder="Ring the bell twice, leave at gate, etc."
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 52 }}
                  />
                </FormField>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 2: Items & Delivery ═══ */}
        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {/* Order Items header with count badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>What amazing treats are you baking?</h2>
              </div>
              {itemSummary.count > 0 && (
                <div
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    background:
                      'linear-gradient(135deg, rgba(181,96,106,0.1), rgba(212,160,80,0.1))',
                    border: '1px solid rgba(181,96,106,0.15)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: 'var(--accent, #B5606A)',
                  }}
                >
                  {itemSummary.count} item{itemSummary.count > 1 ? 's' : ''} · ₹
                  {itemSummary.total.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            {/* Inventory deduction info banner */}
            {recipeList.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.15)',
                  marginBottom: 10,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#15803D',
                }}
              >
                🔗 Link a recipe in each item to auto-deduct ingredients when order moves to{' '}
                <strong>Confirmed</strong>
              </div>
            )}

            {(form.items || []).map((item, idx) => (
              <ItemCard
                key={idx}
                item={item}
                idx={idx}
                expanded={expandedItems.includes(idx)}
                onToggle={() => toggleExpand(idx)}
                onUpdate={(field, val) => updateItem(idx, field, val)}
                onRemove={() => removeItem(idx)}
                onDuplicate={() => duplicateItem(idx)}
                canRemove={(form.items || []).length > 1}
                recipeList={recipeList}
              />
            ))}

            <motion.button
              type="button"
              onClick={addItem}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: '2px dashed rgba(181,96,106,0.25)',
                background: 'rgba(181,96,106,0.03)',
                color: 'var(--accent, #B5606A)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                marginTop: 4,
                marginBottom: 20,
              }}
            >
              <Plus size={15} /> Add Another Item
            </motion.button>

            {/* Reference Photo and Notes — moved to step 2 */}
            <div style={{ marginTop: 16 }}>
              <FormField label="Reference Photo (optional)">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setReferenceImage(url);
                      setForm((prev) => ({ ...prev, referenceFile: file }));
                    }
                  }}
                  style={{ display: 'none' }}
                />
                {referenceImage ? (
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                    <img
                      src={referenceImage}
                      alt="Reference"
                      style={{
                        width: '100%',
                        maxHeight: 140,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1px solid rgba(74,59,50,0.08)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceImage(null);
                        setForm((prev) => ({ ...prev, referenceFile: null }));
                      }}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: 12,
                      border: '2px dashed rgba(181,96,106,0.2)',
                      background: 'rgba(181,96,106,0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: 'var(--accent, #B5606A)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      marginBottom: 12,
                    }}
                  >
                    <Camera size={16} /> Upload cake design / reference
                  </button>
                )}
              </FormField>

              <FormField label="SPECIAL NOTES (OPTIONAL)">
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions or preferences?"
                  style={inputStyle}
                />
              </FormField>
            </div>

            <div style={{ borderTop: '1px solid rgba(74,59,50,0.07)', paddingTop: 16, marginTop: 16 }}>
              <SectionHeader title="Pricing" />
              <div
                style={{
                  padding: '16px',
                  borderRadius: 16,
                  marginBottom: 14,
                  background: 'var(--card, #ffffff)',
                  border: '1px solid rgba(74,59,50,0.06)',
                  boxShadow: '0 4px 12px rgba(74,59,50,0.06)',
                }}
              >
                <PricingRow label="Subtotal" value={pricing.subtotal} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #8C7A6B)', flex: 1 }}>
                    Discount
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      placeholder="0"
                      style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '6px 8px', fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(74,59,50,0.1)' }}>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, discountType: 'flat' })}
                        style={{
                          padding: '5px 10px',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          background: form.discountType === 'flat' ? 'var(--accent, #B5606A)' : 'transparent',
                          color: form.discountType === 'flat' ? '#fff' : 'var(--text2, #8C7A6B)',
                        }}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, discountType: 'percent' })}
                        style={{
                          padding: '5px 10px',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          background: form.discountType === 'percent' ? 'var(--accent, #B5606A)' : 'transparent',
                          color: form.discountType === 'percent' ? '#fff' : 'var(--text2, #8C7A6B)',
                        }}
                      >
                        %
                      </button>
                    </div>
                  </div>
                </div>
                {pricing.discountAmt > 0 && <PricingRow label="Discount Amount" value={pricing.discountAmt} negative />}
                <div style={{ height: 1, background: 'rgba(74,59,50,0.08)', margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text, #4A3B32)' }}>Grand Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent, #B5606A)' }}>₹{pricing.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #8C7A6B)', flex: 1 }}>Advance Paid</span>
                  <input
                    type="number"
                    value={form.advance}
                    onChange={(e) => setForm({ ...form, advance: e.target.value })}
                    placeholder="0"
                    style={{ ...inputStyle, width: 90, textAlign: 'center', padding: '6px 10px', fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#C4574A' }}>Balance Due</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#C4574A' }}>₹{pricing.balanceDue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <SectionHeader title="Payment Method" />
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
                {PAYMENT_METHODS.map((m) => (
                  <Chip
                    key={m}
                    active={form.paymentMethod === m}
                    onClick={() => setForm({ ...form, paymentMethod: m })}
                    label={m}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 3: Review ═══ */}
        {step === 3 && (
          <motion.div
            key="step3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>✨ Ready to bake magic?</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text2)', margin: 0 }}>Let's review your order details</p>
            </div>
            
            {/* Customer & Delivery Summary */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'var(--card, #ffffff)',
                border: '1px solid rgba(74,59,50,0.06)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.04)',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(181,96,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent, #B5606A)' }}>
                  <User size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #4A3B32)' }}>{form.customer}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2, #8C7A6B)', marginTop: 2 }}>{form.phone}</div>
                </div>
              </div>
              
              <div style={{ height: 1, background: 'rgba(74,59,50,0.05)', margin: '10px 0' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,160,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4A050' }}>
                  {form.deliveryType === 'pickup' ? <Store size={16} /> : <Truck size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #4A3B32)' }}>
                    {form.deliveryType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2, #8C7A6B)', marginTop: 2 }}>
                    📅 {form.date} at {form.time}
                  </div>
                  {form.deliveryType === 'delivery' && form.deliveryAddress && (
                    <div style={{ fontSize: 11.5, color: 'var(--text2, #8C7A6B)', marginTop: 4, lineHeight: 1.4 }}>
                      📍 {form.deliveryAddress}
                      {form.landmark && `, near ${form.landmark}`}
                      {form.city && `, ${form.city}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'var(--card, #ffffff)',
                border: '1px solid rgba(74,59,50,0.06)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.04)',
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #4A3B32)', marginBottom: 8 }}>Order Items</div>
              {(form.items || []).filter(i => i.name).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--text2, #8C7A6B)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text, #4A3B32)' }}>{item.quantity}×</span> {item.name} {item.size && `(${item.size})`}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text, #4A3B32)' }}>
                    ₹{((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Summary */}
            <div
              style={{
                padding: '14px',
                borderRadius: 14,
                background: 'var(--card, #ffffff)',
                border: '1px solid rgba(74,59,50,0.06)',
                boxShadow: '0 4px 12px rgba(74,59,50,0.04)',
                marginBottom: 12,
              }}
            >
              <PricingRow label="Subtotal" value={pricing.subtotal} />
              {pricing.discountAmt > 0 && <PricingRow label="Discount" value={pricing.discountAmt} negative />}
              <div style={{ height: 1, background: 'rgba(74,59,50,0.05)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #4A3B32)' }}>Grand Total</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent, #B5606A)' }}>₹{pricing.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 12, color: 'var(--text2, #8C7A6B)' }}>
                <span>Advance Paid ({form.paymentMethod || 'Cash'})</span>
                <span style={{ fontWeight: 600, color: 'var(--text, #4A3B32)' }}>₹{pricing.advance.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#C4574A', fontWeight: 700 }}>
                <span>Balance Due</span>
                <span>₹{pricing.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Notes */}
            {form.notes && (
               <div
               style={{
                 padding: '12px',
                 borderRadius: 12,
                 background: 'rgba(212,160,80,0.05)',
                 border: '1px solid rgba(212,160,80,0.1)',
                 fontSize: 12,
                 color: 'var(--text2, #8C7A6B)',
               }}
             >
               <span style={{ fontWeight: 700, color: '#D4A050' }}>Notes:</span> {form.notes}
             </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <div
        style={{
          padding: '14px 0 env(safe-area-inset-bottom, 8px)',
          background: 'var(--bg, #FAF7F5)',
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && (
            <motion.button
              type="button"
              onClick={goBack}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 14,
                border: '1.5px solid rgba(74,59,50,0.1)',
                background: 'var(--card, #ffffff)',
                color: 'var(--text2, #8C7A6B)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <ChevronLeft size={16} /> Back
            </motion.button>
          )}

          {step < 3 ? (
            <motion.button
              type="button"
              onClick={goNext}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 2,
                height: 50,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #B5606A 0%, #D4A050 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                boxShadow: '0 6px 16px rgba(181,96,106,0.25)',
              }}
            >
              Next <ChevronRight size={16} />
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 2,
                height: 50,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #B5606A 0%, #D4A050 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                boxShadow: '0 8px 20px rgba(181,96,106,0.3)',
              }}
            >
              {editingOrderId ? '✓ Update Order' : '✓ Save Order'}
            </motion.button>
          )}
        </div>
      </div>
    </form>
  );
}
// ─── Shared Styles ──────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  fontSize: 13,
  fontWeight: 500,
  padding: '10px 14px',
  borderRadius: 12,
  border: '1.5px solid rgba(74,59,50,0.08)',
  background: 'var(--card, #ffffff)',
  color: 'var(--text, #4A3B32)',
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

// ─── Sub-components ──────────────────────────────────────────────

function ItemCard({
  item,
  idx,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
  savedCategories,
  recipeList = [],
}) {
  const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

  return (
    <motion.div
      layout
      style={{
        borderRadius: 16,
        marginBottom: 10,
        border: '1px solid rgba(74,59,50,0.06)',
        background: 'var(--card, #ffffff)',
        boxShadow: '0 4px 12px rgba(74,59,50,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Header - always visible */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px',
          cursor: 'pointer',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(181,96,106,0.1), rgba(212,160,80,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--accent, #B5606A)',
          }}
        >
          {idx + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #4A3B32)' }}>
            {item.name || 'New Item'}
          </div>
          {itemTotal > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text2, #8C7A6B)', marginTop: 1 }}>
              {item.quantity || 1} × ₹{Number(item.unitPrice).toLocaleString('en-IN')} = ₹
              {itemTotal.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: '1px solid rgba(74,59,50,0.08)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text3, #BFAFA0)',
            }}
          >
            <Copy size={12} />
          </motion.button>
          {canRemove && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid rgba(196,87,74,0.15)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C4574A',
              }}
            >
              <Trash2 size={12} />
            </motion.button>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} color="var(--text3, #BFAFA0)" />
        ) : (
          <ChevronDown size={16} color="var(--text3, #BFAFA0)" />
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px' }}>
              {/* Product Name */}
              <FormField label="PRODUCT NAME" required>
                <input
                  value={item.name}
                  onChange={(e) => onUpdate('name', e.target.value)}
                  style={inputStyle}
                />
              </FormField>

              {/* Category and Unit */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <FormField label="CATEGORY">
                  <input
                    value={item.category || ''}
                    onChange={(e) => onUpdate('category', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="UNIT">
                  <input
                    value={item.size || ''}
                    onChange={(e) => onUpdate('size', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              {/* Quantity + Unit Price */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <FormField label="QUANTITY">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdate('quantity', e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center', fontWeight: 700 }}
                  />
                </FormField>
                <FormField label="PRICE (₹)" required>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => onUpdate('unitPrice', e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center', fontWeight: 700 }}
                  />
                </FormField>
              </div>



              {/* Link Recipe (for auto inventory deduction) */}
              {recipeList.length > 0 && (
                <FormField label="LINK RECIPE">
                  <select
                    value={item.recipeId || ''}
                    onChange={(e) => onUpdate('recipeId', e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  >
                    <option value="">No recipe linked</option>
                    {recipeList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name || r.title || 'Untitled Recipe'}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              {/* Item Notes */}
              <FormField label="ITEM NOTES (OPTIONAL)">
                <input
                  value={item.notes}
                  onChange={(e) => onUpdate('notes', e.target.value)}
                  style={inputStyle}
                />
              </FormField>

              {/* Live item total */}
              {itemTotal > 0 && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background:
                      'linear-gradient(135deg, rgba(181,96,106,0.06), rgba(212,160,80,0.06))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2, #8C7A6B)' }}>
                    Item Total
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent, #B5606A)' }}>
                    ₹{itemTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
function SectionHeader({ title }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: 'var(--text, #4A3B32)',
        marginBottom: 6,
        marginTop: 4,
        letterSpacing: '-0.01em',
      }}
    >
      {title}
    </div>
  );
}

function FormField({ icon, label, required, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          {icon && <span style={{ color: 'var(--accent, #B5606A)', opacity: 0.7 }}>{icon}</span>}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2, #8C7A6B)' }}>
            {label} {required && <span style={{ color: '#C4574A' }}>*</span>}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

function Chip({ active, onClick, label, small }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      style={{
        padding: small ? '5px 10px' : '7px 13px',
        borderRadius: small ? 8 : 10,
        border: active ? '2px solid var(--accent, #B5606A)' : '1.5px solid rgba(74,59,50,0.08)',
        background: active ? 'rgba(181,96,106,0.08)' : 'transparent',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: small ? 11.5 : 12.5,
        fontWeight: 700,
        color: active ? 'var(--accent, #B5606A)' : 'var(--text2, #8C7A6B)',
        transition: 'all 0.18s',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </motion.button>
  );
}

function ToggleChip({ active, onClick, icon, label }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      style={{
        flex: 1,
        padding: '11px 14px',
        borderRadius: 12,
        border: active ? '2px solid var(--accent, #B5606A)' : '1.5px solid rgba(74,59,50,0.08)',
        background: active ? 'rgba(181,96,106,0.06)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontSize: 13,
        fontWeight: 700,
        color: active ? 'var(--accent, #B5606A)' : 'var(--text2, #8C7A6B)',
        transition: 'all 0.18s',
        fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </motion.button>
  );
}

function PricingRow({ label, value, negative }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #8C7A6B)' }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: negative ? '#C4574A' : 'var(--text, #4A3B32)',
        }}
      >
        {negative ? '−' : ''}₹{(value || 0).toLocaleString('en-IN')}
      </span>
    </div>
  );
}
