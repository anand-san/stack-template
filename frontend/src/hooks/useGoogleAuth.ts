import { AuthError, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase';

interface UseGoogleAuthProps {
  onError: (error: AuthError) => void;
  onSuccess: () => void;
}

export const useGoogleAuth = ({ onError, onSuccess }: UseGoogleAuthProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (error) {
      onError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleGoogleSignIn, isLoading };
};
