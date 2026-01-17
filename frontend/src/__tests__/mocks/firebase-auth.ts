import { vi } from 'vitest';
import type { User } from 'firebase/auth';

type AuthStateCallback = (user: User | null) => void;
let authStateCallback: AuthStateCallback | null = null;
let currentMockUser: User | null = null;

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
    delete: vi.fn(),
    getIdToken: vi.fn(() => Promise.resolve('mock-id-token')),
    getIdTokenResult: vi.fn(() =>
      Promise.resolve({
        token: 'mock-id-token',
        claims: {},
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        signInProvider: 'google.com',
        signInSecondFactor: null,
      }),
    ),
    reload: vi.fn(() => Promise.resolve()),
    toJSON: vi.fn(() => ({})),
    ...overrides,
  } as User;
}

export const mockAuth: {
  currentUser: User | null;
  onAuthStateChanged: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
} = {
  currentUser: currentMockUser,
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
};

export const mockOnAuthStateChanged = vi.fn(
  (_auth: unknown, callback: AuthStateCallback) => {
    authStateCallback = callback;
    callback(currentMockUser);
    return () => {
      authStateCallback = null;
    };
  },
);

export function setMockUser(user: User | null) {
  currentMockUser = user;
  mockAuth.currentUser = user;
  if (authStateCallback) {
    authStateCallback(user);
  }
}

export function resetAuthMocks() {
  currentMockUser = null;
  mockAuth.currentUser = null;
  authStateCallback = null;
  mockOnAuthStateChanged.mockClear();
}
