import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { STAFF } from '../api/endpoints';

export const useStaffList = (params?: { role?: string; isActive?: boolean; search?: string; assignmentDate?: string; page?: number }) => {
  return useQuery({
    queryKey: ['staffList', params],
    queryFn: async () => {
      const res = await api.get(STAFF.LIST, { params });
      return res.data;
    },
  });
};

export const useStaffDetail = (id?: string) => {
  return useQuery({
    queryKey: ['staffDetail', id],
    queryFn: async () => {
      const res = await api.get(STAFF.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useStaffAvailability = (params?: { role?: string; date?: string; floorId?: string }) => {
  return useQuery({
    queryKey: ['staffAvailability', params],
    queryFn: async () => {
      const res = await api.get(STAFF.AVAILABILITY, { params });
      return res.data;
    },
  });
};
