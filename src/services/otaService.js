import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';

const OTA_URL = 'https://www.creamandcrust.online';
const OTA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEy2To4LsUm9+YuQeGFji0fDJIEXAa
0dGvPuCfzXlVAVvK3cY/qsPFDkKmZwvqC13Zg0UZklbCxWXFmFzJiaicwg==
-----END PUBLIC KEY-----`;

// Helper: Convert PEM to ArrayBuffer
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Helper: ECDSA P-256 verification in browser
async function verifySignature(manifest) {
  try {
    const encoder = new TextEncoder();
    const data = JSON.parse(JSON.stringify(manifest));
    const signatureHex = data.signature;
    delete data.signature;

    // Convert hex signature to Uint8Array
    const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // Strip PEM headers to get raw base64
    const b64 = OTA_PUBLIC_KEY.replace(/-----BEGIN PUBLIC KEY-----/, '')
                              .replace(/-----END PUBLIC KEY-----/, '')
                              .replace(/\n/g, '');
    const binaryDerString = window.atob(b64);
    const binaryDer = str2ab(binaryDerString);

    const key = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      key,
      sigBytes,
      encoder.encode(JSON.stringify(data))
    );
  } catch (e) {
    console.error('[OTA] Signature verification error:', e);
    return false;
  }
}

// Generate a stable device ID based on hardware/uuid to enforce deterministic rollout
async function getDeterministicDeviceId() {
  let deviceId = localStorage.getItem('cc_ota_device_id');
  if (!deviceId) {
    const info = await Device.getId();
    deviceId = info.identifier || crypto.randomUUID();
    localStorage.setItem('cc_ota_device_id', deviceId);
  }
  return deviceId;
}

// Hash string to number between 0 and 99
function hashToPercent(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash) % 100;
}

export const otaService = {
  // Call this EARLY in App.jsx (e.g. before rendering router)
  applyPendingUpdateOnBoot: async () => {
    try {
      const { value: pendingVersion } = await Preferences.get({ key: 'ota_pending_version' });
      if (pendingVersion) {
        console.log(`[OTA] Cold Launch Detected. Applying pending update ${pendingVersion}...`);
        await Preferences.remove({ key: 'ota_pending_version' });
        // This will restart the WebView with the new bundle
        await CapacitorUpdater.set({ version: pendingVersion });
        return true; // We are reloading, halt further boot
      }
    } catch (e) {
      console.error('[OTA] Failed to apply pending update on boot:', e);
    }
    return false;
  },

  startBackgroundCheck: () => {
    // Wait 5 seconds after boot so we don't block anything
    setTimeout(async () => {
      try {
        await otaService.checkAndDownloadUpdate();
      } catch (e) {
        console.error('[OTA] Background check failed:', e);
      }
    }, 5000);
  },

  checkAndDownloadUpdate: async () => {
    console.log('[OTA] Checking for updates...');
    
    let manifest;
    try {
      const res = await fetch(`${OTA_URL}/version.json?t=${Date.now()}`);
      manifest = await res.json();
    } catch (e) {
      console.log('[OTA] Could not fetch version.json, probably offline.');
      return;
    }

    if (manifest.disabled || manifest.otaEnabled === false) {
      console.log('[OTA] Updates disabled by remote kill switch.');
      return;
    }

    const isValid = await verifySignature(manifest);
    if (!isValid) {
      console.error('[OTA] Security verification failed! Signature mismatch.');
      return;
    }

    const currentNativeVersion = 1; 
    if (currentNativeVersion < manifest.minimumNative || currentNativeVersion > manifest.maximumNative) {
      console.log(`[OTA] Update requires Native Version ${manifest.minimumNative}-${manifest.maximumNative}. Aborting.`);
      return;
    }

    const deviceId = await getDeterministicDeviceId();
    const rolloutBucket = hashToPercent(deviceId);
    if (rolloutBucket >= manifest.rollout) {
      console.log(`[OTA] Not selected in the ${manifest.rollout}% rollout bucket.`);
      return;
    }

    const status = await Network.getStatus();
    if (!status.connected) return;

    const currentPluginState = await CapacitorUpdater.current();
    if (currentPluginState?.version === manifest.version) {
      console.log('[OTA] App is already on the latest version.');
      return;
    }

    console.log(`[OTA] New version ${manifest.version} found (Priority: ${manifest.priority}). Downloading...`);

    try {
      const result = await CapacitorUpdater.download({
        url: `${OTA_URL}/update.zip`,
        version: manifest.version
      });

      console.log(`[OTA] Download complete! Ready to apply.`, result);

      if (manifest.priority === 'CRITICAL') {
        // Critical updates force an immediate restart
        console.warn('[OTA] CRITICAL Update detected. Restarting app immediately.');
        await CapacitorUpdater.set({ version: manifest.version });
      } else {
        // Normal updates wait for next cold launch
        await Preferences.set({ key: 'ota_pending_version', value: manifest.version });
        console.log(`[OTA] Update scheduled for next cold launch.`);
      }

      await otaService.cleanupOldBundles();

    } catch (e) {
      console.error('[OTA] Download failed:', e);
    }
  },

  cleanupOldBundles: async () => {
    try {
      const res = await CapacitorUpdater.list();
      if (res.versions && res.versions.length > 3) {
        const toDelete = res.versions.slice(0, res.versions.length - 3);
        for (const v of toDelete) {
          await CapacitorUpdater.delete({ version: v });
        }
      }
    } catch (e) {
      console.error('[OTA] Cleanup failed:', e);
    }
  }
};
