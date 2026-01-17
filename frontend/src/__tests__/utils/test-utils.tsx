import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

interface MockAuthContextValue {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const MockAuthContext = React.createContext<MockAuthContextValue | null>(null);

export function useMockAuth() {
  const ctx = React.useContext(MockAuthContext);
  if (!ctx) {
    throw new Error('useMockAuth must be used within MockAuthProvider');
  }
  return ctx;
}

interface MockAuthProviderProps {
  children: React.ReactNode;
  value?: Partial<MockAuthContextValue>;
}

export function MockAuthProvider({ children, value }: MockAuthProviderProps) {
  const defaultValue: MockAuthContextValue = {
    user: null,
    isLoading: false,
    signOut: async () => {},
    ...value,
  };

  return (
    <MockAuthContext.Provider value={defaultValue}>
      {children}
    </MockAuthContext.Provider>
  );
}

interface AllProvidersProps {
  children: React.ReactNode;
  authValue?: Partial<MockAuthContextValue>;
}

function AllProviders({ children, authValue }: AllProvidersProps) {
  return (
    <BrowserRouter>
      <MockAuthProvider value={authValue}>{children}</MockAuthProvider>
    </BrowserRouter>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<MockAuthContextValue>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) {
  const { authValue, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders authValue={authValue}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
