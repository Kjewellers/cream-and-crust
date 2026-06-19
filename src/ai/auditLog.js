const AI_AUDIT_KEY = 'cc_ai_audit_log';
const AI_SESSION_KEY = 'cc_ai_session_state';
const MAX_AUDIT_ENTRIES = 100;

function safeRead(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Session storage is best-effort only.
  }
}

export function createAIAuditEntry({
  intent,
  action,
  status,
  userId,
  targetEntity,
  confirmationState,
  details,
} = {}) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    intent: intent || null,
    action: action || null,
    status: status || 'unknown',
    userId: userId || null,
    targetEntity: targetEntity || null,
    confirmationState: confirmationState || 'none',
    details: details || null,
  };
}

export function logAIAction(entry) {
  const nextEntry = createAIAuditEntry(entry);
  const current = safeRead(AI_AUDIT_KEY, []);
  safeWrite(AI_AUDIT_KEY, [nextEntry, ...current].slice(0, MAX_AUDIT_ENTRIES));
  return nextEntry;
}

export function getAIAuditLog() {
  return safeRead(AI_AUDIT_KEY, []);
}

export function saveAISessionState(state) {
  safeWrite(AI_SESSION_KEY, state || null);
}

export function getAISessionState() {
  return safeRead(AI_SESSION_KEY, null);
}

export function clearAIPrivacyState() {
  try {
    sessionStorage.removeItem(AI_AUDIT_KEY);
    sessionStorage.removeItem(AI_SESSION_KEY);
    localStorage.removeItem(AI_AUDIT_KEY);
    localStorage.removeItem(AI_SESSION_KEY);
  } catch (_) {
    // Ignore cleanup failures.
  }
}
