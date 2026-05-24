import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader, EyeOff, Eye, ChevronRight, Heart, Sparkles, Star } from 'lucide-react';
import { loginUser, registerUser, signInWithGoogle } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { triggerHaptic, showToast } from '../components/iOS';

// Floating background particles component
const FloatingParticles = () => {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.8, 0.3],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 8 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            color: i % 2 === 0 ? '#FF6B8B' : '#FFD166',
          }}
        >
          {i % 3 === 0 ? <Heart size={14 + Math.random()*10} /> : 
           i % 3 === 1 ? <Sparkles size={16 + Math.random()*12} /> : 
           <Star size={12 + Math.random()*8} />}
        </motion.div>
      ))}
    </div>
  );
};

export default function Login() {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentUser) triggerHaptic('success');
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(circle at top right, #FFE5EC 0%, #FFFFFF 60%, #FFF0F3 100%)',
      fontFamily: 'var(--font)',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      
      {/* Animated Background Particles */}
      <FloatingParticles />

      {/* Hero Mascot Animation */}
      <div style={{ 
        position: 'relative', 
        height: '45vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-end',
        zIndex: 5 
      }}>
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [-1, 2, -1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: '100%',
            maxWidth: '380px',
            height: '120%',
            position: 'absolute',
            bottom: '-10%',
            backgroundImage: 'url(/login_bg.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'bottom center',
            mixBlendMode: 'multiply', // Flawlessly blends the white background
            filter: 'drop-shadow(0 20px 30px rgba(255, 107, 139, 0.15))'
          }}
        />
        
        {/* Floating Greeting Bubble */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.5 }}
          style={{
            position: 'absolute',
            top: '15%',
            right: '10%',
            background: 'white',
            padding: '12px 20px',
            borderRadius: '24px 24px 24px 4px',
            boxShadow: '0 8px 24px rgba(255, 107, 139, 0.12)',
            border: '2px solid #FFE4E6',
            zIndex: 10
          }}
        >
          <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: '1.4rem', color: '#FF6B8B', fontWeight: 700 }}>
            Hi, Baker! ✨
          </span>
        </motion.div>
      </div>

      {/* Main Glassmorphic Card Container */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        padding: '0 24px 40px',
        position: 'relative',
        zIndex: 20
      }}>
        
        <motion.div 
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 25, delay: 0.1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: '48px',
            padding: '36px 28px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 24px 48px rgba(255, 107, 139, 0.12), inset 0 2px 0 rgba(255,255,255,1)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                fontFamily: 'Playfair Display, serif', 
                fontSize: '2.2rem', 
                fontWeight: 800,
                color: '#4A3B32', 
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              Cream & Crust
            </motion.h2>
            <p style={{ color: '#8C7A6B', fontSize: '0.9rem', fontWeight: 600, marginTop: 6 }}>
              {mode === 'login' ? "Welcome back, let's bake!" : "Start your sweet journey!"} 🧁
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }} 
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={(e) => { 
                e.preventDefault(); 
                if (mode === 'login') handleAction(() => loginUser(email, password)); 
                else handleAction(() => registerUser(email, password, name)); 
              }} 
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {mode === 'register' && (
                <motion.div whileFocus={{ scale: 1.02 }} style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#FFF', border: '2px solid #FFE4E6', borderRadius: 24, padding: '8px 12px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255,107,139,0.03)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 16, background: '#FFF0F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B8B' }}>
                    <User size={18} strokeWidth={3} />
                  </div>
                  <input type="text" required placeholder="Your beautiful name" value={name} onChange={e => setName(e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '0 16px', fontSize: '15px', color: '#4A3B32', fontWeight: 600 }} 
                  />
                </motion.div>
              )}

              <motion.div whileFocus={{ scale: 1.02 }} style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#FFF', border: '2px solid #FFE4E6', borderRadius: 24, padding: '8px 12px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255,107,139,0.03)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 16, background: '#FFF0F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B8B' }}>
                  <Mail size={18} strokeWidth={3} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 16 }}>
                  <input type="email" required placeholder="priya@bakery.com" value={email} onChange={e => setEmail(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: '15px', color: '#4A3B32', fontWeight: 600, padding: 0 }} 
                  />
                </div>
              </motion.div>

              <motion.div whileFocus={{ scale: 1.02 }} style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#FFF', border: '2px solid #FFE4E6', borderRadius: 24, padding: '8px 12px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255,107,139,0.03)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 16, background: '#FFF0F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B8B' }}>
                  <Lock size={18} strokeWidth={3} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 16 }}>
                  <input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: '18px', letterSpacing: '0.15em', color: '#4A3B32', fontWeight: 900, padding: 0, marginTop: 4 }} 
                  />
                </div>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', color: '#FF6B8B', cursor: 'pointer', padding: '0 12px' }}>
                  {showPassword ? <Eye size={18} strokeWidth={2.5} /> : <EyeOff size={18} strokeWidth={2.5} />}
                </button>
              </motion.div>

              {mode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 8px', marginTop: -4 }}>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#FF6B8B', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    Forgot Password?
                  </button>
                </div>
              )}

              <motion.button 
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #FF6B8B 0%, #FF8DA1 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 24,
                  padding: '20px',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 12,
                  boxShadow: '0 12px 24px rgba(255, 107, 139, 0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg) translateX(-150%)', animation: 'shimmer 2.5s infinite' }} />
                {loading ? <Loader className="spin" size={24} /> : (
                  <>
                    {mode === 'login' ? 'Let\'s Bake!' : 'Create Studio'} 
                    <ChevronRight size={20} strokeWidth={3} />
                  </>
                )}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                <div style={{ flex: 1, height: 2, background: '#FFF0F3', borderRadius: 2 }} />
                <span style={{ fontSize: '0.75rem', color: '#FF6B8B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR</span>
                <div style={{ flex: 1, height: 2, background: '#FFF0F3', borderRadius: 2 }} />
              </div>

              <motion.button 
                type="button" 
                whileTap={{ scale: 0.95 }} 
                onClick={handleGoogleLogin} 
                style={{ 
                  width: '100%', background: '#FFF', border: '2px solid #FFE4E6', 
                  borderRadius: 24, padding: '16px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', gap: 12, fontSize: '0.95rem', fontWeight: 700, 
                  color: '#4A3B32', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,107,139,0.05)' 
                }}
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 22 }} /> 
                Continue with Google
              </motion.button>
            </motion.form>
          </AnimatePresence>
        </motion.div>

        {/* Toggle Mode Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: 32 }}
        >
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ 
              background: 'rgba(255,255,255,0.9)', border: '1px solid #FFE4E6', padding: '12px 24px', 
              borderRadius: 99, color: '#4A3B32', fontSize: '0.9rem', fontWeight: 700, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 16px rgba(255, 107, 139, 0.08)'
            }}
          >
            {mode === 'login' ? "New here? " : "Already baking? "}
            <span style={{ color: '#FF6B8B' }}>
              {mode === 'login' ? 'Create an account' : 'Sign In'}
            </span>
          </button>
        </motion.div>

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
