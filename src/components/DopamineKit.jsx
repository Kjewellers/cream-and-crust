import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

/* ────────────────────────────────────────────────────────────────
   CONFETTI BURST  — Canvas-based particle explosion
   Triggered on order complete, item checked, big saves
   ──────────────────────────────────────────────────────────────── */
class ConfettiParticle {
  constructor(canvas, x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 6 + 3;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed - Math.random() * 4;
    this.gravity = 0.2;
    this.life = 1;
    this.decay = Math.random() * 0.015 + 0.01;
    this.size = Math.random() * 8 + 4;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
  }
  update() {
    this.vx *= 0.98;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

const CONFETTI_COLORS = [
  '#D4714A', '#F5A623', '#FFD60A', '#34C759',
  '#30D158', '#0A84FF', '#BF5AF2', '#FF2D55', '#FF9F0A'
];

let confettiListeners = [];
export function triggerConfetti(originX, originY, count = 80) {
  confettiListeners.forEach(fn => fn({ x: originX, y: originY, count }));
}

export function ConfettiCanvas() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  const spawnBurst = useCallback(({ x, y, count }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = x - rect.left;
    const cy = y - rect.top;
    for (let i = 0; i < count; i++) {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      particlesRef.current.push(new ConfettiParticle(canvas, cx, cy, color));
    }
  }, []);

  useEffect(() => {
    confettiListeners.push(spawnBurst);
    return () => { confettiListeners = confettiListeners.filter(fn => fn !== spawnBurst); };
  }, [spawnBurst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => { p.update(); p.draw(ctx); });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        pointerEvents: 'none', width: '100%', height: '100%'
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────
   SUCCESS BURST  — Centered emoji explosion for key wins
   ──────────────────────────────────────────────────────────────── */
let successListeners = [];
export function triggerSuccessBurst(emoji = '🎉', label = 'Done!') {
  successListeners.forEach(fn => fn({ emoji, label }));
}

export function SuccessBurstOverlay() {
  const [burst, setBurst] = useState(null);

  useEffect(() => {
    const handler = ({ emoji, label }) => {
      setBurst({ emoji, label, id: Date.now() });
      setTimeout(() => setBurst(null), 1800);
    };
    successListeners.push(handler);
    return () => { successListeners = successListeners.filter(fn => fn !== handler); };
  }, []);

  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99998,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.4, 1.1], rotate: [0, 10, -5, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            style={{ fontSize: '6rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))' }}
          >
            {burst.emoji}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 0.2 }}
            style={{
              marginTop: 12, fontSize: '1.3rem', fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.03em',
              textShadow: '0 2px 12px rgba(0,0,0,0.08)'
            }}
          >
            {burst.label}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────────────────────────────
   ANIMATED NUMBER  — Smooth count-up for stats
   ──────────────────────────────────────────────────────────────── */
export function AnimatedNumber({ value, prefix = '', suffix = '', duration = 0.8, decimals = 0 }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = Number(value) || 0;
    prevRef.current = end;
    if (start === end) return;

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = (now - startTime) / (duration * 1000);
      const progress = Math.min(elapsed, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = decimals > 0
    ? displayed.toFixed(decimals)
    : Math.round(displayed).toLocaleString('en-IN');

  return <span>{prefix}{formatted}{suffix}</span>;
}

/* ────────────────────────────────────────────────────────────────
   STREAK BADGE  — Exciting streak counter with fire
   ──────────────────────────────────────────────────────────────── */
export function StreakBadge({ count, label = 'orders today' }) {
  if (!count || count < 2) return null;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.3 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'linear-gradient(135deg, #FF6B35, #FF2D55)',
        color: 'white', borderRadius: 99,
        padding: '5px 14px', fontSize: 13, fontWeight: 800,
        boxShadow: '0 4px 16px rgba(255,59,48,0.35)',
        letterSpacing: '-0.01em'
      }}
    >
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
      >
        🔥
      </motion.span>
      {count} {label}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   RIPPLE BUTTON  — Satisfying press effect
   ──────────────────────────────────────────────────────────────── */
export function RippleButton({ children, onClick, className, style, disabled }) {
  const [ripples, setRipples] = useState([]);
  const btnRef = useRef(null);

  const handleClick = (e) => {
    if (disabled) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    onClick && onClick(e);
  };

  return (
    <button
      ref={btnRef}
      className={className}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      {ripples.map(r => (
        <motion.span
          key={r.id}
          initial={{ scale: 0, opacity: 0.4 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: r.x - 20, top: r.y - 20,
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none'
          }}
        />
      ))}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   FLOATING REWARD  — +1 / emoji that floats up and fades
   ──────────────────────────────────────────────────────────────── */
let floatingRewardListeners = [];
export function triggerFloatingReward(text = '+1', x, y) {
  const id = Date.now();
  floatingRewardListeners.forEach(fn => fn({ text, x, y, id }));
}

export function FloatingRewardLayer() {
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    const handler = (reward) => {
      setRewards(prev => [...prev, reward]);
      setTimeout(() => setRewards(prev => prev.filter(r => r.id !== reward.id)), 1200);
    };
    floatingRewardListeners.push(handler);
    return () => { floatingRewardListeners = floatingRewardListeners.filter(fn => fn !== handler); };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99997, pointerEvents: 'none' }}>
      <AnimatePresence>
        {rewards.map(r => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, scale: 1, x: (r.x || window.innerWidth / 2) - 20 }}
            animate={{ opacity: 0, y: -80, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: r.y || window.innerHeight / 2,
              fontSize: '1.4rem',
              fontWeight: 900,
              color: '#34C759',
              textShadow: '0 2px 8px rgba(52,199,89,0.4)',
              letterSpacing: '-0.02em'
            }}
          >
            {r.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   PULSING DOT  — Live indicator that pulses
   ──────────────────────────────────────────────────────────────── */
export function PulsingDot({ color = '#34C759', size = 10 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%', background: color
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%', background: color
      }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   CARD BOUNCE  — Wrapper that bounces card on mount
   ──────────────────────────────────────────────────────────────── */
export function BounceCard({ children, delay = 0, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay }}
      whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.98 }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   SHAKE  — Error shake animation wrapper
   ──────────────────────────────────────────────────────────────── */
export function ShakeWrapper({ shake, children }) {
  return (
    <motion.div
      animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}
