/**
 * Feature: production-readiness-hardening, Property 2: WhatsApp message
 * encode/decode round-trip; Property 3: Phone normalization rules.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildWhatsAppLink, normalizePhone } from '../whatsappLink.js';

describe('buildWhatsAppLink encode/decode round-trip (Property 2)', () => {
  it('text param decodes back to the source message character-for-character', () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const link = buildWhatsAppLink({ phone: '', message });
        const textParam = link.split('?text=')[1] ?? '';
        // No unencoded spaces or line breaks in the encoded param.
        expect(textParam.includes(' ')).toBe(false);
        expect(textParam.includes('\n')).toBe(false);
        expect(textParam.includes('\r')).toBe(false);
        expect(decodeURIComponent(textParam)).toBe(message);
      }),
      { numRuns: 200 }
    );
  });

  it('preserves emojis, newlines and reserved characters exactly', () => {
    const message = 'Order ✨\nTotal: ₹1200 & 50% off?\r\nThanks! #cake @baker';
    const link = buildWhatsAppLink({ phone: '9876543210', message });
    const textParam = link.split('?text=')[1];
    expect(decodeURIComponent(textParam)).toBe(message);
  });
});

describe('normalizePhone rules (Property 3)', () => {
  it('prepends 91 for exactly 10 digits (with arbitrary separators)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...'0123456789'.split('')), { minLength: 10, maxLength: 10 }),
        fc.array(fc.constantFrom(' ', '-', '(', ')', '+', '.'), { maxLength: 6 }),
        (digits, noise) => {
          const raw = digits.join('') + noise.join('');
          // noise has no digits, so digit count stays 10
          expect(normalizePhone(raw)).toBe('91' + digits.join(''));
        }
      ),
      { numRuns: 200 }
    );
  });

  it('does not double-prefix an already 91-prefixed 12-digit number', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...'0123456789'.split('')), { minLength: 10, maxLength: 10 }),
        (rest) => {
          const num = '91' + rest.join('');
          // 12 digits starting with 91 -> returned unchanged (no second prefix).
          expect(normalizePhone(num)).toBe(num);
          expect(normalizePhone(num).length).toBe(12);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns empty string for missing/empty/no-digit input', () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined, '', '   ', 'abc', '!!!', '+- ()'), (raw) => {
        expect(normalizePhone(raw)).toBe('');
      }),
      { numRuns: 50 }
    );
  });

  it('builds a recipient-less link when there is no phone', () => {
    const link = buildWhatsAppLink({ phone: '', message: 'hi' });
    expect(link.startsWith('https://wa.me/?text=')).toBe(true);
  });
});
