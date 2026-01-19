/**
 * Minimal type definitions for Firestore-like query results
 * Replaces firebase-admin/firestore types
 */
export interface QueryDocumentSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown>;
}

export interface DocumentReference<T> {
  id: string;
  get(): Promise<{ exists: boolean; data(): T | undefined }>;
  set(data: T): Promise<void>;
  delete(): Promise<void>;
  withConverter<U>(converter: unknown): DocumentReference<U>;
}
