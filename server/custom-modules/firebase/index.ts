/**
 * Firebase Services - Lightweight Implementation
 *
 * Provides Firebase Auth and Firestore functionality without the heavy
 * firebase-admin SDK. Uses jose for JWT verification and Firestore REST API.
 *
 * @module firebase
 *
 * @example
 * ```typescript
 * import { adminAuth, Timestamp, FirestoreError } from './services/firebase';
 *
 * // Verify auth token
 * const decoded = await adminAuth.verifyIdToken(token);
 *
 * // Use Timestamp
 * const now = Timestamp.now();
 * ```
 */

// Auth
export { verifyIdToken, type DecodedIdToken } from './auth';

// Firestore
export {
  initializeFirestore,
  getDoc,
  setDoc,
  deleteDoc,
  createDoc,
  queryDocs,
  Timestamp,
  type DocumentSnapshot,
  type WhereClause,
} from './firestore';

// Errors
export { FirestoreError, AuthError, type FirestoreErrorCode } from './errors';

// Types
export type {
  FirestoreValue,
  FirestoreDocument,
  QueryOperator,
  OrderByClause,
  FirestoreData,
} from './types';
