import { useTranslation } from 'react-i18next';

/**
 * `Activity.category` là chuỗi tự do (models/activity.js), không phải enum.
 *
 * Backend chỉ *khuyến nghị* 12 cụm tiếng Việt trong
 * services/activityService.js -> ALLOWED_ACTIVITY_CATEGORY_OPTIONS, nhưng dữ
 * liệu cũ trong DB vẫn còn các slug kỹ thuật tiếng Anh ("social", "recreation",
 * "art", "exercise", "physical", "therapy", "health").
 *
 * Bảng dưới đây chỉ dịch đúng nhóm slug đó. Mọi giá trị đã là cụm tiếng Việt
 * ("Hoạt động giải trí", "Tinh thần", "Y tế"...) được giữ nguyên — không đoán,
 * không sửa dữ liệu, chỉ đảm bảo UI không bao giờ hiện chuỗi kỹ thuật.
 */
const LEGACY_CATEGORY_SLUGS = [
  'social',
  'recreation',
  'art',
  'exercise',
  'physical',
  'therapy',
  'health',
] as const;

/** Slug = chỉ chữ thường ASCII, số và gạch dưới. Cụm tiếng Việt luôn trượt điều kiện này. */
const isTechnicalSlug = (value: string) => /^[a-z0-9_]+$/.test(value);

/**
 * Hook trả về hàm đổi `category` thô thành nhãn hiển thị.
 * Dùng chung cho thẻ danh sách và hộp thoại chi tiết để chỉ có một nguồn nhãn.
 */
export const useActivityCategoryLabel = () => {
  const { t } = useTranslation();
  return (category?: string | null, fallback = ''): string => {
    const raw = (category ?? '').trim();
    if (!raw) return fallback;

    const key = raw.toLowerCase();
    if ((LEGACY_CATEGORY_SLUGS as readonly string[]).includes(key)) {
      return t(`nurse.activities.categories.${key}`, { defaultValue: raw });
    }
    // Giá trị lạ nhưng vẫn ở dạng slug kỹ thuật: ít nhất không để lộ dấu gạch dưới.
    if (isTechnicalSlug(raw)) return raw.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    return raw;
  };
};
