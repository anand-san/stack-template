import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/auth/AuthContextProvider.tsx';
import { ThemeProvider } from './context/theme/ThemeProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="paiper-ui-theme">
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
