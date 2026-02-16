/**
 * Lightweight Sentry Client
 * Replaces @sentry/bun (~280MB) with direct HTTP API calls (~0 overhead)
 *
 * Uses Sentry's Envelope API: https://develop.sentry.dev/sdk/envelopes/
 */

interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
}

interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
}

interface ParsedDSN {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

let config: SentryConfig | null = null;
let parsedDsn: ParsedDSN | null = null;
let currentUser: SentryUser | null = null;

/**
 * Initialize the Sentry client
 *
 * @param options - Sentry configuration
 * @example
 * ```typescript
 * initSentry({
 *   dsn: 'https://key@sentry.io/123',
 *   environment: 'production',
 * });
 * ```
 */
export function initSentry(options: SentryConfig): void {
  config = options;
  parsedDsn = parseDSN(options.dsn);
}

/**
 * Parse a Sentry DSN into components
 * DSN format: {PROTOCOL}://{PUBLIC_KEY}@{HOST}/{PROJECT_ID}
 */
function parseDSN(dsn: string): ParsedDSN {
  const url = new URL(dsn);
  const [publicKey] = (url.username || '').split(':');
  const projectId = url.pathname.replace('/', '');

  return {
    protocol: url.protocol.replace(':', ''),
    publicKey,
    host: url.host,
    projectId,
  };
}

/**
 * Get the envelope endpoint URL
 */
function getEnvelopeUrl(): string {
  if (!parsedDsn) throw new Error('Sentry not initialized');
  return `${parsedDsn.protocol}://${parsedDsn.host}/api/${parsedDsn.projectId}/envelope/`;
}

/**
 * Create envelope headers
 */
function createEnvelopeHeader(): string {
  if (!parsedDsn || !config) throw new Error('Sentry not initialized');

  const header = {
    event_id: generateEventId(),
    dsn: config.dsn,
    sent_at: new Date().toISOString(),
  };
  return JSON.stringify(header);
}

/**
 * Generate a UUID v4 for event IDs
 */
function generateEventId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Send an envelope to Sentry
 */
async function sendEnvelope(
  itemHeader: object,
  payload: object,
): Promise<void> {
  if (!parsedDsn) return;

  const envelope = [
    createEnvelopeHeader(),
    JSON.stringify(itemHeader),
    JSON.stringify(payload),
  ].join('\n');

  try {
    await fetch(getEnvelopeUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    });
  } catch {
    // Silently fail - don't crash the app for logging
  }
}

/**
 * Build base event payload
 */
function buildBaseEvent(): object {
  return {
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    environment: config?.environment,
    release: config?.release,
    user: currentUser,
    contexts: {
      runtime: {
        name: 'bun',
        version: typeof Bun !== 'undefined' ? Bun.version : 'unknown',
      },
    },
  };
}

/**
 * Capture an exception and send to Sentry
 *
 * @param error - Error to capture
 * @param extras - Additional context
 */
export async function captureException(
  error: Error,
  extras?: Record<string, unknown>,
): Promise<void> {
  if (!config) return;

  const event = {
    ...buildBaseEvent(),
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack
            ? { frames: parseStackTrace(error.stack) }
            : undefined,
        },
      ],
    },
    extra: extras,
  };

  await sendEnvelope({ type: 'event' }, event);
}

/**
 * Capture a message and send to Sentry
 *
 * @param message - Message to capture
 * @param level - Severity level
 * @param extras - Additional context
 */
export async function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  extras?: Record<string, unknown>,
): Promise<void> {
  if (!config) return;

  const event = {
    ...buildBaseEvent(),
    message: { formatted: message },
    level,
    extra: extras,
  };

  await sendEnvelope({ type: 'event' }, event);
}

/**
 * Set the current user context
 */
export function setUser(user: SentryUser | null): void {
  currentUser = user;
}

/**
 * Parse a stack trace into Sentry frame format
 */
function parseStackTrace(stack: string): Array<{
  filename?: string;
  lineno?: number;
  colno?: number;
  function?: string;
}> {
  const lines = stack.split('\n').slice(1); // Skip "Error: message" line
  const frames: Array<{
    filename?: string;
    lineno?: number;
    colno?: number;
    function?: string;
  }> = [];

  for (const line of lines) {
    // Match patterns like "at functionName (file:line:col)" or "at file:line:col"
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (match) {
      frames.unshift({
        function: match[1] || '<anonymous>',
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      });
    }
  }

  return frames;
}

/**
 * Check if Sentry is initialized
 */
export function isInitialized(): boolean {
  return config !== null;
}
