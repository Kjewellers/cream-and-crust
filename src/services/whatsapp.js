/**
 * Utility to generate WhatsApp sharing links for invoices
 */

export const generateWhatsAppLink = (order) => {
  const phoneNumber = order.phone.replace(/\D/g, ''); // Clean phone number
  
  const message = `
*🧁 CREAM & CRUST INVOICE*
--------------------------
*Order ID:* ${order.orderId || order.id.slice(0, 5)}
*Customer:* ${order.customer}
*Product:* ${order.product}
*Flavor:* ${order.flavor}
*Size:* ${order.size}

*Delivery Date:* ${order.date}
*Time:* ${order.time}
*Type:* ${order.type.toUpperCase()}

--------------------------
*Total Amount:* ₹${order.total}
*Advance Paid:* ₹${order.advance}
*Balance Due:* ₹${order.total - order.advance}

*Status:* ${order.status.toUpperCase()}
--------------------------
Thank you for choosing Cream & Crust! ✨
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber.startsWith('91') ? phoneNumber : '91' + phoneNumber}?text=${encodedMessage}`;
};

export const shareToWhatsApp = (order) => {
  const link = generateWhatsAppLink(order);
  window.open(link, '_blank');
};
