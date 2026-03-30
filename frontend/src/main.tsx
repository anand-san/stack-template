import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
// @init:firebase-start
import { AuthProvider } from './context/auth/AuthContextProvider.tsx';
// @init:firebase-end
import { ThemeProvider } from './context/theme/ThemeProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* @init:firebase-start */}
    <AuthProvider>
      {/* @init:firebase-end */}
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <App />
      </ThemeProvider>
      {/* @init:firebase-start */}
    </AuthProvider>
    {/* @init:firebase-end */}
  </StrictMode>,
);
