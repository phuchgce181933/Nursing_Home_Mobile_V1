import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CAREGIVER } from '../api/endpoints';

export const useCaregiverDietPlanResidents = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['caregiverDietPlanResidents'],
    queryFn: async () => {
      const res = await api.get(`${CAREGIVER.DIET_PLANS}/residents`);
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCaregiverDietPlanOverview = (params: { workDate: string; residentId?: string; search?: string }) => {
  return useQuery({
    queryKey: ['caregiverDietPlanOverview', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.DIET_PLANS, { params });
      return res.data;
    },
    enabled: !!params.workDate,
  });
};

export const useCaregiverDietPlanDetail = (residentId?: string, params?: { workDate: string }) => {
  return useQuery({
    queryKey: ['caregiverDietPlanDetail', residentId, params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.DIET_PLAN_DETAIL(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId && !!params?.workDate,
  });
};
