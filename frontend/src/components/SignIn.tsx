import { useState } from 'react';
import { RedirectToSignIn, RedirectToSignUp } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ToggleTheme';
import { LogIn, UserPlus, Shield } from 'lucide-react';

export default function SignIn() {
  const [showRedirect, setShowRedirect] = useState(false);
  const [redirectMode, setRedirectMode] = useState<'sign-in' | 'sign-up'>(
    'sign-in',
  );

  const handleSignIn = () => {
    setRedirectMode('sign-in');
    setShowRedirect(true);
  };

  const handleSignUp = () => {
    setRedirectMode('sign-up');
    setShowRedirect(true);
  };

  if (showRedirect) {
    return redirectMode === 'sign-in' ? (
      <RedirectToSignIn />
    ) : (
      <RedirectToSignUp />
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
                Authentication Required
              </h1>
              <p className="text-muted-foreground">
                You need to be signed in to access this application. Please sign
                in to your account or create a new one to continue.
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={handleSignIn} className="w-full" size="lg">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>

              <Button
                onClick={handleSignUp}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </div>

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
