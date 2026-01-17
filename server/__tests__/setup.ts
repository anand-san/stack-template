import { mock } from 'bun:test';
import { mockAuth, mockFirestore, MockTimestamp } from './mocks/firebase-admin';

mock.module('firebase-admin/app', () => ({
  cert: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));

mock.module('firebase-admin/auth', () => ({
  getAuth: () => mockAuth,
}));

mock.module('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
  Timestamp: MockTimestamp,
}));
