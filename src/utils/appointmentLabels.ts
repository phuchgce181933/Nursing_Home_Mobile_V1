import { useTranslation } from 'react-i18next';

/**
 * Nhãn tiếng Việt cho Lịch hẹn chăm sóc.
 *
 * Lưu ý về schema: `CareAppointment.appointmentType` là **chuỗi tự do**
 * (`{ type: String, trim: true }`), KHÔNG phải enum. Dữ liệu thật vì vậy lẫn
 * hai dạng:
 *   - tiếng Việt do người dùng nhập  -> "Khám định kỳ tháng"
 *   - slug kỹ thuật do seed cũ ghi   -> "specialist_visit", "vitals_check"
 *
 * Nên hàm dịch ở đây phải xử lý cả hai: slug đã biết thì tra bảng, slug lạ thì
 * làm đẹp tạm ("abc_def" -> "Abc def"), còn chữ tự do có dấu/có khoảng trắng
 * thì giữ nguyên vì đó đã là nội dung người dùng viết.
 *
 * `status` thì ngược lại — là enum thật (`APPOINTMENT_STATUSES`), dịch qua
 * bảng `status.*` dùng chung như mọi màn hình khác.
 */

const NS = 'nurse.careAppointments';

/** Các slug thực sự có trong DB local, đã đối chiếu bằng distinct(). */
export const KNOWN_APPOINTMENT_TYPES = [
  'general_checkup',
  'specialist_visit',
  'vitals_check',
  'medication_review',
  'physiotherapy',
  'consultation',
  'follow_up',
] as const;

/** Chỉ chữ thường/số/gạch dưới mới coi là slug kỹ thuật cần dịch. */
const isTechnicalSlug = (value: string) => /^[a-z0-9_]+$/.test(value);

const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const useAppointmentLabels = () => {
  const { t } = useTranslation();

  const getTypeLabel = (value?: string | null, fallback = ''): string => {
    const raw = (value ?? '').trim();
    if (!raw) return fallback;
    const key = raw.toLowerCase();
    if ((KNOWN_APPOINTMENT_TYPES as readonly string[]).includes(key)) {
      return t(`${NS}.types.${key}`, { defaultValue: humanize(key) });
    }
    // Slug lạ vẫn phải làm đẹp, tuyệt đối không in ra dấu gạch dưới.
    return isTechnicalSlug(raw) ? humanize(raw) : raw;
  };

  /**
   * `status.in_progress` dùng chung là "Đang làm" — đúng cho nhiệm vụ chăm sóc
   * nhưng sai ngữ cảnh với một buổi hẹn. Nên tra bảng riêng của màn hình trước,
   * rồi mới rơi về bảng `status.*` dùng chung.
   */
  const getStatusLabel = (value?: string | null, fallback = ''): string => {
    const raw = (value ?? '').trim();
    if (!raw) return fallback;
    return t(`${NS}.statuses.${raw}`, {
      defaultValue: t(`status.${raw}`, { defaultValue: humanize(raw) }),
    });
  };

  return { getTypeLabel, getStatusLabel };
};
