import { describe, it, expect } from 'vitest';
import {
  findOverduePending,
  buildReminderMessage,
  buildReminderUrl,
  waPhoneFromRaw,
  referenceDateMs,
} from '../paymentReminders.js';

const NOW = new Date('2026-05-30T10:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

function ageDays(days) {
  return { seconds: Math.floor((NOW - days * DAY) / 1000) };
}

describe('paymentReminders', () => {
  describe('referenceDateMs', () => {
    it('returns the later of createdAt and deliveryDate', () => {
      const order = {
        createdAt: { seconds: Math.floor(NOW / 1000) - 86400 * 10 },
        deliveryDate: '2026-05-25T00:00:00Z',
      };
      const ref = referenceDateMs(order);
      expect(ref).toBe(Date.parse('2026-05-25T00:00:00Z'));
    });

    it('returns null when neither date is present', () => {
      expect(referenceDateMs({})).toBe(null);
    });
  });

  describe('findOverduePending', () => {
    it('flags only orders ≥5 days overdue with a positive balance and a phone', () => {
      const orders = [
        // 7 days old, balance 500 → flag
        {
          id: 'a',
          status: 'delivered',
          phone: '9876543210',
          total: 1000,
          advance: 500,
          createdAt: ageDays(7),
        },
        // 2 days old → too fresh, skip
        {
          id: 'b',
          status: 'delivered',
          phone: '8888888888',
          total: 500,
          advance: 100,
          createdAt: ageDays(2),
        },
        // already paid → skip
        {
          id: 'c',
          status: 'delivered',
          phone: '7777777777',
          total: 500,
          advance: 500,
          createdAt: ageDays(20),
        },
        // missing phone → skip
        {
          id: 'd',
          status: 'delivered',
          total: 800,
          advance: 200,
          createdAt: ageDays(15),
        },
        // inquiry → skip
        {
          id: 'e',
          status: 'inquiry',
          phone: '6666666666',
          total: 800,
          advance: 0,
          createdAt: ageDays(15),
        },
        // cancelled → skip
        {
          id: 'f',
          status: 'cancelled',
          phone: '5555555555',
          total: 800,
          advance: 0,
          createdAt: ageDays(15),
        },
      ];
      const result = findOverduePending(orders, { now: NOW });
      expect(result.map((r) => r.order.id)).toEqual(['a']);
      expect(result[0].balance).toBe(500);
      expect(result[0].daysOverdue).toBe(7);
    });

    it('sorts most overdue first, then largest balance', () => {
      const orders = [
        {
          id: 'small-old',
          status: 'delivered',
          phone: '9000000001',
          total: 200,
          advance: 0,
          createdAt: ageDays(20),
        },
        {
          id: 'big-medium',
          status: 'delivered',
          phone: '9000000002',
          total: 5000,
          advance: 0,
          createdAt: ageDays(8),
        },
        {
          id: 'tiny-medium',
          status: 'delivered',
          phone: '9000000003',
          total: 100,
          advance: 0,
          createdAt: ageDays(8),
        },
      ];
      const result = findOverduePending(orders, { now: NOW });
      expect(result.map((r) => r.order.id)).toEqual(['small-old', 'big-medium', 'tiny-medium']);
    });

    it('respects minDaysOverdue override', () => {
      const orders = [
        {
          id: 'a',
          status: 'delivered',
          phone: '9876543210',
          total: 1000,
          advance: 500,
          createdAt: ageDays(2),
        },
      ];
      expect(findOverduePending(orders, { now: NOW, minDaysOverdue: 1 })).toHaveLength(1);
      expect(findOverduePending(orders, { now: NOW, minDaysOverdue: 5 })).toHaveLength(0);
    });

    it('returns an empty array for non-array input', () => {
      expect(findOverduePending(null)).toEqual([]);
      expect(findOverduePending(undefined)).toEqual([]);
      expect(findOverduePending({})).toEqual([]);
    });
  });

  describe('buildReminderMessage', () => {
    it('uses the customer name, balance, and item', () => {
      const msg = buildReminderMessage(
        {
          name: 'Anita',
          balance: 750,
          order: { product: 'Red Velvet 1kg' },
        },
        { bakeryName: 'Sweet Spot Bakery' }
      );
      expect(msg).toContain('Anita');
      expect(msg).toContain('Red Velvet 1kg');
      expect(msg).toContain('₹750');
      expect(msg).toContain('Sweet Spot Bakery');
    });

    it('includes the UPI line when provided', () => {
      const msg = buildReminderMessage(
        {
          name: 'Bob',
          balance: 200,
          order: { itemName: 'Brownie box' },
        },
        { upiId: 'baker@upi' }
      );
      expect(msg).toContain('UPI: baker@upi');
    });

    it('omits the UPI line when not provided', () => {
      const msg = buildReminderMessage(
        {
          name: 'Bob',
          balance: 200,
          order: { itemName: 'Brownie box' },
        },
        {}
      );
      expect(msg).not.toContain('UPI:');
    });

    it('falls back to "there" and "your recent order" when fields are missing', () => {
      const msg = buildReminderMessage({ balance: 100, order: {} });
      expect(msg).toContain('Hi there');
      expect(msg).toContain('your recent order');
      expect(msg).toContain('Cream & Crust');
    });
  });

  describe('waPhoneFromRaw', () => {
    it('prefixes 10-digit numbers with the default country code', () => {
      expect(waPhoneFromRaw('98765 43210')).toBe('919876543210');
    });

    it('leaves longer numbers alone', () => {
      expect(waPhoneFromRaw('+44 7712 345 678')).toBe('447712345678');
    });

    it('returns empty string for empty / non-digit input', () => {
      expect(waPhoneFromRaw('')).toBe('');
      expect(waPhoneFromRaw(null)).toBe('');
      expect(waPhoneFromRaw('abc')).toBe('');
    });
  });

  describe('buildReminderUrl', () => {
    it('produces a wa.me link with the message URL-encoded', () => {
      const url = buildReminderUrl(
        {
          phone: '9876543210',
          name: 'Anita',
          balance: 500,
          order: { product: 'Tart' },
        },
        { bakeryName: 'Sweet Spot' }
      );
      expect(url.startsWith('https://wa.me/919876543210?text=')).toBe(true);
      const decoded = decodeURIComponent(url.split('text=')[1]);
      expect(decoded).toContain('Anita');
      expect(decoded).toContain('Tart');
      expect(decoded).toContain('₹500');
      expect(decoded).toContain('Sweet Spot');
    });

    it('returns empty string when phone is missing', () => {
      expect(buildReminderUrl({ phone: '', name: 'X', balance: 100, order: {} })).toBe('');
    });
  });
});
