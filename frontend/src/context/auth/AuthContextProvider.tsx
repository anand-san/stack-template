import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!PUBLISHABLE_KEY) {
    throw new Error('Add your Clerk Auth Publishable Key to the .env file');
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>{children}</ClerkProvider>
  );
}
