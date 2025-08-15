import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/firebase';
import { sendSignInLinkToEmail, AuthError } from 'firebase/auth';

interface IFormInput {
  email: string;
}

interface EmailAuthProps {
  onError: (error: AuthError) => void;
  onEmailSent: (email: string) => void;
}

export default function EmailAuth({ onError, onEmailSent }: EmailAuthProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormInput>();
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn: SubmitHandler<IFormInput> = async data => {
    setIsLoading(true);
    const { email } = data;

    const actionCodeSettings = {
      url: window.location.origin + '/login',
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      onEmailSent(email);
    } catch (error) {
      onError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(handleEmailSignIn)}>
      <div>
        <Label htmlFor="email" className="sr-only">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Email address"
          autoComplete="email"
          autoFocus
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^\S+@\S+$/i,
              message: 'Invalid email address',
            },
          })}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <Button
        variant="secondary"
        type="submit"
        className="p-5 w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          'Send Sign In Link'
        )}
      </Button>
    </form>
  );
}
