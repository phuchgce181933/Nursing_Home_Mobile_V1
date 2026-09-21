import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { ACTIVITIES } from '../api/endpoints';

export const useActivities = (params?: { status?: string; search?: string; from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: async () => {
      const res = await api.get(ACTIVITIES.LIST, { params });
      return res.data;
    },
  });
};

export const useActivityDetail = (id?: string) => {
  return useQuery({
    queryKey: ['activityDetail', id],
    queryFn: async () => {
      const res = await api.get(ACTIVITIES.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useRecordActivityParticipation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const res = await api.post(ACTIVITIES.RECORD_RESULT(id), body);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['activityDetail', variables.id] });
      qc.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};
