import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { CONVERSATIONS } from '../api/endpoints';

export const useCreateGuestConversation = () => {
  return useMutation({
    mutationFn: async (body: { guestName: string; guestEmail?: string; guestPhone?: string; subject?: string; content?: string }) => {
      const res = await api.post(CONVERSATIONS.GUEST_CREATE, body);
      return res.data;
    },
  });
};

export const useGuestMessages = (conversationId?: string) => {
  return useQuery({
    queryKey: ['guestMessages', conversationId],
    queryFn: async () => {
      const res = await api.get(CONVERSATIONS.GUEST_MESSAGES(conversationId!));
      return res.data;
    },
    enabled: !!conversationId,
    refetchInterval: 3000,
  });
};

export const useSendGuestMessage = (conversationId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { content: string; guestName: string; guestEmail?: string; guestPhone?: string }) => {
      const res = await api.post(CONVERSATIONS.GUEST_MESSAGES(conversationId!), body);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guestMessages', conversationId] }),
  });
};
