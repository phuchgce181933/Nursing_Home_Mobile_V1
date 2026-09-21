import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { RESIDENTS, CAREGIVER } from '../api/endpoints';

export const useResidents = (params?: { search?: string; status?: string; floorId?: string; page?: number }, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['residents', params],
    queryFn: async () => {
      const res = await api.get(RESIDENTS.LIST, { params });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useResidentDetail = (residentId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['resident', residentId],
    queryFn: async () => {
      const res = await api.get(RESIDENTS.DETAIL(residentId!));
      return res.data;
    },
    enabled: !!residentId && (options?.enabled ?? true),
  });
};

export const useResidentVitals = (residentId?: string, params?: { page?: number }) => {
  return useQuery({
    queryKey: ['vitals', residentId, params],
    queryFn: async () => {
      const res = await api.get(RESIDENTS.MEDICAL_RECORDS(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};

export const useCaregiverResidents = (params?: { search?: string }, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['caregiverResidents', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.RESIDENTS, { params });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCaregiverResidentDetail = (residentId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['caregiverResident', residentId],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.RESIDENT_DETAIL(residentId!));
      return res.data;
    },
    enabled: !!residentId && (options?.enabled ?? true),
  });
};
