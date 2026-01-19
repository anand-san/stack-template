/**
 * Firebase services - Lightweight implementations
 * Replaces firebase-admin SDK to reduce memory footprint
 */
import { verifyIdToken, type DecodedIdToken } from './firebaseAuth';
import {
  initializeFirestore,
  getDoc,
  setDoc,
  deleteDoc,
  queryDocs,
  Timestamp,
  type DocumentSnapshot,
  type WhereClause,
} from './firestoreRest';
import env from '../env';

// Initialize Firestore with service account credentials
const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

initializeFirestore({
  projectId: env.FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey,
});

// Auth exports
export const adminAuth = {
  verifyIdToken: (token: string) =>
    verifyIdToken(token, env.FIREBASE_PROJECT_ID),
};

// Firestore exports - maintain similar interface for ease of migration
export const firestore = {
  collection: (name: string) => ({
    doc: (id?: string) => {
      if (id) {
        return createDocRef(name, id);
      }
      // Generate a new doc ID for new documents
      return createNewDocRef(name);
    },
    where: (field: string, op: WhereClause['op'], value: unknown) => ({
      get: async () => {
        const results = await queryDocs(name, { field, op, value });
        return {
          docs: results.map(r => ({
            id: r.id,
            exists: true,
            data: () => r.data,
          })),
        };
      },
    }),
    withConverter: <T>(_converter: unknown) => ({
      doc: (id?: string) => {
        if (id) {
          return createDocRef<T>(name, id);
        }
        return createNewDocRef<T>(name);
      },
      where: (field: string, op: WhereClause['op'], value: unknown) => ({
        get: async () => {
          const results = await queryDocs<T>(name, { field, op, value });
          return {
            docs: results.map(r => ({
              id: r.id,
              exists: true,
              data: () => r.data,
            })),
          };
        },
      }),
    }),
  }),
};

function createDocRef<T = Record<string, unknown>>(
  collection: string,
  id: string,
) {
  return {
    id,
    get: async (): Promise<DocumentSnapshot<T>> => getDoc<T>(collection, id),
    set: async (data: T) =>
      setDoc(collection, id, data as Record<string, unknown>),
    delete: async () => deleteDoc(collection, id),
    withConverter: <U>(_converter: unknown) => createDocRef<U>(collection, id),
  };
}

function createNewDocRef<T = Record<string, unknown>>(collection: string) {
  // Generate a random document ID similar to Firestore's auto-generated IDs
  const id = generateDocId();
  return {
    id,
    get: async (): Promise<DocumentSnapshot<T>> => getDoc<T>(collection, id),
    set: async (data: T) =>
      setDoc(collection, id, data as Record<string, unknown>),
    delete: async () => deleteDoc(collection, id),
    withConverter: <U>(_converter: unknown) => createNewDocRef<U>(collection),
  };
}

function generateDocId(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Re-export types and utilities
export { Timestamp };
export type { DecodedIdToken, DocumentSnapshot, WhereClause };
