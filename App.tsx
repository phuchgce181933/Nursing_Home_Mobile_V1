import React from 'react';
import './src/i18n';
import { LogBox, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
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

// Retry chỉ có ý nghĩa với lỗi TẠM THỜI (mất mạng, 5xx, 408 timeout, 429 quá tải). Một
// lỗi 4xx xác định (400/401/403/404/422) là câu trả lời cuối cùng của server: thử lại
// không bao giờ đổi kết quả, chỉ nhân số request lên gấp 3 và biến một lỗi đơn lẻ thành
// một chuỗi lỗi lặp trong console/logcat (rõ nhất ở query có refetchInterval).
// KHÔNG tắt retry toàn cục: 5xx/timeout/mất mạng vẫn được thử lại 2 lần đúng như trước.
const RETRYABLE_4XX = [408, 429];
const retryUnlessClientError = (failureCount: number, error: unknown) => {
  const status = (error as AxiosError)?.response?.status;
  if (typeof status === 'number' && status >= 400 && status < 500 && !RETRYABLE_4XX.includes(status)) {
    return false;
  }
  return failureCount < 2;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryUnlessClientError,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Registers this device for Expo push notifications once a user logs in — must render
// inside AuthProvider (needs useAuth) and QueryClientProvider (needs useQueryClient).
const PushNotificationsGate: React.FC = () => {
  const { user, token } = useAuth();
  // `role` là tham số BẮT BUỘC trên thực tế: handleNotificationNavigation() thoát sớm khi
  // thiếu role (`if (!navigationRef.isReady() || !role) return;`), nên nếu không truyền thì
  // chạm vào push sẽ không điều hướng đi đâu cả. Role lấy từ phiên đăng nhập (server-side
  // trust), không lấy từ payload push.
  usePushNotifications(user, token, user?.role);
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
            {/* Every screen's top bar uses a solid role-accent color (see ROLE_COLORS in theme/theme.ts) in both
                schemes, so white status bar content stays legible regardless of light/dark mode. */}
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
