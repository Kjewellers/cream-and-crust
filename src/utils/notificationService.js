/**
 * notificationService.js
 *
 * Centralized, production-grade notification service.
 * Automatically maps raw Firebase, JavaScript, and Capacitor errors to
 * clean, user-friendly messages using errorMessages.js.
 *
 * Usage:
 *   import { showSuccess, showError, showWarning, showInfo } from '../utils/notificationService';
 */

import { friendlyError } from './errorMessages.js';
import { reduceToasts, initToastState } from './toastQueue.js';
import { HapticManager } from '../components/system/HapticManager.js';

// ── Global Error State ──────────────────────────────────────────────────
let listeners = [];
let errorState = initToastState();
const DEFAULT_DURATION = 3500;
const timers = new Map();

function emit() {
  listeners.forEach((fn) => fn([...errorState.visible]));
}

function scheduleAutoDismiss(id, duration) {
  if (timers.has(id)) clearTimeout(timers.get(id));
  const timer = setTimeout(() => dismissError(id), duration);
  timers.set(id, timer);
}

export function subscribeToErrors(fn) {
  listeners.push(fn);
  fn([...errorState.visible]);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function dismissError(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
  const before = errorState.visible.map((t) => t.id);
  errorState = reduceToasts(errorState, { kind: 'remove', id });
  emit();
  const promoted = errorState.visible.find((t) => !before.includes(t.id));
  if (promoted && promoted.duration) scheduleAutoDismiss(promoted.id, promoted.duration);
}

/**
 * Core dispatch function.
 * @param {number} level - Tier level (1: Tiny, 2: Recoverable, 3: Action Required, 4: Critical)
 * @param {object} payload
 */
export function dispatchError(level, payload) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  // Enforce durations: Level 3+ do not auto-dismiss by default. Level 1 & 2 do.
  const defaultDuration = level <= 2 ? DEFAULT_DURATION : null;
  
  const errorObj = {
    id,
    level,
    duration: defaultDuration,
    ...payload,
  };

  const wasVisible = errorState.visible.length;
  // Use MAX_VISIBLE = 1 for the orchestrator, we only want one error shown at a time
  errorState = reduceToasts(errorState, { kind: 'add', toast: errorObj }, 1);
  emit();

  // Trigger haptics based on level
  if (level === 1) {
    if (payload.category === 'success') HapticManager.trigger('success');
    else HapticManager.trigger('light');
  } else if (level === 2) {
    HapticManager.trigger('medium');
  } else if (level >= 3) {
    HapticManager.trigger('error');
  }

  // Schedule dismiss if duration exists and it became visible
  if (errorObj.duration && errorState.visible.length > wasVisible && errorState.visible.some((t) => t.id === id)) {
    scheduleAutoDismiss(id, errorObj.duration);
  }
  return id;
}

// ── Legacy Compatibility Wrappers ───────────────────────────────────────

export function showSuccess(message, duration = DEFAULT_DURATION) {
  return dispatchError(1, { message, category: 'success', duration });
}

export function showError(error, duration = DEFAULT_DURATION) {
  const friendly = friendlyError(error);
  if (friendly === null) return null; // silent error
  
  // By default, map generic errors to Level 2 (Recoverable)
  return dispatchError(2, { 
    message: friendly, 
    category: 'error', 
    title: 'Oops!', 
    duration 
  });
}

export function showWarning(message, duration = DEFAULT_DURATION) {
  return dispatchError(2, { message, category: 'warning', title: 'Heads up!', duration });
}

export function showInfo(message, duration = DEFAULT_DURATION) {
  return dispatchError(1, { message, category: 'info', duration });
}

export function showNotification(messageOrError, type = 'success', duration = DEFAULT_DURATION) {
  if (type === 'error') return showError(messageOrError, duration);
  if (type === 'warning') return showWarning(messageOrError, duration);
  if (type === 'info') return showInfo(messageOrError, duration);
  return showSuccess(messageOrError, duration);
}

export function showToast(messageOrError, type = 'success', duration = DEFAULT_DURATION) {
  return showNotification(messageOrError, type, duration);
}
