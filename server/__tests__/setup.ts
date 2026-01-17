/**
 * Test setup file for Bun test runner
 * This file configures mocks before tests run.
 */

import { mock } from 'bun:test';
import { mockAuth, mockFirestore, MockTimestamp } from './mocks/firebase-admin';

// Mock firebase-admin/app
mock.module('firebase-admin/app', () => ({
  cert: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));

// Mock firebase-admin/auth
mock.module('firebase-admin/auth', () => ({
  getAuth: () => mockAuth,
}));

// Mock firebase-admin/firestore
mock.module('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
  Timestamp: MockTimestamp,
}));
