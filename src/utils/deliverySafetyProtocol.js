/**
 * deliverySafetyProtocol.js
 *
 * Cake delivery verification, rider safety handover, and anti-damage instructions.
 * Generates bilingual driver instructions and pre-dispatch checklists.
 */

export const DISPATCH_CHECKLIST = [
  { id: 'board_secured', label: 'Anti-slip silicone mat placed under cake board' },
  { id: 'box_taped', label: 'Box sealed securely with tamper-evident tape' },
  { id: 'ice_packs', label: 'Chilled ice gel packs placed on box sides (away from direct cake contact)' },
  { id: 'fragile_sticker', label: '"FRAGILE / HANDLE WITH LOVE" label visible on all sides' },
  { id: 'photo_captured', label: 'Pre-dispatch quality photo captured in box' },
];

/**
 * Format bilingual instructions for Rapido / courier / delivery rider
 */
export function generateRiderInstructions({
  orderNumber = '',
  customerName = '',
  deliveryAddress = '',
  customerPhone = '',
  isTieredCake = false,
  riderName = '',
}) {
  return [
    `🚨 *CRITICAL CAKE DELIVERY INSTRUCTIONS* 🚨`,
    `Order #${orderNumber} | Customer: ${customerName}`,
    `Delivery To: ${deliveryAddress}`,
    `Contact: ${customerPhone}`,
    `----------------------------------------`,
    `⚠️ ENGLISH:`,
    `1. KEEP 100% FLAT ON VEHICLE FLOORBOARD. NEVER PLACE ON SEAT OR IN LAP.`,
    `2. DRIVE AT MAX 25-30 KM/H. AVOID POTHOLES & SUDDEN SPEED BREAKERS.`,
    `3. IF CAR: AC MUST BE AT MAXIMUM COOLING (18-20°C). NO SUNLIGHT.`,
    `4. DO NOT TILT OR SWING BOX WHILE WALKING OR CLIMBING STAIRS.`,
    `----------------------------------------`,
    `⚠️ HINDI / हिंदी:`,
    `1. केक का बॉक्स हमेशा बिल्कुल सीधा और फ्लैट (समतल) रखें। सीट पर या गोद में न रखें।`,
    `2. गाड़ी धीमी गति (25-30 किमी/घंटा) से चलाएं। गड्ढों और स्पीड ब्रेकर पर झटका न लगने दें।`,
    `3. कार में AC पूरी तरह चालू रखें। सीधी धूप से बचाएं।`,
    `4. सीढ़ियां चढ़ते समय बॉक्स को सीधा रखें, झुकाएं या हिलाएं नहीं।`,
    `----------------------------------------`,
    `Thank you for delivering this celebration safely! 🙏✨`,
  ].join('\n');
}
