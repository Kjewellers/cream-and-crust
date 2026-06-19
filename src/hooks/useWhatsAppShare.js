/**
 * useWhatsAppShare — open exactly one WhatsApp session per activation with a
 * leading-edge debounce, and a copy-text fallback if WhatsApp does not open.
 *
 * Uses the centralized openLink utility for cross-platform compatibility
 * (Capacitor native + web).
 *
 * Requirements: 6.6 (one session per 1000ms), 6.7 (fallback toast within 3s).
 */
import { useCallback, useRef } from 'react';
import { buildWhatsAppLink } from '../utils/whatsappLink.js';
import { openWhatsAppLink } from '../utils/openLink.js';
import { showToast } from '../components/iOS.jsx';
import { trackWhatsAppSend } from '../services/analytics.js';
import { log } from '../utils/logger.js';

const DEBOUNCE_MS = 1000;

export function useWhatsAppShare() {
  const lastFiredRef = useRef(0);

  const share = useCallback(({ phone, message, context = 'order' } = {}) => {
    const now = Date.now();
    // Leading-edge debounce: ignore repeat activations within the window.
    if (now - lastFiredRef.current < DEBOUNCE_MS) return null;
    lastFiredRef.current = now;

    const link = buildWhatsAppLink({ phone, message });
    log.whatsapp('useWhatsAppShare: opening link for context:', context);

    // Use cross-platform link opener (handles native + web)
    openWhatsAppLink(link).catch((e) => {
      log.whatsapp.warn('useWhatsAppShare: openWhatsAppLink failed:', e?.message);
      // Fallback: copy message to clipboard
      try {
        navigator.clipboard?.writeText(message || '');
      } catch {
        /* clipboard may be unavailable */
      }
      showToast('Could not open WhatsApp. Message copied — paste it in any chat.', 'info');
    });

    trackWhatsAppSend(context);

    return link;
  }, []);

  return share;
}

export default useWhatsAppShare;
