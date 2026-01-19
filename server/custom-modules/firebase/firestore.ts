/**
 * Lightweight Firestore REST API Client
 * Replaces firebase-admin/firestore with direct REST calls
 *
 * @module firebase/firestore
 */
import { FirestoreError } from './errors';
import { Timestamp } from './timestamp';
import type {
  FirestoreValue,
  FirestoreDocument,
  QueryResponse,
  DocumentSnapshot,
  WhereClause,
} from './types';

// Re-export for convenience
export { Timestamp };
export type { DocumentSnapshot, WhereClause };

interface FirestoreConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

let config: FirestoreConfig | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

/**
 * Initialize the Firestore client with service account credentials
 *
 * @param cfg - Service account configuration
 * @throws {FirestoreError} If called with invalid config
 *
 * @example
 * ```typescript
 * initializeFirestore({
 *   projectId: 'my-project',
 *   clientEmail: 'sa@my-project.iam.gserviceaccount.com',
 *   privateKey: '-----BEGIN PRIVATE KEY-----\n...',
 * });
 * ```
 */
export function initializeFirestore(cfg: FirestoreConfig): void {
  if (!cfg.projectId || !cfg.clientEmail || !cfg.privateKey) {
    throw new FirestoreError(
      'invalid-argument',
      'Missing required Firestore configuration',
    );
  }
  config = cfg;
}

/**
 * Gets a valid access token, refreshing if necessary
 * @internal
 */
async function getAccessToken(): Promise<string> {
  if (!config) {
    throw new FirestoreError(
      'invalid-argument',
      'Firestore not initialized. Call initializeFirestore first.',
    );
  }

  const now = Date.now();
  if (accessToken && now < tokenExpiry) {
    return accessToken;
  }

  // Create JWT for Google OAuth
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;

  const payload = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
  };

  // Sign JWT with private key using Web Crypto API
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(config.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput),
  );

  const jwt = `${signatureInput}.${base64UrlEncode(signature)}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new FirestoreError(
      'unauthenticated',
      'Failed to obtain access token',
      response.status,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  accessToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000; // Refresh 1 min early

  return accessToken;
}

/** Convert PEM to binary for Web Crypto */
function pemToBinary(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Base64 URL encode */
function base64UrlEncode(input: string | ArrayBuffer): string {
  let base64: string;
  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    const bytes = new Uint8Array(input);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Get Firestore REST API base URL */
function getBaseUrl(): string {
  if (!config) {
    throw new FirestoreError('invalid-argument', 'Firestore not initialized');
  }
  return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
}

/**
 * Convert JavaScript value to Firestore value format
 * @internal
 */
function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Timestamp) {
    return { timestampValue: value.toISOString() };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/**
 * Convert Firestore value to JavaScript value
 * @internal
 */
function fromFirestoreValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) {
    return Timestamp.fromDate(new Date(value.timestampValue));
  }
  if ('bytesValue' in value) return value.bytesValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields ?? {})) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  return null;
}

/**
 * Gets a single document from Firestore
 *
 * @param collection - Collection name
 * @param docId - Document ID
 * @returns Document snapshot
 * @throws {FirestoreError} On network or permission errors
 *
 * @example
 * ```typescript
 * const snap = await getDoc<User>('users', 'user-123');
 * if (snap.exists) {
 *   console.log(snap.data());
 * }
 * ```
 */
export async function getDoc<T>(
  collection: string,
  docId: string,
): Promise<DocumentSnapshot<T>> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}/${collection}/${docId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) {
    return { exists: false, id: docId, data: () => undefined };
  }

  if (!response.ok) {
    throw FirestoreError.fromStatus(response.status);
  }

  const doc = (await response.json()) as FirestoreDocument;

  const data: Record<string, unknown> = {};
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      data[k] = fromFirestoreValue(v);
    }
  }

  return { exists: true, id: docId, data: () => data as T };
}

/**
 * Creates or overwrites a document in Firestore
 *
 * @param collection - Collection name
 * @param docId - Document ID
 * @param data - Document data
 * @throws {FirestoreError} On network or permission errors
 *
 * @example
 * ```typescript
 * await setDoc('users', 'user-123', {
 *   name: 'John',
 *   createdAt: Timestamp.now(),
 * });
 * ```
 */
export async function setDoc<T extends Record<string, unknown>>(
  collection: string,
  docId: string,
  data: T,
): Promise<void> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}/${collection}/${docId}`;

  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new FirestoreError(
      'internal',
      `Failed to set document: ${error}`,
      response.status,
    );
  }
}

/**
 * Deletes a document from Firestore
 *
 * @param collection - Collection name
 * @param docId - Document ID
 * @throws {FirestoreError} On network or permission errors (not on 404)
 */
export async function deleteDoc(
  collection: string,
  docId: string,
): Promise<void> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}/${collection}/${docId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    throw FirestoreError.fromStatus(response.status);
  }
}

/**
 * Creates a new document with auto-generated ID
 *
 * @param collection - Collection name
 * @param data - Document data
 * @returns Object with the generated document ID
 * @throws {FirestoreError} On network or permission errors
 */
export async function createDoc<T extends Record<string, unknown>>(
  collection: string,
  data: T,
): Promise<{ id: string }> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}/${collection}`;

  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new FirestoreError(
      'internal',
      `Failed to create document: ${error}`,
      response.status,
    );
  }

  const result = (await response.json()) as { name: string };
  const id = result.name.split('/').pop()!;
  return { id };
}

/** Map query operators to Firestore REST API format */
const OP_MAP: Record<WhereClause['op'], string> = {
  '==': 'EQUAL',
  '!=': 'NOT_EQUAL',
  '<': 'LESS_THAN',
  '<=': 'LESS_THAN_OR_EQUAL',
  '>': 'GREATER_THAN',
  '>=': 'GREATER_THAN_OR_EQUAL',
  in: 'IN',
  'not-in': 'NOT_IN',
  'array-contains': 'ARRAY_CONTAINS',
  'array-contains-any': 'ARRAY_CONTAINS_ANY',
};

/**
 * Queries documents from a collection
 *
 * @param collection - Collection name
 * @param where - Optional where clause
 * @returns Array of matching documents
 * @throws {FirestoreError} On network or permission errors
 *
 * @example
 * ```typescript
 * const todos = await queryDocs<Todo>('todos', {
 *   field: 'userId',
 *   op: '==',
 *   value: 'user-123',
 * });
 * ```
 */
export async function queryDocs<T>(
  collection: string,
  where?: WhereClause,
): Promise<Array<{ id: string; data: T }>> {
  const token = await getAccessToken();
  if (!config) {
    throw new FirestoreError('invalid-argument', 'Firestore not initialized');
  }

  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`;

  const query: {
    structuredQuery: {
      from: Array<{ collectionId: string }>;
      where?: {
        fieldFilter: {
          field: { fieldPath: string };
          op: string;
          value: FirestoreValue;
        };
      };
    };
  } = {
    structuredQuery: {
      from: [{ collectionId: collection }],
    },
  };

  if (where) {
    query.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: OP_MAP[where.op],
        value: toFirestoreValue(where.value),
      },
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new FirestoreError(
      'internal',
      `Query failed: ${error}`,
      response.status,
    );
  }

  const results = (await response.json()) as QueryResponse[];

  return results
    .filter(r => r.document)
    .map(r => {
      const doc = r.document!;
      const id = doc.name.split('/').pop()!;
      const data: Record<string, unknown> = {};
      if (doc.fields) {
        for (const [k, v] of Object.entries(doc.fields)) {
          data[k] = fromFirestoreValue(v);
        }
      }
      return { id, data: data as T };
    });
}
