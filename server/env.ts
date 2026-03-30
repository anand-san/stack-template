import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  // @init:sentry-start
  SENTRY_ENABLED: z.string().default('false').optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  // @init:sentry-end
  // @init:firebase-start
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  // @init:firebase-end
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

const env = envSchema.parse(process.env);

export default env;
