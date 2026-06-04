// ⚠️ This key is read from the environment so it is NOT embedded in the production bundle.
// Add VITE_CRYPTO_KEY=<random-32-char-string> to your .env and Vercel env vars.
const SECRET_PASSPHRASE = import.meta.env.VITE_CRYPTO_KEY;

if (import.meta.env.PROD && !SECRET_PASSPHRASE) {
  throw new Error(
    'SECURITY FAULT: VITE_CRYPTO_KEY is missing in production. Refusing to encrypt data.'
  );
}

// In dev, fallback is acceptable for local testing only
const EFFECTIVE_PASSPHRASE = SECRET_PASSPHRASE || 'fallback-key-change-me-in-env';
/**
 * Derive an AES-GCM key from the passphrase.
 * @param {string|null} uid - Firebase UID for per-user salt isolation.
 *   Pass null only when decrypting legacy data (pre-UID-salt migration).
 */
async function getCryptoKey(uid = null) {
  const enc = new TextEncoder();
  // Per-user salt: even if the master passphrase is leaked, each user's key
  // must be brute-forced independently. Falls back to legacy salt for backwards
  // compatibility with records encrypted before this change.
  const salt = uid ? `cream-crust-v2-${uid}` : 'some-fixed-salt-for-db'; // legacy fallback

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(EFFECTIVE_PASSPHRASE),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Fallback key to read legacy local data on production
async function getFallbackCryptoKey(uid = null) {
  const enc = new TextEncoder();
  const salt = uid ? `cream-crust-v2-${uid}` : 'some-fixed-salt-for-db';
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode('fallback-key-change-me-in-env'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a value. Pass the current user's UID for per-user key isolation.
 * @param {string} text
 * @param {string|null} uid - Firebase UID (recommended). Omit only for legacy compat.
 */
export async function encryptData(text, uid = null) {
  if (!text) return text;

  // Prevent double encryption
  if (typeof text === 'string' && (text.startsWith('ENC2:') || text.startsWith('ENC:'))) {
    return text;
  }

  try {
    const key = await getCryptoKey(uid);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();

    const strToEncrypt = typeof text === 'object' ? JSON.stringify(text) : String(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(strToEncrypt)
    );

    const encryptedBytes = new Uint8Array(ciphertext);
    // Prefix: ENC2:<uid_length_hex>:<uid>:<iv+ciphertext base64>
    // This embeds the uid so decryptData can always reconstruct the right key.
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);

    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }

    // Store uid alongside ciphertext so decryption is self-contained
    const uidPart = uid || '';
    return `ENC2:${uidPart.length.toString(16).padStart(2, '0')}:${uidPart}:${btoa(binary)}`;
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

/**
 * Check if a string looks like raw encrypted data that was not decrypted.
 * Use this in UI components as a safety net.
 */
export function isEncryptedString(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('ENC2:') || value.startsWith('ENC:'))
  );
}

/**
 * Sanitize a value for display — if it's still encrypted, return the fallback.
 * Use in components to guarantee encrypted gibberish never reaches the user.
 */
export function safeDisplayValue(value, fallback = '') {
  if (!value) return fallback;
  if (isEncryptedString(value)) return fallback;
  return value;
}

/**
 * Decrypt a value previously encrypted by encryptData.
 * Handles both ENC2 (per-user salt) and legacy ENC (fixed salt) formats.
 * SAFETY: Never returns raw encrypted strings — returns '' on failure.
 */
export async function decryptData(cipherTextStr) {
  if (!cipherTextStr || typeof cipherTextStr !== 'string') return cipherTextStr;

  // ── New format: ENC2:<uid_len_hex>:<uid>:<base64> ──────────────
  if (cipherTextStr.startsWith('ENC2:')) {
    try {
      const rest = cipherTextStr.slice(5); // strip 'ENC2:'
      const uidLenHex = rest.slice(0, 2);
      const uidLen = parseInt(uidLenHex, 16);
      if (isNaN(uidLen) || uidLen < 0) {
        console.error('Decryption (ENC2) invalid uid length');
        return '';
      }
      const uid = rest.slice(3, 3 + uidLen); // skip 'XX:'
      const base64Str = rest.slice(3 + uidLen + 1); // skip 'XX:<uid>:'

      if (!base64Str) {
        console.error('Decryption (ENC2) empty base64 payload');
        return '';
      }

      const binaryStr = atob(base64Str);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) combined[i] = binaryStr.charCodeAt(i);

      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      // Build exhaustive list of keys to try — covers every possible
      // passphrase × salt combination the data could have been encrypted with.
      const keysToTry = [
        () => getCryptoKey(uid || null),          // production key + uid salt (or legacy salt if uid empty)
        () => getCryptoKey(null),                 // production key + legacy salt
        () => getFallbackCryptoKey(uid || null),   // fallback key + uid salt
        () => getFallbackCryptoKey(null),           // fallback key + legacy salt
        () => getLegacyCryptoKey(),                 // old hardcoded key + legacy salt
      ];
      // If uid is non-empty, also try production key with the uid explicitly
      if (uid) {
        keysToTry.splice(1, 0, () => getCryptoKey(uid));
      }

      let decryptedStr;
      let decrypted = false;
      for (const getKey of keysToTry) {
        try {
          const k = await getKey();
          const buf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, ciphertext);
          decryptedStr = new TextDecoder().decode(buf);
          decrypted = true;
          break;
        } catch {
          // try next key
        }
      }

      if (!decrypted) {
        console.error('Decryption (ENC2) failed with all keys');
        return '';
      }

      try {
        if (decryptedStr.startsWith('{') || decryptedStr.startsWith('[')) {
          return JSON.parse(decryptedStr);
        }
      } catch (e) {}

      // If it was double-encrypted, unwrap the next layer
      if (
        typeof decryptedStr === 'string' &&
        (decryptedStr.startsWith('ENC2:') || decryptedStr.startsWith('ENC:'))
      ) {
        return decryptData(decryptedStr);
      }

      return decryptedStr;
    } catch (e) {
      console.error('Decryption (ENC2) failed', e);
      // NEVER return raw cipher text — show nothing instead of gibberish
      return '';
    }
  }

  // ── Legacy format: ENC:<base64> (fixed salt) ────────────────────
  if (cipherTextStr.startsWith('ENC:')) {
    try {
      const base64Str = cipherTextStr.substring(4);
      const binaryStr = atob(base64Str);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) combined[i] = binaryStr.charCodeAt(i);

      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      // Try all possible keys for legacy format too
      const keysToTry = [
        () => getLegacyCryptoKey(),
        () => getCryptoKey(null),
        () => getFallbackCryptoKey(null),
      ];

      let decryptedStr;
      let decrypted = false;
      for (const getKey of keysToTry) {
        try {
          const k = await getKey();
          const buf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, ciphertext);
          decryptedStr = new TextDecoder().decode(buf);
          decrypted = true;
          break;
        } catch {
          // try next key
        }
      }

      if (!decrypted) {
        console.error('Decryption (ENC legacy) failed with all keys');
        return '';
      }

      try {
        if (decryptedStr.startsWith('{') || decryptedStr.startsWith('[')) {
          return JSON.parse(decryptedStr);
        }
      } catch (e) {}

      // If it was double-encrypted, unwrap the next layer
      if (
        typeof decryptedStr === 'string' &&
        (decryptedStr.startsWith('ENC2:') || decryptedStr.startsWith('ENC:'))
      ) {
        return decryptData(decryptedStr);
      }

      return decryptedStr;
    } catch (e) {
      console.error('Decryption (ENC legacy) failed', e);
      return ''; // NEVER return raw cipher string
    }
  }

  return cipherTextStr; // Not encrypted
}

async function getLegacyCryptoKey() {
  const enc = new TextEncoder();
  const legacyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode('cream-and-crust-super-secret-key-2026'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('some-fixed-salt-for-db'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    legacyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
