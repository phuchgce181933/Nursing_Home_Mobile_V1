import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CARE_TASKS, CAREGIVER } from '../api/endpoints';

export const useManagerTasks = (params?: { workDate?: string; status?: string; staffProfileId?: string; page?: number }) => {
  return useQuery({
    queryKey: ['managerTasks', params],
    queryFn: async () => {
      const res = await api.get(CARE_TASKS.LIST, { params });
      return res.data;
    },
  });
};

export const useCaregiverTasks = (params?: { workDate?: string; status?: string; taskType?: string }) => {
  return useQuery({
    queryKey: ['caregiverTasks', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.CARE_TASKS, { params });
      return res.data;
    },
  });
};

export const useUpdateTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes, isCaregiver }: { id: string; status: string; notes?: string; isCaregiver?: boolean }) => {
      const url = isCaregiver ? CAREGIVER.CARE_TASK_STATUS(id) : CARE_TASKS.UPDATE_STATUS(id);
      const res = await api.put(url, { status, notes });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caregiverTasks'] });
      qc.invalidateQueries({ queryKey: ['managerTasks'] });
    },
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(CARE_TASKS.CREATE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managerTasks'] });
    },
  });
};

export const useTasksByShift = (shiftId?: string) => {
  return useQuery({
    queryKey: ['tasksByShift', shiftId],
    queryFn: async () => {
      const res = await api.get(CARE_TASKS.BY_SHIFT(shiftId!));
      return res.data;
    },
    enabled: !!shiftId,
  });
};
