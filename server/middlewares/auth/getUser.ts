import type { Context, Next } from 'hono';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../../services/firebase';
import { AuthUser } from './types';
import { loggerService } from 'services/logger/loggerService';

interface CustomAuthVariables {
  authUserId: string;
  authToken: DecodedIdToken;
}
declare module 'hono' {
  interface ContextVariableMap extends CustomAuthVariables {}
}

export const authenticateUser = async (c: Context, next: Next) => {
  try {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Not Authenticated');
    }

    const idToken = authHeader.slice('Bearer '.length);
    const decoded = await adminAuth.verifyIdToken(idToken);

    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name as string,
    };
    c.set('user', user);

    loggerService.setUser(user.uid, user.email, user.name);

    await next();
  } catch {
    return c.json({ message: 'Not Authenticated' }, 401);
  }
};
