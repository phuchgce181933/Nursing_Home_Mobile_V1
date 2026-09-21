import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CAREGIVER } from '../api/endpoints';

export const useCaregiverRehabResidents = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['caregiverRehabResidents'],
    queryFn: async () => {
      const res = await api.get(`${CAREGIVER.REHAB_SCHEDULES}/residents`);
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCaregiverRehabOverview = (params: { workDate: string; residentId?: string; search?: string }) => {
  return useQuery({
    queryKey: ['caregiverRehabOverview', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.REHAB_SCHEDULES, { params });
      return res.data;
    },
    enabled: !!params.workDate,
  });
};

export const useCaregiverRehabDetail = (residentId?: string, params?: { workDate: string }) => {
  return useQuery({
    queryKey: ['caregiverRehabDetail', residentId, params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.REHAB_DETAIL(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId && !!params?.workDate,
  });
};
