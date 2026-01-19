/**
 * Lightweight Sentry Module
 * Zero-dependency Sentry client using HTTP API
 */

export {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  isInitialized,
} from './client';
