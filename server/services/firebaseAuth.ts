/**
 * Lightweight Firebase Auth - JWT verification without firebase-admin
 * Uses jose library (~50KB) instead of firebase-admin (~80-120MB)
 */
import * as jose from 'jose';

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface DecodedIdToken {
  uid: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
  iss: string;
  aud: string;
  auth_time: number;
  sub: string;
  iat: number;
  exp: number;
  firebase?: {
    identities: Record<string, unknown>;
    sign_in_provider: string;
  };
}

// Cache public keys with expiry
let cachedKeys: Record<string, jose.KeyLike> = {};
let cacheExpiry = 0;

async function getPublicKeys(): Promise<Record<string, jose.KeyLike>> {
  const now = Date.now();

  if (now < cacheExpiry && Object.keys(cachedKeys).length > 0) {
    return cachedKeys;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
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

export async function verifyIdToken(
  token: string,
  projectId: string,
): Promise<DecodedIdToken> {
  const keys = await getPublicKeys();

  // Decode header to get kid
  const header = jose.decodeProtectedHeader(token);
  if (!header.kid || !keys[header.kid]) {
    throw new Error('Invalid token: unknown key id');
  }

  const key = keys[header.kid];

  // Verify the token
  const { payload } = await jose.jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  // Validate additional claims
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Invalid token: missing sub claim');
  }

  if (payload.auth_time && (payload.auth_time as number) > now) {
    throw new Error('Invalid token: auth_time is in the future');
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
