/**
 * Lightweight Firebase Auth - JWT verification without firebase-admin
 * Uses jose library (~50KB) instead of firebase-admin (~80-120MB)
 *
 * @module firebase/auth
 */
import * as jose from 'jose';
import { AuthError } from './errors';

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/**
 * Decoded Firebase ID token payload
 * Contains user information and token metadata
 */
export interface DecodedIdToken {
  /** User's unique ID (same as `sub`) */
  uid: string;
  /** User's email address (if available) */
  email?: string;
  /** User's display name (if available) */
  name?: string;
  /** Whether the user's email is verified */
  email_verified?: boolean;
  /** Token issuer */
  iss: string;
  /** Token audience (project ID) */
  aud: string;
  /** Time when authentication occurred */
  auth_time: number;
  /** Subject (user ID) */
  sub: string;
  /** Token issued at time */
  iat: number;
  /** Token expiration time */
  exp: number;
  /** Firebase-specific claims */
  firebase?: {
    identities: Record<string, unknown>;
    sign_in_provider: string;
  };
}

// Cache public keys with expiry
let cachedKeys: Record<string, jose.KeyLike> = {};
let cacheExpiry = 0;

/**
 * Fetches and caches Google's public keys for JWT verification
 * @internal
 */
async function getPublicKeys(): Promise<Record<string, jose.KeyLike>> {
  const now = Date.now();

  if (now < cacheExpiry && Object.keys(cachedKeys).length > 0) {
    return cachedKeys;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new AuthError(
      'unknown',
      `Failed to fetch Google public keys: ${response.status}`,
    );
  }

  const certs = (await response.json()) as Record<string, string>;

  // Parse cache-control header for expiry
  const cacheControl = response.headers.get('cache-control');
  const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600000;
  cacheExpiry = now + maxAge;

  // Convert PEM certificates to KeyLike objects
  cachedKeys = {};
  for (const [kid, cert] of Object.entries(certs)) {
    cachedKeys[kid] = await jose.importX509(cert, 'RS256');
  }

  return cachedKeys;
}

/**
 * Verifies a Firebase ID token and returns the decoded payload
 *
 * @param token - The Firebase ID token to verify
 * @param projectId - Your Firebase project ID
 * @returns Decoded token with user information
 * @throws {AuthError} If the token is invalid or expired
 *
 * @example
 * ```typescript
 * try {
 *   const decoded = await verifyIdToken(token, 'my-project-id');
 *   console.log('User ID:', decoded.uid);
 * } catch (error) {
 *   if (error instanceof AuthError) {
 *     console.log('Auth failed:', error.code);
 *   }
 * }
 * ```
 */
export async function verifyIdToken(
  token: string,
  projectId: string,
): Promise<DecodedIdToken> {
  const keys = await getPublicKeys();

  // Decode header to get kid
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(token);
  } catch {
    throw new AuthError('invalid-token', 'Failed to decode token header');
  }

  if (!header.kid || !keys[header.kid]) {
    throw new AuthError('invalid-token', 'Unknown signing key');
  }

  const key = keys[header.kid];

  // Verify the token
  let payload: jose.JWTPayload;
  try {
    const result = await jose.jwtVerify(token, key, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    payload = result.payload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new AuthError('expired-token', 'Token has expired', error);
    }
    throw new AuthError(
      'invalid-token',
      error instanceof Error ? error.message : 'Token verification failed',
      error,
    );
  }

  // Validate additional claims
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new AuthError('invalid-token', 'Missing subject claim');
  }

  if (payload.auth_time && (payload.auth_time as number) > now) {
    throw new AuthError('invalid-token', 'auth_time is in the future');
  }

  return {
    uid: payload.sub,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    email_verified: payload.email_verified as boolean | undefined,
    iss: payload.iss as string,
    aud: payload.aud as string,
    auth_time: payload.auth_time as number,
    sub: payload.sub,
    iat: payload.iat as number,
    exp: payload.exp as number,
    firebase: payload.firebase as DecodedIdToken['firebase'],
  };
}
