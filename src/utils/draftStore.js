/**
 * draftStore.js — localStorage-backed draft persistence for in-progress forms.
 *
 * Drafts are form-in-progress data that is not yet a Firestore document, so it
 * lives in localStorage and survives refresh, accidental close, and process
 * death. Tolerant of corrupt data: a bad entry is removed and treated as "no
 * draft" rather than crashing the form.
 *
 * Requirements: 7.1/7.4 (save/restore round-trip), 7.6 (unreadable -> empty
 * form), 7.7 (remove unreadable entry), 10.7 (persist within 1s).
 */

export const DRAFT_PREFIX = 'cc_draft:';

const fullKey = (key) => `${DRAFT_PREFIX}${key}`;

/**
 * Serialize and store a draft under `key`. At most one entry per key.
 * Returns true on success, false if storage was unavailable (never throws).
 */
export function saveDraft(key, data) {
  try {
    localStorage.setItem(fullKey(key), JSON.stringify({ data, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse a draft. On missing/corrupt/unparseable data, removes the bad
 * entry and returns null (Req 7.6, 7.7). Never throws.
 *
 * @returns the stored draft data, or null when there is no usable draft
 */
export function loadDraft(key) {
  let raw;
  try {
    raw = localStorage.getItem(fullKey(key));
  } catch {
    return null;
  }
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    // Stored shape is { data, savedAt }. Anything else is treated as corrupt.
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed.data;
    }
    // Unexpected shape -> corrupt; clean it up.
    removeDraft(key);
    return null;
  } catch {
    // Unparseable -> remove so it is not loaded again (Req 7.7).
    removeDraft(key);
    return null;
  }
}

/** Delete the draft associated with `key`. Never throws. */
export function removeDraft(key) {
  try {
    localStorage.removeItem(fullKey(key));
    return true;
  } catch {
    return false;
  }
}
