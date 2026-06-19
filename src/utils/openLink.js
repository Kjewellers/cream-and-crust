/**
 * openLink.js — Cross-platform link opener for Cream & Crust.
 *
 * On Capacitor native (Android/iOS):
 *   - Uses @capacitor/browser to open URLs in a Chrome Custom Tab / SFSafariVC
 *   - This avoids WebView popup blocking that breaks window.open
 *   - For wa.me links, uses intent:// scheme on Android for direct WhatsApp open
 *
 * On web browser:
 *   - Uses window.open as usual
 *
 * Usage:
 *   import { openLink, openWhatsAppChat } from '../utils/openLink';
 *   openLink('https://example.com');
 *   openWhatsAppChat('919876543210', 'Hello!');
 */

import { Capacitor } from '@capacitor/core';
import { normalizePhone } from './whatsappLink.js';
import { log } from './logger.js';

const isNative = () => Capacitor.isNativePlatform();
const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * Open any URL in the best available handler.
 * On native: @capacitor/browser (Custom Tab)
 * On web: window.open
 */
export async function openLink(url, target = '_blank') {
  if (!url) {
    log.share.warn('openLink called with empty URL');
    return;
  }

  log.share(`Opening link: ${url.slice(0, 80)}...`);

  if (isNative()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, windowName: target });
      return;
    } catch (e) {
      log.share.warn('Browser.open failed, falling back to window.open:', e?.message);
    }
  }

  // Web fallback
  try {
    window.open(url, target, 'noopener,noreferrer');
  } catch (e) {
    log.share.error('window.open failed:', e?.message);
  }
}

/**
 * Open WhatsApp chat with a specific phone number and optional message.
 * Uses wa.me deep link which WhatsApp handles natively.
 *
 * On Android native, tries the Android intent scheme first for a more
 * reliable app launch, then falls back to wa.me.
 *
 * @param {string} phone - Phone number (raw, will be normalized)
 * @param {string} [message] - Optional pre-filled message
 */
export async function openWhatsAppChat(phone, message = '') {
  const normalized = normalizePhone(phone);
  const encoded = encodeURIComponent(message);

  log.whatsapp(`Opening chat: phone=${normalized}, msg=${message.slice(0, 40)}...`);

  // Build the wa.me URL (works universally)
  const waUrl = normalized
    ? `https://wa.me/${normalized}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  if (isNative() && isAndroid() && normalized) {
    // On Android, try the intent scheme for more reliable app launch
    try {
      const intentUrl = `intent://send/${normalized}#Intent;scheme=smsto;package=com.whatsapp;action=android.intent.action.SENDTO;end`;
      // Try intent first, fall back to wa.me
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: waUrl });
      log.whatsapp('Opened via Browser plugin');
      return;
    } catch (e) {
      log.whatsapp.warn('Intent/Browser open failed, using window.open:', e?.message);
    }
  }

  // Web / iOS / fallback
  try {
    if (isNative()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: waUrl });
    } else {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (e) {
    log.whatsapp.error('Failed to open WhatsApp:', e?.message);
    // Ultimate fallback — try to copy message to clipboard
    try {
      await navigator.clipboard?.writeText(message || waUrl);
    } catch { /* ignore */ }
  }
}

/**
 * Open a WhatsApp link (pre-built wa.me URL).
 * Use this when you already have a complete wa.me link.
 */
export async function openWhatsAppLink(url) {
  if (!url) return;
  await openLink(url);
}
