/**
 * SessionManager.js
 * Enterprise Zero-Trust Session & Active Device Registry Service
 *
 * Manages single active session enforcement per bakery account,
 * real-time session revocation listeners, and multi-device settings.
 */

import { db, auth } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getDeviceMetadata, getInstallationId } from './DeviceTrustManager';
import { auditLog, AUDIT } from './auditLog';

export const sessionsCollection = collection(db, 'sessions');

/**
 * Register or update active session in Firestore upon login / token refresh.
 * Enforces single active session by default unless multi-device is allowed.
 *
 * @param {string} uid - User UID
 * @param {boolean} allowMultipleDevices - User's multi-device setting
 */
export async function registerActiveSession(uid, allowMultipleDevices = false) {
  if (!uid) return null;

  try {
    const deviceMeta = getDeviceMetadata();
    const sessionId = `${uid}_${deviceMeta.deviceId}`;
    const sessionRef = doc(db, 'sessions', sessionId);

    // If single device enforcement is enabled, revoke previous active sessions for this UID
    if (!allowMultipleDevices) {
      await revokeAllOtherSessions(uid, deviceMeta.deviceId);
    }

    const sessionData = {
      sessionId,
      uid,
      deviceId: deviceMeta.deviceId,
      deviceName: deviceMeta.deviceName,
      platform: deviceMeta.platform,
      appVersion: deviceMeta.appVersion,
      status: 'active',
      loginTime: serverTimestamp(),
      lastActive: serverTimestamp(),
      revokedAt: null,
      revokedReason: null,
    };

    await setDoc(sessionRef, sessionData, { merge: true });
    await auditLog(AUDIT.LOGIN_SUCCESS, uid, {
      deviceId: deviceMeta.deviceId,
      deviceName: deviceMeta.deviceName,
      platform: deviceMeta.platform,
    });

    return sessionData;
  } catch (error) {
    console.error('[SessionManager] Error registering active session:', error);
    return null;
  }
}

/**
 * Revoke all other active sessions for a user (Single Session Enforcement).
 */
export async function revokeAllOtherSessions(uid, currentDeviceId) {
  try {
    const q = query(
      sessionsCollection,
      where('uid', '==', uid),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      if (data.deviceId !== currentDeviceId) {
        return updateDoc(docSnap.ref, {
          status: 'revoked',
          revokedAt: serverTimestamp(),
          revokedReason: 'single_session_enforced',
        });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);

    if (snapshot.docs.some((d) => d.data().deviceId !== currentDeviceId)) {
      await auditLog(AUDIT.SESSION_REVOCATION, uid, {
        revokedByDevice: currentDeviceId,
        reason: 'single_session_enforced',
      });
    }
  } catch (error) {
    console.error('[SessionManager] Error revoking other sessions:', error);
  }
}

/**
 * Subscribe to the current device's session document in Firestore.
 * Triggers callback if the session is revoked from another device or admin.
 */
export function subscribeToSessionStatus(uid, onRevoked) {
  if (!uid) return () => {};

  const deviceId = getInstallationId();
  const sessionId = `${uid}_${deviceId}`;
  const sessionRef = doc(db, 'sessions', sessionId);

  return onSnapshot(
    sessionRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'revoked') {
          console.warn('[SessionManager] Session has been revoked!');
          if (onRevoked) onRevoked(data.revokedReason || 'Session revoked');
        }
      }
    },
    (err) => {
      console.error('[SessionManager] Session listener error:', err);
    }
  );
}

/**
 * List all active sessions / devices registered for the user.
 */
export async function listActiveSessions(uid) {
  try {
    const q = query(
      sessionsCollection,
      where('uid', '==', uid),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[SessionManager] Error listing sessions:', error);
    return [];
  }
}

/**
 * Manually revoke a specific session by sessionId.
 */
export async function revokeSession(uid, targetSessionId) {
  try {
    const sessionRef = doc(db, 'sessions', targetSessionId);
    await updateDoc(sessionRef, {
      status: 'revoked',
      revokedAt: serverTimestamp(),
      revokedReason: 'user_initiated_logout',
    });
    await auditLog(AUDIT.SESSION_REVOCATION, uid, { targetSessionId });
  } catch (error) {
    console.error('[SessionManager] Error revoking session:', error);
    throw error;
  }
}
