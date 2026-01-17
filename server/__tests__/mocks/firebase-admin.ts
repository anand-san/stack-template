import { mock } from 'bun:test';

export interface MockDecodedToken {
  uid: string;
  email?: string;
  name?: string;
}

let mockVerifyResult: MockDecodedToken | Error = { uid: 'test-user-id' };

export const mockAuth = {
  verifyIdToken: mock(async (_token: string) => {
    if (mockVerifyResult instanceof Error) {
      throw mockVerifyResult;
    }
    return mockVerifyResult;
  }),
};

export function setMockVerifyIdToken(result: MockDecodedToken | Error) {
  mockVerifyResult = result;
}

export function resetAuthMocks() {
  mockVerifyResult = { uid: 'test-user-id' };
  mockAuth.verifyIdToken.mockClear();
}

type FirestoreData = Record<string, Record<string, unknown>>;
const collections: Record<string, FirestoreData> = {};

function getCollection(name: string): FirestoreData {
  if (!collections[name]) {
    collections[name] = {};
  }
  return collections[name];
}

const createDocRef = (
  collectionName: string,
  docId: string,
): Record<string, unknown> => {
  const ref: Record<string, unknown> = {
    id: docId,
    get: mock(async () => {
      const data = getCollection(collectionName)[docId];
      return {
        exists: !!data,
        data: () => data,
        id: docId,
      };
    }),
    set: mock(async (data: unknown) => {
      getCollection(collectionName)[docId] = data as Record<string, unknown>;
    }),
    update: mock(async (data: Record<string, unknown>) => {
      const existing = getCollection(collectionName)[docId];
      if (existing) {
        getCollection(collectionName)[docId] = { ...existing, ...data };
      }
    }),
    delete: mock(async () => {
      delete getCollection(collectionName)[docId];
    }),
    withConverter: () => ref,
  };
  return ref;
};

const createCollectionRef = (
  collectionName: string,
): Record<string, unknown> => {
  const ref: Record<string, unknown> = {
    doc: (docId?: string) => {
      const id =
        docId ?? `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return createDocRef(collectionName, id);
    },
    where: (_field: string, _op: string, _value: unknown) => ({
      get: mock(async () => {
        const col = getCollection(collectionName);
        const docs = Object.entries(col)
          .filter(([, data]) => {
            const fieldValue = (data as Record<string, unknown>)[_field];
            return fieldValue === _value;
          })
          .map(([id, data]) => ({
            id,
            data: () => data,
            exists: true,
          }));
        return { docs };
      }),
    }),
    get: mock(async () => {
      const col = getCollection(collectionName);
      const docs = Object.entries(col).map(([id, data]) => ({
        id,
        data: () => data,
        exists: true,
      }));
      return { docs };
    }),
    withConverter: () => ref,
  };
  return ref;
};

export const mockFirestore = {
  collection: mock((name: string) => createCollectionRef(name)),
};

export function seedFirestore(collectionName: string, data: FirestoreData) {
  collections[collectionName] = { ...data };
}

export function clearFirestore() {
  Object.keys(collections).forEach(key => delete collections[key]);
}

export function getFirestoreData(collectionName: string): FirestoreData {
  return { ...getCollection(collectionName) };
}

export function resetFirestoreMocks() {
  clearFirestore();
  mockFirestore.collection.mockClear();
}

export const MockTimestamp = {
  now: () => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
  }),
  fromDate: (date: Date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  }),
};

export function resetAllMocks() {
  resetAuthMocks();
  resetFirestoreMocks();
}
