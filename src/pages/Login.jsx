import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader, Globe, EyeOff, Eye, ChevronRight, ShieldCheck, Cloud, Heart, Clock, Check } from 'lucide-react';
import { loginUser, registerUser, signInWithGoogle } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { triggerHaptic, showToast } from '../components/iOS';

export default function Login() {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (currentUser) {
      triggerHaptic('success');
    }
  }, [currentUser]);

  const handleAction = async (actionFn) => {
    setLoading(true);
    triggerHaptic('light');
    try {
      await actionFn();
    } catch (err) {
      showToast(err.message || 'Authentication failed.', 'error');
      triggerHaptic('error');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => handleAction(signInWithGoogle);
  const handleSocialStub = (provider) => {
    triggerHaptic('warning');
    showToast(`${provider} login coming soon!`, 'info');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #FFF1F2 0%, #FFFFFF 100%)',
      fontFamily: 'var(--font)',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      {/* Background Mascot Image */}
      {/* Assuming the user copies the generated mascot to public/login-bg.png */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: '-15%',
        width: '100%',
        height: '70%',
        backgroundImage: 'url(/login_bg.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top right',
        zIndex: 0,
        opacity: 0.95
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40, width: 40, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FF6B8B', lineHeight: 1 }}>Cream & Crust</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8C7A6B', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bakery Studio</span>
          </div>
        </div>
        
        <button style={{ 
          background: 'white', border: '1px solid #FFE4E6', borderRadius: 99, 
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '0.85rem', fontWeight: 600, color: '#4A3B32', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255, 107, 139, 0.08)'
        }}>
          <Globe size={14} color="#FF6B8B" /> English <span style={{ fontSize: '0.7rem', color: '#8C7A6B' }}>▼</span>
        </button>
      </div>

      {/* Hero Typography */}
      <div style={{ padding: '0 32px', marginTop: '2vh', position: 'relative', zIndex: 10 }}>
        <h1 style={{ 
          fontFamily: 'Playfair Display, serif', 
          fontSize: '3.2rem', 
          fontWeight: 700, 
          color: '#4A3B32', 
          margin: 0, 
          lineHeight: 1.1 
        }}>Bake</h1>
        <h1 style={{ 
          fontFamily: 'Playfair Display, serif', 
          fontSize: '3.2rem', 
          fontWeight: 700, 
          color: '#FF6B8B', 
          margin: 0, 
          lineHeight: 1.1 
        }}>beautifully,</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ 
            fontFamily: "'Dancing Script', cursive", 
            fontSize: '2.5rem', 
            color: '#4A3B32',
            lineHeight: 1
          }}>Run effortlessly.</span>
          <span style={{ color: '#FF6B8B', fontSize: '1.2rem' }}>♥</span>
        </div>
        <div style={{ width: 80, height: 2, background: '#FF6B8B', marginTop: 12, opacity: 0.3, borderRadius: 2 }} />
        
        <p style={{ 
          marginTop: 16, 
          color: '#4A3B32', 
          fontSize: '0.95rem', 
          fontWeight: 500, 
          maxWidth: 220, 
          lineHeight: 1.5,
          opacity: 0.8
        }}>
          Your all-in-one bakery management studio to create, manage & grow.
        </p>
      </div>

      {/* Floating Badge */}
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          top: '38%',
          left: '24px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: 99,
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(255, 107, 139, 0.15)',
          border: '1px solid #FFE4E6',
          zIndex: 10
        }}
      >
        <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>🧁</span>
        <span style={{ fontSize: '0.65rem', color: '#8C7A6B', fontWeight: 600 }}>Trusted by</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4A3B32' }}>10,000+</span>
        <span style={{ fontSize: '0.65rem', color: '#FF6B8B', fontWeight: 700 }}>Home Bakers</span>
        <span style={{ fontSize: '0.7rem', color: '#FF6B8B', marginTop: 4 }}>♥</span>
      </motion.div>

      {/* Bottom Login Card Container */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'center',
        padding: '0 20px 20px 20px',
        position: 'relative',
        zIndex: 20
      }}>
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(24px)',
            borderRadius: '40px',
            padding: '32px 24px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 -10px 40px rgba(255, 107, 139, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ 
              fontFamily: "'Dancing Script', cursive", 
              fontSize: '2.4rem', 
              color: '#FF6B8B', 
              margin: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}>
              <span style={{ opacity: 0.5, fontSize: '1.2rem' }}>♥</span>
              Welcome back!
              <span style={{ opacity: 0.5, fontSize: '1.2rem' }}>♥</span>
            </h2>
            <p style={{ color: '#4A3B32', fontSize: '0.95rem', fontWeight: 600, marginTop: 4 }}>
              Let's continue your baking journey 🧁
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }} 
              onSubmit={(e) => { 
                e.preventDefault(); 
                if (mode === 'login') handleAction(() => loginUser(email, password)); 
                else handleAction(() => registerUser(email, password, name)); 
              }} 
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {mode === 'register' && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 20, padding: '6px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 16, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B8B', flexShrink: 0 }}>
                    <User size={20} strokeWidth={2.5} />
                  </div>
                  <input type="text" required placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '0 16px', fontSize: '15px', color: '#4A3B32', fontWeight: 600 }} 
                  />
                </div>
              )}

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 20, padding: '6px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 16, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B8B', flexShrink: 0 }}>
                  <Mail size={20} strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 16 }}>
                  <span style={{ fontSize: '0.65rem', color: '#8C7A6B', fontWeight: 600 }}>Email address</span>
                  <input type="email" required placeholder="priya.baker@email.com" value={email} onChange={e => setEmail(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: '15px', color: '#4A3B32', fontWeight: 600, padding: 0 }} 
                  />
                </div>
                {email.includes('@') && <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#FF6B8B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Check size={14} strokeWidth={3} /></div>}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 20, padding: '6px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 16, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B8B', flexShrink: 0 }}>
                  <Lock size={20} strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 16 }}>
                  <span style={{ fontSize: '0.65rem', color: '#8C7A6B', fontWeight: 600 }}>Password</span>
                  <input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: '20px', letterSpacing: '0.1em', color: '#4A3B32', fontWeight: 900, padding: 0 }} 
                  />
                </div>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', color: '#8C7A6B', cursor: 'pointer', padding: '0 16px' }}>
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>

              {mode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#4A3B32', fontWeight: 600 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: rememberMe ? '#FF6B8B' : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {rememberMe && <Check size={14} color="white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} style={{ display: 'none' }} />
                    Remember me
                  </label>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#FF6B8B', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Forgot Password?
                  </button>
                </div>
              )}

              <motion.button 
                whileTap={{ scale: 0.96 }}
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(90deg, #FF8DA1 0%, #FF6B8B 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 99,
                  padding: '18px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                  boxShadow: '0 12px 24px rgba(255, 107, 139, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', transform: 'skewX(-20deg) translateX(-150%)', animation: 'shimmer 3s infinite' }} />
                {loading ? <Loader className="spin" size={24} /> : (
                  <>
                    {mode === 'login' ? 'Login to Bake' : 'Start Baking'} ♥ 
                    <div style={{ position: 'absolute', right: 20, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronRight size={18} strokeWidth={3} />
                    </div>
                  </>
                )}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
                <div style={{ flex: 1, height: 1, borderTop: '1px dashed #E5E5EA' }} />
                <span style={{ fontSize: '0.8rem', color: '#8C7A6B', fontWeight: 600 }}>♥ or continue with ♥</span>
                <div style={{ flex: 1, height: 1, borderTop: '1px dashed #E5E5EA' }} />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={handleGoogleLogin} style={{ flex: 1, background: 'white', border: '1px solid #F0F0F0', borderRadius: 16, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#4A3B32', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" style={{ width: 18 }} /> Google
                </motion.button>
                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => handleSocialStub('Apple')} style={{ flex: 1, background: 'white', border: '1px solid #F0F0F0', borderRadius: 16, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#4A3B32', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <img src="https://www.svgrepo.com/show/511330/apple-173.svg" alt="A" style={{ width: 18 }} /> Apple
                </motion.button>
                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => handleSocialStub('Facebook')} style={{ flex: 1, background: 'white', border: '1px solid #F0F0F0', borderRadius: 16, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#4A3B32', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="F" style={{ width: 18 }} /> Facebook
                </motion.button>
              </div>
            </motion.form>
          </AnimatePresence>

        </motion.div>
      </div>

      {/* Footer Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 20, marginBottom: 32 }}>
        <div style={{ background: '#FFF1F2', padding: '12px 24px', borderRadius: 99, border: '1px solid #FFE4E6', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&auto=format&fit=crop" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="cupcake" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#4A3B32', fontWeight: 600 }}>
              {mode === 'login' ? 'New to Cream & Crust?' : 'Already a member?'}
            </span>
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#FF6B8B', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {mode === 'login' ? 'Create your account' : 'Sign in to Bake'} 
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255, 107, 139, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={14} strokeWidth={3} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Features */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px 24px 24px', position: 'relative', zIndex: 20 }}>
        {[
          { icon: ShieldCheck, title: 'Secure', sub: 'Your data is 100% safe' },
          { icon: Cloud, title: 'Cloud Sync', sub: 'Access anywhere' },
          { icon: Heart, title: 'Made for Bakers', sub: 'Designed with love' },
          { icon: Clock, title: 'Save Time', sub: 'Automate & grow' },
        ].map((feat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, border: '1.5px solid #FF6B8B', color: '#FF6B8B', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
              <feat.icon size={18} strokeWidth={2.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4A3B32' }}>{feat.title}</span>
              <span style={{ fontSize: '0.6rem', color: '#8C7A6B', fontWeight: 600 }}>{feat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: skewX(-20deg) translateX(-150%); }
          50% { transform: skewX(-20deg) translateX(250%); }
          100% { transform: skewX(-20deg) translateX(250%); }
        }
      `}} />
    </div>
  );
}
