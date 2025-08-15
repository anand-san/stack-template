import type { Context } from 'hono';

// Authentication middleware
export const authenticateUser = async (c: Context, next: Function) => {
  try {
    const authHeader = c.req.header('Authorization');
    // if (!authHeader) {
    //   return c.json({ error: "No authorization token provided" }, 401);
    // }
    console.log('authHeader', authHeader);

    await next();
  } catch (error) {
    console.error('Authentication error:', error);
    return c.json({ error: 'Invalid or expired authentication token' }, 401);
  }
};
