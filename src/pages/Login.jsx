import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import {
  loginUser,
  registerUser,
  signInWithGoogle,
  resetPasswordByEmail,
  lookupEmailByPhone,
  loginWithPhone,
  resetPasswordViaPhone,
} from '../services/auth';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getVerifier, resetVerifier } from '../services/recaptchaManager';
import { triggerHaptic, showToast } from '../components/iOS';
import { withAuthTimeout } from '../utils/authTimeout';

/* ─── Palette ──────────────────────────────────────────────────────
   Warm bakery atelier palette consistent with the rest of the app.
   ────────────────────────────────────────────────────────────────── */
const C = {
  cream: '#FAF6F0',
  ivory: '#F4ECDD',
  paper: '#FFFFFF',
  ink: '#1F1611',
  mute: '#7C6B5E',
  hairline: '#E5DDD0',
  rose: '#B5606A',
  roseDeep: '#8B4951',
  roseSoft: '#F4DDD6',
  gold: '#B89968',
  goldHi: '#D8B97E',
};

const FONT_DISPLAY = '"Playfair Display", Georgia, serif';
const FONT_BODY = '"Inter", system-ui, -apple-system, sans-serif';

/* ─── Brand monogram seal (inline SVG, no asset deps) ─────────────── */
const Monogram = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="cc-seal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={C.rose} />
        <stop offset="100%" stopColor={C.goldHi} />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="29" fill="url(#cc-seal)" />
    <circle
      cx="32"
      cy="32"
      r="26"
      fill="none"
      stroke={C.cream}
      strokeOpacity="0.55"
      strokeWidth="0.6"
    />
    <text
      x="32"
      y="42"
      textAnchor="middle"
      fontFamily="Playfair Display, Georgia, serif"
      fontSize="28"
      fontStyle="italic"
      fontWeight="600"
      fill={C.cream}
      letterSpacing="-0.05em"
    >
      C&amp;C
    </text>
  </svg>
);

/* ─── Brand corner ornament (used as accent flourish) ────────────── */
const Flourish = ({ width = 80, color = C.gold, style }) => (
  <svg width={width} height={14} viewBox="0 0 80 14" style={style} aria-hidden="true">
    <path
      d="M2 7 H30 M50 7 H78 M40 7 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0"
      stroke={color}
      strokeWidth="0.8"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="40" cy="7" r="1.4" fill={color} />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09a7.12 7.12 0 010-4.18V7.07H2.18A11.99 11.99 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/* ─── Rotating taglines for the hero (auto-cycle) ────────────────── */
const TAGLINES = [
  'A studio for your sweetest work.',
  'Where every cake has a story.',
  'Your atelier, made simple.',
  'Built quietly, baked beautifully.',
];

/* ─── Field component (shared input shell) ───────────────────────── */
function Field({
  icon: Icon,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  onIconClick,
  iconAction,
  validIndicator,
  required,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: C.cream,
        border: `1.5px solid ${focused ? C.rose : C.hairline}`,
        transition: 'all 0.18s ease',
        boxShadow: focused ? `0 0 0 4px ${C.rose}1A` : 'inset 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: focused ? C.rose : C.mute,
          transition: 'color 0.18s ease',
        }}
      >
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: focused ? C.roseDeep : C.mute,
            marginBottom: 2,
            transition: 'color 0.18s ease',
          }}
        >
          {label}
        </div>
        <input
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: C.ink,
            fontFamily: FONT_BODY,
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '0.005em',
            outline: 'none',
          }}
        />
      </div>
      {validIndicator && (
        <span
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#10B981',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={13} strokeWidth={3} />
        </span>
      )}
      {iconAction && (
        <button
          type="button"
          onClick={onIconClick}
          aria-label={iconAction.label}
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: C.mute,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {iconAction.icon}
        </button>
      )}
    </label>
  );
}

/* ─── Password rule indicator ────────────────────────────────────── */
function PwRule({ ok, label }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: ok ? '#10B981' : C.mute,
        transition: 'color 0.2s',
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ok ? '#10B981' : 'rgba(0,0,0,0.06)',
          color: ok ? '#fff' : C.mute,
          fontSize: 9,
          fontWeight: 900,
          transition: 'all 0.2s',
        }}
      >
        {ok ? '✓' : '·'}
      </span>
      {label}
    </div>
  );
}

/* ─── Phone OTP Flow overlay ─────────────────────────────────────── */
function PhoneOtpFlow({
  onClose,
  phoneNumber,
  setPhoneNumber,
  otpCode,
  setOtpCode,
  otpSent,
  loading,
  loadingMessage,
  onSendOtp,
  onVerifyOtp,
}) {
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    let intval;
    if (otpSent && timer > 0) {
      intval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(intval);
  }, [otpSent, timer]);

  // Handle auto-verify when 6 digits are entered
  useEffect(() => {
    if (otpCode.length === 6 && !loading && otpSent) {
      onVerifyOtp();
    }
  }, [otpCode, loading, otpSent, onVerifyOtp]);

  // Derived UI State
  let state = 'input';
  if (loading && !otpSent) state = 'sending';
  if (!loading && otpSent) state = 'verify';
  if (loading && otpSent) state = 'verifying';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={state === 'input' ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(28, 20, 16, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#fff',
          borderRadius: 24,
          padding: '32px 24px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {state === 'verify' && (
          <button
            onClick={() => {
              // Hack to go back: just close the modal for now, or reset parent state.
              // We'll just close it so they can reopen it to start fresh.
              onClose();
            }}
            style={{
              position: 'absolute',
              top: 24,
              left: 20,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.mute,
            }}
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Dynamic Header / Graphic */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          {state === 'input' && (
            <>
              <div style={{ fontSize: 56, marginBottom: 8, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}>🧁</div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, margin: '0 0 8px', color: C.ink }}>Login with Phone</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: C.mute, lineHeight: 1.4 }}>
                Manage orders, customers, and<br/>grow your bakery business.
              </p>
            </>
          )}

          {state === 'sending' && (
            <>
              <div style={{ fontSize: 56, marginBottom: 16, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}>🧁</div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, margin: '0 0 8px', color: C.ink }}>Sending OTP...</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: C.mute }}>Verifying your number.</p>
              <div style={{ marginTop: 24, display: 'flex', gap: 6, justifyContent: 'center' }}>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} style={{ width: 8, height: 8, borderRadius: '50%', background: C.rose }} />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold }} />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} style={{ width: 8, height: 8, borderRadius: '50%', background: C.mute }} />
              </div>
            </>
          )}

          {state === 'verify' && (
            <>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, margin: '0 0 8px', color: C.ink }}>Verify Your Number</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: C.mute }}>
                OTP sent to <span style={{ color: C.roseDeep, fontWeight: 600, letterSpacing: '0.02em' }}>{phoneNumber}</span>
              </p>
            </>
          )}

          {state === 'verifying' && (
            <>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                <div style={{ fontSize: 56, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}>🧁</div>
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#fff', borderRadius: '50%', padding: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <ShieldCheck size={24} color="#10B981" fill="#D1FAE5" />
                </div>
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, margin: '0 0 8px', color: C.ink }}>Verifying OTP...</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: C.mute }}>Please wait while we verify your code.</p>
            </>
          )}
        </div>

        {/* Input Phase */}
        {state === 'input' && (
          <div style={{ width: '100%' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 16,
                background: C.cream,
                border: `1.5px solid ${C.ivory}`,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12, borderRight: `1.5px solid ${C.hairline}` }}>
                <span style={{ fontSize: 18 }}>🇮🇳</span>
                <span style={{ fontWeight: 600, color: C.ink, fontSize: 15 }}>+91</span>
              </div>
              <input
                type="tel"
                value={phoneNumber.replace('+91', '')}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber('+91' + cleaned);
                }}
                placeholder="98765 43210"
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: FONT_BODY,
                  color: C.ink,
                  outline: 'none',
                  letterSpacing: '0.04em',
                }}
                autoFocus
              />
            </label>
            <button
              type="button"
              onClick={onSendOtp}
              disabled={phoneNumber.replace(/\D/g, '').length !== 12}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                border: 'none',
                background: C.rose,
                color: '#fff',
                fontFamily: FONT_BODY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: phoneNumber.replace(/\D/g, '').length !== 12 ? 0.5 : 1,
                boxShadow: `0 8px 24px ${C.rose}40`,
                transition: 'opacity 0.2s',
              }}
            >
              Continue
            </button>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: C.mute, marginTop: 16, marginBottom: 0, lineHeight: 1.4 }}>
              By continuing, you agree to our<br/>
              <span style={{ color: C.rose, textDecoration: 'underline' }}>Terms of Service</span> & <span style={{ color: C.rose, textDecoration: 'underline' }}>Privacy Policy</span>
            </p>
          </div>
        )}

        {/* Sending State (Informational box) */}
        {state === 'sending' && (
          <div style={{
            background: C.cream,
            borderRadius: 16,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
          }}>
            <ShieldCheck size={20} color={C.mute} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>This usually takes</div>
              <div style={{ fontSize: 12, color: C.mute }}>5-15 seconds</div>
            </div>
          </div>
        )}

        {/* Verify State */}
        {state === 'verify' && (
          <div style={{ width: '100%' }}>
            {/* Native-feeling OTP boxes */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <input
                type="tel"
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'text',
                  zIndex: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const digit = otpCode[i] || '';
                  const isActive = otpCode.length === i;
                  return (
                    <div
                      key={i}
                      style={{
                        width: 42,
                        height: 52,
                        borderRadius: 12,
                        border: `1.5px solid ${isActive ? C.rose : (digit ? C.mute : C.ivory)}`,
                        background: digit ? '#fff' : C.cream,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.ink,
                        transition: 'all 0.2s',
                        boxShadow: isActive ? `0 0 0 3px ${C.roseSoft}` : 'none',
                      }}
                    >
                      {digit}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: C.mute, marginBottom: 4 }}>Didn't receive OTP?</div>
              <button
                type="button"
                disabled={timer > 0}
                onClick={() => {
                  setTimer(30);
                  setOtpCode('');
                  onSendOtp();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: timer > 0 ? C.mute : C.rose,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: timer > 0 ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                {timer > 0 ? `Resend in 00:${timer.toString().padStart(2, '0')}` : 'Resend OTP'}
              </button>
            </div>

            <button
              type="button"
              onClick={onVerifyOtp}
              disabled={otpCode.length !== 6}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                border: 'none',
                background: C.rose,
                color: '#fff',
                fontFamily: FONT_BODY,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: otpCode.length !== 6 ? 0.5 : 1,
                boxShadow: `0 8px 24px ${C.rose}40`,
                marginBottom: 16,
              }}
            >
              Verify OTP
            </button>

            <div style={{
              background: C.cream,
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              width: '100%',
            }}>
              <ShieldCheck size={18} color={C.mute} style={{ marginTop: 2 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Your data is safe</div>
                <div style={{ fontSize: 11.5, color: C.mute }}>We never share your number.</div>
              </div>
            </div>
          </div>
        )}

        {/* Verifying State (Informational box) */}
        {state === 'verifying' && (
          <div style={{
            background: C.cream,
            borderRadius: 16,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
          }}>
            <Lock size={20} color={C.mute} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>This won't take long</div>
              <div style={{ fontSize: 12, color: C.mute }}>Hang tight!</div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Forgot Password Flow overlay ───────────────────────────────── */
function ForgotPasswordFlow({ onClose }) {
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'sending' | 'sent' | 'phone_otp' | 'phone_new_password'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');

  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  // RecaptchaVerifier is managed by the singleton recaptchaManager module.
  // No useRef, no useEffect — avoids StrictMode double-mount and
  // destroy-on-close/create-on-open cycling bugs.

  const handleResetViaEmail = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStep('sending');
    try {
      await withAuthTimeout(resetPasswordByEmail(trimmed), 12000, 'Password reset');
      const [local, domain] = trimmed.split('@');
      const masked =
        local.length <= 2
          ? `${local[0]}***@${domain}`
          : `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local.slice(-1)}@${domain}`;
      setMaskedEmail(masked);
      setStep('sent');
      triggerHaptic('success');
    } catch (err) {
      console.error('Reset email error:', err);
      setStep('input');
      const msgs = {
        'auth/invalid-email': 'That doesn\'t look like a valid email.',
        'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
        'auth/timeout': 'Request timed out. Please check your connection.',
      };
      setError(msgs[err?.code] || 'Reset link sent if an account exists with that email.');
      // Show success anyway to prevent user enumeration
      if (!msgs[err?.code]) {
        setMaskedEmail(resetEmail.trim());
        setStep('sent');
      }
    }
  };

  const handleSendOtp = async () => {
    const digits = resetPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid phone number (at least 10 digits).');
      return;
    }
    const fullPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    setError('');
    
    const t0 = performance.now();
    setStep('sending');
    setLoadingMessage('Verifying...');
    
    try {
      console.log(`[Auth] [Timing] Forgot Password OTP Request Started`);
      const t_lookup0 = performance.now();
      await withAuthTimeout(lookupEmailByPhone(resetPhone), 12000, 'Phone lookup');
      const t_lookup1 = performance.now();
      console.log(`[Auth] [Timing] Phone lookup took ${(t_lookup1 - t_lookup0).toFixed(2)}ms`);

      const t1 = performance.now();
      setLoadingMessage('Sending OTP...');
      const verifier = await getVerifier();
      const result = await withAuthTimeout(signInWithPhoneNumber(auth, fullPhone, verifier), 12000, 'OTP request');
      const t2 = performance.now();
      console.log(`[Auth] [Timing] Firebase OTP Request took ${(t2 - t1).toFixed(2)}ms`);
      console.log(`[Auth] [Timing] Total Time to OTP Sent: ${(t2 - t0).toFixed(2)}ms`);

      // Token is consumed after successful send — reset for Resend
      resetVerifier();

      setConfirmationResult(result);
      setStep('phone_otp');
      triggerHaptic('success');

    } catch (err) {
      console.error('[Auth] Phone reset error:', err);
      // Reset verifier on failure so next attempt gets a fresh one
      resetVerifier();
      if (step !== 'phone_otp') setStep('input');
      const msgs = {
        'auth/timeout': 'Request timed out. Please try again.',
      };
      setError(msgs[err?.code] || err?.message || 'Could not find an account with that phone number.');
    } finally {
      setLoadingMessage('');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setError('');
    setStep('sending');
    try {
      await withAuthTimeout(confirmationResult.confirm(otpCode), 12000, 'OTP verify');
      setStep('phone_new_password');
      triggerHaptic('success');
    } catch (err) {
      setStep('phone_otp');
      setError(err?.code === 'auth/timeout' ? 'Verification timed out.' : 'Invalid OTP code. Please try again.');
    }
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep('sending');
    try {
      await withAuthTimeout(resetPasswordViaPhone(newPassword), 12000, 'Password update');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      setStep('sent');
      triggerHaptic('success');
    } catch (err) {
      setStep('phone_new_password');
      setError(err?.code === 'auth/timeout' ? 'Update timed out.' : 'Failed to update password. ' + (err.message || ''));
    }
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: '12px',
    background: active ? `${C.rose}15` : 'transparent',
    color: active ? C.roseDeep : C.mute,
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(28, 20, 16, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 24,
          padding: '28px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: '#fff',
            }}
          >
            <KeyRound size={22} strokeWidth={2} />
          </div>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              fontWeight: 700,
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
              color: C.ink,
            }}
          >
            {step === 'sent' ? (method === 'phone' ? 'Password Updated!' : 'Check Your Inbox') : 'Reset Password'}
          </h3>
          <p style={{ fontSize: 13, color: C.mute, margin: 0, lineHeight: 1.5 }}>
            {step === 'sent'
              ? (method === 'phone' ? 'Your password has been successfully changed.' : 'We\'ve sent a password reset link')
              : 'Enter your email or phone number to reset your password'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'sent' ? (
            /* ── Success state ───────────────────── */
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '4px 0',
                }}
              >
                <CheckCircle2 size={30} color="#10B981" strokeWidth={2} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.ink,
                  }}
                >
                  Reset link sent to
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.rose,
                    fontFamily: 'ui-monospace, monospace',
                    letterSpacing: '0.02em',
                  }}
                >
                  {maskedEmail}
                </p>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: C.mute,
                  textAlign: 'center',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Check your inbox and spam folder. The link expires in 1 hour.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
                  color: '#fff',
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: `0 8px 20px ${C.rose}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <ArrowLeft size={16} strokeWidth={2.4} />
                Back to Login
              </button>
            </motion.div>
          ) : step === 'phone_otp' || step === 'phone_new_password' ? (
            /* ── OTP / New Password state ───────────────────── */
            <motion.div
              key="otp-pw"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {step === 'phone_otp' ? (
                  <>
                    <input
                      type="number"
                      value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value); setError(''); }}
                      placeholder="Enter 6-digit OTP"
                      autoFocus
                      style={{ padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${error ? '#EF4444' : C.hairline}`, background: C.cream, fontSize: 16, outline: 'none' }}
                    />
                    {error && <p style={{ color: '#EF4444', fontSize: 12, margin: 0 }}>{error}</p>}
                    <button onClick={handleVerifyOtp} style={{ background: C.ink, color: '#fff', padding: '12px', borderRadius: 14, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                      Verify OTP
                    </button>
                    <button 
                      onClick={handleSendOtp} 
                      disabled={step === 'sending'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: C.rose,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '8px'
                      }}
                    >
                      {step === 'sending' ? (loadingMessage || 'Sending...') : 'Resend OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Enter new password (min 6 chars)"
                      autoFocus
                      style={{ padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${error ? '#EF4444' : C.hairline}`, background: C.cream, fontSize: 16, outline: 'none' }}
                    />
                    {error && <p style={{ color: '#EF4444', fontSize: 12, margin: 0 }}>{error}</p>}
                    <button onClick={handleSetNewPassword} style={{ background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`, color: '#fff', padding: '12px', borderRadius: 14, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                      Update Password
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            /* ── Input state ───────────────────── */
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: C.cream,
                  padding: '4px',
                  borderRadius: '16px',
                  marginBottom: '16px',
                  border: `1.5px solid ${C.hairline}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => { setMethod('email'); setError(''); }}
                  style={tabStyle(method === 'email')}
                >
                  <Mail size={14} /> Email
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('phone'); setError(''); }}
                  style={tabStyle(method === 'phone')}
                >
                  <Phone size={14} /> Phone
                </button>
              </div>

              {/* Input field */}
              <AnimatePresence mode="wait">
                {method === 'email' ? (
                  <motion.label
                    key="email-input"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: C.cream,
                      border: `1.5px solid ${error ? '#EF4444' : C.hairline}`,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Mail size={18} color={C.mute} strokeWidth={1.8} />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => { setResetEmail(e.target.value); setError(''); }}
                      placeholder="your@email.com"
                      autoFocus
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: 15,
                        fontWeight: 500,
                        fontFamily: FONT_BODY,
                        color: C.ink,
                        outline: 'none',
                      }}
                    />
                  </motion.label>
                ) : (
                  <motion.label
                    key="phone-input"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: C.cream,
                      border: `1.5px solid ${error ? '#EF4444' : C.hairline}`,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🇮🇳</span>
                    <input
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => { setResetPhone(e.target.value); setError(''); }}
                      placeholder="+91 98765 43210"
                      autoFocus
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: FONT_BODY,
                        color: C.ink,
                        outline: 'none',
                        letterSpacing: '0.02em',
                      }}
                    />
                  </motion.label>
                )}
              </AnimatePresence>

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#EF4444',
                    padding: '0 4px',
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </motion.p>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={method === 'email' ? handleResetViaEmail : handleSendOtp}
                disabled={step === 'sending'}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
                  color: '#fff',
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: step === 'sending' ? 'wait' : 'pointer',
                  opacity: step === 'sending' ? 0.6 : 1,
                  boxShadow: `0 8px 20px ${C.rose}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s',
                }}
              >
                {step === 'sending' ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        animation: 'cc-spin 0.8s linear infinite',
                        display: 'inline-block',
                      }}
                    />
                    {method === 'phone' ? (loadingMessage || 'Looking up...') : 'Sending...'}
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              {/* Hint */}
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  color: C.mute,
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                {method === 'phone'
                  ? 'We\'ll find the email linked to your phone and send a reset link there.'
                  : 'We\'ll send a secure link to reset your password.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel / close */}
        {step !== 'sent' && (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '10px',
              border: 'none',
              background: 'transparent',
              color: C.mute,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT_BODY,
            }}
          >
            Cancel
          </button>
        )}
        {/* reCAPTCHA is rendered in the persistent #recaptcha-root div in index.html */}
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Login component ───────────────────────────────────────── */
export default function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // When user types a phone number in the email field, we look up their email
  // and store it here. A non-empty value means we're in "phone login" mode.
  const [resolvedEmail, setResolvedEmail] = useState(''); // email matched from phone
  const [phoneInputValue, setPhoneInputValue] = useState(''); // raw phone the user typed
  const [phoneLookupHint, setPhoneLookupHint] = useState(''); // display hint text
  const [phoneLookupStatus, setPhoneLookupStatus] = useState(''); // 'searching'|'found'|'notfound'|''
  const heroRef = useRef(null);
  // RecaptchaVerifier is managed by the singleton recaptchaManager module.
  // No useRef, no useEffect — avoids StrictMode double-mount and
  // destroy-on-close/create-on-open cycling bugs.

  // Rotate taglines every 5.5s
  useEffect(() => {
    const id = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 5500);
    return () => clearInterval(id);
  }, []);

  // Subtle parallax on the hero panel (desktop only) when mouse moves
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 920px)');
    if (!mq.matches) return undefined;
    const onMove = (e) => {
      const el = heroRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--orb-x', `${px * 14}px`);
      el.style.setProperty('--orb-y', `${py * 14}px`);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()), [email]);

  // canSubmit: allow either a valid email OR a resolved phone (phone → email lookup succeeded)
  const hasValidIdentifier = emailValid || (resolvedEmail.length > 0 && phoneInputValue.length > 0);

  // ── Strict password rules ──────────────────────────────────────
  // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special
  const pwHasUpper = /[A-Z]/.test(password);
  const pwHasLower = /[a-z]/.test(password);
  const pwHasDigit = /\d/.test(password);
  const pwHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const pwLongEnough = password.length >= 8;
  const passwordOk = pwLongEnough && pwHasUpper && pwHasLower && pwHasDigit && pwHasSpecial;

  // ── Strict name rules (register only) ──────────────────────────
  // 2-50 chars, letters and spaces only
  const nameClean = name.trim();
  const nameValid =
    nameClean.length >= 2 &&
    nameClean.length <= 50 &&
    /^[a-zA-Z\u00C0-\u024F\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u4E00-\u9FFF\s]+$/.test(
      nameClean
    );

  const canSubmit = hasValidIdentifier && passwordOk && (mode === 'login' || nameValid);

  const detectCaps = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'));
    }
  };

  const act = async (fn, operationName = 'Authentication') => {
    if (loading) return;
    setLoading(true);
    try {
      triggerHaptic('light');
    } catch (_) {}
    try {
      await withAuthTimeout(fn(), 12000, operationName);
      // Explicitly release loading state on success to prevent UI freezing 
      // if unmounting takes time or fails.
      setLoading(false);
    } catch (err) {
      const message = err?.message || 'Authentication failed.';
      // Friendlier copy for known firebase auth codes
      const codeMap = {
        'auth/invalid-credential': 'Email or password incorrect. Try again.',
        'auth/wrong-password': "That password doesn't match the account.",
        'auth/user-not-found': 'No account with that email yet. Try registering.',
        'auth/email-already-in-use': 'An account already exists with that email.',
        'auth/weak-password':
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
        'auth/network-request-failed': 'Network hiccup. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
        'auth/popup-closed-by-user': 'Sign-in was cancelled.',
        'auth/timeout': 'Login timed out. Check your connection and try again.',
      };
      const friendly = err?.code && codeMap[err.code] ? codeMap[err.code] : message;
      showToast(friendly, 'error');
      try {
        triggerHaptic('error');
      } catch (_) {}
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      // Specific error messages for each validation rule
      if (mode === 'register' && !nameClean) {
        showToast('Please enter your name', 'error');
      } else if (mode === 'register' && nameClean.length < 2) {
        showToast('Name must be at least 2 characters', 'error');
      } else if (mode === 'register' && nameClean.length > 50) {
        showToast('Name must be under 50 characters', 'error');
      } else if (mode === 'register' && !nameValid) {
        showToast('Name can only contain letters and spaces', 'error');
      } else if (!emailValid) {
        showToast('Enter a valid email address', 'error');
      } else if (!pwLongEnough) {
        showToast('Password must be at least 8 characters', 'error');
      } else if (!pwHasUpper) {
        showToast('Password needs at least one uppercase letter (A-Z)', 'error');
      } else if (!pwHasLower) {
        showToast('Password needs at least one lowercase letter (a-z)', 'error');
      } else if (!pwHasDigit) {
        showToast('Password needs at least one number (0-9)', 'error');
      } else if (!pwHasSpecial) {
        showToast('Password needs at least one special character (!@#$...)', 'error');
      }
      return;
    }
    if (mode === 'login') {
      // Phone login: use the looked-up email internally
      if (resolvedEmail && phoneInputValue) {
        act(() => loginWithPhone(phoneInputValue, password), 'Phone login');
      } else {
        act(() => loginUser(email.trim(), password), 'Email login');
      }
    } else {
      act(() => registerUser(email.trim(), password, nameClean), 'Registration');
    }
  };

  const handleForgot = () => {
    setShowForgotPassword(true);
  };

  // ── Phone-as-login: detect phone input in the email field ───────
  // When the user types a phone number instead of an email, we detect
  // it, run a Firestore lookup, and store the resolved email separately.
  // The email field itself is NOT modified — we keep what the user typed.
  const phoneLookupTimerRef = useRef(null);
  const handleEmailChange = useCallback(
    (e) => {
      const val = e.target.value;
      setEmail(val);
      setPhoneLookupHint('');
      setResolvedEmail('');
      setPhoneInputValue('');
      setPhoneLookupStatus('');

      // Cancel any pending debounce
      if (phoneLookupTimerRef.current) {
        clearTimeout(phoneLookupTimerRef.current);
        phoneLookupTimerRef.current = null;
      }

      // Detect phone number: purely digits (10+) or starts with +
      const stripped = val.replace(/[\s\-()]/g, '');
      const isPhoneInput =
        (stripped.startsWith('+') && stripped.replace(/\D/g, '').length >= 10) ||
        (/^\d+$/.test(stripped) && stripped.length >= 10);

      if (isPhoneInput && mode === 'login') {
        setPhoneLookupStatus('searching');
        setPhoneLookupHint('Looking up your account...');
        // Debounce by 700ms
        phoneLookupTimerRef.current = setTimeout(async () => {
          try {
            const result = await withAuthTimeout(lookupEmailByPhone(stripped), 10000, 'Phone check');
            setResolvedEmail(result.email);
            setPhoneInputValue(stripped);
            setPhoneLookupHint(`✓ Account found — enter your password to sign in`);
            setPhoneLookupStatus('found');
            triggerHaptic('light');
          } catch {
            setPhoneLookupHint('No account linked to this number. Try your email instead.');
            setPhoneLookupStatus('notfound');
          }
        }, 700);
      }
    },
    [mode]
  );

  // ── Phone OTP handlers ──────────────────────────────────────────
  const handleSendOtp = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      showToast('Enter a valid phone number with country code', 'error');
      return;
    }
    const fullPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

    const t0 = performance.now();
    setLoading(true);
    setLoadingMessage('Verifying...');

    try {
      console.log(`[Auth] [Timing] OTP Request Started`);

      const t1 = performance.now();
      setLoadingMessage('Sending OTP...');
      const verifier = await getVerifier();
      const result = await withAuthTimeout(signInWithPhoneNumber(auth, fullPhone, verifier), 15000, 'Send OTP');

      const t2 = performance.now();
      console.log(`[Auth] [Timing] Firebase Request & Response took ${(t2 - t1).toFixed(2)}ms`);
      console.log(`[Auth] [Timing] Total Time to OTP Sent: ${(t2 - t0).toFixed(2)}ms`);

      // Token is consumed after successful send — reset for Resend
      resetVerifier();

      setConfirmationResult(result);
      setOtpSent(true);
      triggerHaptic('success');
      showToast('OTP sent! Check your messages', 'success');

    } catch (err) {
      console.error('[Auth] OTP send error:', err);
      // Reset verifier on failure so next attempt gets a fresh one
      resetVerifier();
      const msgs = {
        'auth/invalid-phone-number': 'Invalid phone number. Include country code (e.g. +91...)',
        'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
        'auth/captcha-check-failed': 'reCAPTCHA verification failed. Refresh and try again.',
        'auth/timeout': 'Request timed out. Please try again.',
      };
      showToast(msgs[err?.code] || err?.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) {
      showToast('Please request OTP first', 'error');
      return;
    }
    if (otpCode.length !== 6) {
      showToast('Enter the 6-digit OTP', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await withAuthTimeout(confirmationResult.confirm(otpCode), 12000, 'Verify OTP');
      const user = result.user;
      triggerHaptic('success');

      // Create user doc if first time
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: user.displayName || user.phoneNumber || 'Baker',
          phone: user.phoneNumber,
          role: 'admin',
          createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'business', user.uid), {
          name: 'Cream & Crust',
          logo: '🧁',
          phone: user.phoneNumber,
          username: 'baker' + Math.floor(100 + Math.random() * 900),
          uid: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      showToast('Welcome! 🎉', 'success');
    } catch (err) {
      console.error('OTP verify error:', err);
      const msgs = {
        'auth/invalid-verification-code': 'Wrong OTP. Check and try again.',
        'auth/code-expired': 'OTP expired. Request a new one.',
        'auth/timeout': 'Verification timed out. Try again.',
      };
      showToast(msgs[err?.code] || 'Verification failed', 'error');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cc-login-shell">
      {/* Inline fonts only (project convention) */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600;700;800&display=swap"
      />

      {/* ── Hero panel (left on desktop, slim header on mobile) ──── */}
      <aside className="cc-login-hero" ref={heroRef}>
        {/* Decorative orbs that follow cursor on desktop */}
        <div className="cc-orb cc-orb-1" />
        <div className="cc-orb cc-orb-2" />
        <div className="cc-orb cc-orb-3" />

        {/* SVG paper grain */}
        <div className="cc-grain" aria-hidden="true" />

        {/* Top brand strip */}
        <div className="cc-brand-strip">
          <Monogram size={48} />
          <div>
            <div className="cc-brand-name">Cream &amp; Crust</div>
            <div className="cc-brand-kicker">Bakery Atelier</div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="cc-hero-copy">
          <div className="cc-hero-eyebrow">
            <Flourish width={36} color={C.gold} />
            <span>Welcome to your studio</span>
            <Flourish width={36} color={C.gold} />
          </div>

          <h1 className="cc-hero-title">
            Bake <em>beautifully</em>,
            <br />
            run effortlessly.
          </h1>

          <div className="cc-hero-tag-wrap">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5 }}
                className="cc-hero-tag"
              >
                {TAGLINES[taglineIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Quiet stats line */}
          <div className="cc-hero-stats">
            <div>
              <strong>10,000+</strong>
              <span>home bakers</span>
            </div>
            <div className="cc-hero-divider" />
            <div>
              <strong>200K+</strong>
              <span>orders shipped</span>
            </div>
            <div className="cc-hero-divider" />
            <div>
              <strong>4.9 ★</strong>
              <span>average rating</span>
            </div>
          </div>
        </div>

        {/* Footer line on hero */}
        <div className="cc-hero-foot">
          <ShieldCheck size={13} color={C.gold} strokeWidth={1.8} />
          <span>End-to-end encrypted &middot; Made in India</span>
        </div>
      </aside>

      {/* ── Form panel (right on desktop, below hero on mobile) ──── */}
      <main className="cc-login-form-panel">
        <motion.section
          className="cc-login-card"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          <div className="cc-card-head">
            <div className="cc-card-eyebrow">
              <Sparkles size={11} />
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </div>
            <h2>{mode === 'login' ? 'Welcome back.' : 'Start your studio.'}</h2>
            <p>
              {mode === 'login'
                ? 'Continue where you left off.'
                : 'A few details and your atelier is ready.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 10 : -10 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleSubmit}
              className="cc-form"
            >
              {mode === 'register' && (
                <Field
                  icon={User}
                  label="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Riya Sharma"
                  autoComplete="name"
                  required
                />
              )}

              <div>
                <Field
                  icon={Mail}
                  label={mode === 'login' ? 'Email or Phone' : 'Email'}
                  type={mode === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={mode === 'login' ? handleEmailChange : (e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'Email or phone number' : 'riya@yourbakery.com'}
                  autoComplete={mode === 'login' ? 'username' : 'email'}
                  validIndicator={emailValid}
                  required
                />
                {phoneLookupHint && mode === 'login' && (
                  <div
                    style={{
                      margin: '6px 4px 0',
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      color:
                        phoneLookupStatus === 'found'
                          ? '#10B981'
                          : phoneLookupStatus === 'notfound'
                          ? '#EF4444'
                          : C.gold,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {phoneLookupStatus === 'found' && <Check size={12} strokeWidth={3} />}
                    {phoneLookupStatus === 'notfound' && <Search size={12} strokeWidth={2} />}
                    {phoneLookupStatus === 'searching' && (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          border: `1.5px solid ${C.gold}`,
                          borderTopColor: 'transparent',
                          display: 'inline-block',
                          animation: 'cc-spin 0.7s linear infinite',
                        }}
                      />
                    )}
                    {phoneLookupHint}
                  </div>
                )}
              </div>

              <div>
                <Field
                  icon={Lock}
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onIconClick={() => setShowPw((v) => !v)}
                  iconAction={{
                    icon: showPw ? <Eye size={17} /> : <EyeOff size={17} />,
                    label: showPw ? 'Hide password' : 'Show password',
                  }}
                  placeholder="Min 8 chars, A-z, 0-9, !@#"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                {capsOn && (
                  <div className="cc-caps-warn">
                    <span className="cc-caps-dot" /> Caps Lock is on
                  </div>
                )}
                {mode === 'register' && password.length > 0 && (
                  <div className="cc-pw-rules">
                    <PwRule ok={pwLongEnough} label="8+ characters" />
                    <PwRule ok={pwHasUpper} label="Uppercase (A-Z)" />
                    <PwRule ok={pwHasLower} label="Lowercase (a-z)" />
                    <PwRule ok={pwHasDigit} label="Number (0-9)" />
                    <PwRule ok={pwHasSpecial} label="Special (!@#$...)" />
                  </div>
                )}
              </div>

              {/* Hidden listener for caps lock detection */}
              <input
                type="text"
                aria-hidden="true"
                tabIndex={-1}
                onKeyUp={detectCaps}
                onKeyDown={detectCaps}
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: 'none',
                  top: -100,
                }}
              />

              {mode === 'login' && (
                <div className="cc-options">
                  <label className="cc-remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" onClick={handleForgot} className="cc-link">
                    Forgot password?
                  </button>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading || !canSubmit}
                whileTap={{ scale: 0.98 }}
                className="cc-submit"
              >
                {loading ? (
                  <span className="cc-loading">
                    <span className="cc-spinner" />
                    <span>Signing you in</span>
                  </span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Studio'}</span>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </>
                )}
              </motion.button>

              {/* Or divider */}
              <div className="cc-or">
                <Flourish width={50} color={C.gold} />
                <span>or</span>
                <Flourish width={50} color={C.gold} />
              </div>

              {/* Single Google sign-in (Apple/Facebook removed — they were
                  showing "coming soon" toasts and felt like dead weight) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                className="cc-google"
                onClick={() => act(() => signInWithGoogle(), 'Google login')}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </motion.button>

              {/* Phone OTP sign-in */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                className="cc-phone-btn"
                onClick={() => setShowPhoneLogin(true)}
                disabled={loading}
              >
                <Phone size={18} strokeWidth={2} />
                <span>Continue with Phone</span>
              </motion.button>

              {/* Terms of Service Disclaimer */}
              <p style={{
                textAlign: 'center',
                fontSize: 12,
                color: C.mute,
                marginTop: 24,
                marginBottom: 0,
                lineHeight: 1.5,
              }}>
                By continuing, you agree to our <a href="#" style={{ color: C.ink, textDecoration: 'none', borderBottom: `1px solid ${C.hairline}` }}>Terms of Service</a> and <a href="#" style={{ color: C.ink, textDecoration: 'none', borderBottom: `1px solid ${C.hairline}` }}>Privacy Policy</a>.
              </p>
            </motion.form>
          </AnimatePresence>

          {/* Phone OTP modal */}
          <AnimatePresence>
            {showPhoneLogin && (
              <PhoneOtpFlow
                onClose={() => {
                  setShowPhoneLogin(false);
                  setPhoneNumber('');
                  setOtpCode('');
                  setConfirmationResult(null);
                  setOtpSent(false);
                }}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                otpSent={otpSent}
                loading={loading}
                loadingMessage={loadingMessage}
                onSendOtp={handleSendOtp}
                onVerifyOtp={handleVerifyOtp}
              />
            )}
          </AnimatePresence>

          {/* Forgot Password modal */}
          <AnimatePresence>
            {showForgotPassword && (
              <ForgotPasswordFlow
                onClose={() => setShowForgotPassword(false)}
              />
            )}
          </AnimatePresence>

          {/* Mode toggle */}
          <div className="cc-mode-toggle">
            <span>{mode === 'login' ? 'New to Cream & Crust?' : 'Already have an account?'}</span>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="cc-mode-link"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
              <ArrowUpRight size={13} strokeWidth={2.4} />
            </button>
          </div>
        </motion.section>

        {/* Footer below the card */}
        <footer className="cc-login-footer">
          <span>&copy; {new Date().getFullYear()} Cream &amp; Crust</span>
          <span aria-hidden="true">&middot;</span>
          <span>Crafted in India</span>
        </footer>
        {/* reCAPTCHA is rendered in the persistent #recaptcha-root div in index.html */}
      </main>

      <style>{`
        .cc-login-shell {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr;
          font-family: ${FONT_BODY};
          color: ${C.ink};
          background: ${C.cream};
        }

        @media (min-width: 920px) {
          .cc-login-shell {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          }
        }

        /* ── Hero panel ─────────────────────────────────────── */
        .cc-login-hero {
          position: relative;
          overflow: hidden;
          padding: 24px 22px 18px;
          background:
            radial-gradient(circle at 20% 20%, ${C.roseSoft}88 0%, transparent 55%),
            radial-gradient(circle at 80% 75%, ${C.goldHi}3D 0%, transparent 50%),
            linear-gradient(160deg, ${C.cream} 0%, ${C.ivory} 100%);
          color: ${C.ink};
          display: flex;
          flex-direction: column;
          gap: 16px;
          --orb-x: 0px;
          --orb-y: 0px;
        }

        @media (min-width: 920px) {
          .cc-login-hero {
            min-height: 100dvh;
            padding: 56px 56px 40px;
            gap: 36px;
          }
        }

        /* Hide stats and hero foot on mobile to save space */
        @media (max-width: 919px) {
          .cc-hero-stats { display: none !important; }
          .cc-hero-foot { display: none !important; }
          .cc-hero-title { font-size: 28px !important; }
          .cc-hero-tag-wrap { height: 22px; }
          .cc-hero-tag { font-size: 13px !important; }
        }

        .cc-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.55;
          background-image:
            url("data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.10  0 0 0 0.025 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>`
            )}");
          mix-blend-mode: multiply;
        }

        .cc-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
          transition: transform 0.4s ease-out;
        }
        .cc-orb-1 {
          width: 280px; height: 280px;
          top: -60px; left: -40px;
          background: radial-gradient(circle, ${C.rose}33, transparent 70%);
          transform: translate(var(--orb-x), var(--orb-y));
        }
        .cc-orb-2 {
          width: 240px; height: 240px;
          bottom: -50px; right: -30px;
          background: radial-gradient(circle, ${C.goldHi}3D, transparent 70%);
          transform: translate(calc(var(--orb-x) * -1), calc(var(--orb-y) * -1));
        }
        .cc-orb-3 {
          width: 180px; height: 180px;
          top: 50%; left: 60%;
          background: radial-gradient(circle, ${C.roseSoft}88, transparent 70%);
          transform: translate(calc(var(--orb-x) * 0.6), calc(var(--orb-y) * 0.6));
        }

        .cc-brand-strip {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }

        .cc-brand-name {
          font-family: ${FONT_DISPLAY};
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.015em;
          color: ${C.ink};
        }

        .cc-brand-kicker {
          margin-top: 4px;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: ${C.mute};
        }

        @media (min-width: 920px) {
          .cc-brand-name { font-size: 26px; }
        }

        .cc-hero-copy {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        @media (min-width: 920px) {
          .cc-hero-copy {
            justify-content: center;
            margin: 24px 0;
          }
        }

        .cc-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-family: ${FONT_BODY};
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: ${C.gold};
        }

        .cc-hero-title {
          margin: 0;
          font-family: ${FONT_DISPLAY};
          font-weight: 500;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 1.02;
          letter-spacing: -0.025em;
          color: ${C.ink};
        }

        .cc-hero-title em {
          font-style: italic;
          color: ${C.rose};
          font-weight: 500;
        }

        .cc-hero-tag-wrap {
          height: 28px;
          position: relative;
        }

        .cc-hero-tag {
          position: absolute;
          inset: 0;
          margin: 0;
          font-family: ${FONT_DISPLAY};
          font-style: italic;
          font-size: clamp(15px, 1.6vw, 18px);
          color: ${C.mute};
          line-height: 1.5;
        }

        .cc-hero-stats {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .cc-hero-stats > div:not(.cc-hero-divider) {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cc-hero-stats strong {
          font-family: ${FONT_DISPLAY};
          font-size: clamp(18px, 1.8vw, 22px);
          font-weight: 700;
          letter-spacing: -0.01em;
          color: ${C.ink};
        }

        .cc-hero-stats span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${C.mute};
        }

        .cc-hero-divider {
          width: 1px;
          height: 28px;
          background: ${C.hairline};
        }

        .cc-hero-foot {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: ${C.mute};
          letter-spacing: 0.04em;
        }

        /* ── Form panel ─────────────────────────────────────── */
        .cc-login-form-panel {
          position: relative;
          padding: 20px 18px 28px;
          background: ${C.paper};
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-top: 1px solid ${C.hairline};
        }

        @media (min-width: 920px) {
          .cc-login-form-panel {
            padding: 56px 64px 40px;
            border-top: none;
            border-left: 1px solid ${C.hairline};
            justify-content: center;
            gap: 32px;
          }
        }

        .cc-login-card {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .cc-card-head {
          text-align: left;
        }

        .cc-card-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 99px;
          background: ${C.roseSoft};
          color: ${C.roseDeep};
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .cc-card-head h2 {
          margin: 0;
          font-family: ${FONT_DISPLAY};
          font-size: clamp(28px, 4vw, 36px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.1;
          color: ${C.ink};
        }

        .cc-card-head p {
          margin: 6px 0 0;
          font-family: ${FONT_DISPLAY};
          font-style: italic;
          font-size: 15px;
          color: ${C.mute};
          line-height: 1.5;
        }

        .cc-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
        }

        .cc-caps-warn {
          margin: 6px 4px 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: ${C.gold};
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .cc-pw-rules {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 14px;
          margin: 8px 4px 0;
        }

        .cc-caps-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: ${C.gold};
          box-shadow: 0 0 0 4px ${C.goldHi}33;
        }

        .cc-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 2px 0 4px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .cc-remember {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: ${C.mute};
          cursor: pointer;
          user-select: none;
        }

        .cc-remember input {
          appearance: none;
          -webkit-appearance: none;
          width: 18px; height: 18px;
          margin: 0;
          border: 1.5px solid ${C.mute};
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          background: transparent;
          transition: all 0.2s ease;
          box-shadow: none;
          padding: 0;
        }
        .cc-remember input:checked {
          background-color: ${C.rose};
          border-color: ${C.rose};
        }
        .cc-remember input:checked::after {
          content: "";
          position: absolute;
          left: 5px;
          top: 1px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .cc-remember span {
          user-select: none;
        }

        .cc-link {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          color: ${C.rose};
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.005em;
        }
        .cc-link:hover { color: ${C.roseDeep}; }

        .cc-submit {
          width: 100%;
          height: 50px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, ${C.rose} 0%, ${C.gold} 100%);
          color: #fff;
          font-family: ${FONT_BODY};
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 24px ${C.rose}40;
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        .cc-submit:hover:not(:disabled) {
          box-shadow: 0 14px 30px ${C.rose}55;
          transform: translateY(-1px);
        }
        .cc-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .cc-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .cc-spinner {
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          animation: cc-spin 0.8s linear infinite;
        }
        @keyframes cc-spin { to { transform: rotate(360deg); } }

        .cc-or {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 6px 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: ${C.mute};
        }

        .cc-google {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 1.5px solid ${C.hairline};
          background: ${C.paper};
          color: ${C.ink};
          font-family: ${FONT_BODY};
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .cc-google:hover:not(:disabled) {
          border-color: ${C.rose};
          background: ${C.cream};
        }
        .cc-google:disabled { opacity: 0.55; cursor: not-allowed; }

        .cc-phone-btn {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 1.5px solid ${C.hairline};
          background: ${C.paper};
          color: ${C.ink};
          font-family: ${FONT_BODY};
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .cc-phone-btn:hover:not(:disabled) {
          border-color: ${C.rose};
          background: ${C.cream};
        }
        .cc-phone-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .cc-mode-toggle {
          margin-top: 14px;
          padding-top: 18px;
          border-top: 1px solid ${C.hairline};
          text-align: center;
          font-size: 13px;
          color: ${C.mute};
          font-weight: 500;
        }

        .cc-mode-link {
          margin-left: 6px;
          background: none;
          border: none;
          font: inherit;
          color: ${C.rose};
          font-weight: 800;
          letter-spacing: 0.005em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .cc-mode-link:hover { color: ${C.roseDeep}; }

        .cc-login-footer {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding-top: 12px;
          font-size: 11px;
          color: ${C.mute};
          letter-spacing: 0.06em;
        }
      `}</style>
    </div>
  );
}
