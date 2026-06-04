import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Phone, MapPin, CreditCard, Instagram, MessageCircle, Globe,
  FileText, Truck, Sparkles, Briefcase, User as UserIcon, ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { updateBusinessInDB } from '../services/db';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { showToast } from './iOS';
import { calculateProfileCompleteness } from '../utils/profileFields';

/**
 * QuickProfileModal
 *
 * A self-contained modal for completing the bakery profile without leaving
 * the dashboard. Shows missing fields first, with the option to also edit
 * filled-in ones.
 */
const FIELDS = [
  { key: 'name',          label: 'Bakery name',     icon: ShoppingBag,    required: true,  group: 'identity' },
  { key: 'ownerName',     label: 'Owner name',      icon: UserIcon,       required: true,  group: 'identity' },
  { key: 'tagline',       label: 'Tagline',         icon: Sparkles,       required: false, group: 'identity' },
  { key: 'businessType',  label: 'Business type',   icon: Briefcase,      required: false, group: 'identity', type: 'select',
    options: ['Home Baker', 'Bakery', 'Cafe', 'Cloud Kitchen', 'Catering', 'Other'] },
  { key: 'phone',         label: 'Phone',           icon: Phone,          required: true,  group: 'contact', type: 'tel' },
  { key: 'instagram',     label: 'Instagram',       icon: Instagram,      required: false, group: 'contact' },
  { key: 'whatsapp',      label: 'WhatsApp',        icon: MessageCircle,  required: false, group: 'contact', type: 'tel' },
  { key: 'website',       label: 'Website',         icon: Globe,          required: false, group: 'contact' },
  { key: 'pickupAddress', label: 'Pickup address',  icon: MapPin,         required: true,  group: 'location' },
  { key: 'city',          label: 'City',            icon: MapPin,         required: true,  group: 'location' },
  { key: 'deliveryAreas', label: 'Delivery areas',  icon: Truck,          required: false, group: 'location', hint: 'Comma-separated' },
  { key: 'upiId',         label: 'UPI ID',          icon: CreditCard,     required: true,  group: 'payments' },
  { key: 'gstNumber',     label: 'GST number',      icon: FileText,       required: false, group: 'payments' },
];

const PLACEHOLDERS = {
  name: 'e.g. Cream & Crust',
  ownerName: 'Your full name',
  tagline: 'A short, memorable line',
  phone: '+91 98765 43210',
  instagram: 'username (without @)',
  whatsapp: '+91 98765 43210',
  website: 'https://yourbakery.com',
  pickupAddress: 'Full pickup address',
  city: 'e.g. Mumbai',
  deliveryAreas: 'Andheri, Bandra, Juhu',
  upiId: 'yourname@upi',
  gstNumber: '22AAAAA0000A1Z5',
};

export default function QuickProfileModal({ open, onClose, business, currentUser, userDoc }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  // Hydrate values from business + userDoc whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setValues({
      name:          business?.name          || '',
      ownerName:     business?.ownerName     || userDoc?.name      || '',
      tagline:       business?.tagline       || '',
      businessType:  business?.businessType  || '',
      phone:         business?.phone         || userDoc?.phone     || '',
      instagram:     business?.instagram     || userDoc?.instagram || '',
      whatsapp:      business?.whatsapp      || userDoc?.whatsapp  || '',
      website:       business?.website       || userDoc?.website   || '',
      pickupAddress: business?.pickupAddress || userDoc?.address   || '',
      city:          business?.city          || '',
      deliveryAreas: Array.isArray(business?.deliveryAreas)
        ? business.deliveryAreas.join(', ')
        : (business?.deliveryAreas || ''),
      upiId:         business?.upiId         || userDoc?.upiId     || '',
      gstNumber:     business?.gstNumber     || userDoc?.gstin     || '',
    });
  }, [open, business, userDoc]);

  const completeness = useMemo(() => calculateProfileCompleteness(business || {}), [business]);

  const missingCount = useMemo(
    () => FIELDS.filter(f => f.required && !String(values[f.key] || '').trim()).length,
    [values]
  );

  const setField = (key, v) => setValues(prev => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!business?.id || !currentUser?.uid) {
      showToast('Cannot save right now', 'error');
      return;
    }
    setSaving(true);
    try {
      const deliveryAreasArray = values.deliveryAreas
        ? values.deliveryAreas.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      await updateBusinessInDB(business.id, {
        name: values.name || business.name,
        ownerName: values.ownerName,
        tagline: values.tagline,
        businessType: values.businessType,
        phone: values.phone,
        instagram: values.instagram,
        whatsapp: values.whatsapp,
        website: values.website,
        pickupAddress: values.pickupAddress,
        city: values.city,
        deliveryAreas: deliveryAreasArray,
        upiId: values.upiId,
        gstNumber: values.gstNumber,
        username: business.username,
      });

      // Mirror personal fields back to user doc
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: values.ownerName || userDoc?.name,
        phone: values.phone,
        address: values.pickupAddress,
        instagram: values.instagram,
        whatsapp: values.whatsapp,
        website: values.website,
        gstin: values.gstNumber,
        upiId: values.upiId,
      });

      showToast('Profile updated', 'success');
      onClose?.();
    } catch (err) {
      console.error(err);
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(28, 21, 18, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '92vh',
              background: 'var(--card)',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -24px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              marginBottom: 0,
            }}
            className="quick-profile-modal-sheet"
          >
            {/* Drag handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 10,
                paddingBottom: 4,
                flexShrink: 0,
              }}
            >
              <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-md)' }} />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '14px 22px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', flexShrink: 0,
                  boxShadow: 'var(--shadow-accent)',
                }}
              >
                <Sparkles size={19} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em' }}>
                  Complete your profile
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text3)', lineHeight: 1.45 }}>
                  {missingCount > 0
                    ? `${missingCount} required field${missingCount === 1 ? '' : 's'} left`
                    : 'Add or update any details below'}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--bg)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text2)',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ padding: '14px 22px 4px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Profile complete
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {completeness}%
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  background: 'var(--border-md)',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>

            {/* Form */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 22px 18px',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {FIELDS.map((f, idx) => {
                const isFilled = !!String(values[f.key] || '').trim();
                const Icon = f.icon;
                return (
                  <div
                    key={f.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr',
                      columnGap: 12,
                      alignItems: 'flex-start',
                      padding: '12px 0',
                      borderBottom: idx === FIELDS.length - 1 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: isFilled ? 'var(--accent-light)' : 'var(--bg)',
                        color: isFilled ? 'var(--accent)' : 'var(--text3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: 22,
                        transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      {isFilled ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label
                        style={{
                          fontSize: 11, color: 'var(--text2)',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        {f.label}
                        {f.required && <span style={{ color: 'var(--accent)', textTransform: 'none', letterSpacing: 'normal' }}>*</span>}
                        {f.hint && <span style={{ color: 'var(--text3)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal', fontSize: 11 }}>· {f.hint}</span>}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          value={values[f.key] || ''}
                          onChange={e => setField(f.key, e.target.value)}
                          style={{ fontSize: 14, padding: '10px 12px', borderRadius: 10 }}
                        >
                          <option value="">Select an option</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.type || 'text'}
                          inputMode={f.type === 'tel' ? 'numeric' : undefined}
                          value={values[f.key] || ''}
                          onChange={e => setField(f.key, e.target.value)}
                          placeholder={PLACEHOLDERS[f.key] || ''}
                          style={{ fontSize: 14, padding: '10px 12px', borderRadius: 10 }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 22px 18px',
                borderTop: '1px solid var(--border)',
                background: 'var(--card)',
                display: 'flex', gap: 10,
                flexShrink: 0,
              }}
            >
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-md)',
                  borderRadius: 12,
                  fontSize: 14, fontWeight: 600, color: 'var(--text2)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Later
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14, fontWeight: 600, color: 'white',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-accent)',
                  opacity: saving ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Check size={15} /> {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </motion.div>

          <style>{`
            @media (min-width: 700px) {
              .quick-profile-modal-sheet {
                margin-bottom: 5vh !important;
                border-radius: 20px !important;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
