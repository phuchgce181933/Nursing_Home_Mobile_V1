import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CARE_NOTES } from '../api/endpoints';

export const useCareNotes = (params?: { residentId?: string; noteType?: string; date?: string; search?: string; page?: number }) => {
  return useQuery({
    queryKey: ['careNotes', params],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.LIST, { params });
      return res.data;
    },
  });
};

export const useMyNotes = (params?: { residentId?: string; noteType?: string; search?: string; page?: number }) => {
  return useQuery({
    queryKey: ['myNotes', params],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.MY_NOTES, { params });
      return res.data;
    },
  });
};

export const useCareNoteDetail = (id?: string) => {
  return useQuery({
    queryKey: ['careNote', id],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateCareNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { residentId: string; content: string; noteType?: string; noteAt?: string; metadata?: Record<string, unknown> }) => {
      const res = await api.post(CARE_NOTES.CREATE, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['careNotes'] });
      qc.invalidateQueries({ queryKey: ['myNotes'] });
    },
  });
};

export const useUpdateCareNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; content?: string; noteType?: string; noteAt?: string; metadata?: Record<string, unknown> }) => {
      const res = await api.put(CARE_NOTES.UPDATE(id), body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['careNotes'] });
      qc.invalidateQueries({ queryKey: ['myNotes'] });
      qc.invalidateQueries({ queryKey: ['noteHistory'] });
      qc.invalidateQueries({ queryKey: ['careNote'] });
    },
  });
};

export const useDeleteCareNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(CARE_NOTES.DELETE(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['careNotes'] });
      qc.invalidateQueries({ queryKey: ['myNotes'] });
      qc.invalidateQueries({ queryKey: ['noteHistory'] });
    },
  });
};

export const useNoteHistory = (residentId?: string, params?: { noteType?: string; search?: string; page?: number }) => {
  return useQuery({
    queryKey: ['noteHistory', residentId, params],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.HISTORY(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};
