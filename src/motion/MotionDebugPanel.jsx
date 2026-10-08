import React, { useState, useEffect } from 'react';
import { useMotion } from './MotionContext.jsx';
import { Activity, Zap, Volume2, Smartphone } from 'lucide-react';

/**
 * MotionDebugPanel — Development-only motion, FPS, and haptics monitor overlay.
 * Automatically hidden in production builds.
 */
export default function MotionDebugPanel() {
  // Hide completely in production builds
  if (import.meta.env.PROD) return null;

  const { reduceMotion, batterySaver, soundEnabled, hapticsEnabled, activeAnimationCount } = useMotion();
  const [fps, setFps] = useState(60);
  const [visible, setVisible] = useState(false);

  // Measure live FPS
  useEffect(() => {
    if (!visible) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animId;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [visible]);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: 76,
          right: 12,
          zIndex: 99999,
          background: 'rgba(26, 20, 17, 0.85)',
          color: '#D8B97E',
          border: '1px solid rgba(216, 185, 126, 0.3)',
          borderRadius: 99,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        ⚡ Dev Motion
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 76,
        right: 12,
        zIndex: 99999,
        background: 'rgba(26, 20, 17, 0.92)',
        color: '#FAF3EE',
        border: '1px solid rgba(216, 185, 126, 0.3)',
        borderRadius: 16,
        padding: '12px 16px',
        width: 220,
        fontSize: 12,
        fontFamily: 'monospace',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 'bold', color: '#D8B97E' }}>
        <span>⚡ MOTION DEBUG</span>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: '#FAF3EE', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>FPS:</span>
          <span style={{ color: fps >= 55 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{fps}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Active Anims:</span>
          <span>{activeAnimationCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Reduce Motion:</span>
          <span style={{ color: reduceMotion ? '#EF4444' : '#10B981' }}>{reduceMotion ? 'ON' : 'OFF'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Battery Saver:</span>
          <span style={{ color: batterySaver ? '#EF4444' : '#10B981' }}>{batterySaver ? 'ON' : 'OFF'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Sound Engine:</span>
          <span>{soundEnabled ? 'ON' : 'OFF'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Haptics:</span>
          <span>{hapticsEnabled ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
}
