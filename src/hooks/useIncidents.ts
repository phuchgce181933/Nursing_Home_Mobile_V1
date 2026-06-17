import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { INCIDENTS } from '../api/endpoints';

export const useIncidents = (params?: { status?: string; severity?: string; page?: number }) => {
  return useQuery({
    queryKey: ['incidents', params],
    queryFn: async () => {
      const res = await api.get(INCIDENTS.LIST, { params });
      return res.data;
    },
  });
};

export const useCreateIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(INCIDENTS.CREATE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};

export const useUpdateIncidentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(INCIDENTS.UPDATE_STATUS(id), { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};
