'use client';

import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import GoogleAuth from './GoogleAuth';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/loader';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface IFormInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupScreen() {
  const { user, loading: loadingUserData } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
  } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = async data => {
    const { email, password, name } = data;
    try {
      setIsLoading(true);

      const user = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user.user, {
        displayName: name,
      });
      navigate('/dashboard');
    } catch {
      toast.error('Uh oh! Something went wrong.', {
        description: `Error signing up. Please try again`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const password = watch('password');

  const nextStep = async () => {
    const isValid = await trigger(['name', 'email']);
    if (isValid) setStep(2);
  };

  const prevStep = () => setStep(1);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && step === 1) {
      event.preventDefault();
      nextStep();
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
          <h2 className="mt-2 text-2xl font-bold">Create a new account</h2>
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
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={handleKeyDown}
        >
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="name" className="sr-only">
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Name"
                  autoComplete="name"
                  {...register('name', {
                    required: 'Enter your name',
                  })}
                  className={cn(
                    'mr-2.5 mb-2 h-full min-h-[44px] w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium placeholder:text-zinc-400 focus:outline-0 dark:border-zinc-800  dark:placeholder:text-zinc-500',
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>
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
                type="button"
                className="mt-2 h-[unset] px-4 py-4 w-full"
                onClick={nextStep}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="new-password"
                    required
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                      pattern: {
                        value:
                          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                        message:
                          'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
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
              <div>
                <Label htmlFor="confirmPassword" className="sr-only">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  required
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value =>
                      value === password || 'The passwords do not match',
                  })}
                  className={cn(
                    'mr-2.5 mb-2 h-full min-h-[44px] w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium placeholder:text-zinc-400 focus:outline-0 dark:border-zinc-800  dark:placeholder:text-zinc-500',
                  )}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-[unset] px-4 py-4 w-1/2"
                  onClick={prevStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="submit"
                  className="mt-2 h-[unset] px-4 py-4 w-1/2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Sign up'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>

        {/* <p className="text-center text-xs text-gray-500">
          By signing up, you agree to our{" "}
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
