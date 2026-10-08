/**
 * src/services/db.js — Legacy Backwards-Compatibility Shim
 *
 * All domain repositories are modularized under `src/services/db/`.
 * This file re-exports everything from `src/services/db/index.js` so that
 * any imports from `'../services/db'` or `'./services/db'` continue to work seamlessly.
 */

export * from './db/index.js';
