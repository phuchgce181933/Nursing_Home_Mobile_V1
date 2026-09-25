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

/**
 * `active` = panel chat đang MỞ. Trước đây query này chạy ngay khi widget mount và poll
 * 3 giây/lần vô điều kiện, kể cả khi người dùng chưa bao giờ bấm vào FAB chat — widget được
 * render sẵn trên Welcome/Services/Living nên mọi màn công khai đều nã request nền. Kết hợp
 * với một `conversationId` cũ còn nằm trong AsyncStorage nhưng đã không còn trong DB (server
 * trả 404 "Không tìm thấy cuộc trò chuyện"), nó tạo ra đúng vòng lặp 404 lặp vô hạn quan sát
 * được: 3 giây/lần × 3 request (retry) mà UI không hề báo lỗi.
 */
export const useGuestMessages = (conversationId?: string, active = true) => {
  return useQuery({
    queryKey: ['guestMessages', conversationId],
    queryFn: async () => {
      const res = await api.get(CONVERSATIONS.GUEST_MESSAGES(conversationId!));
      return res.data;
    },
    enabled: !!conversationId && active,
    // Chỉ poll khi panel đang mở; đóng panel là dừng hẳn thay vì poll nền mãi mãi.
    refetchInterval: active ? 3000 : false,
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
