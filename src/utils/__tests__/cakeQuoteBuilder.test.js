import { describe, it, expect } from 'vitest';
import {
  calculateCustomCakeQuote,
  formatWhatsAppQuoteMessage,
} from '../cakeQuoteBuilder';

describe('cakeQuoteBuilder', () => {
  it('calculates custom cake estimate with addons and delivery', () => {
    const quote = calculateCustomCakeQuote({
      baseFlavour: 'Belgian Chocolate Truffle',
      weightKg: 2.0,
      baseRatePerKg: 1200,
      finishKey: 'ganache', // +350
      decorationKey: 'florals', // +450
      selectedAddons: ['acrylicTopper', 'sparklerCandles'], // 250 + 120 = 370
      deliveryFee: 150,
      discountAmount: 100,
    });

    // base: 2 * 1200 = 2400
    expect(quote.basePrice).toBe(2400);
    expect(quote.finishCost).toBe(350);
    expect(quote.decorationCost).toBe(450);
    expect(quote.addonsTotal).toBe(370);
    // subtotal: 2400 + 350 + 450 + 370 = 3570
    expect(quote.subtotal).toBe(3570);
    // grandTotal: 3570 + 150 - 100 = 3620
    expect(quote.grandTotal).toBe(3620);
    // 50% deposit: 1810
    expect(quote.advanceRequired).toBe(1810);
  });

  it('formats customer-ready WhatsApp quote message cleanly', () => {
    const text = formatWhatsAppQuoteMessage({
      customerName: 'Ananya',
      occasion: 'Anniversary',
      deliveryDate: 'Sunday 6pm',
      flavour: 'Red Velvet Cream Cheese',
      weightKg: 1.5,
      upiId: 'bakery@upi',
    });

    expect(text).toContain('CUSTOM CAKE ESTIMATE');
    expect(text).toContain('Hello Ananya!');
    expect(text).toContain('Anniversary');
    expect(text).toContain('Red Velvet Cream Cheese');
    expect(text).toContain('bakery@upi');
    expect(text).toContain('50% Deposit to lock slot');
  });
});
