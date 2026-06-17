import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CARE_NOTES } from '../api/endpoints';

export const useCareNotes = (params?: { residentId?: string; noteType?: string; date?: string; page?: number }) => {
  return useQuery({
    queryKey: ['careNotes', params],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.LIST, { params });
      return res.data;
    },
  });
};

export const useMyNotes = (params?: { residentId?: string; noteType?: string; page?: number }) => {
  return useQuery({
    queryKey: ['myNotes', params],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.MY_NOTES, { params });
      return res.data;
    },
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

export const useNoteHistory = (residentId?: string, params?: { noteType?: string; page?: number }) => {
  return useQuery({
    queryKey: ['noteHistory', residentId, params],
    queryFn: async () => {
      const res = await api.get(CARE_NOTES.HISTORY(residentId!), { params });
      return res.data;
    },
    enabled: !!residentId,
  });
};
