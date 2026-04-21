export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  createdAt: any;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
