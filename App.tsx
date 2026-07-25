import React from 'react';
import './src/i18n';
import { LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/utils/toast';
import { OfflineBanner } from './src/utils/offline';
import { paperTheme, paperDarkTheme } from './src/theme/theme';
import { ThemeProvider, useThemeMode } from './src/theme/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { useAuth } from './src/auth/useAuth';

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'Animated: `useNativeDriver` is not supported',
  "shared value's .value inside reanimated",
  'shadow*',
]);

if (Platform.OS === 'web') {
  const origWarn = console.warn;
  const origLog = console.log;
  const suppress = [
    'props.pointerEvents is deprecated',
    'Animated: `useNativeDriver` is not supported',
    'Download the React DevTools',
    'shadow*',
    'shadow ',
    'boxShadow',
    "shared value's .value inside reanimated",
    'aria-hidden',
  ];
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && suppress.some(s => args[0].includes(s))) return;
    origWarn.apply(console, args);
  };
  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && suppress.some(s => args[0].includes(s))) return;
    origLog.apply(console, args);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Registers this device for Expo push notifications once a user logs in — must render
// inside AuthProvider (needs useAuth) and QueryClientProvider (needs useQueryClient).
const PushNotificationsGate: React.FC = () => {
  const { user, token } = useAuth();
  usePushNotifications(user, token);
  return null;
};

const AppContent: React.FC = () => {
  const { effectiveScheme } = useThemeMode();
  return (
    <PaperProvider theme={effectiveScheme === 'dark' ? paperDarkTheme : paperTheme}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <OfflineBanner />
            <PushNotificationsGate />
            <RootNavigator />
            <StatusBar style="light" />
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
