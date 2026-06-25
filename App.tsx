import React from 'react';
import { LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/utils/toast';
import { OfflineBanner } from './src/utils/offline';
import { paperTheme } from './src/theme/theme';

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <OfflineBanner />
              <RootNavigator />
              <StatusBar style="light" />
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
