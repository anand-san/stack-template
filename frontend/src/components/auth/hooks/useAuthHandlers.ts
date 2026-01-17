import { AuthError } from 'firebase/auth';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function useAuthHandlers() {
  const navigate = useNavigate();

  const handleAuthError = useCallback((error: AuthError) => {
    if (!error.code) {
      toast.error('Error', {
        description: 'An error occurred. Please try again.',
      });
      return;
    }
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-email':
      case 'auth/invalid-credential':
        toast.error('Error', {
          description: 'Invalid email or password',
        });
        break;
      case 'auth/too-many-requests':
        toast.error('Error', {
          description: 'Too many login attempts. Please try again later.',
        });
        break;
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return;
      case 'auth/invalid-action-code':
        toast.error('Invalid authorization code', {
          description: 'Invalid authorization code. Please try again.',
        });
        break;
      case 'auth/expired-login-link':
        toast.error('Expired login link', {
          description:
            'The login link that you used is either invalid or has expired. Please request a new one.',
        });
        break;
      default:
        toast.error('Error', {
          description: 'An error occurred. Please try again.',
        });
    }
  }, []);

  const handleSuccessfulAuth = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return {
    handleSuccessfulAuth,
    handleAuthError,
  };
}
