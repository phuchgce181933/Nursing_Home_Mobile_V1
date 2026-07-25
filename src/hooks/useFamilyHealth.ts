import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { FAMILY, ACTIVITIES } from '../api/endpoints';

export const useFamilyMedications = (residentId?: string, params?: { status?: string; from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['familyMedications', residentId, params],
    queryFn: async () => {
      const res = await api.get(FAMILY.MEDICATIONS(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};

export const useFamilyPrescriptions = (residentId?: string) => {
  return useQuery({
    queryKey: ['familyPrescriptions', residentId],
    queryFn: async () => {
      const res = await api.get(FAMILY.PRESCRIPTIONS(residentId!));
      return res.data;
    },
    enabled: !!residentId,
  });
};

export const useFamilyDailyActivities = (residentId?: string, params?: { date?: string }) => {
  return useQuery({
    queryKey: ['familyDailyActivities', residentId, params],
    queryFn: async () => {
      const res = await api.get(FAMILY.DAILY_ACTIVITIES(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};

export const useFamilyCareSchedule = (residentId?: string, params?: { date?: string }) => {
  return useQuery({
    queryKey: ['familyCareSchedule', residentId, params],
    queryFn: async () => {
      const res = await api.get(FAMILY.CARE_SCHEDULE(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};

export const useFamilyActivities = (params?: { status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['familyFacilityActivities', params],
    queryFn: async () => {
      const res = await api.get(ACTIVITIES.LIST, { params });
      return res.data;
    },
  });
};

export const useFamilyResidentActivities = (residentId?: string) => {
  return useQuery({
    queryKey: ['familyResidentActivities', residentId],
    queryFn: async () => {
      const res = await api.get(FAMILY.ACTIVITIES(residentId!));
      return res.data;
    },
    enabled: !!residentId,
  });
};

export const useRegisterActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ activityId, residentId }: { activityId: string; residentId: string }) => {
      const res = await api.post(`${ACTIVITIES.DETAIL(activityId)}/register`, { residentId });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['familyFacilityActivities'] });
      qc.invalidateQueries({ queryKey: ['familyResidentActivities', variables.residentId] });
    },
  });
};

export const useUnregisterActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ activityId, residentId }: { activityId: string; residentId: string }) => {
      const res = await api.post(`${ACTIVITIES.DETAIL(activityId)}/unregister`, { residentId });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['familyFacilityActivities'] });
      qc.invalidateQueries({ queryKey: ['familyResidentActivities', variables.residentId] });
    },
  });
};
