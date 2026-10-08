/**
 * CommunityRepository.js
 * Inquiries, Stories, Baker Connect, Chat & AI Memories.
 */
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  where,
  orderBy,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// ── STORIES ───────────────────────────────────────────────────────
export const storiesCollection = collection(db, 'stories');

export const subscribeToStories = (callback, userId) => {
  const q = query(
    storiesCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
};

export const addStoryToDB = async (storyData) => {
  try {
    const docRef = await addDoc(storiesCollection, {
      ...storyData,
      uid: auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding story:', e);
    throw e;
  }
};

export const deleteStoryFromDB = async (storyId) => {
  try {
    await deleteDoc(doc(db, 'stories', storyId));
  } catch (e) {
    console.error('Error deleting story:', e);
    throw e;
  }
};

// ── INQUIRIES ─────────────────────────────────────────────────────
export const inquiriesCollection = collection(db, 'inquiries');

export const addInquiryToDB = async (inquiryData) => {
  try {
    const docRef = await addDoc(inquiriesCollection, {
      ...inquiryData,
      uid: inquiryData.userId || auth.currentUser?.uid,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding inquiry:', e);
    throw e;
  }
};

export const subscribeToInquiries = (callback, userId) => {
  const q = query(
    inquiriesCollection,
    where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER')
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(data);
  });
};

// ── LOCAL CONNECT (MAP & CHAT) ───────────────────────────────────
export const bakersLocationsCollection = collection(db, 'bakers_locations');
export const chatsCollection = collection(db, 'chats');

export const updateBakerLocation = async (lat, lng, details) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await setDoc(doc(db, 'bakers_locations', uid), {
      lat,
      lng,
      displayName: details.displayName || auth.currentUser.displayName || 'Anonymous Baker',
      photoURL: details.photoURL || auth.currentUser.photoURL || '',
      specialty: details.specialty || 'Baking',
      specialties: details.specialties || [details.specialty || 'Baking'],
      privacyMode: details.privacyMode || 'exact',
      liveStatus: details.liveStatus || '',
      lastActive: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating baker location:', error);
  }
};

export const subscribeToBakers = (callback) => {
  return onSnapshot(bakersLocationsCollection, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data);
  });
};

export const startOrGetChat = async (targetUid) => {
  if (!auth.currentUser) return null;
  const uid = auth.currentUser.uid;
  try {
    const q = query(chatsCollection, where('participants', 'array-contains', uid));
    const snapshot = await getDocs(q);
    
    let existingChatId = null;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.participants && data.participants.includes(targetUid)) {
        existingChatId = docSnap.id;
      }
    });

    if (existingChatId) {
      return existingChatId;
    }

    const chatRef = await addDoc(chatsCollection, {
      participants: [uid, targetUid],
      updatedAt: new Date().toISOString(),
      lastMessage: ''
    });
    return chatRef.id;
  } catch (error) {
    console.error('Error starting chat:', error);
    return null;
  }
};

export const sendMessage = async (chatId, text) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    const messagesCollection = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesCollection, {
      senderId: uid,
      text,
      timestamp: new Date().toISOString()
    });
    
    await setDoc(doc(db, 'chats', chatId), {
      lastMessage: text,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

export const subscribeToMessages = (chatId, callback) => {
  if (!chatId) return () => {};
  const messagesCollection = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data);
  });
};

// ── BAKER CONNECT PHASE 2 ─────────────────────────────────────────
export const bakerStoriesCollection = collection(db, 'baker_stories');
export const communityCollection = collection(db, 'community_posts');

export const addBakerStory = async (mediaUrl, text) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await addDoc(bakerStoriesCollection, {
      uid,
      displayName: auth.currentUser.displayName || 'Anonymous',
      photoURL: auth.currentUser.photoURL || '',
      mediaUrl,
      text: text || '',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error adding story:', error);
  }
};

export const subscribeToBakerStories = (callback) => {
  const q = query(bakerStoriesCollection, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const valid = data.filter(s => new Date(s.expiresAt) > new Date());
    callback(valid);
  });
};

export const addCommunityPost = async (text, type = 'request') => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await addDoc(communityCollection, {
      uid,
      displayName: auth.currentUser.displayName || 'Anonymous',
      photoURL: auth.currentUser.photoURL || '',
      text,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding community post:', error);
  }
};

export const subscribeToCommunityPosts = (callback) => {
  const q = query(communityCollection, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data);
  });
};

// ── AI MEMORIES (BRAIN) ───────────────────────────────────────────
export const aiMemoriesCollection = collection(db, 'ai_memories');

export const addMemoryToDB = async (note) => {
  if (!auth.currentUser) throw new Error('User not authenticated');
  const uid = auth.currentUser.uid;
  try {
    const docRef = await addDoc(aiMemoriesCollection, {
      uid,
      note,
      timestamp: new Date().toISOString(),
      deleted: false
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding memory:', error);
    throw error;
  }
};

export const deleteMemoryFromDB = async (memoryId) => {
  try {
    await deleteDoc(doc(db, 'ai_memories', memoryId));
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
};

export const getMemoriesFromDB = async () => {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  try {
    const q = query(aiMemoriesCollection, where('uid', '==', uid));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return list;
  } catch (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
};
