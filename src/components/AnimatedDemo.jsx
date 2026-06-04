/**
 * AnimatedDemo — a silent, auto-playing visual "how-to" for each module.
 *
 * Instead of text banners (which home bakers don't read), this shows a
 * mock phone screen where an animated finger taps buttons, fills forms,
 * and demonstrates the actual workflow — like a built-in tutorial GIF.
 *
 * Each module passes a `scenes` array. A scene is a snapshot of mock UI
 * with an animated finger that points/taps. Scenes auto-advance.
 *
 * Shows once per module per user (tracked in localStorage). Re-playable
 * from Settings via resetAllModuleTours.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, SkipForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_PREFIX = 'cc_module_demo_seen_';

export function hasSeenDemo(moduleId, uid) {
  if (!uid || !moduleId) return true;
  return localStorage.getItem(`${DEMO_PREFIX}${moduleId}:${uid}`) === '1';
}
export function markDemoSeen(moduleId, uid) {
  if (!uid || !moduleId) return;
  localStorage.setItem(`${DEMO_PREFIX}${moduleId}:${uid}`, '1');
}
export function resetAllDemos(uid) {
  if (!uid) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(DEMO_PREFIX) && k.endsWith(`:${uid}`))
    .forEach((k) => localStorage.removeItem(k));
}

// ─── Animated finger pointer ──────────────────────────────────────
function Finger({ x, y, tapping }) {
  return (
    <motion.div
      animate={{ left: x, top: y, scale: tapping ? 0.82 : 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{
        position: 'absolute',
        zIndex: 50,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
        transform: 'translate(-30%, -10%)',
      }}
    >
      {/* Tap ripple */}
      <AnimatePresence>
        {tapping && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(181,96,106,0.4)',
            }}
          />
        )}
      </AnimatePresence>
      <span style={{ fontSize: 30 }}>👆</span>
    </motion.div>
  );
}

export default function AnimatedDemo({ moduleId, title, scenes = [], onComplete }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const [visible, setVisible] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [tapping, setTapping] = useState(false);
  const timers = useRef([]);

  const initialized = useRef(false);

  // Trigger
  useEffect(() => {
    if (!uid || !moduleId || !scenes.length) return;
    
    // If already seen and we haven't initialized it in this mount cycle, skip
    if (hasSeenDemo(moduleId, uid) && !initialized.current) return;
    
    initialized.current = true;
    
    // Mark as seen IMMEDIATELY so it doesn't replay on next login even if interrupted
    markDemoSeen(moduleId, uid);
    
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [uid, moduleId, scenes.length]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    setVisible(false);
    markDemoSeen(moduleId, uid);
    if (onComplete) onComplete();
  }, [moduleId, uid, onComplete, clearTimers]);

  // Auto-advance scenes with a tap animation midway
  useEffect(() => {
    if (!visible) return;
    clearTimers();
    const scene = scenes[sceneIdx];
    const dwell = scene?.duration || 2600;

    // Fire tap animation at 55% of the scene
    timers.current.push(
      setTimeout(() => {
        setTapping(true);
        try {
          window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' }));
        } catch {}
      }, dwell * 0.55)
    );
    timers.current.push(setTimeout(() => setTapping(false), dwell * 0.55 + 450));

    // Advance
    timers.current.push(
      setTimeout(() => {
        if (sceneIdx >= scenes.length - 1) finish();
        else setSceneIdx((i) => i + 1);
      }, dwell)
    );

    return clearTimers;
  }, [visible, sceneIdx, scenes, finish, clearTimers]);

  if (!visible || !scenes.length) return null;

  const scene = scenes[sceneIdx];
  const progress = ((sceneIdx + 1) / scenes.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 140, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            fontFamily: '"Inter", system-ui, sans-serif',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Compact bottom sheet card ──────────────────────── */}
          <div
            style={{
              margin: '0 10px 10px',
              borderRadius: 24,
              background: '#FFFDF9',
              boxShadow: '0 -4px 40px rgba(74,59,50,0.13), 0 0 0 1px rgba(74,59,50,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Progress bar — top accent strip */}
            <div style={{ height: 3, background: 'rgba(74,59,50,0.07)' }}>
              <motion.div
                animate={{ width: `${((sceneIdx + 1) / scenes.length) * 100}%` }}
                transition={{ duration: 0.4 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #B5606A, #D4A050)',
                  borderRadius: 2,
                }}
              />
            </div>

            {/* Header: module label + step counter + Skip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px 0',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#B5606A',
                }}
              >
                {title} · Quick Tour
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(74,59,50,0.35)' }}>
                  {sceneIdx + 1} of {scenes.length}
                </span>
                <button
                  type="button"
                  onClick={finish}
                  aria-label="Skip tutorial"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 99,
                    border: '1.5px solid rgba(74,59,50,0.12)',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#5C4F46',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  Skip <X size={11} />
                </button>
              </div>
            </div>

            {/* Body: mini scene preview + caption */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '10px 14px 14px',
              }}
            >
              {/* Mini phone preview */}
              <div
                style={{
                  flexShrink: 0,
                  position: 'relative',
                  width: 100,
                  height: 148,
                  borderRadius: 16,
                  background: '#FFFDF9',
                  border: '2px solid #EAE2D8',
                  boxShadow: '0 6px 20px rgba(74,59,50,0.10)',
                  overflow: 'hidden',
                }}
              >
                {/* Scale down the scene to fit the small preview */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    width: '200%',
                    height: '200%',
                    pointerEvents: 'none',
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={sceneIdx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      {scene.render({ tapping })}
                    </motion.div>
                  </AnimatePresence>
                  {scene.finger && (
                    <Finger x={scene.finger.x} y={scene.finger.y} tapping={tapping} />
                  )}
                </div>
              </div>

              {/* Caption + dot indicators */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <motion.div
                  key={`cap-${sceneIdx}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#2D1B14',
                      lineHeight: 1.35,
                      marginBottom: 10,
                    }}
                  >
                    {scene.caption}
                  </div>
                </motion.div>

                {/* Tappable dot navigation */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {scenes.map((_, i) => (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      aria-label={`Go to step ${i + 1}`}
                      onClick={() => setSceneIdx(i)}
                      onKeyDown={(e) => e.key === 'Enter' && setSceneIdx(i)}
                      style={{
                        width: i === sceneIdx ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        background:
                          i === sceneIdx
                            ? 'linear-gradient(90deg, #B5606A, #D4A050)'
                            : i < sceneIdx
                              ? 'rgba(181,96,106,0.38)'
                              : 'rgba(74,59,50,0.12)',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10.5,
                    color: 'rgba(74,59,50,0.35)',
                    fontWeight: 600,
                  }}
                >
                  Auto-advances · tap dots to jump
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


// ─── Reusable mock UI primitives for building scenes ──────────────

export const MockUI = {
  Screen: ({ children, title }) => (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {title && (
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(74,59,50,0.06)',
            fontWeight: 800,
            fontSize: 15,
            color: '#2D1B14',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ flex: 1, padding: 14, overflow: 'hidden' }}>{children}</div>
    </div>
  ),

  Button: ({ children, primary, highlight, style = {} }) => (
    <div
      style={{
        padding: '11px 14px',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 13,
        textAlign: 'center',
        background: primary
          ? 'linear-gradient(135deg, #B5606A, #D4A050)'
          : highlight
            ? 'rgba(181,96,106,0.1)'
            : '#F4EDE8',
        color: primary ? '#fff' : '#B5606A',
        border: highlight ? '2px solid #B5606A' : 'none',
        boxShadow: highlight ? '0 0 0 4px rgba(181,96,106,0.15)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  ),

  Field: ({ label, value, filled }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8C7A6B', marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          padding: '9px 12px',
          borderRadius: 10,
          background: '#FAF6F0',
          border: filled ? '1.5px solid #B5606A' : '1px solid rgba(74,59,50,0.1)',
          fontSize: 13,
          fontWeight: 600,
          color: value ? '#2D1B14' : '#C7B8B0',
          minHeight: 18,
        }}
      >
        {value || '...'}
      </div>
    </div>
  ),

  Card: ({ children, style = {} }) => (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        background: '#fff',
        border: '1px solid rgba(74,59,50,0.06)',
        boxShadow: '0 2px 8px rgba(74,59,50,0.05)',
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </div>
  ),

  Chip: ({ children, active }) => (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: 9,
        fontSize: 12,
        fontWeight: 700,
        background: active ? 'rgba(181,96,106,0.1)' : '#F4EDE8',
        color: active ? '#B5606A' : '#8C7A6B',
        border: active ? '2px solid #B5606A' : '1px solid transparent',
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  ),
};
