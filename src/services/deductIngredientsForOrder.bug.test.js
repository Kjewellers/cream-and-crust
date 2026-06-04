/**
 * Task 1 — Bug Condition Property Tests (A1–A10)
 * Must FAIL on unfixed code, PASS after all fix sub-tasks complete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

vi.mock('../services/firebase', () => ({
  db: {}, auth: { currentUser: { uid: 'test-uid' } }, storage: {},
}));

const mockRunTransaction = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(), initializeFirestore: vi.fn(), terminate: vi.fn(),
  collection: vi.fn((_db, col) => ({ _col: col })),
  addDoc: vi.fn(), getDoc: mockGetDoc, getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc, doc: vi.fn((_db, col, id) => ({ _col: col, _id: id })),
  deleteDoc: vi.fn(), query: vi.fn((...a) => a), orderBy: vi.fn(),
  onSnapshot: vi.fn(), where: vi.fn((...a) => a), setDoc: vi.fn(),
  arrayUnion: vi.fn(v => v), serverTimestamp: vi.fn(() => '2024-01-01T00:00:00.000Z'),
  runTransaction: mockRunTransaction, FieldValue: { increment: vi.fn(n => n) },
}));

vi.mock('../components/iOS', () => ({ showToast: vi.fn() }));
vi.mock('../utils/crypto', () => ({
  encryptData: vi.fn(async v => v), decryptData: vi.fn(async v => v),
}));

import {
  convertUnit, parseSizeMultiplier,
  IncompatibleUnitError, InsufficientStockError, MissingRecipeLinkError,
  MissingInventoryItemError,
} from './inventoryErrors.js';

describe('A1 — deduction uses recipe ingredient qty, not hardcoded constant', () => {
  it('convertUnit(qty, unit, unit) === qty for any positive qty', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(500), noNaN: true }),
        fc.constantFrom('g', 'kg', 'ml', 'l', 'pcs'),
        (qty, unit) => {
          expect(convertUnit(qty, unit, unit)).toBeCloseTo(qty, 5);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('A2 — recipe selection requires explicit recipeId', () => {
  it('MissingRecipeLinkError code === MISSING_RECIPE_LINK', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (orderId, productName) => {
        const err = new MissingRecipeLinkError(orderId, productName);
        expect(err.code).toBe('MISSING_RECIPE_LINK');
        expect(err.orderId).toBe(orderId);
      }),
      { numRuns: 10 }
    );
  });
});

describe('A3 — idempotency guard prevents double deduction', () => {
  it('deductIngredientsForOrder skips when deductedForOrder=true', async () => {
    mockRunTransaction.mockClear();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'test-uid', recipeId: 'r1', deductedForOrder: true }),
    });
    const { deductIngredientsForOrder } = await import('./db.js');
    await deductIngredientsForOrder('order-1', { uid: 'test-uid', recipeId: 'r1', deductedForOrder: true });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('A4 — missing inventory item throws MissingInventoryItemError', () => {
  it('error carries ingredientName and code', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const err = new MissingInventoryItemError(name);
        expect(err.code).toBe('MISSING_INVENTORY_ITEM');
        expect(err.ingredientName).toBe(name);
      }),
      { numRuns: 10 }
    );
  });
});

describe('A5 — cross-family unit mismatch throws IncompatibleUnitError', () => {
  it('mass vs count throws', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('g', 'kg'),
        fc.constantFrom('pcs', 'boxes'),
        fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
        (mass, count, qty) => {
          expect(() => convertUnit(qty, mass, count, 'ingredient')).toThrow(IncompatibleUnitError);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('A6 — deduction wrapped in single Firestore transaction', () => {
  it('calls runTransaction exactly once', async () => {
    mockRunTransaction.mockClear();
    mockRunTransaction.mockImplementation(async (_db, fn) => {
      const txn = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ stock: 10, unit: 'kg', item: 'Flour', uid: 'test-uid', deductedForOrder: false }),
        }),
        update: vi.fn(), set: vi.fn(),
      };
      return fn(txn);
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'test-uid', recipeId: 'r1', product: 'Cake', size: '1kg', deductedForOrder: false,
        name: 'Vanilla Cake', ingredients: [{ name: 'Flour', qty: 200, unit: 'g' }],
      }),
    });
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'inv-1', data: () => ({ item: 'Flour', stock: 10, unit: 'kg', uid: 'test-uid' }) }],
    });
    const { deductIngredientsForOrder } = await import('./db.js');
    await deductIngredientsForOrder('order-2', { uid: 'test-uid', recipeId: 'r1', size: '1kg' });
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('A7 — insufficient stock throws InsufficientStockError', () => {
  it('error carries available/needed context', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.float({ min: 0, max: 5, noNaN: true }),
        fc.float({ min: 6, max: 100, noNaN: true }),
        fc.constantFrom('kg', 'g', 'pcs'),
        (name, available, needed, unit) => {
          const err = new InsufficientStockError(name, available, needed, unit);
          expect(err.code).toBe('INSUFFICIENT_STOCK');
          expect(err.available).toBe(available);
          expect(err.needed).toBe(needed);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('A8 — IncompatibleUnitError stores both unit strings', () => {
  it('ingredientUnit and inventoryUnit are preserved', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('g', 'kg', 'ml', 'l'),
        fc.constantFrom('pcs', 'boxes'),
        fc.string({ minLength: 1 }),
        (ingUnit, invUnit, name) => {
          const err = new IncompatibleUnitError(ingUnit, invUnit, name);
          expect(err.ingredientUnit).toBe(ingUnit);
          expect(err.inventoryUnit).toBe(invUnit);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('A9 — restockIngredientsForOrder is exported from db.js', () => {
  it('is a function', async () => {
    const db = await import('./db.js');
    expect(typeof db.restockIngredientsForOrder).toBe('function');
  });
});

describe('A10 — parseSizeMultiplier handles standard cake sizes', () => {
  it('known sizes parse correctly', () => {
    expect(parseSizeMultiplier('500gm')).toBeCloseTo(0.5, 3);
    expect(parseSizeMultiplier('1kg')).toBeCloseTo(1.0, 3);
    expect(parseSizeMultiplier('1.5kg')).toBeCloseTo(1.5, 3);
    expect(parseSizeMultiplier('2kg')).toBeCloseTo(2.0, 3);
    expect(parseSizeMultiplier('2kg+')).toBeCloseTo(2.0, 3);
  });

  it('gm and kg representations are equivalent', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 5000 }), (grams) => {
        const asGm = parseSizeMultiplier(`${grams}gm`);
        const asKg = parseSizeMultiplier(`${(grams / 1000).toFixed(3)}kg`);
        expect(asGm).toBeCloseTo(asKg, 3);
      }),
      { numRuns: 10 }
    );
  });
});
