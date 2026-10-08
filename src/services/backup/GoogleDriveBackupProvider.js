/**
 * GoogleDriveBackupProvider.js — Bakery Vault Google Drive Storage
 *
 * Handles all Google Drive operations for backup storage:
 *  - Google OAuth 2.0 with drive.file scope
 *  - Auto-detects Google-signed-in users (no extra account selection)
 *  - Creates "Cream & Crust Backups" folder
 *  - Uploads encrypted .ccbkp files
 *  - Lists available restore points (multiple backups)
 *  - Downloads backup files
 *  - Deletes old backups (retention: last 5)
 *  - Quota information
 *
 * Refactored from GoogleDriveAuthService.js with improved error handling.
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { log } from '../../utils/logger';

const GDRIVE_ACCOUNT_KEY = 'cc_vault_gdrive_account';
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FOLDER_NAME = 'Cream & Crust Backups';
const MAX_RESTORE_POINTS = 5;

// ── Account Management ──────────────────────────────────────────────────

/**
 * Get the connected Google Drive account.
 * @returns {object|null} { email, name, photoURL, accessToken, expiresAt, connectedAt }
 */
export function getConnectedAccount() {
  try {
    const raw = localStorage.getItem(GDRIVE_ACCOUNT_KEY);
    if (!raw) return null;
    const account = JSON.parse(raw);

    if (account?.expiresAt && Date.now() > account.expiresAt) {
      account.needsRefresh = true;
    }
    return account;
  } catch {
    return null;
  }
}

/**
 * Check if the current Firebase user signed in via Google.
 * If so, they already have implicit Google account access.
 */
export function isGoogleSignedIn() {
  const user = auth.currentUser;
  if (!user) return false;
  return user.providerData?.some((p) => p.providerId === 'google.com');
}

/**
 * Check if the current Firebase user signed in only via phone.
 */
export function isPhoneOnlyUser() {
  const user = auth.currentUser;
  if (!user) return false;
  return (
    user.providerData?.length > 0 &&
    user.providerData.every((p) => p.providerId === 'phone')
  );
}

/**
 * Connect to Google Drive OAuth.
 * For Google-signed-in users, reuses existing credentials.
 *
 * @returns {Promise<object>} Account details with access token
 */
export async function connect() {
  log.auth('[Vault:GDrive] Initiating Google Drive OAuth');

  // Try Google Identity Services (GIS) first
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id:
            import.meta.env.VITE_GOOGLE_CLIENT_ID ||
            '104712891398-creamcrust.apps.googleusercontent.com',
          scope: 'email profile ' + GDRIVE_SCOPE,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }

            const currentUser = auth.currentUser;
            const account = {
              email: currentUser?.email || 'Google User',
              name: currentUser?.displayName || 'Baker',
              photoURL: currentUser?.photoURL || null,
              accessToken: response.access_token,
              expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
              connectedAt: new Date().toISOString(),
            };

            localStorage.setItem(GDRIVE_ACCOUNT_KEY, JSON.stringify(account));
            log.auth('[Vault:GDrive] GIS token acquired');
            resolve(account);
          },
        });
        client.requestAccessToken();
      } catch (e) {
        log.auth.warn('[Vault:GDrive] GIS failed, falling back:', e?.message);
        reject(e);
      }
    });
  }

  // Fallback: Firebase Auth Google Provider
  const provider = new GoogleAuthProvider();
  provider.addScope(GDRIVE_SCOPE);
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const account = {
      email: result.user.email,
      name: result.user.displayName,
      photoURL: result.user.photoURL,
      accessToken: credential?.accessToken,
      expiresAt: Date.now() + 3600 * 1000,
      connectedAt: new Date().toISOString(),
    };

    localStorage.setItem(GDRIVE_ACCOUNT_KEY, JSON.stringify(account));
    log.auth('[Vault:GDrive] Firebase OAuth success');
    return account;
  } catch (e) {
    log.auth.error('[Vault:GDrive] OAuth failed:', e?.message);
    throw new Error('Failed to connect Google Account. Please try again.');
  }
}

/**
 * Disconnect Google Drive.
 */
export function disconnect() {
  localStorage.removeItem(GDRIVE_ACCOUNT_KEY);
  log.auth('[Vault:GDrive] Disconnected');
}

/**
 * Ensure we have a valid access token, refreshing if needed.
 * @returns {Promise<string>} Valid access token
 */
async function getValidToken() {
  let account = getConnectedAccount();

  if (!account || !account.accessToken || account.needsRefresh) {
    account = await connect();
  }

  return account.accessToken;
}

// ── Folder Management ───────────────────────────────────────────────────

/**
 * Get or create the "Cream & Crust Backups" folder.
 * @param {string} token
 * @returns {Promise<string>} Folder ID
 */
async function getOrCreateFolder(token) {
  const q = encodeURIComponent(`name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files?.length > 0) return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create backup folder in Google Drive');
  }

  const folder = await createRes.json();
  log.share('[Vault:GDrive] Created backup folder:', folder.id);
  return folder.id;
}

// ── Upload ──────────────────────────────────────────────────────────────

/**
 * Upload an encrypted .ccbkp backup to Google Drive.
 *
 * @param {Uint8Array} encryptedData - The .ccbkp binary
 * @param {string} fileName - e.g., "bakery-vault-2026-07-31.ccbkp"
 * @param {function} [onProgress]
 * @returns {Promise<{ fileId: string, fileName: string, sizeBytes: number }>}
 */
export async function upload(encryptedData, fileName, onProgress) {
  onProgress?.({ step: 'connecting', message: 'Connecting to Google Drive...', percent: 10 });

  const token = await getValidToken();
  onProgress?.({ step: 'folder', message: 'Preparing backup folder...', percent: 25 });

  const folderId = await getOrCreateFolder(token);
  onProgress?.({ step: 'uploading', message: 'Uploading securely...', percent: 40 });

  // Convert Uint8Array to base64 for upload
  let binary = '';
  for (let i = 0; i < encryptedData.length; i++) {
    binary += String.fromCharCode(encryptedData[i]);
  }
  const base64Data = btoa(binary);

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/octet-stream',
    description: 'Cream & Crust encrypted backup (Bakery Vault)',
  };

  const boundary = '-------BakeryVault' + Math.random().toString(36).substring(2);
  const body =
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/octet-stream\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    `\r\n--${boundary}--`;

  onProgress?.({ step: 'uploading', message: 'Uploading securely...', percent: 60 });

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    log.auth.error('[Vault:GDrive] Upload failed:', errText);
    throw new Error('Google Drive upload failed. Please reconnect your account.');
  }

  const file = await uploadRes.json();
  onProgress?.({ step: 'cleanup', message: 'Cleaning up old backups...', percent: 85 });

  // Enforce retention — keep only last N backups
  await enforceRetention(token);

  onProgress?.({ step: 'complete', message: 'Backup uploaded successfully', percent: 100 });

  return {
    fileId: file.id,
    fileName: file.name,
    sizeBytes: parseInt(file.size, 10) || encryptedData.length,
  };
}

// ── List Backups ────────────────────────────────────────────────────────

/**
 * List available backup restore points from Google Drive.
 * @returns {Promise<Array<{ id: string, name: string, createdTime: string, sizeBytes: number, sizeLabel: string }>>}
 */
export async function list() {
  const account = getConnectedAccount();
  if (!account?.accessToken) return [];

  try {
    const q = encodeURIComponent(`name contains 'bakery-vault' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc&pageSize=${MAX_RESTORE_POINTS + 5}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      sizeBytes: parseInt(f.size, 10) || 0,
      sizeLabel: formatBytes(parseInt(f.size, 10) || 0),
    }));
  } catch (e) {
    log.share.warn('[Vault:GDrive] Failed to list backups:', e?.message);
    return [];
  }
}

// ── Download ────────────────────────────────────────────────────────────

/**
 * Download a backup file from Google Drive.
 * @param {string} fileId
 * @returns {Promise<Uint8Array>} Raw .ccbkp binary
 */
export async function download(fileId) {
  const token = await getValidToken();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to download backup from Google Drive');
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── Delete ──────────────────────────────────────────────────────────────

/**
 * Delete a backup file from Google Drive.
 * @param {string} fileId
 */
export async function deleteBackup(fileId) {
  const token = await getValidToken();

  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Enforce retention policy — keep only the last MAX_RESTORE_POINTS backups.
 */
async function enforceRetention(token) {
  try {
    const backups = await list();
    if (backups.length <= MAX_RESTORE_POINTS) return;

    const toDelete = backups.slice(MAX_RESTORE_POINTS);
    for (const backup of toDelete) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${backup.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        log.share('[Vault:GDrive] Deleted old backup:', backup.name);
      } catch {
        // Best-effort cleanup
      }
    }
  } catch {
    // Retention cleanup is non-critical
  }
}

// ── Quota ───────────────────────────────────────────────────────────────

/**
 * Get Google Drive storage quota info.
 * @returns {Promise<{ used: string, total: string, percent: number } | null>}
 */
export async function getQuota() {
  try {
    const token = await getValidToken();
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const q = data.storageQuota;

    const used = parseInt(q.usage, 10) || 0;
    const total = parseInt(q.limit, 10) || 15 * 1024 * 1024 * 1024; // 15GB default

    return {
      used: formatBytes(used),
      total: formatBytes(total),
      percent: Math.round((used / total) * 100),
    };
  } catch {
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
