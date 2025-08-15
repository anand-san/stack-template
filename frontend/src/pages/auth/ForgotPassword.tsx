import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Navigate } from 'react-router-dom';
import { auth } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader } from '@/components/loader';

interface IFormInput {
  email: string;
}

export default function ForgotPasswordScreen() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormInput>();

  const { user, loading: loadingUserData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handlePasswordReset: SubmitHandler<IFormInput> = async data => {
    setIsLoading(true);
    const { email } = data;

    try {
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
    } catch {
      toast.error('Uh oh! Something went wrong.', {
        description: 'Could not send password reset email',
      });
      //   handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingUserData) {
    return (
      <div className="h-screen flex">
        <Loader />
      </div>
    );
  }

  if (user) {
    return <Navigate to={'/'} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl p-4 py-8 md:p-6 md:py-8 md:shadow-lg dark:md:border">
        <div className="text-center">
          <img
            src="/logo_with_background.png?height=48&width=48"
            alt="App Logo"
            className="mx-auto h-24 w-24"
          />
          <h2 className="mt-2 text-2xl font-bold">Reset Password</h2>
        </div>

        {emailSent ? (
          <div className="text-center flex flex-col space-y-6 items-center text-sm">
            <CheckCircle className="text-green-400 h-12 w-12" />
            <p>
              We have sent you an email to reset your password. Follow the link
              in the email to set a new password.
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit(handlePasswordReset)}
          >
            <div>
              <Label htmlFor="email" className="sr-only">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address',
                  },
                })}
                className={cn(
                  'mr-2.5 mb-2 h-full min-h-[44px] w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium placeholder:text-zinc-400 focus:outline-0 dark:border-zinc-800  dark:placeholder:text-zinc-500',
                )}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              variant={'outline'}
              type="submit"
              className="mt-2 h-[unset] px-4 py-4 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Request Password Reset'
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Go back to{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>

        {/* <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p> */}
      </div>
    </div>
  );
}
