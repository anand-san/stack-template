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
  onEmailRequired: () => void;
}

export const useEmailLinkAuth = ({
  onError,
  onSuccess,
  onEmailRequired,
}: UseEmailLinkAuthProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmailLink, setPendingEmailLink] = useState<string | null>(null);

  const completeSignIn = useCallback(
    async (email: string, link: string) => {
      try {
        setIsLoading(true);
        const result = await signInWithEmailLink(auth, email, link);

        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('name');
        if (name && result.user) {
          await updateProfile(result.user, {
            displayName: decodeURIComponent(name),
          });
        }

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
        setPendingEmailLink(null);
      }
    },
    [onError, onSuccess],
  );

  const handleEmailLink = useCallback(async () => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        setPendingEmailLink(window.location.href);
        onEmailRequired();
        return;
      }
      await completeSignIn(email, window.location.href);
    }
  }, [completeSignIn, onEmailRequired]);

  const submitEmailForLink = useCallback(
    async (email: string) => {
      if (pendingEmailLink) {
        await completeSignIn(email, pendingEmailLink);
      }
    },
    [completeSignIn, pendingEmailLink],
  );

  return {
    handleEmailLink,
    submitEmailForLink,
    isLoading,
    needsEmailConfirmation: pendingEmailLink !== null,
  };
};
