/**
 * Lightweight Firestore REST API client
 * Replaces firebase-admin/firestore with direct REST calls
 */

export interface FirestoreTimestamp {
  seconds: number;
  nanos: number;
}

export class Timestamp {
  constructor(
    public seconds: number,
    public nanoseconds: number,
  ) {}

  static now(): Timestamp {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1_000_000);
  }

  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
  }

  toDate(): Date {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1_000_000);
  }

  toJSON(): { seconds: number; nanos: number } {
    return { seconds: this.seconds, nanos: this.nanoseconds };
  }
}

interface FirestoreConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

let config: FirestoreConfig | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

export function initializeFirestore(cfg: FirestoreConfig): void {
  config = cfg;
}

async function getAccessToken(): Promise<string> {
  if (!config) {
    throw new Error(
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

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  accessToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000; // Refresh 1 min early

  return accessToken;
}

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

function getBaseUrl(): string {
  if (!config) throw new Error('Firestore not initialized');
  return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
}

// Convert JS value to Firestore value format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFirestoreValue(value: any): any {
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
    return {
      timestampValue: new Date(
        value.seconds * 1000 + value.nanoseconds / 1_000_000,
      ).toISOString(),
    };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

// Convert Firestore value to JS value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromFirestoreValue(value: any): any {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) {
    const date = new Date(value.timestampValue);
    return Timestamp.fromDate(date);
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  return null;
}

export interface DocumentSnapshot<T> {
  exists: boolean;
  id: string;
  data(): T | undefined;
}

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
    throw new Error(`Firestore error: ${response.status}`);
  }

  const doc = (await response.json()) as { fields?: Record<string, unknown> };

  const data: Record<string, unknown> = {};
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      data[k] = fromFirestoreValue(v);
    }
  }

  return { exists: true, id: docId, data: () => data as T };
}

export async function setDoc<T extends Record<string, unknown>>(
  collection: string,
  docId: string,
  data: T,
): Promise<void> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}/${collection}/${docId}`;

  const fields: Record<string, unknown> = {};
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
    throw new Error(`Firestore error: ${response.status} - ${error}`);
  }
}

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
    throw new Error(`Firestore error: ${response.status}`);
  }
}

export async function createDoc<T extends Record<string, unknown>>(
  collection: string,
  data: T,
): Promise<{ id: string }> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}/${collection}`;

  const fields: Record<string, unknown> = {};
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
    throw new Error(`Firestore error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { name: string };
  // Extract doc ID from name: projects/{project}/databases/(default)/documents/{collection}/{docId}
  const id = result.name.split('/').pop()!;
  return { id };
}

export interface WhereClause {
  field: string;
  op: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'in' | 'array-contains';
  value: unknown;
}

export async function queryDocs<T>(
  collection: string,
  where?: WhereClause,
): Promise<Array<{ id: string; data: T }>> {
  const token = await getAccessToken();
  if (!config) throw new Error('Firestore not initialized');

  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`;

  const opMap: Record<string, string> = {
    '==': 'EQUAL',
    '<': 'LESS_THAN',
    '<=': 'LESS_THAN_OR_EQUAL',
    '>': 'GREATER_THAN',
    '>=': 'GREATER_THAN_OR_EQUAL',
    '!=': 'NOT_EQUAL',
    in: 'IN',
    'array-contains': 'ARRAY_CONTAINS',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    structuredQuery: {
      from: [{ collectionId: collection }],
    },
  };

  if (where) {
    query.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: opMap[where.op],
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
    throw new Error(`Firestore error: ${response.status} - ${error}`);
  }

  const results = (await response.json()) as Array<{
    document?: { name: string; fields: Record<string, unknown> };
  }>;

  return results
    .filter(r => r.document)
    .map(r => {
      const doc = r.document!;
      const id = doc.name.split('/').pop()!;
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(doc.fields)) {
        data[k] = fromFirestoreValue(v);
      }
      return { id, data: data as T };
    });
}
