/**
 * Feature: production-readiness-hardening, Property 4: Draft save/restore
 * round-trip; Property 5: Draft store tolerates corrupt data.
 *
 * Validates: Requirements 7.4, 7.6, 7.7, 10.7, 10.8
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { saveDraft, loadDraft, removeDraft, DRAFT_PREFIX } from '../draftStore.js';

beforeEach(() => {
  localStorage.clear();
});

const draftArb = fc.record({
  customer: fc.string(),
  phone: fc.string(),
  product: fc.string(),
  total: fc.integer({ min: 0, max: 100000 }),
  advance: fc.integer({ min: 0, max: 100000 }),
  notes: fc.string(),
  items: fc.array(fc.record({ name: fc.string(), qty: fc.integer() }), { maxLength: 5 }),
});

describe('draftStore round-trip (Property 4)', () => {
  it('loadDraft after saveDraft is deep-equal to the saved draft', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), draftArb, (key, draft) => {
        saveDraft(key, draft);
        expect(loadDraft(key)).toEqual(draft);
      }),
      { numRuns: 200 }
    );
  });

  it('removeDraft clears the entry', () => {
    saveDraft('order:u1', { product: 'Cake' });
    expect(loadDraft('order:u1')).toEqual({ product: 'Cake' });
    removeDraft('order:u1');
    expect(loadDraft('order:u1')).toBeNull();
  });
});

describe('draftStore corrupt-data tolerance (Property 5)', () => {
  it('never throws and returns null + removes the bad entry for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string({ minLength: 1 }), (garbage, key) => {
        localStorage.setItem(`${DRAFT_PREFIX}${key}`, garbage);
        let result;
        expect(() => {
          result = loadDraft(key);
        }).not.toThrow();
        // Either it happened to be valid JSON with a `data` field, or it was
        // corrupt and got cleaned up. Corrupt entries must not survive.
        if (result === null) {
          expect(localStorage.getItem(`${DRAFT_PREFIX}${key}`)).toBeNull();
        }
      }),
      { numRuns: 200 }
    );
  });

  it('returns null for a non-JSON value and removes it', () => {
    localStorage.setItem(`${DRAFT_PREFIX}bad`, '{not valid json');
    expect(loadDraft('bad')).toBeNull();
    expect(localStorage.getItem(`${DRAFT_PREFIX}bad`)).toBeNull();
  });
});
