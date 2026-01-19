/**
 * Firestore Timestamp Implementation
 * Lightweight replacement for firebase-admin/firestore Timestamp
 */

/**
 * Represents a Firestore Timestamp with seconds and nanoseconds precision.
 * Compatible with Firebase Admin SDK Timestamp interface.
 *
 * @example
 * ```typescript
 * // Create from current time
 * const now = Timestamp.now();
 *
 * // Create from Date
 * const ts = Timestamp.fromDate(new Date('2024-01-01'));
 *
 * // Convert back to Date
 * const date = ts.toDate();
 * ```
 */
export class Timestamp {
  /**
   * Creates a new Timestamp
   * @param seconds - Seconds since Unix epoch
   * @param nanoseconds - Nanoseconds within the second (0-999999999)
   */
  constructor(
    public readonly seconds: number,
    public readonly nanoseconds: number,
  ) {
    // Validate nanoseconds range
    if (nanoseconds < 0 || nanoseconds >= 1_000_000_000) {
      throw new RangeError('nanoseconds must be between 0 and 999999999');
    }
  }

  /**
   * Creates a Timestamp for the current time
   * @returns New Timestamp representing now
   */
  static now(): Timestamp {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1_000_000);
  }

  /**
   * Creates a Timestamp from a JavaScript Date
   * @param date - Date to convert
   * @returns New Timestamp
   */
  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
  }

  /**
   * Creates a Timestamp from seconds and nanoseconds
   * @param seconds - Seconds since Unix epoch
   * @param nanoseconds - Nanoseconds (default: 0)
   * @returns New Timestamp
   */
  static fromMillis(milliseconds: number): Timestamp {
    return new Timestamp(
      Math.floor(milliseconds / 1000),
      (milliseconds % 1000) * 1_000_000,
    );
  }

  /**
   * Converts to JavaScript Date
   * @returns Date object (note: loses nanosecond precision)
   */
  toDate(): Date {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1_000_000);
  }

  /**
   * Converts to milliseconds since Unix epoch
   * @returns Milliseconds (note: loses nanosecond precision beyond ms)
   */
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }

  /**
   * Converts to ISO 8601 string (for REST API)
   * @returns ISO string representation
   */
  toISOString(): string {
    return this.toDate().toISOString();
  }

  /**
   * JSON serialization format
   */
  toJSON(): { seconds: number; nanoseconds: number } {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }

  /**
   * Compares this Timestamp to another
   * @param other - Timestamp to compare
   * @returns -1, 0, or 1
   */
  compareTo(other: Timestamp): -1 | 0 | 1 {
    if (this.seconds < other.seconds) return -1;
    if (this.seconds > other.seconds) return 1;
    if (this.nanoseconds < other.nanoseconds) return -1;
    if (this.nanoseconds > other.nanoseconds) return 1;
    return 0;
  }

  /**
   * Checks equality with another Timestamp
   * @param other - Timestamp to compare
   * @returns true if equal
   */
  isEqual(other: Timestamp): boolean {
    return this.compareTo(other) === 0;
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `Timestamp(seconds=${this.seconds}, nanoseconds=${this.nanoseconds})`;
  }
}
