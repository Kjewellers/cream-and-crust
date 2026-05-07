// WhatsApp utility functions

const WHATSAPP_NUMBER = '919876543210'; // Default — change to your number

export function formatOrderForWhatsApp(order) {
  const lines = [
    `🧁 *New Order — Cream & Crust*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `📋 *Order ID:* ${order.id}`,
    `📅 *Date:* ${order.date}`,
    `⏰ *Time:* ${order.time}`,
    `📦 *Type:* ${order.type === 'delivery' ? '🚗 Delivery' : '🏠 Pickup'}`,
    ``,
    `👤 *Customer:* ${order.customer.name}`,
    `📱 *Phone:* ${order.customer.phone}`,
  ];

  if (order.type === 'delivery' && order.customer.address) {
    lines.push(`📍 *Address:* ${order.customer.address}`);
  }

  lines.push('', `🛒 *Items:*`);
  order.items.forEach((item, i) => {
    lines.push(`  ${i + 1}. ${item.name} (${item.size}) × ${item.qty} — ₹${item.price * item.qty}`);
  });

  lines.push(
    ``,
    `💰 *Total: ₹${order.total}*`,
  );

  if (order.notes) {
    lines.push(``, `📝 *Notes:* ${order.notes}`);
  }

  lines.push(``, `Thank you for choosing Cream & Crust! 🎂`);

  return lines.join('\n');
}

export function sendWhatsAppMessage(phone, message) {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
}

export function sendOrderToOwner(order) {
  const message = formatOrderForWhatsApp(order);
  sendWhatsAppMessage(WHATSAPP_NUMBER, message);
}

export function contactCustomer(phone, message) {
  sendWhatsAppMessage(phone, message || 'Hi! This is Cream & Crust 🧁');
}

export default {
  formatOrderForWhatsApp,
  sendWhatsAppMessage,
  sendOrderToOwner,
  contactCustomer,
};
