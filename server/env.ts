import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  SENTRY_ENABLED: z.string().default('false').optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

const env = envSchema.parse(process.env);

export default env;
