import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { MEDICAL_SERVICE_PACKAGES } from '../api/endpoints';

/**
 * Gói dịch vụ (chỉ đọc) cho điều dưỡng.
 *
 * Backend: routes/medicalServicePackages.js -> controllers/servicePackageController.js
 * -> services/servicePackageService.js. Web gọi cùng controller đó qua
 * `/admin/service-packages`, còn Doctor/Nurse dùng `/medical/service-packages`.
 * Cùng filter, cùng sort `{ createdAt: -1 }`.
 */

type ServicePackageQuery = {
  tier?: string;
  search?: string;
  /**
   * `servicePackageService.listServicePackages` KHÔNG lọc gì nếu thiếu tham số này
   * — gói đã xoá mềm (isActive=false) sẽ lọt vào danh sách. Web mặc định
   * `isActive: 'true'` (ServicePackagesPage.jsx:53), nên Mobile phải gửi kèm thì
   * hai bên mới cùng một tập dữ liệu.
   */
  isActive?: boolean;
  page?: number;
  limit?: number;
};

/** Ghi log kỹ thuật chỉ trong dev; người dùng luôn chỉ thấy thông báo tiếng Việt. */
const logDev = (scope: string, error: unknown) => {
  if (__DEV__) {
    const err = error as any;
    console.warn(`[servicePackages] ${scope}`, err?.response?.status, err?.response?.data ?? err?.message);
  }
};

export const useServicePackages = (params?: ServicePackageQuery) => {
  const query: ServicePackageQuery = { isActive: true, ...params };
  return useQuery({
    queryKey: ['servicePackages', query],
    queryFn: async () => {
      try {
        const res = await api.get(MEDICAL_SERVICE_PACKAGES.LIST, { params: query });
        return res.data;
      } catch (e) {
        logDev('list', e);
        throw e;
      }
    },
  });
};

export const useServicePackageDetail = (packageId?: string) => {
  return useQuery({
    queryKey: ['servicePackageDetail', packageId],
    queryFn: async () => {
      try {
        const res = await api.get(MEDICAL_SERVICE_PACKAGES.DETAIL(packageId!));
        // Backend wraps the package under a `servicePackage` key, not `data`.
        return res.data?.servicePackage ?? res.data?.data ?? res.data;
      } catch (e) {
        logDev('detail', e);
        throw e;
      }
    },
    enabled: !!packageId,
  });
};
