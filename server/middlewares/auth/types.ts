export interface AuthUser {
  uid: string;
  email: string | undefined;
  name: string | undefined;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
