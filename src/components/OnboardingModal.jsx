import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Goal,
  Globe,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Store,
  User,
} from 'lucide-react';
import { updateBusinessInDB } from '../services/db';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { showToast } from './iOS';

const businessTypes = ['Cakes', 'Brownies', 'Desserts', 'Breads', 'All bakery items'];
const goals = [
  { id: 'orders', label: 'Manage orders' },
  { id: 'products', label: 'Add products' },
  { id: 'menu', label: 'Create menu' },
  { id: 'inventory', label: 'Track inventory' },
  { id: 'analytics', label: 'View analytics' },
];

const cleanUsername = (value, fallback = 'bakery') => {
  const base = String(value || fallback).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return base || fallback;
};

const Field = ({ icon: Icon, label, children }) => (
  <div className="form-group">
    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={16} /> {label}
    </label>
    {children}
  </div>
);

export default function OnboardingModal({ user, business, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(() => {
    const ownerName = user?.name || user?.displayName || '';
    const bakeryName = business?.name && business.name !== 'Cream & Crust' ? business.name : '';
    return {
      ownerName,
      phone: user?.phone || user?.phoneNumber || business?.phone || '',
      email: user?.email || business?.email || '',
      bakeryName,
      tagline: business?.tagline || '',
      businessType: business?.businessType || 'All bakery items',
      instagram: business?.instagram || user?.instagram || '',
      whatsapp: business?.whatsapp || business?.phone || user?.phone || '',
      website: business?.website || '',
      pickupAddress: business?.pickupAddress || business?.address || user?.address || '',
      city: business?.city || '',
      deliveryAreas: Array.isArray(business?.deliveryAreas) ? business.deliveryAreas.join(', ') : (business?.deliveryAreas || ''),
      upiId: business?.upiId || '',
      gstNumber: business?.gstNumber || business?.gstin || '',
      mainGoal: user?.mainGoal || business?.mainGoal || 'orders',
      username: business?.username || cleanUsername(bakeryName || ownerName || user?.email?.split('@')[0], 'bakery'),
    };
  });

  const steps = useMemo(() => ([
    {
      title: 'Set up your bakery studio',
      subtitle: 'A few details help Cream & Crust personalize your dashboard, invoices, menu, and guided tour.',
      icon: Store,
    },
    {
      title: 'Owner details',
      subtitle: 'This appears in your profile and helps personalize greetings.',
      icon: User,
    },
    {
      title: 'Bakery identity',
      subtitle: 'Your bakery name powers the dashboard, menu, invoices, and customer-facing pages.',
      icon: Store,
    },
    {
      title: 'Social and contact',
      subtitle: 'Customers should know where to contact you and where to see your work.',
      icon: Instagram,
    },
    {
      title: 'Pickup and delivery',
      subtitle: 'Used for invoices, order cards, and delivery planning.',
      icon: MapPin,
    },
    {
      title: 'Payments',
      subtitle: 'UPI is used on pending-payment invoices so customers can pay you quickly.',
      icon: CreditCard,
    },
    {
      title: 'Personalize your dashboard',
      subtitle: 'Choose what you want to do first. You can change this later.',
      icon: Goal,
    },
  ]), []);

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const update = (key, value) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'bakeryName' && (!prev.username || prev.username === cleanUsername(prev.bakeryName))) {
        next.username = cleanUsername(value);
      }
      return next;
    });
  };

  const canContinue = () => {
    if (step === 1) return formData.ownerName.trim() && formData.phone.trim();
    if (step === 2) return formData.bakeryName.trim() && formData.username.trim();
    if (step === 4) return formData.pickupAddress.trim() && formData.city.trim();
    return true;
  };

  const saveSetup = async ({ skipped = false } = {}) => {
    setLoading(true);
    try {
      const uid = user?.uid;
      if (!uid) throw new Error('Missing user session');

      const ownerName = formData.ownerName.trim() || user?.displayName || user?.email?.split('@')[0] || 'Baker';
      const bakeryName = formData.bakeryName.trim() || business?.name || 'Cream & Crust';
      const username = cleanUsername(formData.username || bakeryName) + (business?.username ? '' : Math.floor(100 + Math.random() * 900));
      const deliveryAreas = String(formData.deliveryAreas || '')
        .split(',')
        .map(area => area.trim())
        .filter(Boolean);

      await setDoc(doc(db, 'users', uid), {
        name: ownerName,
        phone: formData.phone.trim(),
        email: formData.email.trim() || user?.email || '',
        address: formData.pickupAddress.trim(),
        onboardingComplete: true,
        onboardingCompleted: true,
        setupSkipped: skipped,
        mainGoal: formData.mainGoal,
      }, { merge: true });

      await updateBusinessInDB(business?.id || uid, {
        name: bakeryName,
        ownerName,
        tagline: formData.tagline.trim(),
        username,
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
        email: formData.email.trim() || user?.email || '',
        instagram: formData.instagram.replace(/^@/, '').trim(),
        website: formData.website.trim(),
        address: formData.pickupAddress.trim(),
        pickupAddress: formData.pickupAddress.trim(),
        city: formData.city.trim(),
        deliveryAreas,
        upiId: formData.upiId.trim(),
        gstNumber: formData.gstNumber.trim(),
        businessType: formData.businessType,
        mainGoal: formData.mainGoal,
        onboardingComplete: true,
        setupSkipped: skipped,
      });

      showToast(skipped ? 'Setup skipped — complete your profile anytime from Settings' : 'Bakery studio set up successfully!', 'success');
      onComplete?.({ skipped, mainGoal: formData.mainGoal });
    } catch (error) {
      showToast('Setup failed: ' + (error.message || 'Please try again'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (!canContinue()) {
      showToast('Please complete the required details first.', 'error');
      return;
    }
    if (isLast) return saveSetup();
    setStep(prev => prev + 1);
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>✨</div>
          <p style={{ color: 'var(--text2)', lineHeight: 1.65, margin: '0 auto', maxWidth: 360 }}>
            We will collect your bakery profile, personalize your dashboard, then start a skippable guided app tour.
          </p>
        </div>
      );
    }

    if (step === 1) {
      return (
        <>
          <Field icon={User} label="Owner name *">
            <input autoFocus value={formData.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder="e.g. Priya Sharma" />
          </Field>
          <Field icon={Phone} label="Phone / WhatsApp *">
            <input type="tel" inputMode="tel" value={formData.phone} onChange={e => update('phone', e.target.value)} placeholder="10-digit number" />
          </Field>
          <Field icon={Mail} label="Email">
            <input type="email" value={formData.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" />
          </Field>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Field icon={Store} label="Bakery name *">
            <input autoFocus value={formData.bakeryName} onChange={e => update('bakeryName', e.target.value)} placeholder="e.g. Sweet Crumbs" />
          </Field>
          <Field icon={Globe} label="Public menu username *">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', padding: '0 12px', borderRadius: 12 }}>
              <span style={{ color: 'var(--text3)', fontWeight: 800 }}>@</span>
              <input value={formData.username} onChange={e => update('username', cleanUsername(e.target.value))} placeholder="sweetcrumbs" style={{ background: 'transparent', border: 'none', paddingLeft: 0 }} />
            </div>
          </Field>
          <Field icon={Store} label="Tagline">
            <input value={formData.tagline} onChange={e => update('tagline', e.target.value)} placeholder="Fresh bakes for every celebration" />
          </Field>
          <Field icon={Store} label="Business type">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {businessTypes.map(type => (
                <button key={type} type="button" onClick={() => update('businessType', type)} style={{
                  padding: '9px 12px',
                  borderRadius: 999,
                  border: formData.businessType === type ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: formData.businessType === type ? 'var(--cream)' : 'var(--bg)',
                  color: formData.businessType === type ? 'var(--accent2)' : 'var(--text2)',
                  fontWeight: 800,
                  fontSize: 12,
                }}>{type}</button>
              ))}
            </div>
          </Field>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Field icon={Instagram} label="Instagram handle">
            <input value={formData.instagram} onChange={e => update('instagram', e.target.value)} placeholder="@yourbakery" />
          </Field>
          <Field icon={Phone} label="Customer WhatsApp">
            <input type="tel" value={formData.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="+91..." />
          </Field>
          <Field icon={Globe} label="Website / portfolio link">
            <input value={formData.website} onChange={e => update('website', e.target.value)} placeholder="https://..." />
          </Field>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <Field icon={MapPin} label="Home bakery / pickup address *">
            <textarea autoFocus rows={3} value={formData.pickupAddress} onChange={e => update('pickupAddress', e.target.value)} placeholder="Full pickup address" style={{ resize: 'vertical' }} />
          </Field>
          <Field icon={MapPin} label="Delivery city *">
            <input value={formData.city} onChange={e => update('city', e.target.value)} placeholder="e.g. Bengaluru" />
          </Field>
          <Field icon={MapPin} label="Delivery areas">
            <input value={formData.deliveryAreas} onChange={e => update('deliveryAreas', e.target.value)} placeholder="Indiranagar, Koramangala, Whitefield" />
          </Field>
        </>
      );
    }

    if (step === 5) {
      return (
        <>
          <Field icon={CreditCard} label="UPI ID for pending invoice payments">
            <input autoFocus value={formData.upiId} onChange={e => update('upiId', e.target.value)} placeholder="yourbakery@upi" />
          </Field>
          <Field icon={CreditCard} label="GST number (optional)">
            <input value={formData.gstNumber} onChange={e => update('gstNumber', e.target.value)} placeholder="Optional" />
          </Field>
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(181,96,106,0.08)', color: 'var(--text2)', fontSize: 13, lineHeight: 1.55 }}>
            UPI appears only on invoices with pending balance, so customers can pay you directly.
          </div>
        </>
      );
    }

    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {goals.map(goal => (
          <button key={goal.id} type="button" onClick={() => update('mainGoal', goal.id)} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderRadius: 16,
            border: formData.mainGoal === goal.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            background: formData.mainGoal === goal.id ? 'var(--cream)' : 'var(--bg)',
            color: 'var(--text)',
            fontWeight: 850,
            textAlign: 'left',
          }}>
            {goal.label}
            {formData.mainGoal === goal.id && <CheckCircle size={18} color="var(--accent)" />}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(250, 247, 245, 0.85)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        style={{ background: 'var(--bg)', borderRadius: 28, width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.35)' }}
      >
        <div style={{ height: 7, background: 'var(--bg2)' }}>
          <motion.div animate={{ width: `${((step + 1) / steps.length) * 100}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), #D9A06F)' }} />
        </div>

        <div style={{ padding: 26, maxHeight: 'calc(92vh - 7px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--cream)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <current.icon size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', lineHeight: 1.1, color: 'var(--text)' }}>{current.title}</h2>
              <p style={{ margin: '7px 0 0', color: 'var(--text3)', fontSize: '0.9rem', lineHeight: 1.45 }}>{current.subtitle}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ x: 18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -18, opacity: 0 }} transition={{ duration: 0.22 }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {!isFirst && (
              <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)} disabled={loading} style={{ minWidth: 96 }}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={next} disabled={loading || !canContinue()} style={{ flex: 1, height: 52, gap: 10 }}>
              {loading ? <Loader2 className="animate-spin" /> : isLast ? 'Finish and start tour' : 'Continue'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" onClick={() => saveSetup({ skipped: true })} disabled={loading} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '8px 16px', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Skip for now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
