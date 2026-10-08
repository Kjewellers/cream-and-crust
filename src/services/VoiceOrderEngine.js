/**
 * VoiceOrderEngine.js
 *
 * Spoken Hinglish & English voice order parser for Cream & Crust.
 * Converts raw spoken transcript into structured order payloads.
 */

export function parseVoiceOrderTranscript(transcript = '') {
  if (!transcript || typeof transcript !== 'string') {
    return { success: false, raw: transcript, parsed: null };
  }

  const text = transcript.toLowerCase().trim();

  // Extract weight/size (e.g., "2kg", "1.5 kg", "half kg", "500g")
  let size = '1kg';
  const sizeMatch = text.match(/(\d+(?:\.\d+)?\s*(?:kg|g|pound|pounds))/i);
  if (sizeMatch) {
    size = sizeMatch[1].replace(/\s+/g, '');
  } else if (text.includes('half kg')) {
    size = '0.5kg';
  }

  // Extract amount / total (e.g., "1500 rs", "rs 1200", "₹1500", "1500 rupees")
  let total = 0;
  const totalMatch = text.match(/(?:rs\.?|₹|rupees?)\s*(\d+)|(\d+)\s*(?:rs\.?|₹|rupees?)/i);
  if (totalMatch) {
    total = Number(totalMatch[1] || totalMatch[2]) || 0;
  }

  // Extract advance paid (e.g., "500 advance", "advance 500")
  let advance = 0;
  const advanceMatch = text.match(/(?:advance|paid)\s*(\d+)|(\d+)\s*(?:advance|paid)/i);
  if (advanceMatch) {
    advance = Number(advanceMatch[1] || advanceMatch[2]) || 0;
  }

  // Extract customer name (e.g., "for Rahul", "for Priya Sharma")
  let customerName = 'Valued Customer';
  const nameMatch = text.match(/(?:for|for customer|client)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  if (nameMatch) {
    customerName = nameMatch[1].replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Extract product flavor/type
  let product = 'Custom Cake';
  if (text.includes('truffle') || text.includes('chocolate')) {
    product = 'Chocolate Truffle Cake';
  } else if (text.includes('red velvet') || text.includes('velvet')) {
    product = 'Red Velvet Cake';
  } else if (text.includes('cheesecake') || text.includes('cheese')) {
    product = 'Blueberry Cheesecake';
  } else if (text.includes('pineapple')) {
    product = 'Fresh Pineapple Cake';
  } else if (text.includes('black forest')) {
    product = 'Black Forest Cake';
  }

  // Default delivery date (Today or Tomorrow)
  const deliveryDate = text.includes('tomorrow')
    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    success: true,
    raw: transcript,
    parsed: {
      customer: customerName,
      product,
      size,
      total: String(total || 1200),
      advance: String(advance || 0),
      date: deliveryDate,
      time: '04:00 PM',
      status: 'confirmed',
      notes: `Voice order created: "${transcript}"`,
    },
  };
}
