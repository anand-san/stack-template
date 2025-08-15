import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/loader';
import GoogleAuth from './GoogleAuth';
import EmailAuth from './components/EmailAuth';
import EmailSent from './components/EmailSent';
import { useEmailLinkAuth } from './handlers/useEmailLinkAuth';
import useAuthHandlers from './useAuthHandlers';
import { AuthError } from 'firebase/auth';
import { logger } from '@/utils/logger';

export default function LoginScreen() {
  const { user, loading: loadingUserData } = useAuth();
  const { handleAuthError, handleSuccessfulAuth } = useAuthHandlers();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { handleEmailLink, isLoading: emailLinkLoading } = useEmailLinkAuth({
    onError: handleAuthError,
    onSuccess: handleSuccessfulAuth,
  });

  const handleAuthCallbacks = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);

      // Handle email link authentication
      if (params.get('apiKey')) {
        await handleEmailLink();
      }
    } catch (error) {
      logger.logError(error, {
        message: 'Error handling auth callbacks',
      });

      window.history.replaceState({}, document.title, window.location.pathname);
      handleAuthError(error as AuthError);
    } finally {
      window.localStorage.removeItem('emailForSignIn');
    }
  }, [window.location.search]);

  // Handle authentication callbacks
  useEffect(() => {
    handleAuthCallbacks();
  }, []);

  if (loadingUserData || emailLinkLoading) {
    return (
      <div className="flex mt-48 justify-center items-center">
        <Loader />
      </div>
    );
  }

  if (user) {
    return <Navigate to={'/'} />;
  }

  if (emailSent) {
    return (
      <div className="h-screen flex items-center justify-center p-2 md:p-4">
        <EmailSent email={sentEmail} onBack={() => setEmailSent(false)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl p-4 py-8 md:p-6 md:py-8">
        <div className="text-center space-y-4">
          <img src={''} alt="App Logo" className="mx-auto h-36 w-36" />
          <p className="font-medium text-2xl">App Login</p>
        </div>

        <div className="flex flex-col space-y-4">
          <GoogleAuth />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-gray-500">
              Or continue using email
            </span>
          </div>
        </div>

        <EmailAuth
          onError={handleAuthError}
          onEmailSent={(email: string) => {
            setEmailSent(true);
            setSentEmail(email);
          }}
        />

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link to="#" className="hover:underline font-medium">
            Terms & Conditions
          </Link>{' '}
          and{' '}
          <Link to="#" className="hover:underline font-medium">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
