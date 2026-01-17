import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '@/pages/Home';
import {
  setMockUser,
  resetAuthMocks,
  createMockUser,
} from '../mocks/firebase-auth';
import { AuthProvider } from '@/context/auth/AuthContextProvider';

// Mock the hello API
vi.mock('@/api/hello', () => ({
  sendHello: vi.fn(),
}));

// Import the mocked function
import { sendHello } from '@/api/hello';
const mockSendHello = vi.mocked(sendHello);

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Home Page - Ping Server', () => {
  beforeEach(() => {
    resetAuthMocks();
    setMockUser(createMockUser({ displayName: 'Test User' }));
    vi.clearAllMocks();
  });

  it('should display ping server button', async () => {
    renderHome();

    expect(
      await screen.findByRole('button', { name: /Ping Server/i }),
    ).toBeInTheDocument();
  });

  it('should call API and display response when ping server is clicked', async () => {
    const user = userEvent.setup();
    mockSendHello.mockResolvedValueOnce('Hello from the server!');

    renderHome();

    const pingButton = await screen.findByRole('button', {
      name: /Ping Server/i,
    });
    await user.click(pingButton);

    // Verify API was called
    expect(mockSendHello).toHaveBeenCalledTimes(1);

    // Verify response is displayed
    await waitFor(() => {
      expect(screen.getByText('Hello from the server!')).toBeInTheDocument();
    });
  });

  it('should show loading state while API call is in progress', async () => {
    const user = userEvent.setup();

    // Create a promise that we can control
    let resolvePromise: (value: string) => void;
    const pendingPromise = new Promise<string>(resolve => {
      resolvePromise = resolve;
    });
    mockSendHello.mockReturnValueOnce(pendingPromise);

    renderHome();

    const pingButton = await screen.findByRole('button', {
      name: /Ping Server/i,
    });
    await user.click(pingButton);

    // Button should be disabled during loading
    expect(pingButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!('Done!');

    await waitFor(() => {
      expect(pingButton).not.toBeDisabled();
    });
  });

  it('should display error message when API call fails', async () => {
    const user = userEvent.setup();
    mockSendHello.mockRejectedValueOnce(new Error('Network error'));

    renderHome();

    const pingButton = await screen.findByRole('button', {
      name: /Ping Server/i,
    });
    await user.click(pingButton);

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should clear previous response when ping is clicked again', async () => {
    const user = userEvent.setup();
    mockSendHello
      .mockResolvedValueOnce('First response')
      .mockResolvedValueOnce('Second response');

    renderHome();

    const pingButton = await screen.findByRole('button', {
      name: /Ping Server/i,
    });

    // First click
    await user.click(pingButton);
    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    // Second click
    await user.click(pingButton);
    await waitFor(() => {
      expect(screen.queryByText('First response')).not.toBeInTheDocument();
      expect(screen.getByText('Second response')).toBeInTheDocument();
    });
  });
});
