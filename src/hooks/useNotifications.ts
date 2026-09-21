import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { NOTIFICATIONS } from '../api/endpoints';

export const useNotifications = (params?: { page?: number; limit?: number; category?: string; isRead?: boolean }) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const res = await api.get(NOTIFICATIONS.LIST, { params });
      return res.data;
    },
  });
};

export const useNotificationCategories = () => {
  return useQuery({
    queryKey: ['notificationCategories'],
    queryFn: async () => {
      const res = await api.get(NOTIFICATIONS.CATEGORIES);
      return res.data;
    },
    staleTime: Infinity,
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async () => {
      const res = await api.get(NOTIFICATIONS.SETTINGS);
      return res.data;
    },
  });
};

export const useUpdateNotificationSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { enabledCategories?: string[]; deliveryChannels?: string[]; doNotDisturb?: boolean }) => {
      const res = await api.post(NOTIFICATIONS.SETTINGS, body);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificationSettings'] }),
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(NOTIFICATIONS.READ(id));
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post(NOTIFICATIONS.MARK_READ_BULK, { ids });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(NOTIFICATIONS.DELETE(id));
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useDeleteNotificationsBulk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post(NOTIFICATIONS.DELETE_BULK, { ids });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
