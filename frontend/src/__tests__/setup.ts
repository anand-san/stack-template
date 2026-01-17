import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock environment variables for Firebase
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', async () => {
  const { mockAuth, mockOnAuthStateChanged } = await import(
    './mocks/firebase-auth'
  );
  return {
    getAuth: vi.fn(() => mockAuth),
    onAuthStateChanged: mockOnAuthStateChanged,
    signInWithPopup: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(),
    sendSignInLinkToEmail: vi.fn(() => Promise.resolve()),
    isSignInWithEmailLink: vi.fn(() => false),
    signInWithEmailLink: vi.fn(),
  };
});
