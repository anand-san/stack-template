/**
 * Firestore REST API Error Classes
 * Provides structured error handling with typed error codes
 */

/** Error codes matching Firestore/Firebase conventions */
export type FirestoreErrorCode =
  | 'not-found'
  | 'permission-denied'
  | 'already-exists'
  | 'invalid-argument'
  | 'unauthenticated'
  | 'resource-exhausted'
  | 'aborted'
  | 'unavailable'
  | 'internal'
  | 'unknown';

/**
 * Custom error class for Firestore operations
 * @example
 * ```typescript
 * try {
 *   await getDoc('users', 'nonexistent');
 * } catch (error) {
 *   if (error instanceof FirestoreError && error.code === 'not-found') {
 *     // Handle missing document
 *   }
 * }
 * ```
 */
export class FirestoreError extends Error {
  readonly name = 'FirestoreError';

  constructor(
    /** Firestore error code */
    public readonly code: FirestoreErrorCode,
    /** Human-readable error message */
    message: string,
    /** HTTP status code if from REST API */
    public readonly status?: number,
    /** Original error if wrapped */
    public readonly cause?: unknown,
  ) {
    super(message);
    // Maintains proper stack trace in V8/Bun
    Error.captureStackTrace?.(this, FirestoreError);
  }

  /** Create from HTTP response status */
  static fromStatus(status: number, message?: string): FirestoreError {
    const code = statusToCode(status);
    return new FirestoreError(
      code,
      message ?? `Firestore request failed with status ${status}`,
      status,
    );
  }
}

/** Map HTTP status codes to Firestore error codes */
function statusToCode(status: number): FirestoreErrorCode {
  switch (status) {
    case 400:
      return 'invalid-argument';
    case 401:
      return 'unauthenticated';
    case 403:
      return 'permission-denied';
    case 404:
      return 'not-found';
    case 409:
      return 'already-exists';
    case 429:
      return 'resource-exhausted';
    case 499:
      return 'aborted';
    case 500:
      return 'internal';
    case 503:
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/**
 * Custom error class for Firebase Auth operations
 */
export class AuthError extends Error {
  readonly name = 'AuthError';

  constructor(
    /** Auth error code */
    public readonly code:
      | 'invalid-token'
      | 'expired-token'
      | 'revoked-token'
      | 'invalid-argument'
      | 'unknown',
    /** Human-readable error message */
    message: string,
    /** Original error if wrapped */
    public readonly cause?: unknown,
  ) {
    super(message);
    Error.captureStackTrace?.(this, AuthError);
  }
}
