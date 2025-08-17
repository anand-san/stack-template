import { getAuth } from '@hono/clerk-auth';
import type { Context } from 'hono';

interface CustomAuthVariables {
  authUserId: string;
}
declare module 'hono' {
  interface ContextVariableMap extends CustomAuthVariables {}
}

export const authenticateUser = async (c: Context, next: Function) => {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      throw new Error('Not Authenticated');
    }

    c.set('authUserId', auth.userId);

    await next();
  } catch (error) {
    return c.json({ message: 'Not Authenticated' }, 401);
  }
};
