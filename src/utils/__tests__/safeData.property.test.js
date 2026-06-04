/**
 * Feature: production-readiness-hardening, Property 1: Safe data access never
 * throws and yields a well-formed order.
 *
 * Validates: Requirements 1.3, 1.4
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { safeGet, safeNumber, safeString, safeArray, normalizeOrder } from '../safeData.js';

describe('safeData accessors (Property 1)', () => {
  it('never throws for any input', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(() => safeGet(value, 'a.b.c', null)).not.toThrow();
        expect(() => safeNumber(value, 0)).not.toThrow();
        expect(() => safeString(value, '')).not.toThrow();
        expect(() => safeArray(value)).not.toThrow();
        expect(() => normalizeOrder(value)).not.toThrow();
      }),
      { numRuns: 200 }
    );
  });

  it('safeNumber always returns a finite number', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const n = safeNumber(value, 0);
        expect(typeof n).toBe('number');
        expect(Number.isFinite(n)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('safeArray always returns an array', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(Array.isArray(safeArray(value))).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('normalizeOrder returns a well-formed order for any input', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const o = normalizeOrder(value);
        expect(typeof o.customerName).toBe('string');
        expect(o.customerName.length).toBeGreaterThan(0); // default "Customer"
        expect(typeof o.product).toBe('string');
        expect(typeof o.status).toBe('string');
        expect(Number.isFinite(o.total)).toBe(true);
        expect(Number.isFinite(o.advance)).toBe(true);
        expect(Number.isFinite(o.balance)).toBe(true);
        expect(o.balance).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(o.items)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('passes through valid present fields unchanged', () => {
    const raw = {
      id: 'abc',
      customerName: 'Priya',
      product: 'Chocolate Cake',
      status: 'BAKING',
      total: 1200,
      advance: 400,
    };
    const o = normalizeOrder(raw);
    expect(o.id).toBe('abc');
    expect(o.customerName).toBe('Priya');
    expect(o.product).toBe('Chocolate Cake');
    expect(o.status).toBe('baking'); // lowercased
    expect(o.total).toBe(1200);
    expect(o.advance).toBe(400);
    expect(o.balance).toBe(800);
  });
});
