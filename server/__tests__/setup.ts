import { mock } from 'bun:test';
import { mockAuth, mockFirestore, MockTimestamp } from './mocks/firebase-admin';

// Mock the lightweight firebase services
mock.module('../services/firebase', () => ({
  adminAuth: mockAuth,
  firestore: mockFirestore,
  Timestamp: MockTimestamp,
}));

// Mock the firebaseAuth module
mock.module('../services/firebaseAuth', () => ({
  verifyIdToken: mockAuth.verifyIdToken,
}));

// Mock the firestoreRest module
mock.module('../services/firestoreRest', () => ({
  initializeFirestore: () => {},
  getDoc: mock(async () => ({ exists: false, data: () => undefined })),
  setDoc: mock(async () => {}),
  deleteDoc: mock(async () => {}),
  createDoc: mock(async () => ({ id: 'new-id' })),
  queryDocs: mock(async () => []),
  Timestamp: MockTimestamp,
}));
