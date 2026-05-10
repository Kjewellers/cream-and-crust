import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader, Globe, Check, ChevronLeft } from 'lucide-react';
import { loginUser, registerUser, signInWithGoogle } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { triggerHaptic } from '../components/iOS';

export default function Login() {
  const { currentUser, mockLogin } = useAuth();
  const [mode, setMode] = useState('select'); // 'select' | 'email' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successAnim, setSuccessAnim] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setSuccessAnim(true);
      triggerHaptic('success');
    }
  }, [currentUser]);

  const handleAction = async (actionFn) => {
    setError('');
    setLoading(true);
    triggerHaptic('light');
    
    if (devMode) {
      setTimeout(() => {
        setSuccessAnim(true);
        triggerHaptic('success');
        // Actually update global state so App.jsx redirects
        setTimeout(mockLogin, 1500);
      }, 500);
      return;
    }

    try {
      await actionFn();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
      triggerHaptic('error');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => handleAction(signInWithGoogle);

  if (successAnim) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', zIndex: 9999 }}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{ 
              width: 80, height: 80, borderRadius: '50%', background: '#34C759', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(52,199,89,0.3)'
            }}
          >
            <Check size={48} color="white" strokeWidth={3} />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ color: 'var(--text)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em' }}
          >
            Sign in Successful
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 14px 14px 42px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'rgba(0, 0, 0, 0.03)',
    fontSize: '16px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };
  
  const iconStyle = { position: 'absolute', left: 14, top: 14, color: 'var(--text3)' };

  const SecondaryButton = ({ icon: Icon, label, onClick }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => { triggerHaptic('light'); onClick(); }}
      style={{
        width: '100%', padding: '14px', borderRadius: '10px',
        background: '#FFFFFF', color: '#000000', border: '1px solid #D1D1D6',
        fontSize: '16px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
      }}
    >
      {Icon && <Icon size={20} />}
      {label}
    </motion.button>
  );

  const PrimaryButton = ({ label, onClick, loading }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => { triggerHaptic('medium'); onClick(); }}
      style={{
        width: '100%', padding: '14px', borderRadius: '10px',
        background: 'var(--accent)', color: 'white', border: 'none',
        fontSize: '16px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      {loading ? <Loader className="spin" size={20} /> : label}
    </motion.button>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24, fontFamily: 'var(--font)'
    }}>
      <motion.div 
        layout
        style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}
      >
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>🧁</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Cream & Crust</h1>
          <p style={{ color: 'var(--text2)', fontSize: '1rem', fontWeight: 500 }}>Sign in to continue</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: '#FF3B3015', color: '#FF3B30', padding: '12px', borderRadius: 10, marginBottom: 20, fontSize: '0.85rem', fontWeight: 500 }}>
              {error}
            </motion.div>
          )}

          {mode === 'select' && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SecondaryButton icon={Globe} label="Continue with Google" onClick={handleGoogleLogin} />
              <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <PrimaryButton label="Continue with Email" onClick={() => setMode('email')} />
              <div style={{ marginTop: 24 }}>
                <button onClick={() => setMode('register')} style={{ color: 'var(--text3)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Don't have an account? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one</span>
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'email' && (
            <motion.form key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={(e) => { e.preventDefault(); handleAction(() => loginUser(email, password)); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={iconStyle} />
                <input type="email" required style={inputStyle} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={iconStyle} />
                <input type="password" required style={inputStyle} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <PrimaryButton label="Sign In" onClick={() => {}} loading={loading} />
              <button type="button" onClick={() => setMode('select')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text3)', marginTop: 12, fontSize: '0.9rem', fontWeight: 500 }}>
                <ChevronLeft size={16} /> Back
              </button>
            </motion.form>
          )}

          {mode === 'register' && (
            <motion.form key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={(e) => { e.preventDefault(); handleAction(() => registerUser(email, password, name)); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <User size={18} style={iconStyle} />
                <input type="text" required style={inputStyle} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={iconStyle} />
                <input type="email" required style={inputStyle} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={iconStyle} />
                <input type="password" required style={inputStyle} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
              </div>
              <PrimaryButton label="Create Account" onClick={() => {}} loading={loading} />
              <button type="button" onClick={() => setMode('select')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text3)', marginTop: 12, fontSize: '0.9rem', fontWeight: 500 }}>
                <ChevronLeft size={16} /> Back
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setDevMode(!devMode)}
          style={{ position: 'fixed', bottom: 20, right: 20, fontSize: '10px', color: 'var(--text3)', opacity: 0.1, background: 'none', border: 'none' }}
        >
          {devMode ? 'MOCK_ON' : 'MOCK_OFF'}
        </button>
      </motion.div>
    </div>
  );
}
