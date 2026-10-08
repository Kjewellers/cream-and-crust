/**
 * MotionDebugger.jsx — Motion Debugger & Inspector Tool v2.0
 * Development-only HUD displaying real-time FPS, dropped frames, motion state, and audio state.
 */
import React, { useState, useEffect } from 'react';
import { useMotionConfig } from './useMotion';
import { MotionAnalytics } from './MotionAnalytics';
import { SoundEngine } from './SoundEngine';

export default function MotionDebugger() {
  const config = useMotionConfig();
  const [metrics, setMetrics] = useState(() => MotionAnalytics.getMetrics());

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;

    const interval = setInterval(() => {
      setMetrics(MotionAnalytics.getMetrics());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 9999,
        background: 'rgba(14, 13, 17, 0.85)',
        backdropFilter: 'blur(8px)',
        color: '#D4A050',
        padding: '8px 12px',
        borderRadius: 10,
        fontSize: '0.7rem',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        border: '1px solid rgba(212, 160, 80, 0.35)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div style={{ fontWeight: 'bold', color: '#FFF' }}>[CREAM MOTION ENGINE v2.0]</div>
      <div>FPS: <span style={{ color: metrics.fps >= 55 ? '#10B981' : '#EF4444' }}>{metrics.fps}</span> | Dropped: {metrics.droppedFrames}</div>
      <div>Reduced Motion: {config.reducedMotion ? 'YES' : 'NO'}</div>
      <div>Battery Saver: {config.batterySaver ? 'YES' : 'NO'}</div>
      <div>Ambient Canvas: {config.allowAmbient ? 'ACTIVE' : 'PAUSED'}</div>
      <div>Sound Synth: {SoundEngine.enabled ? 'ON' : 'OFF'}</div>
    </div>
  );
}
