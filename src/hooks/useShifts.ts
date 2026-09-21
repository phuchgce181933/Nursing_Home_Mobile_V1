import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { SHIFTS } from '../api/endpoints';

export const useShifts = (params?: { status?: string; fromDate?: string; toDate?: string; assignedStaffId?: string; page?: number }) => {
  return useQuery({
    queryKey: ['shifts', params],
    queryFn: async () => {
      const res = await api.get(SHIFTS.LIST, { params });
      return res.data;
    },
  });
};

export const useMyShifts = (params?: { status?: string; fromDate?: string; toDate?: string; page?: number }, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['myShifts', params],
    queryFn: async () => {
      const res = await api.get(SHIFTS.MY, { params });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useShiftDetail = (id?: string) => {
  return useQuery({
    queryKey: ['shift', id],
    queryFn: async () => {
      const res = await api.get(SHIFTS.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useConfirmShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(SHIFTS.CONFIRM(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myShifts'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useCheckInShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(SHIFTS.CHECK_IN(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myShifts'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useCheckOutShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(SHIFTS.CHECK_OUT(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myShifts'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useCompleteShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(SHIFTS.COMPLETE(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myShifts'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useCreateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(SHIFTS.CREATE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const usePublishShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(SHIFTS.PUBLISH(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};
