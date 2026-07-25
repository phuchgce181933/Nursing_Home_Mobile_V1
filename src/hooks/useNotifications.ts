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
