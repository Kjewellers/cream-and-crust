/**
 * EncryptionService.js — Bakery Vault Encryption Engine
 *
 * Per-user AES-256-GCM encryption with random key generation.
 *
 * Security Architecture:
 *  - Each user gets a unique random 256-bit encryption key on first backup
 *  - Key is stored encrypted in Firestore: users/{uid}/vault/encryptionKey
 *  - The key is wrapped using the user's auth-derived key (PBKDF2 from UID)
 *  - Backups are: JSON → gzip compress → AES-256-GCM encrypt → .ccbkp binary
 *
 * Binary .ccbkp format:
 *  [MAGIC:4] [VERSION:2] [FLAGS:2] [TIMESTAMP:8] [CHECKSUM:32] [IV:12] [DATA:*]
 *
 * NEVER uses VITE_CRYPTO_KEY or any hardcoded secret.
 * NEVER uploads plaintext JSON.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { log } from '../../utils/logger';

// Magic bytes: "CCBK" (Cream Crust BaKup)
const MAGIC_BYTES = new Uint8Array([0x43, 0x43, 0x42, 0x4B]);
const FORMAT_VERSION = 2;

// Header layout sizes
const HEADER_SIZE = 4 + 2 + 2 + 8 + 32 + 12; // 60 bytes total

/**
 * Derive a key-wrapping key from the user's UID.
 * This is used ONLY to encrypt/decrypt the per-user random backup key.
 * It is NOT the backup encryption key itself.
 */
async function deriveWrappingKey(uid) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(`bakery-vault-wrap-${uid}`),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`ccbk-salt-v2-${uid}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a new random 256-bit AES-GCM key for backup encryption.
 * @returns {Promise<CryptoKey>}
 */
async function generateBackupKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export + wrap it
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to raw bytes.
 */
async function exportKey(cryptoKey) {
  const raw = await crypto.subtle.exportKey('raw', cryptoKey);
  return new Uint8Array(raw);
}

/**
 * Import raw bytes back into a CryptoKey.
 */
async function importKey(rawBytes) {
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap (encrypt) the backup key using the UID-derived wrapping key.
 * Returns { iv, wrappedKey } as base64 strings for Firestore storage.
 */
async function wrapBackupKey(backupKey, uid) {
  const wrappingKey = await deriveWrappingKey(uid);
  const rawKey = await exportKey(backupKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    rawKey
  );

  return {
    iv: uint8ToBase64(iv),
    wrappedKey: uint8ToBase64(new Uint8Array(encrypted)),
    createdAt: new Date().toISOString(),
    version: FORMAT_VERSION,
  };
}

/**
 * Unwrap (decrypt) the backup key stored in Firestore.
 */
async function unwrapBackupKey(wrappedData, uid) {
  const wrappingKey = await deriveWrappingKey(uid);
  const iv = base64ToUint8(wrappedData.iv);
  const encrypted = base64ToUint8(wrappedData.wrappedKey);

  const rawKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    encrypted
  );

  return importKey(new Uint8Array(rawKey));
}

// ── Base64 helpers ──────────────────────────────────────────────────────

function uint8ToBase64(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Key Management ──────────────────────────────────────────────────────

/**
 * Get or create the per-user backup encryption key.
 * Key is stored wrapped (encrypted) in Firestore users/{uid}/vault/encryptionKey.
 *
 * @param {string} uid
 * @returns {Promise<CryptoKey>}
 */
export async function getOrCreateBackupKey(uid) {
  if (!uid) throw new Error('UID required for backup encryption');

  const vaultRef = doc(db, `users/${uid}/vault`, 'encryptionKey');

  try {
    const snap = await getDoc(vaultRef);

    if (snap.exists()) {
      // Unwrap existing key
      const data = snap.data();
      log.share('[Vault] Unwrapping existing backup key for UID:', uid);
      return await unwrapBackupKey(data, uid);
    }
  } catch (e) {
    log.share.warn('[Vault] Failed to read existing key, generating new:', e?.message);
  }

  // Generate new random key
  log.share('[Vault] Generating new 256-bit backup key for UID:', uid);
  const newKey = await generateBackupKey();
  const wrappedData = await wrapBackupKey(newKey, uid);

  try {
    await setDoc(vaultRef, wrappedData);
    log.share('[Vault] Stored wrapped backup key in Firestore');
  } catch (e) {
    log.share.warn('[Vault] Failed to persist key to Firestore:', e?.message);
    // Key still works for this session — will retry persist on next backup
  }

  return newKey;
}

// ── SHA-256 Checksum ────────────────────────────────────────────────────

/**
 * Generate SHA-256 checksum of arbitrary data.
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>} 32-byte hash
 */
export async function generateChecksum(data) {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

/**
 * Verify SHA-256 checksum matches.
 */
export async function verifyChecksum(data, expectedChecksum) {
  const actual = await generateChecksum(data);
  if (actual.length !== expectedChecksum.length) return false;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expectedChecksum[i]) return false;
  }
  return true;
}

// ── Compress / Decompress ───────────────────────────────────────────────

async function compress(data) {
  // Dynamic import pako to keep bundle size small for non-backup paths
  const { gzip } = await import('pako');
  return gzip(data);
}

async function decompress(data) {
  const { ungzip } = await import('pako');
  return ungzip(data);
}

// ── Encrypt / Decrypt Backup ────────────────────────────────────────────

/**
 * Encrypt a backup payload into .ccbkp binary format.
 *
 * Flow: JSON → UTF-8 → gzip → AES-256-GCM → prepend header
 *
 * @param {object} payload - The backup data object
 * @param {string} uid - User UID for key derivation
 * @param {function} [onProgress] - Progress callback
 * @returns {Promise<Uint8Array>} Encrypted .ccbkp binary
 */
export async function encryptBackup(payload, uid, onProgress) {
  onProgress?.({ step: 'encrypting', message: 'Encrypting your bakery data...', percent: 0 });

  // 1. Serialize to JSON
  const jsonStr = JSON.stringify(payload);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  onProgress?.({ step: 'compressing', message: 'Compressing data...', percent: 20 });

  // 2. Compress with gzip
  const compressed = await compress(jsonBytes);
  onProgress?.({ step: 'encrypting', message: 'Encrypting with AES-256...', percent: 40 });

  // 3. Get backup key
  const key = await getOrCreateBackupKey(uid);

  // 4. Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 5. Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    compressed
  );
  const encryptedData = new Uint8Array(ciphertext);
  onProgress?.({ step: 'checksum', message: 'Verifying integrity...', percent: 70 });

  // 6. Compute checksum of the compressed data (pre-encryption)
  const checksum = await generateChecksum(compressed);

  // 7. Build header
  const timestamp = BigInt(Date.now());
  const timestampBytes = new Uint8Array(8);
  const timestampView = new DataView(timestampBytes.buffer);
  timestampView.setBigUint64(0, timestamp, false); // big-endian

  const versionBytes = new Uint8Array(2);
  new DataView(versionBytes.buffer).setUint16(0, FORMAT_VERSION, false);

  const flagsBytes = new Uint8Array(2);
  // Flags: bit 0 = gzip compressed, bit 1 = AES-256-GCM
  new DataView(flagsBytes.buffer).setUint16(0, 0x0003, false);

  // 8. Assemble: MAGIC + VERSION + FLAGS + TIMESTAMP + CHECKSUM + IV + DATA
  const totalSize = HEADER_SIZE + encryptedData.length;
  const output = new Uint8Array(totalSize);
  let offset = 0;

  output.set(MAGIC_BYTES, offset); offset += 4;
  output.set(versionBytes, offset); offset += 2;
  output.set(flagsBytes, offset); offset += 2;
  output.set(timestampBytes, offset); offset += 8;
  output.set(checksum, offset); offset += 32;
  output.set(iv, offset); offset += 12;
  output.set(encryptedData, offset);

  onProgress?.({ step: 'complete', message: 'Encryption complete', percent: 100 });

  log.share(`[Vault] Encrypted backup: ${jsonBytes.length}B → ${compressed.length}B (gzip) → ${totalSize}B (encrypted)`);

  return output;
}

/**
 * Decrypt a .ccbkp binary backup into a JS object.
 *
 * Flow: parse header → AES-256-GCM decrypt → gunzip → JSON.parse
 *
 * @param {Uint8Array} ccbkpData - Raw .ccbkp binary
 * @param {string} uid - User UID for key derivation
 * @param {function} [onProgress] - Progress callback
 * @returns {Promise<object>} Decrypted backup payload
 */
export async function decryptBackup(ccbkpData, uid, onProgress) {
  onProgress?.({ step: 'validating', message: 'Validating backup file...', percent: 0 });

  if (!(ccbkpData instanceof Uint8Array)) {
    ccbkpData = new Uint8Array(ccbkpData);
  }

  // 1. Validate minimum size
  if (ccbkpData.length < HEADER_SIZE + 1) {
    throw new Error('Invalid backup file: too small');
  }

  // 2. Parse header
  let offset = 0;

  // Magic bytes
  const magic = ccbkpData.slice(offset, offset + 4); offset += 4;
  if (!arraysEqual(magic, MAGIC_BYTES)) {
    throw new Error('Invalid backup file: wrong format');
  }

  // Version
  const version = new DataView(ccbkpData.buffer, ccbkpData.byteOffset + offset, 2).getUint16(0, false);
  offset += 2;
  if (version > FORMAT_VERSION) {
    throw new Error(`Backup version ${version} is newer than supported (${FORMAT_VERSION}). Please update the app.`);
  }

  // Flags
  offset += 2; // skip flags for now

  // Timestamp
  const timestampView = new DataView(ccbkpData.buffer, ccbkpData.byteOffset + offset, 8);
  const timestamp = Number(timestampView.getBigUint64(0, false));
  offset += 8;

  // Checksum (32 bytes SHA-256)
  const storedChecksum = ccbkpData.slice(offset, offset + 32); offset += 32;

  // IV (12 bytes)
  const iv = ccbkpData.slice(offset, offset + 12); offset += 12;

  // Encrypted data
  const encryptedData = ccbkpData.slice(offset);

  onProgress?.({ step: 'decrypting', message: 'Decrypting your data...', percent: 30 });

  // 3. Get backup key
  const key = await getOrCreateBackupKey(uid);

  // 4. Decrypt
  let compressed;
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    compressed = new Uint8Array(decrypted);
  } catch (e) {
    throw new Error('Decryption failed. The backup may have been created with a different account.');
  }

  onProgress?.({ step: 'verifying', message: 'Verifying integrity...', percent: 50 });

  // 5. Verify checksum
  const checksumValid = await verifyChecksum(compressed, storedChecksum);
  if (!checksumValid) {
    throw new Error('Backup integrity check failed. The file may be corrupted.');
  }

  onProgress?.({ step: 'decompressing', message: 'Decompressing data...', percent: 70 });

  // 6. Decompress
  const jsonBytes = await decompress(compressed);
  const jsonStr = new TextDecoder().decode(jsonBytes);

  onProgress?.({ step: 'parsing', message: 'Loading backup data...', percent: 90 });

  // 7. Parse JSON
  const payload = JSON.parse(jsonStr);

  // Attach metadata
  payload._backupMeta = {
    version,
    timestamp,
    backupDate: new Date(timestamp).toISOString(),
    checksumValid: true,
    encrypted: true,
    compressed: true,
  };

  onProgress?.({ step: 'complete', message: 'Backup decrypted successfully', percent: 100 });

  return payload;
}

// ── Utilities ───────────────────────────────────────────────────────────

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Quick validation of a .ccbkp file without full decryption.
 * Checks magic bytes, version, and timestamp sanity.
 */
export function validateBackupHeader(data) {
  try {
    if (!(data instanceof Uint8Array)) data = new Uint8Array(data);
    if (data.length < HEADER_SIZE) return { valid: false, reason: 'File too small' };

    const magic = data.slice(0, 4);
    if (!arraysEqual(magic, MAGIC_BYTES)) return { valid: false, reason: 'Invalid format' };

    const version = new DataView(data.buffer, data.byteOffset + 4, 2).getUint16(0, false);
    if (version > FORMAT_VERSION) return { valid: false, reason: `Unsupported version ${version}` };

    const ts = Number(new DataView(data.buffer, data.byteOffset + 8, 8).getBigUint64(0, false));
    if (ts < 1700000000000 || ts > Date.now() + 86400000) {
      return { valid: false, reason: 'Invalid timestamp' };
    }

    return {
      valid: true,
      version,
      timestamp: ts,
      backupDate: new Date(ts).toISOString(),
      encryptedSize: data.length - HEADER_SIZE,
      totalSize: data.length,
    };
  } catch (e) {
    return { valid: false, reason: e?.message || 'Parse error' };
  }
}

export { MAGIC_BYTES, FORMAT_VERSION, HEADER_SIZE, uint8ToBase64, base64ToUint8 };
