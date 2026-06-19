/**
 * auditLog.js — Append-only audit trail for destructive/critical actions.
 *
 * Logs important business events to `audit_logs` Firestore collection.
 * Only technical data — no customer PII.
 *
 * Usage:
 *   import { auditLog, AUDIT } from './auditLog.js';
 *   await auditLog(AUDIT.ORDER_DELETED, currentUser.uid, { orderId });
 */

export const AUDIT = Object.freeze({
  ORDER_DELETED: 'order_deleted',
  ORDER_CREATED: 'order_created',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  PAYMENT_RECORDED: 'payment_recorded',
  PAYMENT_FAILED: 'payment_failed',
  INVOICE_GENERATED: 'invoice_generated',
  INVENTORY_EDITED: 'inventory_edited',
  RECIPE_DELETED: 'recipe_deleted',
  PRODUCT_DELETED: 'product_deleted',
  CUSTOMER_DELETED: 'customer_deleted',
  INVENTORY_DELETED: 'inventory_deleted',
  EXPENSE_DELETED: 'expense_deleted',
  SHOPPING_DELETED: 'shopping_deleted',
  ITEM_RESTORED: 'item_restored',
  ITEM_PERMANENTLY_DELETED: 'item_permanently_deleted',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  SETTINGS_CHANGED: 'settings_changed',
});

/**
 * Write an audit log entry.
 * Fire-and-forget — never throws into the caller.
 *
 * @param {string} action  - One of AUDIT constants
 * @param {string} uid     - Currently logged-in user UID
 * @param {object} meta    - Extra technical context (no PII)
 */
export async function auditLog(action, uid, meta = {}) {
  if (!action || !uid) return;
  try {
    const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
      import('./firebase.js'),
      import('firebase/firestore'),
    ]);
    await addDoc(collection(db, 'audit_logs'), {
      action,
      uid,
      meta,
      timestamp: serverTimestamp(),
      url: typeof window !== 'undefined' ? (window.location?.pathname || '') : '',
    });
  } catch {
    /* Audit log failures are silent — never block the user action */
  }
}
