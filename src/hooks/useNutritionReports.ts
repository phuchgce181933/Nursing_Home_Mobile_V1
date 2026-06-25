import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { NUTRITION_REPORTS } from '../api/endpoints';

export const useNutritionSummary = (params?: { from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['nutritionSummary', params],
    queryFn: async () => {
      const res = await api.get(NUTRITION_REPORTS.SUMMARY, { params });
      return res.data;
    },
  });
};

export const useNutritionResidents = (params?: { search?: string; missingMealPlanOnly?: boolean; from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['nutritionResidents', params],
    queryFn: async () => {
      const res = await api.get(NUTRITION_REPORTS.RESIDENTS, { params });
      return res.data;
    },
  });
};

export const useNutritionResidentDetail = (residentId?: string, params?: { from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['nutritionResidentDetail', residentId, params],
    queryFn: async () => {
      const res = await api.get(NUTRITION_REPORTS.RESIDENT_DETAIL(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};
