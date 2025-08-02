'use client';

import React from 'react';
import { AuthContext, useAuthProvider } from '@/hooks/use-auth';
import { ThemeContext, useThemeProvider } from '@/hooks/use-theme';
import { ToastProvider } from '@/components/ui/toast';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const auth = useAuthProvider();
  const theme = useThemeProvider();

  return (
    <ThemeContext.Provider value={theme}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          {children}
        </AuthContext.Provider>
      </ToastProvider>
    </ThemeContext.Provider>
  );
};

export default AppProviders;