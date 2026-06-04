/**
 * Feature: production-readiness-hardening, Property 16: Firestore rules enforce
 * per-bakery isolation.
 *
 * Validates: Requirements 9.1-9.8, 15.6
 *
 * EMULATOR-GATED. This suite runs against the local Firebase Firestore
 * emulator using @firebase/rules-unit-testing. It is skipped automatically
 * when the emulator is not running (or the dep is not installed) so the normal
 * jsdom suite stays fast and self-contained.
 *
 * To run it:
 *   1. npm i -D @firebase/rules-unit-testing
 *   2. firebase emulators:start --only firestore
 *   3. set FIRESTORE_EMULATOR_HOST=localhost:8080  (PowerShell: $env:FIRESTORE_EMULATOR_HOST="localhost:8080")
 *   4. npx vitest run src/test/rules/isolation.test.js
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMULATOR_ON = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// Owner-scoped private collections: A must never touch B's docs.
const PRIVATE_COLLECTIONS = ['orders', 'customers', 'inventory', 'recipes', 'expenses'];

// Public-read, owner-write collections.
const PUBLIC_COLLECTIONS = ['business', 'products'];

const maybe = EMULATOR_ON ? describe : describe.skip;

maybe('Firestore rules — per-bakery isolation (Property 16)', () => {
  let testEnv;
  let rulesModule;

  beforeAll(async () => {
    rulesModule = await import('@firebase/rules-unit-testing');
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    testEnv = await rulesModule.initializeTestEnvironment({
      projectId: 'cream-and-crust-test',
      firestore: { rules },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it('bakery A is denied reads of bakery B private docs', async () => {
    const { assertFails } = rulesModule;
    // Seed B's docs with admin (rules bypassed).
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const col of PRIVATE_COLLECTIONS) {
        await db.collection(col).doc('docB').set({ uid: 'bakeryB', createdAt: 'x' });
      }
    });
    const aDb = testEnv.authenticatedContext('bakeryA').firestore();
    for (const col of PRIVATE_COLLECTIONS) {
      // eslint-disable-next-line no-await-in-loop
      await assertFails(aDb.collection(col).doc('docB').get());
    }
  });

  it('bakery A is denied writes (update/delete) to bakery B private docs', async () => {
    const { assertFails } = rulesModule;
    const aDb = testEnv.authenticatedContext('bakeryA').firestore();
    for (const col of PRIVATE_COLLECTIONS) {
      // eslint-disable-next-line no-await-in-loop
      await assertFails(aDb.collection(col).doc('docB').update({ tampered: true }));
      // eslint-disable-next-line no-await-in-loop
      await assertFails(aDb.collection(col).doc('docB').delete());
    }
  });

  it('a create whose uid != requester is denied', async () => {
    const { assertFails } = rulesModule;
    const aDb = testEnv.authenticatedContext('bakeryA').firestore();
    await assertFails(aDb.collection('orders').doc('x').set({ uid: 'bakeryB', createdAt: 'x' }));
  });

  it('changing the owner uid on update is denied', async () => {
    const { assertFails } = rulesModule;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('orders')
        .doc('ownA')
        .set({ uid: 'bakeryA', createdAt: 'x' });
    });
    const aDb = testEnv.authenticatedContext('bakeryA').firestore();
    await assertFails(aDb.collection('orders').doc('ownA').update({ uid: 'bakeryB' }));
  });

  it('unauthenticated requests are denied private reads and all writes', async () => {
    const { assertFails } = rulesModule;
    const anon = testEnv.unauthenticatedContext().firestore();
    for (const col of PRIVATE_COLLECTIONS) {
      // eslint-disable-next-line no-await-in-loop
      await assertFails(anon.collection(col).doc('docB').get());
    }
    await assertFails(anon.collection('products').doc('p').set({ uid: 'bakeryA', name: 'x' }));
  });

  it('public collections are readable but owner-write only', async () => {
    const { assertSucceeds, assertFails } = rulesModule;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      for (const col of PUBLIC_COLLECTIONS) {
        await ctx.firestore().collection(col).doc('pub').set({ uid: 'bakeryB', name: 'x' });
      }
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    for (const col of PUBLIC_COLLECTIONS) {
      // eslint-disable-next-line no-await-in-loop
      await assertSucceeds(anon.collection(col).doc('pub').get());
    }
    const aDb = testEnv.authenticatedContext('bakeryA').firestore();
    await assertFails(aDb.collection('products').doc('pub').update({ name: 'hacked' }));
  });

  it('unmatched document paths are denied entirely', async () => {
    const { assertFails } = rulesModule;
    const aDb = testEnv.authenticatedContext('bakeryA').firestore();
    await assertFails(aDb.collection('secretStuff').doc('z').get());
  });
});

// When the emulator is off, leave a visible note so the skip is intentional.
if (!EMULATOR_ON) {
  describe('Firestore rules isolation (Property 16)', () => {
    it.skip('skipped — set FIRESTORE_EMULATOR_HOST to run against the emulator', () => {});
  });
}
