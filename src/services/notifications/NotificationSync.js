/**
 * NotificationSync.js
 *
 * Real-time Multi-Device Notification Synchronization Service.
 * Syncs read/unread states, unread counts, and archived status across all user devices.
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

let unsubscribeListener = null;

export function subscribeToNotificationSync(userId, onUpdate) {
  if (!userId) return () => {};

  if (unsubscribeListener) {
    unsubscribeListener();
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  unsubscribeListener = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : new Date(),
      }));

      const unreadCount = notifications.filter((n) => !n.read && !n.archived).length;

      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate({ notifications, unreadCount });
      }
    },
    (err) => {
      console.error('[NotificationSync] Real-time sync listener error:', err);
    }
  );

  return unsubscribeListener;
}

export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[NotificationSync] Failed to mark as read:', err);
  }
}

export async function markAllNotificationsAsRead(notifications = []) {
  const unreadDocs = notifications.filter((n) => !n.read && !n.archived);
  if (unreadDocs.length === 0) return;

  try {
    const batch = writeBatch(db);
    unreadDocs.forEach((n) => {
      const docRef = doc(db, 'notifications', n.id);
      batch.update(docRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.error('[NotificationSync] Failed to mark all as read:', err);
  }
}

export async function archiveNotification(notificationId) {
  if (!notificationId) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      archived: true,
      archivedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[NotificationSync] Failed to archive notification:', err);
  }
}
