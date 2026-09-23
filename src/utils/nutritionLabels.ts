import { useTranslation } from 'react-i18next';

/**
 * Nguồn nhãn DUY NHẤT cho module Báo cáo dinh dưỡng.
 *
 * Giá trị enum lấy trực tiếp từ model Backend (KHÔNG suy đoán):
 *   - mealType      : models/mealPlanEntry.js:9  + models/mealIntakeNote.js:5
 *                     ['breakfast', 'lunch', 'dinner']
 *                     (services/careNoteService.js:13 cho phép thêm 'snack' với care note)
 *   - dietType      : models/specialDietEntry.js:11
 *                     ['diabetic','low_sodium','renal','high_protein','soft_texture','liquid_only','custom']
 *   - intakeStatus  : models/mealIntakeNote.js:6
 *                     ['full', 'partial', 'refused', 'assisted']
 *
 * Bản dịch tiếng Việt khớp với Web (Nursing_Home_Fe_V1/src/i18n.js -> nutrition.dietType
 * và nutrition.intakeStatus) để hai nền tảng dùng chung một từ vựng.
 *
 * LƯU Ý — bảng nhãn cũ trong NutritionReportsScreen bị sai so với source:
 *   dietType  : có 'vegetarian', 'low_fat', 'texture_modified', 'other' (KHÔNG tồn tại)
 *               và thiếu 'soft_texture', 'liquid_only', 'custom'.
 *   intakeStatus: có 'ate_all', 'not_applicable' (KHÔNG tồn tại)
 *               và thiếu 'full', 'assisted' — đúng 2 giá trị đang có trong DB local,
 *               nên màn hình đang in thẳng chuỗi tiếng Anh "full" / "assisted".
 */

const NS = 'nurse.nutritionReports';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const DIET_TYPES = [
  'diabetic',
  'low_sodium',
  'renal',
  'high_protein',
  'soft_texture',
  'liquid_only',
  'custom',
] as const;
export const INTAKE_STATUSES = ['full', 'partial', 'refused', 'assisted'] as const;

/** Slug kỹ thuật = chỉ chữ thường ASCII, số, gạch dưới. */
const isTechnicalSlug = (value: string) => /^[a-z0-9_]+$/.test(value);

/** Giá trị lạ vẫn phải đọc được, tuyệt đối không hiện gạch dưới: "soft_texture" -> "Soft texture". */
const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const makeLookup =
  (t: (k: string, o?: any) => string, group: string, known: readonly string[]) =>
  (value?: string | null, fallback = ''): string => {
    const key = (value ?? '').trim().toLowerCase();
    if (!key) return fallback;
    if (known.includes(key)) return t(`${NS}.${group}.${key}`, { defaultValue: humanize(key) });
    return isTechnicalSlug(key) ? humanize(key) : key;
  };

export const useNutritionLabels = () => {
  const { t } = useTranslation();
  return {
    getMealTypeLabel: makeLookup(t, 'mealTypes', MEAL_TYPES),
    getDietTypeLabel: makeLookup(t, 'dietTypes', DIET_TYPES),
    getIntakeStatusLabel: makeLookup(t, 'intakeStatuses', INTAKE_STATUSES),
  };
};
