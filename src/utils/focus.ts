import { Platform } from 'react-native';

/**
 * Nhả focus khỏi phần tử đang được focus (chỉ trên Web).
 *
 * Vì sao cần: react-native-paper Dialog/Modal khi bị ẩn sẽ đặt `aria-hidden="true"`
 * + `display:none` lên cây con của nó. Nếu ngay lúc đó một phần tử con (ví dụ nút
 * vừa được bấm) vẫn đang giữ focus thì trình duyệt cảnh báo:
 *   "Blocked aria-hidden on an element because its descendant retained focus."
 * Gọi hàm này TRƯỚC khi ẩn/di chuyển khỏi một modal để trả focus về document,
 * tránh để `document.activeElement` nằm trong cây aria-hidden.
 *
 * Trên iOS/Android không có DOM nên là no-op.
 */
export const releaseActiveFocus = () => {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as any)?.document;
  const el = doc?.activeElement as { blur?: () => void } | null;
  el?.blur?.();
};
