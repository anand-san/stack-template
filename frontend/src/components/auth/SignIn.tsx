import { useCallback, useEffect, useState } from 'react';
import { AuthError } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ToggleTheme';
import { Mail, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth/AuthContextProvider';
import useAuthHandlers from '@/components/auth/hooks/useAuthHandlers';
import { useEmailLinkAuth } from '@/components/auth/hooks/useEmailLinkAuth';
import { useGoogleAuth } from '@/components/auth/hooks/useGoogleAuth';
import { useSendEmailLink } from '@/components/auth/hooks/useSendEmailLink';
import { isValidEmail } from '@/utils/isValidEmail';

export default function SignIn() {
  const { isLoading: authLoading } = useAuth();
  const { handleAuthError, handleSuccessfulAuth } = useAuthHandlers();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmailAddress, setSentEmailAddress] = useState('');
  const [email, setEmail] = useState('');
  const [needsEmailInput, setNeedsEmailInput] = useState(false);

  const {
    handleEmailLink,
    submitEmailForLink,
    isLoading: emailLinkLoading,
    needsEmailConfirmation,
  } = useEmailLinkAuth({
    onError: handleAuthError,
    onSuccess: handleSuccessfulAuth,
    onEmailRequired: () => setNeedsEmailInput(true),
  });

  const { handleGoogleSignIn, isLoading: googleLoading } = useGoogleAuth({
    onError: handleAuthError,
    onSuccess: handleSuccessfulAuth,
  });

  const { sendEmailLink, isLoading: sendingEmail } = useSendEmailLink({
    onError: handleAuthError,
    onEmailSent: (email: string) => {
      setEmailSent(true);
      setSentEmailAddress(email);
    },
  });

  const handleAuthCallbacks = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('apiKey')) {
        await handleEmailLink();
      }
    } catch (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAuthError(error as AuthError);
    }
  }, [handleEmailLink, handleAuthError]);

  useEffect(() => {
    handleAuthCallbacks();
  }, [handleAuthCallbacks]);

  const handleSubmitEmail = () => {
    if (email && isValidEmail(email)) {
      if (needsEmailConfirmation) {
        submitEmailForLink(email);
      } else {
        sendEmailLink(email);
      }
    }
  };

  if (authLoading || emailLinkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-lg border shadow-lg p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">
                  Check your email
                </h1>
                <p className="text-muted-foreground">
                  We've sent a sign-in link to{' '}
                  <span className="font-medium text-foreground">
                    {sentEmailAddress}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to sign in. You can close this
                  tab.
                </p>
              </div>

              <Button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                variant="ghost"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Use a different email
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg border shadow-lg p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-3 rounded-full">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {needsEmailInput ? 'Confirm your email' : 'Welcome'}
              </h1>
              <p className="text-muted-foreground">
                {needsEmailInput
                  ? 'Enter the email address you used to request the sign-in link'
                  : 'Sign in to your account to continue'}
              </p>
            </div>

            {!needsEmailInput && (
              <>
                <div className="space-y-4">
                  <Button
                    onClick={handleGoogleSignIn}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={googleLoading || sendingEmail}
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <GoogleIcon className="w-5 h-5 mr-2" />
                    )}
                    Continue with Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  onKeyDown={e => e.key === 'Enter' && handleSubmitEmail()}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmitEmail}
              className="w-full"
              size="lg"
              disabled={
                sendingEmail ||
                !email ||
                !isValidEmail(email) ||
                googleLoading ||
                emailLinkLoading
              }
            >
              {sendingEmail || emailLinkLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {needsEmailInput ? 'Confirm & Sign In' : 'Send Sign-In Link'}
            </Button>

            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our terms of service and privacy
              policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}
