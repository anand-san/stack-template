import type { Context, Next } from 'hono';
import { adminAuth } from '../../services/firebase';
import type { AuthUser } from './types';
import { loggerService } from '../../services/logger/loggerService';

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
      name: decoded.name,
    };
    c.set('user', user);

    loggerService.setUser(user.uid, user.email, user.name);

    await next();
  } catch {
    return c.json({ message: 'Not Authenticated' }, 401);
  }
};
