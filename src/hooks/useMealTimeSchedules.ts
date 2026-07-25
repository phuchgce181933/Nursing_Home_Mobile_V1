import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { MEAL_TIME_SCHEDULES } from '../api/endpoints';

export const useMealTimeSchedules = (params?: { date?: string; status?: string; page?: number }) => {
  return useQuery({
    queryKey: ['mealTimeSchedules', params],
    queryFn: async () => {
      const res = await api.get(MEAL_TIME_SCHEDULES.LIST, { params });
      return res.data;
    },
  });
};

export const useMealTimeScheduleDetail = (id?: string) => {
  return useQuery({
    queryKey: ['mealTimeScheduleDetail', id],
    queryFn: async () => {
      const res = await api.get(MEAL_TIME_SCHEDULES.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useMealTimeScheduleTemplates = () => {
  return useQuery({
    queryKey: ['mealTimeScheduleTemplates'],
    queryFn: async () => {
      const res = await api.get(MEAL_TIME_SCHEDULES.TEMPLATES);
      return res.data;
    },
  });
};

export const useMealTimeScheduleResidents = () => {
  return useQuery({
    queryKey: ['mealTimeScheduleResidents'],
    queryFn: async () => {
      const res = await api.get(MEAL_TIME_SCHEDULES.RESIDENTS);
      return res.data;
    },
  });
};

export const usePublishedMealTimes = (params?: { date?: string }) => {
  return useQuery({
    queryKey: ['publishedMealTimes', params],
    queryFn: async () => {
      const res = await api.get(MEAL_TIME_SCHEDULES.PUBLISHED_TIMES, { params });
      return res.data;
    },
  });
};

export const useCreateMealTimeScheduleDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const res = await api.post(MEAL_TIME_SCHEDULES.CREATE_DRAFT, body);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mealTimeSchedules'] }); },
  });
};

export const useUpdateMealTimeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const res = await api.put(MEAL_TIME_SCHEDULES.UPDATE(id), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealTimeSchedules'] });
      qc.invalidateQueries({ queryKey: ['mealTimeScheduleDetail'] });
    },
  });
};

export const usePublishMealTimeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(MEAL_TIME_SCHEDULES.PUBLISH(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mealTimeSchedules'] });
      qc.invalidateQueries({ queryKey: ['mealTimeScheduleDetail'] });
    },
  });
};

export const useDeleteMealTimeSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(MEAL_TIME_SCHEDULES.DELETE(id));
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mealTimeSchedules'] }); },
  });
};
