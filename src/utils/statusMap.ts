import { STATUS_COLORS } from '../theme/theme';

type StatusEntry = {
  label: string;
  bgColor: string;
  textColor: string;
  icon: string;
};

const map: Record<string, StatusEntry> = {
  // CareTask statuses
  pending:     { label: 'Chờ xử lý',    bgColor: '#FFEDD5', textColor: '#92400E', icon: 'clock-outline' },
  in_progress: { label: 'Đang thực hiện', bgColor: '#FFEDD5', textColor: '#92400E', icon: 'progress-clock' },
  completed:   { label: 'Hoàn thành',    bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle-outline' },
  skipped:     { label: 'Bỏ qua',       bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'skip-next-circle-outline' },
  missed:      { label: 'Bỏ lỡ',        bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'alert-circle-outline' },

  // Shift statuses
  draft:       { label: 'Nháp',         bgColor: '#FFEDD5', textColor: '#92400E', icon: 'file-edit-outline' },
  published:   { label: 'Đã xuất bản',  bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'send-outline' },
  confirmed:   { label: 'Đã xác nhận',  bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-decagram' },
  cancelled:   { label: 'Đã hủy',       bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle-outline' },

  // MedicationSchedule statuses (uppercase)
  PENDING:     { label: 'Chờ',          bgColor: '#FFEDD5', textColor: '#92400E', icon: 'clock-outline' },
  TAKEN:       { label: 'Đã cho',       bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle' },
  LATE_TAKEN:  { label: 'Cho muộn',     bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'clock-check-outline' },
  MISSED:      { label: 'Bỏ qua',      bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle' },
  SKIPPED:     { label: 'Bỏ qua',      bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'skip-next' },
  OVERDUE:     { label: 'Quá hạn',     bgColor: '#FFEDD5', textColor: '#92400E', icon: 'alert-outline' },

  // Incident statuses
  open:          { label: 'Mở',           bgColor: '#FFEDD5', textColor: '#92400E', icon: 'alert-circle-outline' },
  investigating: { label: 'Đang xử lý',  bgColor: '#FFEDD5', textColor: '#92400E', icon: 'magnify' },
  resolved:      { label: 'Đã giải quyết', bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle-outline' },
  closed:        { label: 'Đã đóng',     bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'lock-outline' },

  // Incident severity
  low:      { label: 'Thấp',      bgColor: '#D1FAE5', textColor: '#065F46', icon: 'information-outline' },
  medium:   { label: 'Trung bình', bgColor: '#FFEDD5', textColor: '#92400E', icon: 'alert-outline' },
  high:     { label: 'Cao',       bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'alert-circle' },
  critical: { label: 'Nguy kịch', bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'alert-octagon' },

  // Resident residencyStatus
  admitted:    { label: 'Đang ở',     bgColor: '#D1FAE5', textColor: '#065F46', icon: 'account-check' },
  discharged:  { label: 'Đã xuất',   bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'account-remove' },
  transferred: { label: 'Chuyển',    bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'swap-horizontal' },
  inactive:    { label: 'Ngưng',     bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'account-off' },

  // Room statuses
  available:   { label: 'Trống',       bgColor: '#D1FAE5', textColor: '#065F46', icon: 'door-open' },
  full:        { label: 'Đầy',        bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'door-closed' },
  maintenance: { label: 'Bảo trì',    bgColor: '#FFEDD5', textColor: '#92400E', icon: 'wrench-outline' },

  // CareNote types
  meal:         { label: 'Bữa ăn',        bgColor: '#FFEDD5', textColor: '#92400E', icon: 'silverware-fork-knife' },
  activity:     { label: 'Hoạt động',      bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'run' },
  daily_living: { label: 'Sinh hoạt',      bgColor: '#D1FAE5', textColor: '#065F46', icon: 'home-heart' },
  health:       { label: 'Sức khỏe',       bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'heart-pulse' },
  general:      { label: 'Chung',          bgColor: '#F0F0F0', textColor: '#374151', icon: 'note-text-outline' },

  // CareTask types
  morning_care:       { label: 'Chăm sóc sáng',    bgColor: '#FFEDD5', textColor: '#92400E', icon: 'weather-sunny' },
  medication:         { label: 'Thuốc',             bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'pill' },
  physical_therapy:   { label: 'Vật lý trị liệu',  bgColor: '#D1FAE5', textColor: '#065F46', icon: 'human-handsup' },
  meal_assistance:    { label: 'Hỗ trợ bữa ăn',    bgColor: '#FFEDD5', textColor: '#92400E', icon: 'food' },
  evening_check:      { label: 'Kiểm tra tối',     bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'weather-night' },
  emergency_response: { label: 'Khẩn cấp',         bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'ambulance' },

  // Hygiene completion statuses
  partial:  { label: 'Một phần',  bgColor: '#FFEDD5', textColor: '#92400E', icon: 'circle-half-full' },
  refused:  { label: 'Từ chối',  bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'hand-back-left' },
  assisted: { label: 'Hỗ trợ',   bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'handshake-outline' },

  // Meal intake statuses
  // full already covered by Room 'full' above, will use fallback

  // Care levels
  // low/medium/high already covered by incident severity
};

const fallback: StatusEntry = {
  label: '',
  bgColor: '#F0F0F0',
  textColor: '#374151',
  icon: 'help-circle-outline',
};

export const getStatusEntry = (status?: string | null): StatusEntry => {
  if (!status) return fallback;
  return map[status] ?? { ...fallback, label: status };
};
