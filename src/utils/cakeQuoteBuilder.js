/**
 * cakeQuoteBuilder.js
 *
 * Instant pricing and quotation engine for custom celebration cakes.
 * Generates structured pricing breakdown and customer-ready WhatsApp proposal messages.
 */

export const FINISH_RATES = {
  naked: { label: 'Semi-Naked / Crumb Coat', addPrice: 0 },
  buttercream: { label: 'Silky Buttercream Palette', addPrice: 200 },
  ganache: { label: 'Belgian Chocolate Ganache', addPrice: 350 },
  fondant: { label: 'Full Satin Fondant Drape', addPrice: 700 },
};

export const DECORATION_TIERS = {
  minimal: { label: 'Minimalist & Clean Piping', addPrice: 0 },
  florals: { label: 'Fresh Blooms, Berries & Macarons', addPrice: 450 },
  figurine: { label: 'Handcrafted Fondant 3D Figurine', addPrice: 850 },
  sculpted: { label: 'Architectural / Isomalt / Stenciled Gold', addPrice: 1500 },
};

export const ADDONS_CATALOG = {
  acrylicTopper: { label: 'Custom Acrylic Name Topper', price: 250 },
  sparklerCandles: { label: 'Sparkler & Metallic Candles', price: 120 },
  luxuryBox: { label: 'Tall Transparent Display Box & Ribbon', price: 350 },
  knifeSet: { label: 'Pastry Server & Cutlery Set', price: 80 },
};

/**
 * Calculate comprehensive custom cake estimate
 */
export function calculateCustomCakeQuote({
  baseFlavour = 'Chocolate Truffle',
  weightKg = 1.0,
  baseRatePerKg = 1200,
  finishKey = 'buttercream',
  decorationKey = 'florals',
  selectedAddons = [], // array of addon keys
  deliveryFee = 150,
  discountAmount = 0,
}) {
  const basePrice = Math.round(weightKg * baseRatePerKg);
  const finishCost = FINISH_RATES[finishKey]?.addPrice || 0;
  const decorationCost = DECORATION_TIERS[decorationKey]?.addPrice || 0;

  let addonsTotal = 0;
  const addonsBreakdown = (selectedAddons || []).map((key) => {
    const item = ADDONS_CATALOG[key] || { label: key, price: 0 };
    addonsTotal += item.price;
    return item;
  });

  const subtotal = basePrice + finishCost + decorationCost + addonsTotal;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discountAmount);
  const advanceRequired = Math.round(grandTotal * 0.5); // Standard 50% deposit to confirm date

  return {
    basePrice,
    finishCost,
    decorationCost,
    addonsTotal,
    addonsBreakdown,
    deliveryFee,
    discountAmount,
    subtotal,
    grandTotal,
    advanceRequired,
  };
}

/**
 * Format a customer-ready WhatsApp quote message
 */
export function formatWhatsAppQuoteMessage({
  customerName = 'Valued Customer',
  occasion = 'Celebration',
  deliveryDate = 'This Weekend',
  flavour = 'Belgian Chocolate Truffle',
  weightKg = 1.0,
  tierCount = 1,
  finishKey = 'buttercream',
  decorationKey = 'florals',
  selectedAddons = [],
  deliveryFee = 150,
  discountAmount = 0,
  bakeryName = 'Cream & Crust Bakery',
  upiId = '',
}) {
  const quote = calculateCustomCakeQuote({
    baseFlavour: flavour,
    weightKg,
    finishKey,
    decorationKey,
    selectedAddons,
    deliveryFee,
    discountAmount,
  });

  const finish = FINISH_RATES[finishKey]?.label || 'Buttercream';
  const deco = DECORATION_TIERS[decorationKey]?.label || 'Custom Art';

  let text = `🎂 *CUSTOM CAKE ESTIMATE — ${bakeryName.toUpperCase()}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Hello ${customerName}! Here is your bespoke cake plan for *${occasion}* on *${deliveryDate}*:\n\n`;

  text += `✨ *CAKE SPECIFICATIONS:*\n`;
  text += `• Flavour: *${flavour}*\n`;
  text += `• Size: *${weightKg} kg* (${tierCount > 1 ? `${tierCount}-Tier Stack` : 'Single Tier'})\n`;
  text += `• Finish: ${finish}\n`;
  text += `• Styling: ${deco}\n`;

  if (quote.addonsBreakdown.length > 0) {
    text += `• Add-ons: ${quote.addonsBreakdown.map((a) => a.label).join(', ')}\n`;
  }

  text += `\n💰 *INVESTMENT BREAKDOWN:*\n`;
  text += `• Cake Craft & Styling: ₹${quote.subtotal}\n`;
  if (deliveryFee > 0) {
    text += `• Temperature-Controlled Delivery: ₹${deliveryFee}\n`;
  }
  if (discountAmount > 0) {
    text += `• Promotional Privilege: -₹${discountAmount}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*TOTAL: ₹${quote.grandTotal.toLocaleString('en-IN')}*\n`;
  text += `*50% Deposit to lock slot: ₹${quote.advanceRequired.toLocaleString('en-IN')}*\n\n`;

  if (upiId) {
    text += `📲 *Pay via UPI:* \`${upiId}\`\n\n`;
  }

  text += `_Please share the payment screenshot to confirm this date in our production calendar. We can't wait to bake for you!_ 🧁✨`;

  return text;
}
