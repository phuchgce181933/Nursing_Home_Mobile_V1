import { useTranslation } from 'react-i18next';

/**
 * Nhãn hiển thị cho Gói dịch vụ.
 *
 * Giá trị enum trong DB/API giữ nguyên (models/enums.js -> SERVICE_PACKAGE_TIERS,
 * models/servicePackage.js -> allowedRoomTypes); việc dịch chỉ xảy ra ở lớp hiển thị.
 *
 * Gom về một chỗ vì trước đây `ServicePackagesScreen` in thẳng `item.tier` còn
 * `ServicePackageDetailScreen` in `tier.toUpperCase()` — điều dưỡng nhìn thấy
 * "standard" và "PREMIUM".
 */

const NS = 'nurse.servicePackages';

/** models/enums.js:60 — SERVICE_PACKAGE_TIERS. */
export const SERVICE_PACKAGE_TIERS = ['basic', 'standard', 'premium', 'vip'] as const;

/** models/servicePackage.js:12 — allowedRoomTypes. */
export const ROOM_TYPES = ['standard', 'premium', 'icu', 'isolation'] as const;

const isTechnicalSlug = (value: string) => /^[a-z0-9_]+$/.test(value);
const humanize = (value: string) => value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const makeLookup =
  (t: (k: string, o?: any) => string, group: string, known: readonly string[]) =>
  (value?: string | null, fallback = ''): string => {
    const key = (value ?? '').trim().toLowerCase();
    if (!key) return fallback;
    if (known.includes(key)) return t(`${NS}.${group}.${key}`, { defaultValue: humanize(key) });
    // Giá trị lạ ngoài enum: vẫn không để lộ slug kỹ thuật thô.
    return isTechnicalSlug(key) ? humanize(key) : key;
  };

/**
 * Định dạng tiền tệ theo đúng quy ước đang dùng trong dự án
 * (FamilyWalletScreen, FamilyInvoicesScreen, BillingSummaryScreen):
 * `1.234.567 ₫` — dấu phân cách vi-VN, khoảng trắng, ký hiệu ₫.
 *
 * Không đổi giá trị số đã lưu, chỉ đổi cách hiển thị.
 */
export const formatVnd = (value: unknown): string => {
  const n = typeof value === 'number' ? value : Number(value);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString('vi-VN')} ₫`;
};

export const useServicePackageLabels = () => {
  const { t } = useTranslation();
  return {
    getTierLabel: makeLookup(t, 'tiers', SERVICE_PACKAGE_TIERS),
    getRoomTypeLabel: makeLookup(t, 'roomTypes', ROOM_TYPES),
    /**
     * `isActive` là boolean, không phải enum. Cần nhãn riêng vì khoá `status.active`
     * dùng chung đang mang nghĩa "Tích cực" (mức độ tham gia hoạt động), không phải
     * "Đang hoạt động" của gói dịch vụ.
     */
    getActiveLabel: (isActive?: boolean | null): string =>
      t(`${NS}.${isActive ? 'statusActive' : 'statusInactive'}`),
    formatVnd,
  };
};
