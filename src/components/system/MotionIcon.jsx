import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/**
 * MotionIcon.jsx
 * Provides smooth, GPU-accelerated SVG animations for error states.
 */
export function MotionIcon({ type = 'unknown', size = 48, color = 'currentColor' }) {
  const prefersReducedMotion = useReducedMotion();

  const getIcon = () => {
    switch (type) {
      case 'offline':
        return <OfflineIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
      case 'payment':
        return <PaymentIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
      case 'permission':
        return <PermissionIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
      case 'save':
        return <SaveIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
      case 'ai_offline':
        return <AIIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
      case 'success':
        return <SuccessIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
      default:
        return <UnknownIcon size={size} color={color} reducedMotion={prefersReducedMotion} />;
    }
  };

  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {getIcon()}
    </div>
  );
}

// ── Offline (Floating Cloud) ────────────────────────────────────────────────
function OfflineIcon({ size, color, reducedMotion }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
        animate={reducedMotion ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M22 12l-3 3-3-3"
        initial={{ opacity: 0, y: -5 }}
        animate={reducedMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1, 0], y: [-5, 0, 5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </svg>
  );
}

// ── Payment Failed (Coin flip/shake) ───────────────────────────────────────
function PaymentIcon({ size, color, reducedMotion }) {
  return (
    <motion.svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      animate={reducedMotion ? {} : { rotateY: [0, 180, 360], rotateZ: [0, -5, 5, 0] }}
      transition={{ 
        rotateY: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        rotateZ: { duration: 0.4, repeat: Infinity, repeatDelay: 2.6 } 
      }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M9 12h6" />
    </motion.svg>
  );
}

// ── Permission (Shield grows, lock closes) ──────────────────────────────────
function PermissionIcon({ size, color, reducedMotion }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
      <motion.path
        d="M9 11a3 3 0 1 1 6 0v2"
        initial={{ y: -2 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", delay: 0.2 }}
      />
      <rect x="9" y="13" width="6" height="5" rx="1" />
    </svg>
  );
}

// ── Save Failed (Paper wiggle) ─────────────────────────────────────────────
function SaveIcon({ size, color, reducedMotion }) {
  return (
    <motion.svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      animate={reducedMotion ? {} : { rotate: [0, -4, 4, -2, 2, 0] }}
      transition={{ duration: 0.6, ease: "easeInOut", delay: 0.5, repeat: Infinity, repeatDelay: 4 }}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </motion.svg>
  );
}

// ── AI Offline (Robot sleeping) ────────────────────────────────────────────
function AIIcon({ size, color, reducedMotion }) {
  return (
    <motion.svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      animate={reducedMotion ? {} : { y: [0, 2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      {/* Sleeping eyes */}
      <path d="M7 15l2 2 2-2" />
      <path d="M13 15l2 2 2-2" />
      {/* Zzz */}
      <motion.path 
        d="M17 5 h3 l-3 3 h3" 
        strokeWidth="1"
        initial={{ opacity: 0, x: -5, y: 5 }}
        animate={reducedMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: [0, 1, 0], x: [0, 5, 10], y: [0, -5, -10] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

// ── Success (Sparkle checkmark) ────────────────────────────────────────────
function SuccessIcon({ size, color, reducedMotion }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {!reducedMotion && (
        <motion.circle
          cx="12" cy="12" r="10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.1, opacity: [0, 0.2, 0] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
    </svg>
  );
}

// ── Unknown / Generic ──────────────────────────────────────────────────────
function UnknownIcon({ size, color, reducedMotion }) {
  return (
    <motion.svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      animate={reducedMotion ? {} : { rotate: [0, 10, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill={color} />
    </motion.svg>
  );
}
