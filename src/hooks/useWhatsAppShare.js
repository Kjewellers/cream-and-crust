/**
 * useWhatsAppShare — open exactly one WhatsApp session per activation with a
 * leading-edge debounce, and a copy-text fallback if WhatsApp does not open.
 *
 * Requirements: 6.6 (one session per 1000ms), 6.7 (fallback toast within 3s).
 */
import { useCallback, useRef } from 'react';
import { buildWhatsAppLink } from '../utils/whatsappLink.js';
import { showToast } from '../components/iOS.jsx';
import { trackWhatsAppSend } from '../services/analytics.js';

const DEBOUNCE_MS = 1000;
const FALLBACK_MS = 3000;

export function useWhatsAppShare() {
  const lastFiredRef = useRef(0);

  const share = useCallback(({ phone, message, context = 'order' } = {}) => {
    const now = Date.now();
    // Leading-edge debounce: ignore repeat activations within the window.
    if (now - lastFiredRef.current < DEBOUNCE_MS) return null;
    lastFiredRef.current = now;

    const link = buildWhatsAppLink({ phone, message });
    let win = null;
    try {
      win = window.open(link, '_blank');
    } catch {
      win = null;
    }

    trackWhatsAppSend(context);

    // If WhatsApp could not open, offer a copy-text fallback.
    setTimeout(() => {
      const blocked = !win || win.closed || typeof win.closed === 'undefined';
      if (blocked) {
        try {
          navigator.clipboard?.writeText(message || '');
        } catch {
          /* clipboard may be unavailable */
        }
        showToast('Could not open WhatsApp. Message copied — paste it in any chat.', 'info');
      }
    }, FALLBACK_MS);

    return link;
  }, []);

  return share;
}

export default useWhatsAppShare;
