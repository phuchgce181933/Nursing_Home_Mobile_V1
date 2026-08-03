import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { MEDICAL_SERVICE_PACKAGES } from '../api/endpoints';

export const useServicePackages = (params?: { tier?: string; search?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['servicePackages', params],
    queryFn: async () => {
      const res = await api.get(MEDICAL_SERVICE_PACKAGES.LIST, { params });
      return res.data;
    },
  });
};

export const useServicePackageDetail = (packageId?: string) => {
  return useQuery({
    queryKey: ['servicePackageDetail', packageId],
    queryFn: async () => {
      const res = await api.get(MEDICAL_SERVICE_PACKAGES.DETAIL(packageId!));
      // Backend wraps the package under a `servicePackage` key, not `data`.
      return res.data?.servicePackage ?? res.data?.data ?? res.data;
    },
    enabled: !!packageId,
  });
};
