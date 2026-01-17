import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/pages/Layout';
import Home from '@/pages/Home';
import {
  setMockUser,
  resetAuthMocks,
  createMockUser,
} from '../mocks/firebase-auth';
import { AuthProvider } from '@/context/auth/AuthContextProvider';

// Mock the hello API to prevent issues
vi.mock('@/api/hello', () => ({
  sendHello: vi.fn(),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout - Auth-based Routing', () => {
  beforeEach(() => {
    resetAuthMocks();
  });

  it('should display SignIn page when user is not logged in', async () => {
    setMockUser(null);

    renderLayout();

    // SignIn page has "Welcome" heading and sign-in options
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to your account to continue'),
    ).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('should display Home content when user is logged in', async () => {
    const mockUser = createMockUser({
      displayName: 'John Doe',
      email: 'john@example.com',
    });
    setMockUser(mockUser);

    renderLayout();

    // Home page shows user greeting and ping button
    expect(await screen.findByText(/Hello John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/This is a protected Route/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ping Server/i }),
    ).toBeInTheDocument();
  });

  it('should show logout button when user is logged in', async () => {
    setMockUser(createMockUser({ displayName: 'Test User' }));

    renderLayout();

    // Wait for Home content to render
    await screen.findByText(/Hello Test User/);

    // Logout button has LogOutIcon - find by role
    const buttons = screen.getAllByRole('button');
    const logoutButton = buttons.find(btn =>
      btn.querySelector('.lucide-log-out'),
    );
    expect(logoutButton).toBeInTheDocument();
  });
});
