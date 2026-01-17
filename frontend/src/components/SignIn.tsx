import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ToggleTheme';
import { LogIn, UserPlus, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth/AuthContextProvider';

export default function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={
                    mode === 'sign-in' ? 'current-password' : 'new-password'
                  }
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSubmit}
                className="w-full"
                size="lg"
                disabled={isSubmitting || !email || !password}
              >
                {mode === 'sign-in' ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>

              <Button
                onClick={() =>
                  setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
                }
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {mode === 'sign-in'
                  ? 'Need an account? Sign up'
                  : 'Have an account? Sign in'}
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
