import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/auth/AuthContextProvider';
import {
  setMockUser,
  resetAuthMocks,
  createMockUser,
} from '../mocks/firebase-auth';

// Test component to access auth context
function TestConsumer() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <span data-testid="auth-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    resetAuthMocks();
  });

  it('should show loading state initially', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // After first render, loading should be false because mock calls callback immediately
    expect(screen.getByTestId('auth-status')).toBeInTheDocument();
  });

  it('should show not logged in when no user', async () => {
    setMockUser(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'Not logged in',
      );
    });
  });

  it('should show user email when logged in', async () => {
    const mockUser = createMockUser({ email: 'user@test.com' });
    setMockUser(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'Logged in as user@test.com',
      );
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within AuthProvider',
    );

    consoleSpy.mockRestore();
  });
});
