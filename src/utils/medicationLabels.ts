import { useTranslation } from 'react-i18next';

/**
 * Nhãn tiếng Việt cho Thuốc / Đơn thuốc.
 *
 * Giá trị enum lấy trực tiếp từ `Nursing_Home_Be_V1/models/prescription.js`:
 *   PRESCRIPTION_STATUSES = DRAFT ACTIVE SUSPENDED COMPLETED CANCELLED EXPIRED
 *   ITEM_ROUTES           = oral injection topical inhaled
 * và `models/medicationSchedule.js` cho trạng thái từng lần phát thuốc.
 *
 * Giá trị lưu trong DB giữ nguyên; đây chỉ là tầng hiển thị.
 */

const NS = 'nurse.medications';

export const PRESCRIPTION_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;

export const MEDICATION_ROUTES = ['oral', 'injection', 'topical', 'inhaled'] as const;

export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

/**
 * Trạng thái đơn thuốc -> hue của bảng màu dùng chung (statusMap).
 * Cần bảng riêng vì `statusMap` chỉ biết trạng thái *lịch phát thuốc* viết hoa
 * (PENDING/TAKEN/MISSED...), không biết trạng thái *đơn thuốc*.
 */
export const PRESCRIPTION_STATUS_HUE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  COMPLETED: 'info',
  DRAFT: 'neutral',
  SUSPENDED: 'warning',
  CANCELLED: 'danger',
  EXPIRED: 'danger',
};

const humanize = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export const useMedicationLabels = () => {
  const { t } = useTranslation();

  const getPrescriptionStatusLabel = (value?: string | null, fallback = ''): string => {
    const raw = (value ?? '').trim();
    if (!raw) return fallback;
    const key = raw.toUpperCase();
    if ((PRESCRIPTION_STATUSES as readonly string[]).includes(key)) {
      return t(`${NS}.prescriptionStatuses.${key}`, { defaultValue: humanize(key) });
    }
    return humanize(raw);
  };

  const getRouteLabel = (value?: string | null, fallback = ''): string => {
    const raw = (value ?? '').trim();
    if (!raw) return fallback;
    const key = raw.toLowerCase();
    if ((MEDICATION_ROUTES as readonly string[]).includes(key)) {
      return t(`${NS}.routes.${key}`, { defaultValue: humanize(key) });
    }
    return humanize(raw);
  };

  return { getPrescriptionStatusLabel, getRouteLabel };
};

/**
 * Ghép liều + đơn vị thành một chuỗi đọc được.
 *
 * Dữ liệu seed cũ ghi thẳng vào Mongo nên `dosage` đã nuốt luôn đơn vị
 * ("1 vien") trong khi `unit` vẫn là "vien" — nối thẳng sẽ ra "1 vien vien".
 * Đơn thuốc tạo qua API thì `dosage` là số ("1") nên cần nối thêm đơn vị.
 * Chỉ nối khi phần đuôi của liều chưa chính là đơn vị đó.
 */
export const formatDosage = (dosage?: string | number | null, unit?: string | null): string => {
  const d = String(dosage ?? '').trim();
  const u = String(unit ?? '').trim();
  if (!d) return u;
  if (!u) return d;
  return d.toLowerCase().endsWith(u.toLowerCase()) ? d : `${d} ${u}`;
};
