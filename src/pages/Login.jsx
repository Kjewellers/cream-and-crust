import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader, Smartphone, Globe } from 'lucide-react';
import { loginUser, registerUser, signInWithGoogle, signInWithPhone, setupRecaptcha } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [otp, setOtp] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setupRecaptcha('recaptcha-container');
      const result = await signInWithPhone(phoneNumber);
      setVerificationId(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verificationId.confirm(otp);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser(email, password, name);
      } else {
        await loginUser(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  console.log("Rendering Login Page...");
  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div 
        className="card"
        style={{ width: '100%', maxWidth: 420, padding: 40, textAlign: 'center', opacity: 1, visibility: 'visible' }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 10 }}>🧁</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: 5 }}>Cream & Crust</h1>
        <p style={{ color: 'var(--text3)', marginBottom: 30 }}>
          {isRegistering ? 'Create your account' : 'Sign in to your account'}
        </p>

        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 15px', borderRadius: 'var(--radius-sm)', marginBottom: 20, fontSize: '0.85rem', textAlign: 'left' }}>
            {error}
          </div>
        )}

        {loginMethod === 'email' ? (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            {isRegistering && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text3)' }} />
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    style={{ paddingLeft: 40, width: '100%' }} 
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text3)' }} />
                <input 
                  type="email" 
                  required 
                  className="form-input" 
                  style={{ paddingLeft: 40, width: '100%' }} 
                  placeholder="hello@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text3)' }} />
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  style={{ paddingLeft: 40, width: '100%' }} 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10 }}
              disabled={loading}
            >
              {loading ? <Loader size={18} className="spin" /> : (
                <>
                  {isRegistering ? 'Create Account' : 'Sign In'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={verificationId ? handleVerifyOtp : handlePhoneLogin} style={{ textAlign: 'left' }}>
            {!verificationId ? (
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text3)' }} />
                  <input 
                    type="tel" 
                    required 
                    className="form-input" 
                    style={{ paddingLeft: 40, width: '100%' }} 
                    placeholder="+1 234 567 890"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Enter OTP</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text3)' }} />
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    style={{ paddingLeft: 40, width: '100%' }} 
                    placeholder="123456"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10 }}
              disabled={loading}
            >
              {loading ? <Loader size={18} className="spin" /> : (
                <>
                  {verificationId ? 'Verify OTP' : 'Send OTP'} <ArrowRight size={18} />
                </>
              )}
            </button>
            <div id="recaptcha-container"></div>
          </form>
        )}

        {!isRegistering && (
          <>
            <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Or continue with</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <button onClick={handleGoogleLogin} className="btn btn-outline" style={{ width: '100%', gap: 10 }}>
                <Globe size={18} /> Google
              </button>
              <button 
                onClick={() => setLoginMethod(loginMethod === 'email' ? 'phone' : 'email')} 
                className="btn btn-outline" 
                style={{ width: '100%', gap: 10 }}
              >
                {loginMethod === 'email' ? <Smartphone size={18} /> : <Mail size={18} />} 
                {loginMethod === 'email' ? 'Phone' : 'Email'}
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--text3)' }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            type="button" 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            {isRegistering ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
