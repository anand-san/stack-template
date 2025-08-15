import { useCallback, useState } from 'react';
import { auth } from '@/firebase';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile,
  AuthError,
} from 'firebase/auth';

interface UseEmailLinkAuthProps {
  onError: (error: AuthError) => void;
  onSuccess: () => void;
}

export const useEmailLinkAuth = ({ onSuccess }: UseEmailLinkAuthProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLink = useCallback(async () => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        const error = new Error('Link expired. Please request a new one.');
        (error as any).code = 'auth/expired-login-link';
        throw error;
      }

      if (email) {
        try {
          setIsLoading(true);
          const result = await signInWithEmailLink(
            auth,
            email,
            window.location.href,
          );

          // Check if this is a registration (has name parameter)
          const urlParams = new URLSearchParams(window.location.search);
          const name = urlParams.get('name');
          if (name && result.user) {
            await updateProfile(result.user, {
              displayName: decodeURIComponent(name),
            });
          }

          // Clean up localStorage
          window.localStorage.removeItem('emailForSignIn');
          window.localStorage.removeItem('nameForSignIn');
          onSuccess();
        } catch (error) {
          throw error;
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, []);

  return { handleEmailLink, isLoading };
};
