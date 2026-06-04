/**
 * whatsappLink.js — single source of truth for WhatsApp deep links.
 *
 * Consolidates the previously duplicated generators in services/whatsapp.js
 * and utils/whatsapp.js. Pure and fully property-testable.
 *
 * Requirements: 6.1 (percent-encoded message), 6.2 (encode/decode round-trip),
 * 6.3 (10-digit -> prepend 91), 6.4 (already-prefixed 12-digit unchanged),
 * 6.5 (missing/invalid -> message-only link).
 */

/**
 * Normalize an Indian phone number for wa.me.
 *  - strips every non-digit character
 *  - exactly 10 digits        -> prepend "91"            (Req 6.3)
 *  - 12 digits starting "91"  -> returned unchanged      (Req 6.4)
 *  - empty / no digits        -> "" (message-only link)  (Req 6.5)
 *  - any other length         -> returned as digits-only (best effort)
 *
 * @param {*} raw
 * @returns {string} digits-only recipient, or "" when there is no recipient
 */
export function normalizePhone(raw) {
  if (raw == null) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

/**
 * Build a wa.me deep link. The message is percent-encoded with
 * encodeURIComponent so spaces, line breaks, emojis and reserved characters
 * are all encoded (Req 6.1), and decodeURIComponent of the text parameter
 * reproduces the source message character-for-character (Req 6.2).
 *
 * When there is no valid recipient a message-only link is produced so the
 * baker can pick a contact inside WhatsApp (Req 6.5).
 *
 * @param {{ phone?: *, message?: string }} args
 * @returns {string} https://wa.me/... link
 */
export function buildWhatsAppLink({ phone, message } = {}) {
  const digits = normalizePhone(phone);
  const encoded = encodeURIComponent(message == null ? '' : String(message));
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/** Only allow verified Google Maps HTTPS URLs to prevent link injection. */
export function isSafeMapsLink(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const allowed = ['maps.google.com', 'maps.app.goo.gl', 'goo.gl', 'www.google.com'];
    return allowed.some((host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

/**
 * Compose the branded order-confirmation message text from an order.
 * Returns a plain string (callers encode it via buildWhatsAppLink).
 */
export function buildOrderMessage(order = {}, business = {}) {
  const total = Number(order.total || order.totalAmount || 0);
  const advance = Number(order.advance || 0);
  const balance = Math.max(0, total - advance);
  const status =
    balance <= 0 ? '✅ FULLY PAID' : advance > 0 ? '🟡 PARTIALLY PAID' : '🔴 PAYMENT PENDING';

  const customerName =
    typeof order.customer === 'object'
      ? order.customer?.name || 'Valued Customer'
      : order.customerName || order.customer || 'Valued Customer';

  const brand = business?.name || 'Cream & Crust';
  const orderId = order.orderId?.split?.('-')?.[1] || order.orderId || order.id || '001';

  const lines = [
    `*🧁 ${brand.toUpperCase()}*`,
    `*ORDER CONFIRMATION* 📜`,
    ``,
    `*Order ID:* #${orderId}`,
    `*Status:* ${status}`,
    `--------------------------------`,
    `👤 *Customer:* ${customerName}`,
    `🎂 *Product:* ${order.product || 'Custom Bake'}`,
    `⚖️ *Weight:* ${order.size || order.cakeWeight || 'Standard'}`,
    `📅 *Delivery:* ${order.date || order.deliveryDate || 'TBD'}`,
    `⏰ *Time:* ${order.time || order.deliveryTime || 'TBD'}`,
    ``,
    `💰 *Financial Summary:*`,
    `*Total Amount:* ₹${total}`,
    `*Advance Paid:* ₹${advance}`,
    `*Balance Due:* ₹${balance}`,
    `--------------------------------`,
    `📍 *Delivery Address:*`,
    `${order.deliveryAddress || 'Pickup from Studio'}`,
  ];

  if (isSafeMapsLink(order.mapsLink)) {
    lines.push(``, `📍 *Location:* ${order.mapsLink}`);
  }

  lines.push(``, `Thank you for choosing ${brand}! We are excited to bake for you. ✨`);

  return lines.join('\n');
}
