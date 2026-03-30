import { mock } from 'bun:test';
import { mockAuth, mockFirestore, MockTimestamp } from './mocks/firebase-admin';

mock.module('../env', () => ({
  default: {
    PORT: '3000',
    SENTRY_ENABLED: 'false',
    SENTRY_DSN: '',
    SENTRY_ENVIRONMENT: 'test',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_CLIENT_EMAIL: 'test@test.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: 'test-private-key',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

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
