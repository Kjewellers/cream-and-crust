/**
 * NotificationRepository.js
 * All Firestore operations for the notifications collection + FCM tokens.
 */
import { collection, addDoc, getDoc, updateDoc, deleteDoc, doc, query, onSnapshot, where, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const notificationsCollection = collection(db, 'notifications');

export const addNotificationToDB = async (notificationData) => {
  try {
    const targetUid = notificationData.userId || auth.currentUser?.uid;
    const docRef = await addDoc(notificationsCollection, {
      ...notificationData,
      uid: targetUid,
      read: false,
      createdAt: new Date().toISOString(),
    });

    if (targetUid) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const tokens = userData.fcmTokens || (userData.fcmToken ? [userData.fcmToken] : []);
          if (tokens.length > 0) {
            const apiBase = import.meta.env.VITE_API_URL || '/api';
            Promise.resolve()
              .then(async () => {
                const { getAuth } = await import('firebase/auth');
                const fbUser = getAuth().currentUser;
                const idToken = fbUser ? await fbUser.getIdToken() : null;
                return fetch(`${apiBase}/notifications/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
                  body: JSON.stringify({ tokens, title: notificationData.title || 'New Notification', body: notificationData.message || '', data: { url: '/notifications' } }),
                });
              })
              .catch((e) => console.error('Push API error:', e));
          }
        }
      } catch (pushErr) {
        console.error('Failed to trigger push:', pushErr);
      }
    }

    return docRef.id;
  } catch (e) {
    console.error('Error adding notification: ', e);
    throw e;
  }
};

export const saveFCMToken = async (token) => {
  if (!auth.currentUser) return;
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, { fcmTokens: arrayUnion(token) }, { merge: true });
  } catch (e) {
    console.error('Error saving FCM token:', e);
  }
};

export const subscribeToNotifications = (userId, callback) => {
  const q = query(notificationsCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(notifs);
    },
    (error) => { console.error('Notifications subscription error:', error); }
  );
};

export const updateNotificationInDB = async (id, updatedData) => {
  try {
    await updateDoc(doc(db, 'notifications', id), updatedData);
  } catch (e) {
    console.error('Error updating notification: ', e);
    throw e;
  }
};

export const deleteNotificationFromDB = async (id) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (e) {
    console.error('Error deleting notification: ', e);
    throw e;
  }
};
