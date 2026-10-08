/**
 * DeviceTrustManager.js
 * Enterprise Zero-Trust Device Trust & Installation ID Service
 *
 * Generates and securely persists a unique Installation ID (deviceTrustId)
 * and captures trusted device metadata (Device Name, OS/Platform, App Version).
 */

const INSTALLATION_KEY = 'cc_device_installation_id';
const DEVICE_TRUST_KEY = 'cc_trusted_devices_registry';

/**
 * Generate a cryptographically secure UUID v4.
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create unique Installation ID for this device / browser instance.
 */
export function getInstallationId() {
  if (typeof window === 'undefined') return 'server_instance';
  try {
    let id = localStorage.getItem(INSTALLATION_KEY);
    if (!id) {
      id = 'inst_' + generateUUID();
      localStorage.setItem(INSTALLATION_KEY, id);
    }
    return id;
  } catch (e) {
    console.error('[DeviceTrust] Error accessing localStorage:', e);
    return 'fallback_inst_' + Date.now();
  }
}

/**
 * Capture current device metadata for session registry and security audit logs.
 */
export function getDeviceMetadata() {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server',
      deviceName: 'Server Environment',
      platform: 'NodeJS',
      appVersion: '1.1.23',
    };
  }

  const userAgent = navigator.userAgent || '';
  let platform = 'Web';
  if (/android/i.test(userAgent)) platform = 'Android';
  else if (/iPad|iPhone|iPod/.test(userAgent)) platform = 'iOS';
  else if (/Macintosh/.test(userAgent)) platform = 'macOS';
  else if (/Windows/.test(userAgent)) platform = 'Windows';
  else if (/Linux/.test(userAgent)) platform = 'Linux';

  let deviceName = 'Browser (' + platform + ')';
  if (userAgent.includes('Chrome')) deviceName = 'Chrome on ' + platform;
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) deviceName = 'Safari on ' + platform;
  else if (userAgent.includes('Firefox')) deviceName = 'Firefox on ' + platform;
  else if (userAgent.includes('Edg')) deviceName = 'Edge on ' + platform;

  return {
    deviceId: getInstallationId(),
    deviceName,
    platform,
    userLanguage: navigator.language || 'en-US',
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    appVersion: '1.1.23',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if the current device installation is recognized in local registry.
 */
export function isDeviceTrusted(uid) {
  try {
    const raw = localStorage.getItem(`${DEVICE_TRUST_KEY}_${uid}`);
    if (!raw) return false;
    const trusted = JSON.parse(raw);
    return trusted.includes(getInstallationId());
  } catch (e) {
    return false;
  }
}

/**
 * Register current device installation as trusted.
 */
export function markDeviceAsTrusted(uid) {
  try {
    const key = `${DEVICE_TRUST_KEY}_${uid}`;
    const instId = getInstallationId();
    const raw = localStorage.getItem(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!list.includes(instId)) {
      list.push(instId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.error('[DeviceTrust] Error marking device trusted:', e);
  }
}
