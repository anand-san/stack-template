import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
});

export type Env = z.infer<typeof envSchema>;

const env = envSchema.parse(process.env);

export default env;
