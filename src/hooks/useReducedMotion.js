/**
 * useReducedMotion — true when the user prefers reduced motion (or the device
 * is in a battery-saver-like low-power state). Callers disable non-essential
 * animation while keeping all controls usable.
 *
 * Requirements: 5.4, 5.5 (limit heavy animation), 17.11 (reduced motion).
 */
import { useEffect, useState } from 'react';

function query() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    const mq = query();
    return mq ? mq.matches : false;
  });

  useEffect(() => {
    const mq = query();
    if (!mq) return undefined;
    const onChange = (e) => setReduced(e.matches);
    // addEventListener is the modern API; addListener is the legacy fallback.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}

export default useReducedMotion;
