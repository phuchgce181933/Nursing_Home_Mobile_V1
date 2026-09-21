import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { MEDICATIONS } from '../api/endpoints';

export const useDailyMedSchedule = (params?: { date?: string; residentId?: string; status?: string }, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['dailyMedSchedule', params],
    queryFn: async () => {
      const res = await api.get(MEDICATIONS.DAILY_SCHEDULE, { params });
      return res.data;
    },
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
};

export const useMedSchedules = (params?: { residentId?: string; date?: string; status?: string }) => {
  return useQuery({
    queryKey: ['medSchedules', params],
    queryFn: async () => {
      const res = await api.get(MEDICATIONS.SCHEDULE, { params });
      return res.data;
    },
    enabled: !!params?.residentId,
  });
};

export const useMarkTaken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actualTimeTaken, notes }: { id: string; actualTimeTaken?: string; notes?: string }) => {
      const res = await api.patch(MEDICATIONS.MARK_TAKEN(id), { actualTimeTaken, notes });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dailyMedSchedule'] });
      qc.invalidateQueries({ queryKey: ['medSchedules'] });
    },
  });
};

export const useMarkMissed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, notes }: { id: string; reason: string; notes?: string }) => {
      const res = await api.patch(MEDICATIONS.MARK_MISSED(id), { reason, notes });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dailyMedSchedule'] });
      qc.invalidateQueries({ queryKey: ['medSchedules'] });
    },
  });
};

export const useMedHistory = (params?: { residentId?: string; from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['medHistory', params],
    queryFn: async () => {
      const res = await api.get(MEDICATIONS.HISTORY, { params });
      return res.data;
    },
    enabled: !!params?.residentId,
  });
};
