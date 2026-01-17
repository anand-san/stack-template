import {
  AuthError,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile,
} from 'firebase/auth';
import { useCallback, useState } from 'react';
import { auth } from '@/lib/firebase';

interface UseEmailLinkAuthProps {
  onError: (error: AuthError) => void;
  onSuccess: () => void;
}

export const useEmailLinkAuth = ({
  onError,
  onSuccess,
}: UseEmailLinkAuthProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLink = useCallback(async () => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        const error = new Error('Link expired. Please request a new one.');
        (error as unknown as { code: string }).code = 'auth/expired-login-link';
        throw error;
      }

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
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        onSuccess();
      } catch (error) {
        onError(error as AuthError);
      } finally {
        setIsLoading(false);
      }
    }
  }, [onError, onSuccess]);

  return { handleEmailLink, isLoading };
};
