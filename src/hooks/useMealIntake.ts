import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CAREGIVER } from '../api/endpoints';

export const useMealIntakeNotes = (params?: { workDate?: string; mealType?: string }) => {
  return useQuery({
    queryKey: ['mealIntake', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.MEAL_INTAKE, { params });
      return res.data;
    },
  });
};

export const useMealIntakeContext = () => {
  return useQuery({
    queryKey: ['mealIntakeContext'],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.MEAL_INTAKE_CONTEXT);
      return res.data;
    },
  });
};

export const useCreateMealIntake = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(CAREGIVER.MEAL_INTAKE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealIntake'] });
    },
  });
};

export const useUpdateMealIntake = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await api.put(CAREGIVER.MEAL_INTAKE_DETAIL(id), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealIntake'] });
    },
  });
};

export const useDeleteMealIntake = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(CAREGIVER.MEAL_INTAKE_DETAIL(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealIntake'] });
    },
  });
};

export const useHygieneRecords = (params?: { workDate?: string }) => {
  return useQuery({
    queryKey: ['hygiene', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.HYGIENE, { params });
      return res.data;
    },
  });
};

export const useCreateHygiene = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post(CAREGIVER.HYGIENE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hygiene'] });
    },
  });
};

export const useDailyBehaviors = (params?: { workDate?: string }) => {
  return useQuery({
    queryKey: ['dailyBehaviors', params],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.DAILY_BEHAVIORS, { params });
      return res.data;
    },
  });
};

export const useDietPlans = () => {
  return useQuery({
    queryKey: ['dietPlans'],
    queryFn: async () => {
      const res = await api.get(CAREGIVER.DIET_PLANS);
      return res.data;
    },
  });
};
