import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Timer, CheckCircle2, Circle, Pause, Play, Volume2 } from 'lucide-react';

export default function CookingMode({ recipe, onClose, onExit, onFinished }) {
  const steps = recipe.steps || [];
  const [curr, setCurr] = useState(0);
  const [checked, setChecked] = useState({});
  const [seconds, setSeconds] = useState(300);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Extract timer from step text or fallback to 0
    let stepSecs = 0;
    const currStep = steps[curr];
    if (currStep?.timer) {
      stepSecs = parseInt(currStep.timer) * 60;
    } else if (currStep?.desc) {
      const match = currStep.desc.match(/(\d+)\s*(min|minute|hr|hour)/i);
      if (match) {
        stepSecs = parseInt(match[1]) * (match[2].toLowerCase().startsWith('h') ? 3600 : 60);
      }
    }
    
    setSeconds(stepSecs > 0 ? stepSecs : 300);
    setPaused(true); // Don't auto-start until they hit Play
  }, [curr, steps]);

  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880; gain.gain.value = 0.3;
            osc.start(); setTimeout(() => osc.stop(), 600);
          } catch(e) {}
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [paused, curr]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const progress = ((curr) / steps.length) * 100;

  if (curr >= steps.length) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rv-kitchen" style={{ justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #10B981, #059669)' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Baking Complete!</div>
          <div style={{ fontSize: 16, opacity: 0.8, marginBottom: 40 }}>Great job! Your {recipe.name} is ready.</div>
          <button className="rv-k-btn rv-k-btn-sec" style={{ minWidth: 200, marginBottom: 12 }} onClick={() => { onFinished && onFinished(); onExit && onExit(); }}>Done ✓</button>
        </div>
      </motion.div>
    );
  }

  const step = steps[curr];

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="rv-kitchen">
      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
        <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'var(--rv-pink)' }} />
      </div>

      <div className="rv-k-header">
        <button className="rv-circle-btn" onClick={onClose}><ArrowLeft size={20} /></button>
        <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Step {curr + 1} of {steps.length}</div>
        <div className="rv-k-timer" style={{ color: seconds < 60 ? '#F87171' : 'white' }}>
          <Timer size={20} /> {fmt(seconds)}
        </div>
      </div>

      <img
        src={recipe.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'}
        className="rv-k-img" alt=""
        onError={e => { e.target.style.display = 'none'; }}
      />

      <div className="rv-k-content">
        <div className="rv-k-title">{step.desc || step.title || `Follow instructions for step ${curr + 1}`}</div>

        {step.tip && <div className="rv-k-tip">💡 Tip: {step.tip}</div>}
        {!step.tip && <div className="rv-k-tip">💡 Tip: Read the recipe fully before you begin each step — timing and temperature are key in baking!</div>}

        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: 'rgba(255,255,255,0.9)' }}>Ingredients Needed</div>
        {(recipe.ingredients || []).map((ing, i) => (
          <div key={i} className="rv-k-check" onClick={() => setChecked(p => ({ ...p, [ing.name]: !p[ing.name] }))}>
            {checked[ing.name]
              ? <CheckCircle2 size={24} color="var(--rv-green)" />
              : <Circle size={24} color="rgba(255,255,255,0.3)" />}
            <span style={{ textDecoration: checked[ing.name] ? 'line-through' : 'none', opacity: checked[ing.name] ? 0.4 : 1, fontSize: 18 }}>
              {ing.name} <span style={{ opacity: 0.5, fontSize: 14 }}>{ing.qty} {ing.unit}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Timer control bar */}
      <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => setPaused(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', background: 'var(--rv-pink)', border: 'none', cursor: 'pointer', fontWeight: 800, padding: '10px 20px', borderRadius: 20 }}>
          {paused ? <Play size={20} /> : <Pause size={20} />} {paused ? 'Start Timer' : 'Pause Timer'}
        </button>
        <div style={{ fontSize: 28, fontWeight: 900, color: seconds < 60 ? '#F87171' : '#10B981', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(seconds)}
        </div>
      </div>

      <div className="rv-k-bottom">
        <button className="rv-k-btn rv-k-btn-sec" onClick={() => setCurr(c => Math.max(0, c - 1))} disabled={curr === 0} style={{ opacity: curr === 0 ? 0.4 : 1 }}>← Previous</button>
        <button className="rv-k-btn rv-k-btn-pri" onClick={() => setCurr(c => c + 1)}>
          {curr === steps.length - 1 ? 'Finish Baking 🎉' : 'Next Step →'}
        </button>
      </div>
    </motion.div>
  );
}
