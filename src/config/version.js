/**
 * src/config/version.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central source of truth for Cream & Crust versioning and update targets.
 * Decouples Web App updates (Vercel / PWA) from Android App updates (Play Store / Capgo OTA).
 */

import Platform from '../platform/Platform.js';

export const APP_CONFIG = Object.freeze({
  web: {
    id: 'cream-and-crust-web',
    name: 'Cream & Crust Web',
    platform: 'web',
    version: '1.1.24',
    build: 'web-prod',
    updateChannel: 'vercel_pwa',
    updateDescription: 'Instant Web & PWA updates via Vercel',
    storeUrl: 'https://www.creamandcrust.online',
  },
  android: {
    id: 'com.creamandcrust.app',
    name: 'Cream & Crust for Android',
    platform: 'android',
    version: '1.1.24',
    versionCode: 28,
    build: 'google-play-release',
    updateChannel: 'play_store_and_ota',
    updateDescription: 'Google Play Store releases and Capgo native OTA',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.creamandcrust.app',
    marketUrl: 'market://details?id=com.creamandcrust.app',
  },
});

/**
 * Returns active platform key: 'android' | 'web'
 */
export function getActivePlatformKey() {
  if (Platform.isAndroid()) return 'android';
  if (Platform.isIOS()) return 'ios';
  return 'web';
}

/**
 * Returns current platform app metadata object.
 */
export function getAppVersionInfo() {
  const isAndroid = Platform.isAndroid();
  return isAndroid ? APP_CONFIG.android : APP_CONFIG.web;
}

/**
 * Returns current display version string, e.g. "1.1.24 (Build 28)" on Android or "1.1.24" on Web.
 */
export function getDisplayVersion() {
  const info = getAppVersionInfo();
  if (info.versionCode) {
    return `${info.version} (Build ${info.versionCode})`;
  }
  return info.version;
}

/**
 * Parses semver string into comparable integer (e.g. "1.1.24" -> 10124)
 */
export function parseSemver(vString) {
  if (!vString) return 0;
  const parts = String(vString).replace(/[^0-9.]/g, '').split('.').map(Number);
  return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

