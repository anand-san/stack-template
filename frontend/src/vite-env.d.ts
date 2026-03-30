/// <reference types="vite/client" />

interface ImportMetaEnv {
  // @init:firebase-start
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  // @init:firebase-end
  readonly VITE_API_ENDPOINT?: string;
  // @init:sentry-start
  readonly VITE_SENTRY_ENABLED?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  // @init:sentry-end
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
