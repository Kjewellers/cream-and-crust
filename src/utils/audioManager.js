// A lightweight, asset-free audio manager using Web Audio API

let audioCtx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSound(type = 'light') {
  if (typeof window === 'undefined') return;
  
  // Check user preference (default is true if not set, or we can default to false. Let's default to true)
  if (localStorage.getItem('cc_uiSounds') === 'false') return;

  const ctx = getContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'success') {
    // A pleasant major third chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.1); // E5

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.start(t);
    osc.stop(t + 0.4);
  } else if (type === 'error') {
    // A muted, low thud
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.start(t);
    osc.stop(t + 0.2);
  } else if (type === 'info' || type === 'warning') {
    // Soft double beep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t); // A4

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, t + 0.15);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    gain2.gain.setValueAtTime(0, t + 0.15);
    gain2.gain.linearRampToValueAtTime(0.1, t + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    
    osc2.start(t + 0.15);
    osc2.stop(t + 0.25);

    osc.start(t);
    osc.stop(t + 0.1);
  } else {
    // 'light', 'medium', 'heavy' - very soft tap/click
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

    const volume = type === 'heavy' ? 0.15 : type === 'medium' ? 0.1 : 0.05;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.start(t);
    osc.stop(t + 0.05);
  }
}
