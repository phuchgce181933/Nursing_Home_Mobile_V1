import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { LEAVE_REQUESTS } from '../api/endpoints';

export const useLeaveRequests = (params?: { status?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['leaveRequests', params],
    queryFn: async () => {
      const res = await api.get(LEAVE_REQUESTS.LIST, { params });
      return res.data;
    },
  });
};

export const useCreateLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { leaveType: string; startDate: string; endDate: string; reason: string }) => {
      const res = await api.post(LEAVE_REQUESTS.CREATE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaveRequests'] });
    },
  });
};

export const useCancelLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(LEAVE_REQUESTS.CANCEL(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaveRequests'] });
    },
  });
};
