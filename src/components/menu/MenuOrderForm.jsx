/**
 * @file MenuOrderForm.jsx
 *
 * Customer-facing in-website order form. Opened from
 * OrderChannelPicker when the customer chooses "Order via this Website".
 *
 * On submit:
 *   - Writes to `orders` collection so the Orders module sees it
 *     (channel='website' fields, plain customer details so the bakery
 *     can read them without per-uid decryption).
 *   - Writes to `inquiries` (so it also shows in inquiries list).
 *   - Fires a notification so the bakery sees a real-time alert.
 *
 * Auth: the public menu page has already signed the visitor in via
 * Firebase Anonymous auth, so Firestore writes succeed under our
 * channel-tagged rules.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MessageCircle, X, User, Phone, MapPin, Calendar, Package, Map as MapIcon, Loader2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { addInquiryToDB, addNotificationToDB } from '../../services/db';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { trackEvent, getVisitorId, getSessionId, getTrafficSource } from '../../services/menuAnalytics';

const PRIMARY = '#B5606A';
const GOLD = '#D8B97E';
const INK = '#1A1410';
const SOFT = '#F5F1EC';
const BORDER = '#E5E0D8';

function isValidPhone(p) {
  const digits = String(p || '').replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

export default function MenuOrderForm({ open, onClose, business, data, product }) {
  const bakeryName = data?.bakeryName || business?.name || 'this bakery';
  const bakeryUid = business?.id;
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryDate: '',
    productName: product?.name || '',
    quantity: 1,
    notes: '',
    location: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapCenter = form.location || { lat: 28.6139, lng: 77.2090 }; // Default to New Delhi

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setForm(f => ({ ...f, location: { lat, lng } }));
    
    if (window.google) {
      setGeocoding(true);
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setGeocoding(false);
        if (status === 'OK' && results[0]) {
          setForm(f => ({ ...f, address: results[0].formatted_address }));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        productName: product?.name || f.productName || '',
      }));
      setSubmitted(false);
      setErrors({});
      if (business?.id) {
        trackEvent('order_started', business.id, data?.username || 'default', product?.id, { channel: 'website' });
      }
    }
  }, [open, product]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) {
        if (!submitted && business?.id) {
          trackEvent('checkout_abandoned', business.id, data?.username || 'default', product?.id, { channel: 'website', reason: 'escape_key' });
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Please tell us your name';
    if (!isValidPhone(form.phone)) e.phone = 'Enter a valid phone number';
    if (!form.productName.trim()) e.productName = 'What would you like to order?';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (submitting || submitted) return;
    if (!validate()) return;
    if (!bakeryUid) {
      setErrors({ _global: 'This bakery cannot accept website orders right now.' });
      return;
    }
    setSubmitting(true);
    try {
      const qty = Number(form.quantity) || 1;
      const unitPrice = Number(product?.price) || 0;
      const total = unitPrice * qty;

      const summary = [
        `\u{1F6CD}\u{FE0F} New order via website`,
        `Item: ${form.productName}${qty > 1 ? ` x${qty}` : ''}`,
        product?.selectedWeightLabel ? `Weight: ${product.selectedWeightLabel}` : null,
        unitPrice ? `Price: \u20B9${unitPrice}${qty > 1 ? ` x${qty} = \u20B9${total}` : ''}` : null,
        form.deliveryDate ? `Needed by: ${form.deliveryDate}` : null,
        form.address ? `Deliver to: ${form.address}` : null,
        form.location ? `Map: https://maps.google.com/?q=${form.location.lat},${form.location.lng}` : null,
        form.notes ? `Notes: ${form.notes}` : null,
        `Phone: ${form.phone.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');

      // 1. Write directly to the `orders` collection so it appears in
      //    the Orders module. Customer fields are stored as plain
      //    strings (the bakery owns the doc and reads it through
      //    decryptData which is a no-op for non-encrypted strings).
      //    Status starts as 'inquiry' so the bakery sees an
      //    Accept/Reject card on their dashboard before it enters
      //    the production flow.
      await addDoc(collection(db, 'orders'), {
        uid: bakeryUid,
        userId: bakeryUid,
        channel: 'website',
        status: 'inquiry',
        customer: form.name.trim(),
        customerName: form.name.trim(),
        phone: form.phone.trim(),
        product: form.productName.trim(),
        productPrice: unitPrice || null,
        quantity: qty,
        total: total || null,
        totalAmount: total || null,
        selectedWeight: product?.selectedWeight || null,
        selectedWeightLabel: product?.selectedWeightLabel || null,
        deliveryAddress: form.address.trim() || null,
        deliveryDate: form.deliveryDate || null,
        notes: form.notes.trim() || null,
        source: getTrafficSource(),
        orderSource: 'menu',
        bakeryId: bakeryUid,
        menuId: data?.username || 'default',
        productId: product?.id || null,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        amount: total || 0,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      // 2. Also log an inquiry (existing surface) — fire-and-forget.
      addInquiryToDB({
        userId: bakeryUid,
        bakerName: bakeryName,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        deliveryDate: form.deliveryDate || null,
        productName: form.productName.trim(),
        quantity: qty,
        notes: form.notes.trim(),
        productPrice: unitPrice || null,
        channel: 'website',
        note: summary,
      }).catch((e) => console.warn('inquiry log failed:', e?.code || e?.message));

      // 3. Notification ping.
      addNotificationToDB({
        userId: bakeryUid,
        type: 'order',
        title: `\u{1F389} New website order from ${form.name.trim()}`,
        message: `${form.productName.trim()}${product?.selectedWeightLabel ? ` (${product.selectedWeightLabel})` : ''}${qty > 1 ? ` x${qty}` : ''} \u00B7 ${form.phone.trim()}`,
        channel: 'website',
      }).catch((e) => console.warn('notify failed:', e?.code || e?.message));

      if (bakeryUid) {
        trackEvent('order_completed', bakeryUid, data?.username || 'default', product?.id, {
          channel: 'website',
          revenue: total
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Order submit failed:', err);
      setErrors({
        _global:
          err?.code === 'permission-denied'
            ? "Sorry, we couldn't reach this bakery. Please use WhatsApp instead."
            : 'Sorry, something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cc-order-form"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => {
          if (!submitting) {
            if (!submitted && business?.id) {
              trackEvent('checkout_abandoned', business.id, data?.username || 'default', product?.id, { channel: 'website', reason: 'backdrop_click' });
            }
            onClose();
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20, 14, 16, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 16,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Order form"
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 480,
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '20px 20px 24px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
            position: 'relative',
            maxHeight: '92vh',
            overflowY: 'auto',
            color: INK,
            marginBottom: 'max(env(safe-area-inset-bottom), 24px)',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              background: BORDER,
              borderRadius: 99,
              margin: '0 auto 14px',
            }}
          />

          {!submitting && (
            <button
              type="button"
              onClick={() => {
                if (!submitted && business?.id) {
                  trackEvent('checkout_abandoned', business.id, data?.username || 'default', product?.id, { channel: 'website', reason: 'close_button' });
                }
                onClose();
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: SOFT,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: INK,
              }}
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          )}

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 8px 8px' }}>
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, ${GOLD} 100%)`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  margin: '0 auto 16px',
                  boxShadow: `0 10px 30px ${PRIMARY}44`,
                }}
              >
                <Check size={32} strokeWidth={3} />
              </motion.div>
              <h2
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 26,
                  fontWeight: 700,
                  margin: '0 0 8px',
                  letterSpacing: '-0.015em',
                }}
              >
                Order placed!
              </h2>
              <p
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: '#7C6D63',
                  margin: '0 0 24px',
                  lineHeight: 1.55,
                }}
              >
                {bakeryName} will reach out shortly at{' '}
                <strong style={{ color: INK, fontStyle: 'normal' }}>{form.phone}</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: INK,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px 30px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 12,
                  fontFamily: '"Inter", sans-serif',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: PRIMARY,
                    marginBottom: 6,
                  }}
                >
                  Place your order
                </div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 22,
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: '-0.015em',
                    lineHeight: 1.2,
                  }}
                >
                  Order from {bakeryName}
                </h2>
                {product && (
                  <div
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: '#7C6D63',
                      marginTop: 6,
                    }}
                  >
                    {product.name}
                    {product.price ? ` \u00B7 \u20B9${product.price}` : ''}
                    {product.selectedWeightLabel ? ` \u00B7 ${product.selectedWeightLabel}` : ''}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <Field icon={User} label="Your name" required error={errors.name}>
                  <input
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Riya Sharma"
                    style={inputStyle(errors.name)}
                  />
                </Field>

                <Field icon={Phone} label="Phone number" required error={errors.phone}>
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    style={inputStyle(errors.phone)}
                  />
                </Field>

                <Field
                  icon={Package}
                  label="What would you like to order?"
                  required
                  error={errors.productName}
                >
                  <input
                    type="text"
                    value={form.productName}
                    onChange={(e) => update('productName', e.target.value)}
                    placeholder="Chocolate truffle cake"
                    style={inputStyle(errors.productName)}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field icon={null} label="Quantity">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={form.quantity}
                      onChange={(e) => update('quantity', e.target.value)}
                      style={inputStyle()}
                    />
                  </Field>
                  <Field icon={Calendar} label="Needed by">
                    <input
                      type="date"
                      min={today}
                      value={form.deliveryDate}
                      onChange={(e) => update('deliveryDate', e.target.value)}
                      style={inputStyle()}
                    />
                  </Field>
                </div>

                <Field icon={MapPin} label="Delivery address (optional)">
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      placeholder="Door no, street, city, pincode"
                      style={{ ...inputStyle(), resize: 'vertical', minHeight: 64, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        background: showMap ? PRIMARY : '#EEE',
                        color: showMap ? '#FFF' : INK,
                        border: 'none',
                        borderRadius: 8,
                        padding: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: '0.2s',
                      }}
                      title="Choose on Map"
                    >
                      <MapIcon size={16} />
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showMap && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginTop: 8, borderRadius: 10 }}
                      >
                        {isLoaded ? (
                          <div style={{ position: 'relative', height: 200, width: '100%', borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${BORDER}` }}>
                            <GoogleMap
                              mapContainerStyle={{ width: '100%', height: '100%' }}
                              center={mapCenter}
                              zoom={13}
                              onClick={handleMapClick}
                              options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                              }}
                            >
                              {form.location && <Marker position={form.location} />}
                            </GoogleMap>
                            {geocoding && (
                              <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: '#FFF', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <Loader2 size={12} className="animate-spin" color={PRIMARY} /> Locating...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ height: 200, width: '100%', borderRadius: 10, background: SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#9C8A80' }}>
                            Loading Map...
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#9C8A80', marginTop: 6, textAlign: 'center' }}>
                          Tap anywhere on the map to drop a pin.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Field>

                <Field icon={null} label="Anything else? (notes, flavour, occasion)">
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Eggless, chocolate flavour, for a birthday"
                    style={{ ...inputStyle(), resize: 'vertical', minHeight: 60 }}
                  />
                </Field>

                {errors._global && (
                  <div
                    style={{
                      background: '#FFEEEE',
                      color: '#C0392B',
                      padding: '10px 12px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {errors._global}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting
                      ? `${PRIMARY}aa`
                      : `linear-gradient(135deg, ${PRIMARY} 0%, ${GOLD} 100%)`,
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '15px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    cursor: submitting ? 'wait' : 'pointer',
                    borderRadius: 14,
                    marginTop: 4,
                    boxShadow: `0 8px 24px ${PRIMARY}33`,
                    fontFamily: '"Inter", sans-serif',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  {submitting ? (
                    'Sending\u2026'
                  ) : (
                    <>
                      Place order <MessageCircle size={14} />
                    </>
                  )}
                </button>

                <div
                  style={{
                    fontSize: 11,
                    color: '#9C8A80',
                    textAlign: 'center',
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  We share your order only with {bakeryName}.
                </div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ icon: Icon, label, required, error, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 5,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: INK,
        }}
      >
        {Icon && <Icon size={12} color={PRIMARY} />}
        <span>
          {label}
          {required && <span style={{ color: PRIMARY, marginLeft: 2 }}>*</span>}
        </span>
      </div>
      {children}
      {error && (
        <div
          style={{
            fontSize: 11,
            color: '#C0392B',
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </label>
  );
}

function inputStyle(error) {
  return {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${error ? '#C0392B' : BORDER}`,
    background: error ? '#FFF5F5' : SOFT,
    fontSize: 14,
    fontFamily: '"Inter", sans-serif',
    color: INK,
    outline: 'none',
    boxSizing: 'border-box',
  };
}
