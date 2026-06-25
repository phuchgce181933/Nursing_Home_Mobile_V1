import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { MEAL_PLANS } from '../api/endpoints';

export const useMealPlans = (params?: { date?: string; status?: string; page?: number }) => {
  return useQuery({
    queryKey: ['mealPlans', params],
    queryFn: async () => {
      const res = await api.get(MEAL_PLANS.LIST, { params });
      return res.data;
    },
  });
};

export const useMealPlanDetail = (id?: string) => {
  return useQuery({
    queryKey: ['mealPlanDetail', id],
    queryFn: async () => {
      const res = await api.get(MEAL_PLANS.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useMealPlanTemplates = () => {
  return useQuery({
    queryKey: ['mealPlanTemplates'],
    queryFn: async () => {
      const res = await api.get(MEAL_PLANS.TEMPLATES);
      return res.data;
    },
  });
};

export const useMealPlanResidents = () => {
  return useQuery({
    queryKey: ['mealPlanResidents'],
    queryFn: async () => {
      const res = await api.get(MEAL_PLANS.RESIDENTS);
      return res.data;
    },
  });
};

export const useCreateMealPlanDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const res = await api.post(MEAL_PLANS.CREATE_DRAFT, body);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mealPlans'] }); },
  });
};

export const useUpdateMealPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const res = await api.put(MEAL_PLANS.UPDATE(id), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
      qc.invalidateQueries({ queryKey: ['mealPlanDetail'] });
    },
  });
};

export const usePublishMealPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(MEAL_PLANS.PUBLISH(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealPlans'] });
      qc.invalidateQueries({ queryKey: ['mealPlanDetail'] });
    },
  });
};

export const useDeleteMealPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(MEAL_PLANS.DELETE(id));
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mealPlans'] }); },
  });
};
