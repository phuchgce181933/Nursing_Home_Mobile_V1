import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { NOTIFICATIONS } from '../api/endpoints';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Set by the hook once a token is registered, so logout() can unregister the same
// device without needing its own copy of the Expo push SDK wiring.
let lastRegisteredToken: string | null = null;

export const unregisterPushToken = async () => {
  if (!lastRegisteredToken) return;
  try {
    await api.delete(NOTIFICATIONS.PUSH_TOKEN, { data: { token: lastRegisteredToken } });
  } catch (err) {
    console.warn('[usePushNotifications] unregister failed:', (err as Error)?.message);
  } finally {
    lastRegisteredToken = null;
  }
};

// Registers this device for Expo push notifications once a user is authenticated, and wires
// up foreground/tap listeners that just refresh the notifications list — this app has no
// global navigation ref yet, so a full deep-link-to-notification-detail on tap is left as a
// follow-up; today a tap simply brings the app to the foreground with fresh data available.
export const usePushNotifications = (user: unknown, token: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;

    const register = async () => {
      // Push tokens require a physical device (or a custom dev/production build — Expo Go
      // on SDK 53+ no longer supports remote push at all) — this silently no-ops otherwise.
      if (!Device.isDevice) return;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (cancelled) return;

        lastRegisteredToken = expoPushToken;
        await api.post(NOTIFICATIONS.PUSH_TOKEN, { token: expoPushToken, platform: Platform.OS });
      } catch (err) {
        console.warn('[usePushNotifications] registration failed:', (err as Error)?.message);
      }
    };

    register();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const receivedSub = Notifications.addNotificationReceivedListener(invalidate);
    const responseSub = Notifications.addNotificationResponseReceivedListener(invalidate);
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [queryClient]);
};
