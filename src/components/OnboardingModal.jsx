import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Store, Phone, MapPin, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { updateBusinessInDB } from '../services/db';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { showToast } from './iOS';

export default function OnboardingModal({ user, business, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: business?.name || '',
    username: business?.username || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const isComplete = business?.name && business?.name !== 'Cream & Crust' && business?.username && user?.phone;

  if (isComplete) return null;

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      // Update Business
      await updateBusinessInDB(business?.id || user?.uid, {
        name: formData.businessName,
        username: formData.username.toLowerCase().replace(/\s+/g, ''),
      });

      // Update User
      await updateDoc(doc(db, "users", user.uid), {
        phone: formData.phone,
        address: formData.address
      });

      showToast('Profile set up successfully! 🧁', 'success');
      onComplete();
    } catch (error) {
      showToast('Setup failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'var(--bg)', borderRadius: 24, width: '100%', maxWidth: 450, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: 'var(--bg2)' }}>
          <motion.div animate={{ width: `${(step/3)*100}%` }} style={{ height: '100%', background: 'var(--accent)' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✨</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Welcome to Cream & Crust</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>Let's set up your professional bakery profile in 3 quick steps.</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={16} /> Bakery Name
                </label>
                <input 
                  autoFocus
                  placeholder="e.g. The Sassy Whisk" 
                  value={formData.businessName} 
                  onChange={e => setFormData({...formData, businessName: e.target.value})} 
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} /> Unique Username (for your Portfolio)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', padding: '0 12px', borderRadius: 12 }}>
                  <span style={{ color: 'var(--text3)', fontWeight: 600 }}>@</span>
                  <input 
                    autoFocus
                    placeholder="sassycakes" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    style={{ background: 'transparent', border: 'none', paddingLeft: 0 }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 8 }}>This will be your link: creamandcrust.online/portfolio/{formData.username || 'username'}</p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={16} /> Contact WhatsApp/Phone
                </label>
                <input 
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  placeholder="10-digit number" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} /> Delivery/Bakery Address
                </label>
                <input 
                  placeholder="City, Area (e.g. Mumbai, Bandra)" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          className="btn btn-primary" 
          onClick={handleNext} 
          disabled={loading || (step === 1 && !formData.businessName) || (step === 2 && !formData.username) || (step === 3 && !formData.phone)}
          style={{ width: '100%', height: 55, marginTop: 20, fontSize: '1rem', gap: 10 }}
        >
          {loading ? <Loader2 className="animate-spin" /> : step === 3 ? 'Complete Setup' : 'Next Step'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </motion.div>
    </div>
  );
}
