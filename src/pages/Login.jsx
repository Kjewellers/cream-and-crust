import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginUser, registerUser, signInWithGoogle } from '../services/auth';
import { triggerHaptic, showToast } from '../components/iOS';

/* ─── SVG Social Icons ─── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09a7.12 7.12 0 010-4.18V7.07H2.18A11.99 11.99 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
);
const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);

/* ─── Shared Styles ─── */
const fieldWrap = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: '#FFFFFF', border: '1.5px solid #FFE0E6',
  borderRadius: 16, padding: '10px 12px',
  boxShadow: '0 2px 8px rgba(255,107,139,0.05)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
const iconBox = {
  width: 32, height: 32, borderRadius: 10,
  background: 'linear-gradient(135deg, #FFF0F3, #FFE0E6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, flexShrink: 0,
};
const inputStyle = {
  flex: 1, background: 'none', border: 'none', outline: 'none',
  fontSize: '13.5px', color: '#3D1C2E', fontWeight: 600,
  fontFamily: "'Outfit', sans-serif",
};

/* ─── Main Login Component ─── */
export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);

  const act = async (fn) => {
    setLoading(true);
    try { triggerHaptic('light'); } catch {}
    try { await fn(); }
    catch (err) {
      showToast(err.message || 'Authentication failed.', 'error');
      try { triggerHaptic('error'); } catch {}
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #FFF0F3 0%, #FFE0E8 40%, #FFD4DE 70%, #FFE0E8 100%)',
      fontFamily: "'Outfit', sans-serif", position: 'relative',
      overflowX: 'hidden', overflowY: 'auto',
    }}>
      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Playfair+Display:ital,wght@0,700;1,700&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Soft blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,180,195,0.35)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', top: 200, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,200,210,0.4)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: 80, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,160,180,0.25)', filter: 'blur(35px)' }} />
      </div>

      {/* ═══════ HEADER ═══════ */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(255,107,139,0.15)', fontSize: 18 }}>🧁</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#D63F6A', letterSpacing: '-0.02em' }}>Cream &amp; Crust</div>
            <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#B5606A', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bakery Studio</div>
          </div>
        </div>
        <button style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,107,139,0.15)', borderRadius: 99, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 600, color: '#6B4C52', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          🌐 English <span style={{ fontSize: '0.6rem' }}>▾</span>
        </button>
      </div>

      {/* ═══════ HERO SECTION ═══════ */}
      <div style={{ position: 'relative', zIndex: 5, padding: '14px 18px 0', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        {/* Left copy */}
        <div style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
          <h1 style={{ margin: 0, lineHeight: 1.08 }}>
            <span style={{ display: 'block', fontWeight: 900, fontSize: '2rem', color: '#3D1C2E', letterSpacing: '-0.03em' }}>Bake</span>
            <span style={{ display: 'block', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.85rem', color: '#E8456A', lineHeight: 1.15 }}>beautifully,</span>
            <span style={{ display: 'block', fontFamily: "'Dancing Script', cursive", fontWeight: 700, fontSize: '1.6rem', color: '#3D1C2E', marginTop: 2 }}>Run effortlessly.</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: '#7A5060', lineHeight: 1.45, marginTop: 8, maxWidth: 160, fontWeight: 500 }}>
            Your all-in-one bakery management studio to create, manage &amp; grow.
          </p>
          {/* Trust badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '6px 12px', marginTop: 10, border: '1px solid rgba(255,107,139,0.12)', boxShadow: '0 3px 10px rgba(255,107,139,0.08)' }}>
            <span style={{ fontSize: '1rem' }}>🏆</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#D63F6A' }}>10,000+</div>
              <div style={{ fontSize: '0.55rem', color: '#8C6B74', fontWeight: 600, lineHeight: 1.15 }}>Home Bakers</div>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-0.5, 1, -0.5] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 185, flexShrink: 0, marginTop: -8 }}
        >
          <img src="/mascot.png" alt="BakeFlow mascot" style={{ width: '100%', filter: 'drop-shadow(0 10px 20px rgba(255,107,139,0.2))' }} />
        </motion.div>
      </div>

      {/* ═══════ FORM CARD ═══════ */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.08 }}
        style={{
          position: 'relative', zIndex: 20,
          margin: '8px 14px 0',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28, padding: '22px 18px 18px',
          boxShadow: '0 16px 48px rgba(214,63,106,0.12), 0 2px 12px rgba(0,0,0,0.04)',
          border: '1px solid rgba(255,255,255,0.85)',
        }}
      >
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontFamily: "'Dancing Script', cursive", fontSize: '1.7rem', fontWeight: 700, color: '#D63F6A' }}>
            {mode === 'login' ? 'Welcome back!' : 'Join the family!'}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#8C6B74', fontWeight: 500 }}>
            {mode === 'login' ? "Let's continue your baking journey 🧁" : "Start your sweet adventure today 🎀"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 12 : -12 }}
            transition={{ duration: 0.2 }}
            onSubmit={e => { e.preventDefault(); mode === 'login' ? act(() => loginUser(email, password)) : act(() => registerUser(email, password, name)); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {/* Name (register only) */}
            {mode === 'register' && (
              <div style={fieldWrap}>
                <div style={iconBox}>👤</div>
                <input type="text" required placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              </div>
            )}

            {/* Email */}
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8C6B74', marginBottom: 4, paddingLeft: 4 }}>Email address</div>
              <div style={fieldWrap}>
                <div style={iconBox}>✉️</div>
                <input type="email" required placeholder="priya.baker@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                {email.includes('@') && <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>✓</div>}
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8C6B74', marginBottom: 4, paddingLeft: 4 }}>Password</div>
              <div style={fieldWrap}>
                <div style={iconBox}>🔒</div>
                <input type={showPw ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, letterSpacing: password && !showPw ? '0.18em' : 'normal' }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5606A', fontSize: 15, padding: '0 2px', display: 'flex' }}>
                  {showPw ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            {mode === 'login' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#5A3D44', fontWeight: 600 }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#E8456A', width: 15, height: 15 }} />
                  Remember me
                </label>
                <button type="button" style={{ background: 'none', border: 'none', color: '#E8456A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Forgot Password?</button>
              </div>
            )}

            {/* Submit Button */}
            <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={loading} style={{
              background: 'linear-gradient(135deg, #E8456A 0%, #FF7096 50%, #E8456A 100%)',
              backgroundSize: '200% 100%',
              color: 'white', border: 'none', borderRadius: 99, padding: '15px 20px',
              fontSize: '0.95rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 2,
              boxShadow: '0 8px 24px rgba(232,69,106,0.4)',
              position: 'relative', overflow: 'hidden',
              opacity: loading ? 0.8 : 1,
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)', animation: 'shimmerLogin 2.5s infinite' }} />
              {loading ? '⏳ Please wait...' : (
                <>
                  {mode === 'login' ? 'Login to Bake' : 'Create Studio'} <span>♥</span>
                  <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>→</span>
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #FFCDD6)' }} />
              <span style={{ fontSize: '0.68rem', color: '#D63F6A', fontWeight: 700, whiteSpace: 'nowrap' }}>or continue with ♥</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #FFCDD6, transparent)' }} />
            </div>

            {/* Social Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: <GoogleIcon />, label: 'Google', fn: () => act(() => signInWithGoogle()) },
                { icon: <AppleIcon />, label: 'Apple', fn: () => showToast('Apple Sign-In coming soon!', 'info') },
                { icon: <FacebookIcon />, label: 'Facebook', fn: () => showToast('Facebook Sign-In coming soon!', 'info') },
              ].map(b => (
                <motion.button key={b.label} type="button" whileTap={{ scale: 0.95 }} onClick={b.fn} style={{
                  flex: 1, background: 'white', border: '1.5px solid #FFE0E6',
                  borderRadius: 14, padding: '10px 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  fontSize: '0.72rem', fontWeight: 700, color: '#4A3B32', cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(255,107,139,0.06)',
                }}>
                  {b.icon} {b.label}
                </motion.button>
              ))}
            </div>
          </motion.form>
        </AnimatePresence>
      </motion.div>

      {/* ═══════ SIGNUP / TOGGLE CTA ═══════ */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '16px 20px 8px', gap: 12 }}>
        <motion.div animate={{ rotate: [-3, 3, -3], y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: 48, flexShrink: 0, filter: 'drop-shadow(0 6px 12px rgba(255,107,139,0.15))' }}>🧁</motion.div>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#6B4C52', fontWeight: 600 }}>{mode === 'login' ? 'New to Cream & Crust?' : 'Already have an account?'}</div>
          <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Dancing Script', cursive", fontSize: '1.25rem', fontWeight: 700, color: '#E8456A', padding: 0, marginTop: 1 }}>
            {mode === 'login' ? 'Create your account' : 'Sign in instead'}
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#E8456A', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, flexShrink: 0 }}>→</span>
          </button>
        </div>
      </div>

      {/* ═══════ FOOTER FEATURES ═══════ */}
      <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '6px 12px 24px' }}>
        {[
          { icon: '🛡️', t: 'Secure', d: 'Your data is 100% safe' },
          { icon: '☁️', t: 'Cloud Sync', d: 'Access anywhere, anytime' },
          { icon: '♥', t: 'Made for Bakers', d: 'Designed with love for home bakers' },
          { icon: '⏱️', t: 'Save Time', d: 'Automate & grow effortlessly' },
        ].map(f => (
          <div key={f.t} style={{ textAlign: 'center', padding: '6px 2px' }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{f.icon}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#4A3B32', marginBottom: 1 }}>{f.t}</div>
            <div style={{ fontSize: '0.5rem', color: '#8C7A6B', lineHeight: 1.3, fontWeight: 500 }}>{f.d}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmerLogin {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
