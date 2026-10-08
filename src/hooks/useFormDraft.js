import { useState, useEffect, useCallback } from 'react';

/**
 * useFormDraft — WhatsApp-grade draft auto-saver for forms.
 *
 * Automatically persists input field values in real-time so users
 * never lose their typed data if their browser reloads or mobile
 * app is minimized/switched mid-entry.
 *
 * @param {string} key - Unique key for this form draft (e.g. 'draft_orderForm')
 * @param {object} initialValues - Default values if no draft exists
 * @returns {[object, (updater: object | ((prev: object) => object)) => void, () => void]}
 *   [values, setValues, clearDraft]
 */
export function useFormDraft(key, initialValues = {}) {
  const storageKey = `cc_draft:${key}`;

  const [values, setValuesState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialValues, ...parsed };
      }
    } catch {}
    return initialValues;
  });

  // Save to sessionStorage whenever values update
  useEffect(() => {
    try {
      if (values && Object.keys(values).length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(values));
      }
    } catch {}
  }, [storageKey, values]);

  const setValues = useCallback((updater) => {
    setValuesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setValuesState(initialValues);
  }, [storageKey, initialValues]);

  return [values, setValues, clearDraft];
}

export default useFormDraft;
