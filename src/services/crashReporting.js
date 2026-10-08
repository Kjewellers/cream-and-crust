/**
 * crashReporting.js — DEPRECATED SHIM
 *
 * This file is kept for backwards compatibility ONLY.
 * All functionality has been merged into ErrorMonitor.js.
 *
 * DO NOT add new code here.
 * DO NOT import from this file in new code — import from ErrorMonitor.js instead.
 *
 * Removal planned once all import sites are updated.
 */
export {
  logCrashToFirestore,
  attachGlobalCrashListeners,
} from './ErrorMonitor.js';
