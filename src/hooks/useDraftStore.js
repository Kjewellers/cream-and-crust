/**
 * useDraftStore — debounced autosave + restore for forms.
 *
 * Autosaves `form` to the Draft_Store at most once per `debounceMs`, restores
 * any existing draft on mount (reporting `restored` so the caller can show a
 * "Draft restored ✨" toast), and exposes `clearDraft()` to call on successful
 * submit.
 *
 * Requirements: 7.1 (debounced autosave), 7.2 (restore on open), 7.3 (restore
 * signal), 7.5 (clear on submit), 10.7 (persist within 1s).
 */
import { useEffect, useRef, useState } from 'react';
import { saveDraft, loadDraft, removeDraft } from '../utils/draftStore.js';

/**
 * @param {string} key - draft key (e.g. "order:<uid>")
 * @param {object} form - current form values
 * @param {(values: object) => void} setForm - setter used to restore values
 * @param {{ debounceMs?: number, enabled?: boolean }} [opts]
 * @returns {{ restored: boolean, clearDraft: () => void }}
 */
export function useDraftStore(key, form, setForm, { debounceMs = 1000, enabled = true } = {}) {
  const [restored, setRestored] = useState(false);
  const timerRef = useRef(null);
  const didRestoreRef = useRef(false);
  const lastSavedRef = useRef(0);

  // Restore once on mount.
  useEffect(() => {
    if (!enabled || didRestoreRef.current) return;
    didRestoreRef.current = true;
    const draft = loadDraft(key);
    if (draft && typeof draft === 'object') {
      setForm((prev) => ({ ...prev, ...draft }));
      setRestored(true);
    }
  }, [key, enabled]);

  // Debounced autosave on form change.
  useEffect(() => {
    if (!enabled) return undefined;
    // Skip the very first render before any user edit.
    if (!didRestoreRef.current) return undefined;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft(key, form);
      lastSavedRef.current = Date.now();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
     
  }, [form, key, debounceMs, enabled]);

  const clearDraft = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    removeDraft(key);
    setRestored(false);
  };

  return { restored, clearDraft };
}

export default useDraftStore;
