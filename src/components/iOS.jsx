import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Loader2,
  Share2,
  Mic,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { playSound } from '../utils/audioManager';
export { Loader2 };

/* ─────────────────────────────────────────────────────────────────
   MOBILE UTILITIES  — Haptics & Sharing
   ───────────────────────────────────────────────────────────────── */
export const triggerHaptic = (type = 'light') => {
  playSound(type);
  if (!window.navigator.vibrate) return;
  const patterns = {
    light: [10],
    medium: [20],
    heavy: [35],
    success: [10, 40, 15],
    error: [50, 30, 50],
    warning: [30, 40, 30],
  };
  window.navigator.vibrate(patterns[type] || patterns.light);
};

/* ─────────────────────────────────────────────────────────────────
   useScrollDirection  — Hides FABs on scroll-down, restores on
   scroll-up (iOS Mail / Twitter pattern). Returns true when the
   user is actively scrolling DOWN past `threshold` pixels.
   ───────────────────────────────────────────────────────────────── */
export function useScrollDirection(threshold = 12) {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    let lastY = window.scrollY || window.pageYOffset || 0;
    let ticking = false;

    const update = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const dy = y - lastY;

      // Always show near the very top
      if (y < 80) {
        setHidden(false);
      } else if (Math.abs(dy) > threshold) {
        setHidden(dy > 0); // hide on scroll down, show on scroll up
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return hidden;
}

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
  const startY = useRef(null);
  const lastRefreshTime = useRef(0);
  const PULL_THRESHOLD = 120; // Increased from 80 to prevent accidental triggers
  const DEBOUNCE_MS = 2000; // Minimum 2s between refreshes

  const handleTouchStart = (e) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = null;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null) return;
    
    // Safety check — if user scrolled down, cancel the pull tracking
    if (window.scrollY > 0) {
      startY.current = null;
      setPulling(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    // Only track positive (downward) pulls
    if (distance < 0) {
      setPulling(false);
      return;
    }

    // Trigger pull state if dragged down more than threshold from top
    if (distance > PULL_THRESHOLD) {
      setPulling(true);
    } else {
      setPulling(false);
    }
  };

  const handleTouchEnd = () => {
    startY.current = null;
    if (pulling && !refreshing) {
      const now = Date.now();
      // Debounce: prevent rapid successive refreshes
      if (now - lastRefreshTime.current < DEBOUNCE_MS) {
        setPulling(false);
        return;
      }
      lastRefreshTime.current = now;
      setRefreshing(true);
      triggerHaptic('medium');
      onRefresh().finally(() => {
        setRefreshing(false);
        setPulling(false);
      });
    } else {
      setPulling(false);
    }
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ position: 'relative' }}>
      <AnimatePresence>
        {(pulling || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { scale: [1, 1.2, 1] }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
              style={{
                background: 'var(--card)',
                padding: 10,
                borderRadius: 99,
                boxShadow: 'var(--shadow)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {refreshing ? <Loader2 size={20} /> : <div style={{ fontSize: 16 }}>↓</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div animate={{ y: refreshing ? 60 : 0 }}>{children}</motion.div>
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
        width,
        height,
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
    <div
      style={{
        padding: '16px 0',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
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
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        padding: 22,
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton width="50%" height={20} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${90 - i * 15}%`} height={14} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        padding: 20,
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
      }}
    >
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 32px',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontSize: '3.5rem',
          marginBottom: 16,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
        }}
      >
        {icon}
      </motion.div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 14,
            color: 'var(--text3)',
            maxWidth: 280,
            lineHeight: 1.6,
            marginBottom: action ? 24 : 0,
          }}
        >
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
            padding: '12px 28px',
            background: 'var(--accent)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-accent)',
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
   Hardened: 4s default duration, max 3 visible + FIFO overflow queue,
   tap-to-dismiss. Queue logic lives in utils/toastQueue.js (testable).
   ───────────────────────────────────────────────────────────────── */
import { reduceToasts, initToastState } from '../utils/toastQueue.js';

let toastListeners = [];
let toastState = initToastState();
const TOAST_DURATION = 4000;
const _toastTimers = new Map();

function emitToasts() {
  // Listeners receive only the currently-visible toasts.
  toastListeners.forEach((fn) => fn([...toastState.visible]));
}

function scheduleAutoDismiss(id, duration) {
  if (_toastTimers.has(id)) clearTimeout(_toastTimers.get(id));
  const timer = setTimeout(() => dismissToast(id), duration);
  _toastTimers.set(id, timer);
}

/** Remove a toast immediately (used by auto-dismiss and the tap control). */
export function dismissToast(id) {
  if (_toastTimers.has(id)) {
    clearTimeout(_toastTimers.get(id));
    _toastTimers.delete(id);
  }
  const before = toastState.visible.map((t) => t.id);
  toastState = reduceToasts(toastState, { kind: 'remove', id });
  emitToasts();
  // If a queued toast was just promoted into view, start its timer.
  const promoted = toastState.visible.find((t) => !before.includes(t.id));
  if (promoted) scheduleAutoDismiss(promoted.id, promoted.duration);
}

export function showToast(message, type = 'success', duration = TOAST_DURATION) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const toast = { id, message, type, duration };

  const wasVisible = toastState.visible.length;
  toastState = reduceToasts(toastState, { kind: 'add', toast });
  emitToasts();

  // Trigger appropriate haptic based on type
  if (type === 'success') triggerHaptic('success');
  else if (type === 'error') triggerHaptic('error');
  else triggerHaptic('light');

  // Only start the auto-dismiss timer once the toast is actually visible.
  // Queued (overflow) toasts get their timer when promoted in dismissToast().
  if (toastState.visible.length > wasVisible && toastState.visible.some((t) => t.id === id)) {
    scheduleAutoDismiss(id, duration);
  }
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    setToasts([...toastState.visible]);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== setToasts);
    };
  }, []);

  const icons = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };
  const colors = {
    success: {
      bg: 'rgba(240, 250, 246, 0.85)',
      border: '#A8D8C8',
      color: '#2E7A5A',
      icon: '#4A9A80',
    },
    error: {
      bg: 'rgba(253, 242, 242, 0.85)',
      border: '#F0B8B3',
      color: '#B04040',
      icon: '#C45050',
    },
    info: { bg: 'rgba(245, 242, 252, 0.85)', border: '#C2B0E0', color: '#6040A8', icon: '#8060B8' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(20px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const c = colors[t.type] || colors.success;
          return (
            <motion.div
              key={t.id}
              onClick={() => dismissToast(t.id)}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                borderRadius: 'var(--radius)',
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                backdropFilter: 'blur(20px)',
                maxWidth: 380,
                whiteSpace: 'nowrap',
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
    const idx = options.findIndex((o) => (typeof o === 'string' ? o : o.value) === value);
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
        display: 'inline-flex',
        position: 'relative',
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
          position: 'absolute',
          top: 2,
          height: 'calc(100% - 4px)',
          background: 'var(--card)',
          borderRadius: '6.5px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)',
        }}
      />
      {options.map((opt) => {
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
              position: 'relative',
              zIndex: 1,
              padding: pad,
              fontSize: fs,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '6.5px',
              transition: 'color 0.2s ease',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
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
   BOTTOM SHEET  — Full-screen mobile takeover (app-native feel)
   On mobile: slides up and fills the entire viewport so forms feel
   like a dedicated screen, not a floating card on a big website.
   ───────────────────────────────────────────────────────────────── */
export function BottomSheet({ open, onClose, title, children }) {
  // Lock body scroll when open
  React.useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              zIndex: 200,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              margin: 'auto',
              width: 'calc(100% - 40px)',
              maxWidth: 560,
              height: 'fit-content',
              maxHeight: '92dvh',
              background: 'var(--bg)',
              borderRadius: '24px',
              zIndex: 201,
              boxShadow: '0 24px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Sticky header with title + close */}
            <div
              style={{
                flexShrink: 0,
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--card)',
              }}
            >
              {title && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}
                  >
                    {title}
                  </h2>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text2)',
                    }}
                  >
                    <X size={15} strokeWidth={2.5} />
                  </motion.button>
                </div>
              )}
            </div>

            {/* Scrollable content area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 20px))',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

/* ─────────────────────────────────────────────────────────────────
   SWIPE ROW  — iOS-style swipe-to-reveal actions
   ───────────────────────────────────────────────────────────────── */
export function SwipeRow({ children, onDelete, onWhatsApp, onRapido }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(null);
  const isDragging = useRef(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const THRESHOLD = 74;

  const hasLeftActions = onWhatsApp || onRapido;
  const leftActionWidth = onWhatsApp && onRapido ? THRESHOLD * 2 : THRESHOLD;

  useEffect(() => {
    if (offset === -THRESHOLD / 2 || offset === leftActionWidth / 2) {
      setIsPeeking(true);
      const timer = setTimeout(() => {
        setOffset(0);
        setIsPeeking(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [offset, leftActionWidth]);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;

    if (dx < 0 && onDelete) {
      setOffset(Math.max(dx, -THRESHOLD * 1.5));
    } else if (dx > 0 && hasLeftActions) {
      setOffset(Math.min(dx, leftActionWidth * 1.5));
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (offset < -THRESHOLD / 2) {
      setOffset(-THRESHOLD);
    } else if (offset > leftActionWidth / 2) {
      setOffset(leftActionWidth);
    } else {
      setOffset(0);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Right side reveal (Delete) */}
      {onDelete && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: THRESHOLD,
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 0,
          }}
        >
          <button
            onClick={() => {
              setOffset(0);
              onDelete();
            }}
            style={{
              height: '100%',
              width: THRESHOLD,
              background: '#FF3B30',
              color: 'white',
              border: 'none',
              borderRadius: '0 16px 16px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={18} />
            <span style={{ fontSize: 10, fontWeight: 700 }}>Delete</span>
          </button>
        </div>
      )}

      {/* Left side reveal (WhatsApp & Rapido) */}
      {hasLeftActions && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: leftActionWidth,
            display: 'flex',
            zIndex: 0,
          }}
        >
          {onWhatsApp && (
            <button
              onClick={() => {
                setOffset(0);
                onWhatsApp();
              }}
              style={{
                height: '100%',
                width: THRESHOLD,
                background: '#10B981',
                color: 'white',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
                borderRadius: onRapido ? '0' : '16px 0 0 16px',
              }}
            >
              <MessageSquare size={18} />
              <span style={{ fontSize: 9, fontWeight: 800 }}>WhatsApp</span>
            </button>
          )}
          {onRapido && (
            <button
              onClick={() => {
                setOffset(0);
                onRapido();
              }}
              style={{
                height: '100%',
                width: THRESHOLD,
                background: '#FBBF24',
                color: 'var(--text)',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
                borderRadius: onWhatsApp ? '0' : '16px 0 0 16px',
              }}
            >
              <span style={{ fontSize: 18 }}>🛵</span>
              <span style={{ fontSize: 9, fontWeight: 800 }}>Rapido</span>
            </button>
          )}
        </div>
      )}

      <motion.div
        animate={{ x: offset }}
        transition={
          isPeeking
            ? { type: 'spring', stiffness: 100, damping: 20 }
            : { type: 'spring', stiffness: 400, damping: 30 }
        }
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
/* ─────────────────────────────────────────────────────────────────
   SWIPE GUIDE  — Instruction animation for swipe actions
   ───────────────────────────────────────────────────────────────── */

export function OnboardingTutorial({ onFinish }) {
  const [step, setStep] = useState(1);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (step === 3) {
      setTimeout(() => setShowSheet(true), 500);
    }
  }, [step]);

  const next = () => {
    triggerHaptic('light');
    if (step < 3) setStep(step + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {step === 1 && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                padding: '16px 24px',
                borderRadius: 24,
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                maxWidth: 280,
                textAlign: 'center',
                marginBottom: 40,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                👉 Swipe right to quickly share order on WhatsApp
              </div>
            </motion.div>

            <div style={{ position: 'relative', width: 200, height: 100 }}>
              <motion.div
                animate={{
                  x: [-60, 60, 60, -60],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  times: [0, 0.4, 0.8, 1],
                }}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  boxShadow: '0 8px 24px rgba(181,96,106,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 24,
                  border: '2px solid white',
                }}
              >
                👆
              </motion.div>
            </div>

            <button
              className="btn btn-primary"
              onClick={next}
              style={{ position: 'absolute', bottom: 40 }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                padding: '16px 24px',
                borderRadius: 24,
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                maxWidth: 280,
                textAlign: 'center',
                marginBottom: 40,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                🛵 Tap scooter icon to instantly book Rapido delivery
              </div>
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '4px solid #F5A623',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
              }}
            >
              🛵
            </motion.div>

            <button
              className="btn btn-primary"
              onClick={next}
              style={{ position: 'absolute', bottom: 40 }}
            >
              Got it
            </button>
          </div>
        )}

        <AnimatePresence>
          {showSheet && (
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--bg)',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 -12px 40px rgba(0,0,0,0.2)',
                zIndex: 10000,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  background: 'var(--border)',
                  borderRadius: 2,
                  margin: '0 auto 24px',
                }}
              />
              <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>
                You're ready to manage deliveries 🚀
              </h2>
              <p style={{ color: 'var(--text2)', marginBottom: 32 }}>
                Share orders instantly and book delivery in seconds.
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                onClick={() => {
                  localStorage.setItem('cc_onboarding_completed', 'true');
                  onFinish();
                }}
              >
                Let's Go
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
