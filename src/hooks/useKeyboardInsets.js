/**
 * useKeyboardInsets — detect the on-screen keyboard via visualViewport.
 *
 * When the soft keyboard opens, the visual viewport shrinks relative to the
 * layout viewport. Callers hide the bottom navigation while the keyboard is
 * open and restore it on dismiss.
 *
 * Requirements: 4.3 (restore nav on keyboard dismiss), 4.6 (hide nav while
 * keyboard open), 17.2-17.5 (keyboard does not obscure inputs).
 */
import { useEffect, useState } from 'react';

// Heuristic: treat a >150px shrink of the visual viewport as "keyboard open".
const KEYBOARD_THRESHOLD = 150;

export function useKeyboardInsets() {
  const [state, setState] = useState({
    keyboardOpen: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return undefined;

    const onResize = () => {
      const shrink = window.innerHeight - vv.height;
      setState({
        keyboardOpen: shrink > KEYBOARD_THRESHOLD,
        viewportHeight: vv.height,
      });
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  return state;
}

export default useKeyboardInsets;
