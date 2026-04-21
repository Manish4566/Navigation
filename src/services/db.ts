import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChatSession, Message, UserProfile, FirestoreErrorInfo } from '../types';

function handleFirestoreError(error: any, operation: string, path: string | null): never {
  if (error.code === 'permission-denied') {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType: operation as any,
      path,
      authInfo: {
        userId: user?.uid || 'anonymous',
        email: user?.email || '',
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous ?? true,
        providerInfo: (user?.providerData || []).map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || '',
        }))
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

export const dbService = {
  async createUserProfile(user: { uid: string, email: string, displayName: string }) {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          ...user,
          createdAt: serverTimestamp()
        });
      } else {
        // Only update if display name changed to avoid rule triggers on immutable fields
        if (snap.data().displayName !== user.displayName) {
          await updateDoc(userRef, {
            displayName: user.displayName
          });
        }
      }
    } catch (e) {
      handleFirestoreError(e, 'write', `users/${user.uid}`);
    }
  },

  async createSession(userId: string, title: string) {
    try {
      const docRef = await addDoc(collection(db, 'chat_sessions'), {
        userId,
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', 'chat_sessions');
    }
  },

  async getSessions(userId: string) {
    try {
      const q = query(
        collection(db, 'chat_sessions'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
    } catch (e) {
      handleFirestoreError(e, 'list', 'chat_sessions');
    }
  },

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'createdAt'>) {
    try {
      const sessionRef = doc(db, 'chat_sessions', sessionId);
      const msgRef = await addDoc(collection(sessionRef, 'messages'), {
        ...message,
        createdAt: serverTimestamp()
      });
      
      // Update session timestamp for ordering
      await updateDoc(sessionRef, {
        updatedAt: serverTimestamp()
      });
      
      return msgRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', `chat_sessions/${sessionId}/messages`);
    }
  },

  async getMessages(sessionId: string) {
    try {
      const sessionRef = doc(db, 'chat_sessions', sessionId);
      const q = query(collection(sessionRef, 'messages'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    } catch (e) {
      handleFirestoreError(e, 'list', `chat_sessions/${sessionId}/messages`);
    }
  },

  async deleteSession(sessionId: string) {
    try {
      // Note: In rules, subcollections aren't automatically deleted.
      // For a production app, we'd use a Cloud Function or batch delete.
      // Here we just delete the metadata.
      await deleteDoc(doc(db, 'chat_sessions', sessionId));
    } catch (e) {
      handleFirestoreError(e, 'delete', `chat_sessions/${sessionId}`);
    }
  },

  async updateSessionTitle(sessionId: string, title: string) {
    try {
      await updateDoc(doc(db, 'chat_sessions', sessionId), {
        title,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `chat_sessions/${sessionId}`);
    }
  }
};
