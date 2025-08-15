import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Navigate } from 'react-router-dom';
import { auth } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { AuthError, signInWithEmailAndPassword } from 'firebase/auth';
import { Loader } from '@/components/loader';
import { cn } from '@/lib/utils';
import GoogleAuth from './GoogleAuth';
import useAuthHandlers from './useAuthHandlers';

interface IFormInput {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormInput>();

  const { user, loading: loadingUserData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { handleAuthError, handleSuccessfulAuth } = useAuthHandlers();

  const handleEmailPasswordLogin: SubmitHandler<IFormInput> = async data => {
    setIsLoading(true);
    const { email, password } = data;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleSuccessfulAuth();
      setIsLoading(false);
    } catch (error) {
      handleAuthError(error as AuthError);
      setIsLoading(false);
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
          <h2 className="mt-2 text-2xl font-bold">Login</h2>
        </div>

        <GoogleAuth />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-background text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(handleEmailPasswordLogin)}
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
          <div>
            <Label htmlFor="password" className="sr-only">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
                className={cn(
                  'mr-2.5 mb-2 h-full min-h-[44px] w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium placeholder:text-zinc-400 focus:outline-0 dark:border-zinc-800  dark:placeholder:text-zinc-500',
                )}
              />
              <Button
                variant={'link'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              {/* <Checkbox id="remember-me" />
              <Label htmlFor="remember-me" className="ml-2 text-gray-600">
                Remember me
              </Label> */}
            </div>
            <Link
              to="/forgot-password"
              className="text-primary hover:underline"
            >
              Forgot password?
            </Link>
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
              'Sign in'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
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
