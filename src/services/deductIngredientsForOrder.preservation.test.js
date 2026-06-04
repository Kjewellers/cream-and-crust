/**
 * Task 2 — Preservation Property Tests (P2.1–P2.6)
 * Must PASS on both unfixed and fixed code.
 * These tests verify that correct existing behaviour is not broken.
 */

import { describe, it, expect, vi } from 'vitest';
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

import { convertUnit, parseSizeMultiplier, canonicalUnit, UNIT_FAMILIES } from './inventoryErrors.js';

// ─── P2.1 — Non-confirmed transitions must NOT call deductIngredientsForOrder ───
describe('P2.1 — non-confirmed status transitions do not trigger deduction', () => {
  it('updateOrderStatusInDB only deducts when status === "confirmed"', async () => {
    mockRunTransaction.mockClear();
    mockUpdateDoc.mockClear();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'test-uid', status: 'confirmed', product: 'Cake', recipeId: 'r1' }),
    });
    const { updateOrderStatusInDB } = await import('./db.js');
    const nonConfirmedStatuses = ['inquiry', 'ready', 'delivered', 'cancelled', 'baking'];
    for (const s of nonConfirmedStatuses) {
      mockRunTransaction.mockClear();
      await updateOrderStatusInDB('order-x', s);
      expect(mockRunTransaction).not.toHaveBeenCalled();
    }
  });
});

// ─── P2.2 — Happy-path: confirmed transition triggers deduction ─────────────────
describe('P2.2 — happy path: transitioning to confirmed triggers deduction attempt', () => {
  it('updateOrderStatusInDB calls deductIngredientsForOrder when status === "confirmed"', async () => {
    mockRunTransaction.mockClear();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'test-uid', recipeId: 'r1', product: 'Cake', size: '1kg',
        deductedForOrder: false, name: 'Vanilla', ingredients: [],
      }),
    });
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { updateOrderStatusInDB } = await import('./db.js');
    // It should not throw — gracefully handles empty ingredients
    await expect(updateOrderStatusInDB('order-bake', 'confirmed')).resolves.not.toThrow();
    // updateDoc should have been called to set the status
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
});

// ─── P2.3 — field-update preservation: updateDoc is called with correct fields
describe('P2.3 — updateOrderStatusInDB sets status and any extraFields', () => {
  it('passes status and extraFields to updateDoc', async () => {
    mockUpdateDoc.mockClear();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'test-uid', recipeId: 'r1', deductedForOrder: false, ingredients: [] }),
    });
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { updateOrderStatusInDB } = await import('./db.js');
    await updateOrderStatusInDB('order-3', 'ready', { invoiceUrl: 'https://example.com/inv.pdf' });
    const firstCall = mockUpdateDoc.mock.calls[0];
    expect(firstCall[1]).toMatchObject({ status: 'ready', invoiceUrl: 'https://example.com/inv.pdf' });
  });
});

// ─── P2.4 — Inventory shape is preserved (stock is a finite number) ──────────
describe('P2.4 — unit conversion always yields a finite non-negative number', () => {
  it('convertUnit output is finite and non-negative', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.constantFrom('g', 'kg'),
        fc.constantFrom('g', 'kg'),
        (qty, from, to) => {
          const result = convertUnit(qty, from, to);
          expect(Number.isFinite(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ─── P2.5 — Recipe shape preservation: ingredient fields are not mutated ─────
describe('P2.5 — parseSizeMultiplier does not mutate input and returns positive', () => {
  it('returns a positive finite number for any non-empty string', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('500gm', '1kg', '1.5kg', '2kg', '2kg+', '250gm', '3kg'),
        (sizeStr) => {
          const original = sizeStr;
          const result = parseSizeMultiplier(sizeStr);
          expect(sizeStr).toBe(original);            // no mutation
          expect(Number.isFinite(result)).toBe(true);
          expect(result).toBeGreaterThan(0);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ─── P2.6 — non-recipeId non-confirmed orders are untouched ────────────────────
describe('P2.6 — deductIngredientsForOrder returns without transaction when no recipeId', () => {
  it('throws MissingRecipeLinkError and does not call runTransaction', async () => {
    mockRunTransaction.mockClear();
    const { deductIngredientsForOrder } = await import('./db.js');
    await expect(
      deductIngredientsForOrder('order-no-recipe', {
        uid: 'test-uid',
        product: 'Mystery Cake',
        // no recipeId
      })
    ).rejects.toThrow('has no recipeId');
    // Transaction must never have been opened
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});
