import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { PRESCRIPTIONS } from '../api/endpoints';

export const usePrescriptions = (params?: { status?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['prescriptions', params],
    queryFn: async () => {
      const res = await api.get(PRESCRIPTIONS.LIST, { params });
      return res.data;
    },
  });
};
