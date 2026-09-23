import { useTranslation } from 'react-i18next';

type StatusEntry = {
  i18nKey: string;
  bgColor: string;
  textColor: string;
  icon: string;
};

export type Hue = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type Scheme = 'light' | 'dark';

// Every status/severity below picks one of these five hue families instead of
// its own literal hex pair, so light/dark variants stay consistent and adding
// a mode only means touching this one table.
const HUES: Record<Hue, Record<Scheme, { bg: string; text: string }>> = {
  success: {
    light: { bg: '#D1FAE5', text: '#065F46' },
    dark: { bg: '#064E3B', text: '#6EE7B7' },
  },
  warning: {
    light: { bg: '#FFEDD5', text: '#92400E' },
    dark: { bg: '#78350F', text: '#FDBA74' },
  },
  danger: {
    light: { bg: '#FEE2E2', text: '#991B1B' },
    dark: { bg: '#7F1D1D', text: '#FCA5A5' },
  },
  info: {
    light: { bg: '#DBEAFE', text: '#1E40AF' },
    dark: { bg: '#1E3A5F', text: '#93C5FD' },
  },
  neutral: {
    light: { bg: '#F0F0F0', text: '#374151' },
    dark: { bg: '#2A2A2A', text: '#D1D5DB' },
  },
};

/**
 * Cặp màu nền/chữ của một hue, dùng cho những chỗ KHÔNG phải StatusBadge —
 * ví dụ nút hành động trên thẻ. Trước đây các màn hình tự viết hex cố định
 * (`#991B1B`, `#065F46`); những giá trị đó chỉ hợp nền sáng nên ở chế độ tối
 * chúng rơi thành chữ tối trên nền tối. Đọc qua đây thì cả hai chế độ đều đạt
 * tương phản vì dùng đúng bảng màu mà StatusBadge đang dùng.
 */
export const getHueColors = (hue: Hue, scheme: Scheme = 'light') => HUES[hue][scheme];

const map: Record<string, { hue: Hue; icon: string }> = {
  // CareTask statuses
  pending:     { hue: 'warning', icon: 'clock-outline' },
  in_progress: { hue: 'warning', icon: 'progress-clock' },
  completed:   { hue: 'success', icon: 'check-circle-outline' },
  skipped:     { hue: 'danger', icon: 'skip-next-circle-outline' },
  missed:      { hue: 'danger', icon: 'alert-circle-outline' },

  // CareAppointment statuses
  scheduled:   { hue: 'info', icon: 'calendar-clock' },

  // Activity statuses (models/enums.js -> ACTIVITY_STATUSES).
  // `ongoing` là trạng thái backend tự gán trong syncActivityStatusIfNeeded khi
  // now nằm giữa scheduledAt và endAt — thiếu nó thì UI rò ra chữ "ongoing".
  ongoing:     { hue: 'warning', icon: 'play-circle-outline' },

  // Shift statuses
  draft:       { hue: 'warning', icon: 'file-edit-outline' },
  DRAFT:       { hue: 'warning', icon: 'file-edit-outline' },
  published:   { hue: 'info', icon: 'send-outline' },
  confirmed:   { hue: 'success', icon: 'check-decagram' },
  cancelled:   { hue: 'danger', icon: 'close-circle-outline' },
  CANCELLED:   { hue: 'danger', icon: 'close-circle-outline' },

  // MedicationSchedule statuses (uppercase)
  PENDING:     { hue: 'warning', icon: 'clock-outline' },
  TAKEN:       { hue: 'success', icon: 'check-circle' },
  LATE_TAKEN:  { hue: 'info', icon: 'clock-check-outline' },
  MISSED:      { hue: 'danger', icon: 'close-circle' },
  SKIPPED:     { hue: 'danger', icon: 'skip-next' },
  OVERDUE:     { hue: 'warning', icon: 'alert-outline' },
  // Bốn trạng thái còn lại của SCHEDULE_STATUSES. HELD sinh ra khi bác sĩ tạm
  // ngưng đơn, DISCONTINUED khi huỷ đơn — cả hai đều xuất hiện trong dữ liệu
  // thật nên phải có hue/icon riêng, nếu không badge rơi về neutral + chữ thô.
  REFUSED:       { hue: 'danger', icon: 'hand-back-left' },
  HELD:          { hue: 'warning', icon: 'pause-circle-outline' },
  NOT_AVAILABLE: { hue: 'warning', icon: 'package-variant-closed-remove' },
  DISCONTINUED:  { hue: 'neutral', icon: 'stop-circle-outline' },

  // Incident statuses
  // `reported` không nằm trong enum schema nhưng vẫn tồn tại trong DB (seed cũ ghi
  // bằng updateOne nên Mongoose bỏ qua validator). Thiếu entry này thì StatusBadge
  // rơi về nhánh fallback và in ra chuỗi thô "reported".
  reported:      { hue: 'info', icon: 'clipboard-alert-outline' },
  open:          { hue: 'warning', icon: 'alert-circle-outline' },
  investigating: { hue: 'warning', icon: 'magnify' },
  resolved:      { hue: 'success', icon: 'check-circle-outline' },
  closed:        { hue: 'danger', icon: 'lock-outline' },

  // Incident severity
  low:      { hue: 'success', icon: 'information-outline' },
  medium:   { hue: 'warning', icon: 'alert-outline' },
  high:     { hue: 'danger', icon: 'alert-circle' },
  critical: { hue: 'danger', icon: 'alert-octagon' },

  // ResidentVisit statuses
  approved: { hue: 'success', icon: 'check-circle-outline' },
  rejected: { hue: 'danger', icon: 'close-circle-outline' },

  // Resident residencyStatus
  admitted:    { hue: 'success', icon: 'account-check' },
  discharged:  { hue: 'danger', icon: 'account-remove' },
  transferred: { hue: 'info', icon: 'swap-horizontal' },
  inactive:    { hue: 'danger', icon: 'account-off' },

  // Room statuses
  available:   { hue: 'success', icon: 'door-open' },
  full:        { hue: 'info', icon: 'door-closed' },
  maintenance: { hue: 'warning', icon: 'wrench-outline' },

  // CareNote types
  meal:         { hue: 'warning', icon: 'silverware-fork-knife' },
  activity:     { hue: 'info', icon: 'run' },
  daily_living: { hue: 'success', icon: 'home-heart' },
  health:       { hue: 'danger', icon: 'heart-pulse' },
  general:      { hue: 'neutral', icon: 'note-text-outline' },

  // CareTask types
  morning_care:       { hue: 'warning', icon: 'weather-sunny' },
  medication:         { hue: 'info', icon: 'pill' },
  physical_therapy:   { hue: 'success', icon: 'human-handsup' },
  meal_assistance:    { hue: 'warning', icon: 'food' },
  evening_check:      { hue: 'info', icon: 'weather-night' },
  emergency_response: { hue: 'danger', icon: 'ambulance' },

  // Hygiene completion statuses
  partial:  { hue: 'warning', icon: 'circle-half-full' },
  refused:  { hue: 'danger', icon: 'hand-back-left' },
  assisted: { hue: 'info', icon: 'handshake-outline' },

  // Activity attendance statuses
  present:     { hue: 'success', icon: 'account-check' },
  absent:      { hue: 'danger', icon: 'account-remove' },
  late:        { hue: 'warning', icon: 'clock-alert-outline' },
  left_early:  { hue: 'info', icon: 'exit-run' },

  // Activity participation levels
  active:  { hue: 'success', icon: 'run-fast' },
  // partial already covered by Hygiene completion statuses above
  passive: { hue: 'neutral', icon: 'sleep' },

  // Admission request statuses
  new_request: { hue: 'info', icon: 'file-plus-outline' },
  consulting:  { hue: 'warning', icon: 'account-voice' },
  assessing:   { hue: 'warning', icon: 'clipboard-pulse-outline' },
  contracting: { hue: 'info', icon: 'file-sign' },
  checked_in:  { hue: 'success', icon: 'check-decagram' },

  // Admission eligibility statuses
  eligible:     { hue: 'success', icon: 'check-circle-outline' },
  not_eligible: { hue: 'danger', icon: 'close-circle-outline' },

  // Invoice statuses (backend sends both cases depending on endpoint)
  issued:         { hue: 'info', icon: 'file-document-outline' },
  ISSUED:         { hue: 'info', icon: 'file-document-outline' },
  paid:           { hue: 'success', icon: 'check-circle-outline' },
  PAID:           { hue: 'success', icon: 'check-circle-outline' },
  partially_paid: { hue: 'warning', icon: 'circle-half-full' },
  PARTIALLY_PAID: { hue: 'warning', icon: 'circle-half-full' },
  overdue:        { hue: 'danger', icon: 'alert-outline' },
};

const FALLBACK_ICON = 'help-circle-outline';

export const getStatusEntry = (status?: string | null, scheme: Scheme = 'light'): StatusEntry => {
  if (!status) {
    const { bg, text } = HUES.neutral[scheme];
    return { bgColor: bg, textColor: text, icon: FALLBACK_ICON, i18nKey: '' };
  }
  const entry = map[status] ?? { hue: 'neutral' as Hue, icon: FALLBACK_ICON };
  const { bg, text } = HUES[entry.hue][scheme];
  return { bgColor: bg, textColor: text, icon: entry.icon, i18nKey: getStatusI18nKey(status) };
};

/** Khoá i18n của một giá trị enum backend. Mọi nhãn đều đi qua bảng `status.*` duy nhất. */
export const getStatusI18nKey = (value?: string | null): string => (value ? `status.${value}` : '');

/**
 * Lưới an toàn cuối cùng, chỉ chạy khi thiếu khoá i18n: "morning_care" -> "Morning care".
 * Cố ý chỉ viết hoa chữ cái đầu — `textTransform: 'capitalize'` sẽ tạo ra
 * "Morning_care" / "Chăm Sóc Buổi Sáng", nên không dùng ở tầng style.
 */
export const humanizeEnumValue = (value: string): string => {
  const words = value.replace(/_/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Hook trả về hàm dịch enum -> nhãn người dùng đọc được.
 * Dùng cho mọi chỗ hiển thị taskType/status/severity... thay vì tự `.replace(/_/g,' ')`.
 */
export const useStatusLabel = () => {
  const { t } = useTranslation();
  return (value?: string | null, fallback = ''): string => {
    if (!value) return fallback;
    return t(getStatusI18nKey(value), { defaultValue: humanizeEnumValue(value) });
  };
};
