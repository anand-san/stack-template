/**
 * Firestore Value Type Definitions
 * Discriminated unions for type-safe value conversion
 */

import type { Timestamp } from './timestamp';

/** Firestore null value */
export interface NullValue {
  nullValue: null;
}

/** Firestore string value */
export interface StringValue {
  stringValue: string;
}

/** Firestore integer value (stored as string in REST API) */
export interface IntegerValue {
  integerValue: string;
}

/** Firestore double/float value */
export interface DoubleValue {
  doubleValue: number;
}

/** Firestore boolean value */
export interface BooleanValue {
  booleanValue: boolean;
}

/** Firestore timestamp value (ISO 8601 string) */
export interface TimestampValue {
  timestampValue: string;
}

/** Firestore bytes value (base64 encoded) */
export interface BytesValue {
  bytesValue: string;
}

/** Firestore geo point value */
export interface GeoPointValue {
  geoPointValue: {
    latitude: number;
    longitude: number;
  };
}

/** Firestore array value */
export interface ArrayValue {
  arrayValue: {
    values?: FirestoreValue[];
  };
}

/** Firestore map/object value */
export interface MapValue {
  mapValue: {
    fields?: Record<string, FirestoreValue>;
  };
}

/** Firestore reference value */
export interface ReferenceValue {
  referenceValue: string;
}

/**
 * Discriminated union of all Firestore value types
 * Used for type-safe serialization/deserialization
 */
export type FirestoreValue =
  | NullValue
  | StringValue
  | IntegerValue
  | DoubleValue
  | BooleanValue
  | TimestampValue
  | BytesValue
  | GeoPointValue
  | ArrayValue
  | MapValue
  | ReferenceValue;

/** Firestore document structure from REST API */
export interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

/** Firestore query response */
export interface QueryResponse {
  document?: FirestoreDocument;
  readTime?: string;
  skippedResults?: number;
}

/** Supported query operators */
export type QueryOperator =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'in'
  | 'not-in'
  | 'array-contains'
  | 'array-contains-any';

/** Where clause for queries */
export interface WhereClause {
  field: string;
  op: QueryOperator;
  value: unknown;
}

/** Order by clause for queries */
export interface OrderByClause {
  field: string;
  direction: 'asc' | 'desc';
}

/** Document snapshot with typed data */
export interface DocumentSnapshot<T> {
  /** Whether the document exists */
  exists: boolean;
  /** Document ID */
  id: string;
  /** Get the document data (undefined if doesn't exist) */
  data(): T | undefined;
}

/**
 * JavaScript types that can be stored in Firestore
 */
export type FirestoreData =
  | null
  | string
  | number
  | boolean
  | Date
  | Timestamp
  | FirestoreData[]
  | { [key: string]: FirestoreData };
