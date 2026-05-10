import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2, Share2, Mic } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   MOBILE UTILITIES  — Haptics & Sharing
   ───────────────────────────────────────────────────────────────── */
export const triggerHaptic = (type = 'light') => {
  if (!window.navigator.vibrate) return;
  const patterns = {
    light: [10],
    medium: [20],
    heavy: [35],
    success: [10, 40, 15],
    error: [50, 30, 50],
    warning: [30, 40, 30]
  };
  window.navigator.vibrate(patterns[type] || patterns.light);
};

export const shareContent = async (data) => {
  if (navigator.share) {
    try {
      await navigator.share(data);
      triggerHaptic('success');
      return true;
    } catch (err) {
      console.log('Share failed:', err);
      return false;
    }
  } else {
    // Fallback to clipboard
    if (data.text || data.url) {
      await navigator.clipboard.writeText(data.text || data.url);
      showToast('Copied to clipboard!', 'info');
      return true;
    }
  }
  return false;
};

/* ─────────────────────────────────────────────────────────────────
   PULL TO REFRESH  — Classic iOS gesture
   ───────────────────────────────────────────────────────────────── */
export function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const handleTouchEnd = () => {
    if (pulling && !refreshing) {
      setRefreshing(true);
      triggerHaptic('medium');
      onRefresh().finally(() => {
        setRefreshing(false);
        setPulling(false);
      });
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY <= 0 && e.touches[0].clientY > 150) {
      setPulling(true);
    } else if (e.touches[0].clientY < 100) {
      setPulling(false);
    }
  };

  return (
    <div onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ position: 'relative' }}>
      <AnimatePresence>
        {(pulling || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { scale: [1, 1.2, 1] }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
              style={{
                background: 'var(--card)', padding: 10, borderRadius: 99,
                boxShadow: 'var(--shadow)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {refreshing ? <Loader2 size={20} /> : <div style={{ fontSize: 16 }}>↓</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div animate={{ y: refreshing ? 60 : 0 }}>
        {children}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SKELETON LOADER  — iOS shimmer effect
   ───────────────────────────────────────────────────────────────── */
export function Skeleton({ width = '100%', height = 18, radius = 8, style = {} }) {
  return (
    <motion.div
      style={{
        width, height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--cream) 25%, #f5ede8 50%, var(--cream) 75%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
      animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export function OrderRowSkeleton() {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={80} height={16} />
        <Skeleton width={60} height={22} radius={99} />
      </div>
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={12} />
    </div>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width="50%" height={20} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${90 - i * 15}%`} height={14} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
      <Skeleton width={40} height={40} radius={10} style={{ marginBottom: 14 }} />
      <Skeleton width="60%" height={11} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={28} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EMPTY STATE  — iOS-style illustrated empty states
   ───────────────────────────────────────────────────────────────── */
export function EmptyState({ icon = '📦', title, subtitle, action, actionLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '56px 32px', textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: '3.5rem', marginBottom: 16, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
      >
        {icon}
      </motion.div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 280, lineHeight: 1.6, marginBottom: action ? 24 : 0 }}>
          {subtitle}
        </div>
      )}
      {action && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            triggerHaptic('light');
            action();
          }}
          style={{
            padding: '12px 28px', background: 'var(--accent)', color: 'white',
            borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 14,
            border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-accent)',
            letterSpacing: '-0.01em',
          }}
        >
          {actionLabel || 'Get Started'}
        </motion.button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TOAST NOTIFICATION SYSTEM  — iOS-style top toasts
   ───────────────────────────────────────────────────────────────── */
let toastListeners = [];
let toastQueue = [];

export function showToast(message, type = 'success', duration = 3000) {
  const id = Date.now();
  const toast = { id, message, type, duration };
  toastQueue = [...toastQueue, toast];
  toastListeners.forEach(fn => fn([...toastQueue]));
  
  // Trigger appropriate haptic based on type
  if (type === 'success') triggerHaptic('success');
  else if (type === 'error') triggerHaptic('error');
  else triggerHaptic('light');

  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    toastListeners.forEach(fn => fn([...toastQueue]));
  }, duration + 400);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => { toastListeners = toastListeners.filter(fn => fn !== setToasts); };
  }, []);

  const icons = { success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };
  const colors = {
    success: { bg: 'rgba(240, 250, 246, 0.85)', border: '#A8D8C8', color: '#2E7A5A', icon: '#4A9A80' },
    error:   { bg: 'rgba(253, 242, 242, 0.85)', border: '#F0B8B3', color: '#B04040', icon: '#C45050' },
    info:    { bg: 'rgba(245, 242, 252, 0.85)', border: '#C2B0E0', color: '#6040A8', icon: '#8060B8' },
  };

  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map(t => {
          const c = colors[t.type] || colors.success;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.color, borderRadius: 'var(--radius)',
                padding: '12px 20px', fontSize: 14, fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)', pointerEvents: 'auto',
                letterSpacing: '-0.01em', backdropFilter: 'blur(20px)',
                maxWidth: 380, whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: c.icon }}>{icons[t.type]}</span>
              {t.message}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL  — iOS-style pill tab switcher
   ───────────────────────────────────────────────────────────────── */
export function SegmentedControl({ options, value, onChange, size = 'md' }) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = options.findIndex(o => (typeof o === 'string' ? o : o.value) === value);
    const btns = containerRef.current.querySelectorAll('[data-seg]');
    if (btns[idx]) {
      const btn = btns[idx];
      setIndicatorStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [value, options]);

  const pad = size === 'sm' ? '6px 14px' : '8px 18px';
  const fs = size === 'sm' ? 13 : 14;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'inline-flex', position: 'relative',
        background: 'var(--bg)',
        borderRadius: '8.5px',
        padding: 2,
        userSelect: 'none',
      }}
    >
      <motion.div
        layout
        animate={indicatorStyle}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        style={{
          position: 'absolute', top: 2, height: 'calc(100% - 4px)',
          background: 'var(--card)', borderRadius: '6.5px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)',
        }}
      />
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const isActive = v === value;
        return (
          <button
            key={v}
            data-seg={v}
            onClick={() => {
              triggerHaptic('light');
              onChange(v);
            }}
            style={{
              position: 'relative', zIndex: 1,
              padding: pad, fontSize: fs,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text3)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: '6.5px',
              transition: 'color 0.2s ease',
              letterSpacing: '-0.01em', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PRESS BUTTON  — iOS-style spring press
   ───────────────────────────────────────────────────────────────── */
export function PressButton({ children, onClick, className, style }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96, opacity: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      onClick={(e) => {
        triggerHaptic('light');
        onClick && onClick(e);
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BOTTOM SHEET  — iOS-style modal for mobile
   ───────────────────────────────────────────────────────────────── */
export function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)',
              backdropFilter: 'blur(6px)', zIndex: 200,
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'var(--card)',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              borderRadius: '32px 32px 0 0',
              padding: '0 20px 40px',
              zIndex: 201,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              maxHeight: '92vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 12 }}>
              <div style={{ width: 36, height: 5, borderRadius: 2.5, background: 'rgba(0,0,0,0.2)' }} />
            </div>
            {title && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h2>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                  <X size={15} strokeWidth={2.5} />
                </motion.button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SWIPE ROW  — iOS-style swipe-to-reveal actions
   ───────────────────────────────────────────────────────────────── */
export function SwipeRow({ children, onDelete, onWhatsApp }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(null);
  const isDragging = useRef(false);
  const THRESHOLD = 80;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -THRESHOLD * 1.5));
  };
  const handleTouchEnd = () => {
    isDragging.current = false;
    if (offset < -THRESHOLD) {
      setOffset(-THRESHOLD);
      triggerHaptic('light');
    } else {
      setOffset(0);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        display: 'flex', alignItems: 'center',
        opacity: offset < -20 ? 1 : 0,
        transition: 'opacity 0.2s',
      }}>
        {onWhatsApp && (
          <button onClick={() => { setOffset(0); onWhatsApp(); }}
            style={{ height: '100%', width: 74, background: '#34C759', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 22 }}>💬</span><span>Share</span>
          </button>
        )}
        {onDelete && (
          <button onClick={() => { setOffset(0); onDelete(); }}
            style={{ height: '100%', width: 74, background: '#FF3B30', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 22 }}>🗑️</span><span>Delete</span>
          </button>
        )}
      </div>
      <motion.div
        animate={{ x: offset }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ background: 'var(--card)', position: 'relative', zIndex: 1 }}
        onClick={() => {
          if (offset !== 0) {
            setOffset(0);
            triggerHaptic('light');
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
