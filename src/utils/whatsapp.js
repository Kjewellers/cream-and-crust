// WhatsApp utility functions
//
// Uses the centralized openLink utility for cross-platform compatibility.
// Business name is passed dynamically instead of hardcoded.

import { openWhatsAppChat } from './openLink';
import { log } from './logger';

export function formatOrderForWhatsApp(order, businessName = '') {
  const bakeryName = businessName || 'Your Bakery';
  const lines = [
    `🧁 *New Order — ${bakeryName}*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `📋 *Order ID:* ${order.id}`,
    `📅 *Date:* ${order.date}`,
    `⏰ *Time:* ${order.time}`,
    `📦 *Type:* ${order.type === 'delivery' ? '🚗 Delivery' : '🏠 Pickup'}`,
    ``,
    `👤 *Customer:* ${order.customer?.name || 'Customer'}`,
    `📱 *Phone:* ${order.customer?.phone || ''}`,
  ];

  if (order.type === 'delivery' && order.customer?.address) {
    lines.push(`📍 *Address:* ${order.customer.address}`);
  }

  lines.push('', `🛒 *Items:*`);
  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach((item, i) => {
    lines.push(`  ${i + 1}. ${item.name} (${item.size || ''}) × ${item.qty || 1} — ₹${(item.price || 0) * (item.qty || 1)}`);
  });

  lines.push(
    ``,
    `💰 *Total: ₹${order.total || 0}*`,
  );

  if (order.notes) {
    lines.push(``, `📝 *Notes:* ${order.notes}`);
  }

  lines.push(``, `Thank you for choosing ${bakeryName}! 🎂`);

  return lines.join('\n');
}

export async function sendWhatsAppMessage(phone, message) {
  log.whatsapp('sendWhatsAppMessage: phone=', phone?.slice(0, 6), '...');
  await openWhatsAppChat(phone, message);
}

export async function sendOrderToOwner(order, businessPhone = '', businessName = '') {
  const message = formatOrderForWhatsApp(order, businessName);
  await sendWhatsAppMessage(businessPhone, message);
}

export async function contactCustomer(phone, message, businessName = '') {
  const bakeryName = businessName || 'Your Bakery';
  await sendWhatsAppMessage(phone, message || `Hi! This is ${bakeryName} 🧁`);
}

export default {
  formatOrderForWhatsApp,
  sendWhatsAppMessage,
  sendOrderToOwner,
  contactCustomer,
};
