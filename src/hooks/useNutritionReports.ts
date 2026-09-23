import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { NUTRITION_REPORTS } from '../api/endpoints';

/**
 * Báo cáo dinh dưỡng cho điều dưỡng.
 *
 * Backend: routes/nutritionReports.js -> controllers/nutritionReportController.js
 * -> services/nutritionReportService.js. Phạm vi dữ liệu do chính service giới hạn
 * theo `getAssignedResidentIdSetForUser(actorUser._id)`, nên client KHÔNG cần và
 * KHÔNG được truyền thêm tham số lọc cư dân nào.
 */

type DateRange = { from?: string; to?: string };

/** Khoảng ngày tối đa backend chấp nhận (nutritionReportService.js -> MAX_RANGE_DAYS). */
export const MAX_RANGE_DAYS = 31;

/** Ghi log kỹ thuật chỉ trong dev; người dùng luôn chỉ thấy thông báo tiếng Việt. */
const logDev = (scope: string, error: unknown) => {
  if (__DEV__) {
    const err = error as any;
    console.warn(`[nutritionReports] ${scope}`, err?.response?.status, err?.response?.data ?? err?.message);
  }
};

export const useNutritionSummary = (params?: DateRange) =>
  useQuery({
    queryKey: ['nutritionSummary', params],
    queryFn: async () => {
      try {
        const res = await api.get(NUTRITION_REPORTS.SUMMARY, { params });
        return res.data;
      } catch (e) {
        logDev('summary', e);
        throw e;
      }
    },
  });

/**
 * `missingMealPlan` phải là chuỗi 'true' — service so sánh
 * `query.missingMealPlan === 'true'` (nutritionReportService.js:304).
 */
export const useNutritionResidents = (
  params?: DateRange & { search?: string; missingMealPlan?: 'true'; page?: number; limit?: number }
) =>
  useQuery({
    queryKey: ['nutritionResidents', params],
    queryFn: async () => {
      try {
        const res = await api.get(NUTRITION_REPORTS.RESIDENTS, { params });
        return res.data;
      } catch (e) {
        logDev('residents', e);
        throw e;
      }
    },
  });

export const useNutritionResidentDetail = (residentId?: string, params?: DateRange) =>
  useQuery({
    queryKey: ['nutritionResidentDetail', residentId, params],
    queryFn: async () => {
      try {
        const res = await api.get(NUTRITION_REPORTS.RESIDENT_DETAIL(residentId!), { params });
        return res.data;
      } catch (e) {
        logDev('residentDetail', e);
        throw e;
      }
    },
    enabled: !!residentId,
    // 403 = không được phân công cư dân này: thử lại cũng vô ích.
    retry: (count, error: any) => (error?.response?.status === 403 ? false : count < 2),
  });
