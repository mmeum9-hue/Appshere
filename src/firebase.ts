import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  increment,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

// Configuração do Firebase obtida de firebase-applet-config.json
const firebaseConfig = {
  projectId: "msoccer-74552",
  appId: "1:608446758255:web:b0f951166e9b605feebc9a",
  apiKey: "AIzaSyCXvMXczoc93gvHj5ob_oqyYOWcxY6i4ig",
  authDomain: "msoccer-74552.firebaseapp.com",
  storageBucket: "msoccer-74552.firebasestorage.app",
  messagingSenderId: "608446758255"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore com o Database ID específico do AI Studio
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-cd14f602-8ba3-4412-8d04-a3bd4aed23b2");

// Inicializa o Auth e o Storage
const auth = getAuth(app);
const storage = getStorage(app);

export { 
  app, 
  db, 
  auth, 
  storage,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  getDocs,
  query,
  where,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

