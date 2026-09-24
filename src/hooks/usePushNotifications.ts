import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { NOTIFICATIONS } from '../api/endpoints';
import { handleNotificationNavigation } from '../navigation/navigationRef';

// Remote push notifications were removed from Expo Go with SDK 53 — merely importing
// expo-notifications there triggers its internal push-token-listener registration, which
// throws immediately. So the module is required lazily and only outside Expo Go (real
// dev/production builds are unaffected); a static top-level `import` would run that
// registration before this check ever executes.
// Web (Expo Web) does not support remote push either: expo-notifications loads but methods
// such as getLastNotificationResponseAsync / getExpoPushTokenAsync throw UnavailabilityError.
// Treat web like Expo Go so every guard below short-circuits and no unsupported web call runs.
const pushUnavailable = Constants.appOwnership === 'expo' || Platform.OS === 'web';
/* eslint-disable @typescript-eslint/no-require-imports -- must stay lazy; a static import would run expo-notifications' registration in Expo Go and crash (see comment above) */
const Notifications = pushUnavailable ? null : (require('expo-notifications') as typeof import('expo-notifications'));
const Device = pushUnavailable ? null : (require('expo-device') as typeof import('expo-device'));
/* eslint-enable @typescript-eslint/no-require-imports */

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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

// Kênh thông báo Android. Nhắc thuốc là kênh riêng, importance HIGH để hiển thị heads-up ngay cả
// khi máy đang khóa/nền (PART 4/12/14). Nội dung nhắc thuốc đã được server làm sạch (không tên
// thuốc/liều) nên an toàn hiển thị trên màn hình khóa.
const ensureAndroidChannels = async () => {
  if (Platform.OS !== 'android' || !Notifications) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Thông báo chung',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('medication', {
    name: 'Nhắc phát thuốc',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

// Đăng ký token đẩy lên backend (upsert theo token; backend tự gỡ token cũ của tài khoản khác).
const sendTokenToBackend = async (token: string) => {
  lastRegisteredToken = token;
  await api.post(NOTIFICATIONS.PUSH_TOKEN, { token, platform: Platform.OS });
};

// Registers this device for Expo push notifications once a user is authenticated, wires up
// foreground/tap listeners (tap → điều hướng theo allowlist), and re-registers whenever Expo
// rotates the token (PART 18). role dùng để quyết định màn hình đích khi chạm vào push.
export const usePushNotifications = (user: unknown, token: string | null, role?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !token || !Notifications || !Device) return;
    let cancelled = false;

    const register = async () => {
      // Push tokens require a physical device (or a custom dev/production build — Expo Go
      // on SDK 53+ no longer supports remote push at all) — this silently no-ops otherwise.
      if (!Device!.isDevice) return;
      try {
        // Android 13+ (API 33): POST_NOTIFICATIONS phải xin runtime. Nếu bị từ chối thì app vẫn
        // chạy bình thường, chỉ không có push (PART 16) — không hỏi lại dồn dập.
        const { status: existingStatus } = await Notifications!.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications!.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        await ensureAndroidChannels();

        // projectId đến từ app.json extra.eas.projectId. Trên bản standalone, thiếu projectId +
        // google-services.json thì getExpoPushTokenAsync sẽ throw — được bắt ở catch bên dưới,
        // app không crash và tiếp tục dùng thông báo in-app.
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as any)?.easConfig?.projectId;
        const { data: expoPushToken } = await Notifications!.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (cancelled) return;

        await sendTokenToBackend(expoPushToken);
      } catch (err) {
        console.warn('[usePushNotifications] registration failed:', (err as Error)?.message);
      }
    };

    register();
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  // PART 18: Expo có thể xoay token (cập nhật app/khôi phục/cài lại). Lắng nghe và đẩy token mới
  // lên backend để không mất kết nối push sau các sự kiện đó.
  useEffect(() => {
    if (!user || !token || !Notifications) return;
    const sub = Notifications.addPushTokenListener((t) => {
      if (t?.data) sendTokenToBackend(t.data).catch(() => {});
    });
    return () => sub.remove();
  }, [user, token]);

  // Foreground refresh + điều hướng khi chạm vào push (kể cả khi mở app từ trạng thái đã tắt).
  useEffect(() => {
    if (!Notifications) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

    const receivedSub = Notifications.addNotificationReceivedListener(invalidate);
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      invalidate();
      const data = response?.notification?.request?.content?.data as
        | { targetEntityType?: unknown }
        | undefined;
      handleNotificationNavigation(role, data);
    });

    // App mở từ trạng thái terminated do người dùng chạm vào push (PART 13/15): sự kiện tap đã
    // xảy ra trước khi listener kịp gắn, nên phải đọc lại phản hồi cuối cùng.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data as
        | { targetEntityType?: unknown }
        | undefined;
      if (data) handleNotificationNavigation(role, data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [queryClient, role]);
};
