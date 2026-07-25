import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { SPECIAL_DIETS } from '../api/endpoints';

export const useSpecialDiets = (params?: { date?: string; status?: string; page?: number }) => {
  return useQuery({
    queryKey: ['specialDiets', params],
    queryFn: async () => {
      const res = await api.get(SPECIAL_DIETS.LIST, { params });
      return res.data;
    },
  });
};

export const useSpecialDietDetail = (id?: string) => {
  return useQuery({
    queryKey: ['specialDietDetail', id],
    queryFn: async () => {
      const res = await api.get(SPECIAL_DIETS.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useSpecialDietTemplates = () => {
  return useQuery({
    queryKey: ['specialDietTemplates'],
    queryFn: async () => {
      const res = await api.get(SPECIAL_DIETS.TEMPLATES);
      return res.data;
    },
  });
};

export const useSpecialDietResidents = () => {
  return useQuery({
    queryKey: ['specialDietResidents'],
    queryFn: async () => {
      const res = await api.get(SPECIAL_DIETS.RESIDENTS);
      return res.data;
    },
  });
};

export const useCreateSpecialDietDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const res = await api.post(SPECIAL_DIETS.CREATE_DRAFT, body);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['specialDiets'] }); },
  });
};

export const useUpdateSpecialDiet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const res = await api.put(SPECIAL_DIETS.UPDATE(id), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['specialDiets'] });
      qc.invalidateQueries({ queryKey: ['specialDietDetail'] });
    },
  });
};

export const usePublishSpecialDiet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(SPECIAL_DIETS.PUBLISH(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['specialDiets'] });
      qc.invalidateQueries({ queryKey: ['specialDietDetail'] });
    },
  });
};

export const useDeleteSpecialDiet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(SPECIAL_DIETS.DELETE(id));
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['specialDiets'] }); },
  });
};
