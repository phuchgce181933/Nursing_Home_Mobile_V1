import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { FAMILY } from '../api/endpoints';

export const useFamilyAppointments = (
  residentId?: string,
  params?: { status?: string; from?: string; to?: string }
) => {
  return useQuery({
    queryKey: ['familyCareAppointments', residentId, params],
    queryFn: async () => {
      const res = await api.get(FAMILY.CARE_APPOINTMENTS(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};
