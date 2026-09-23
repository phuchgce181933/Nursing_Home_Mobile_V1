import { useTranslation } from 'react-i18next';

/**
 * Nguồn nhãn DUY NHẤT cho module Sự cố (Incident).
 *
 * Mọi màn hình liên quan đến sự cố phải dùng các hàm ở đây, không được tự dịch
 * lại trong component. Backend/DB giữ nguyên giá trị gốc — file này chỉ dịch ở
 * tầng hiển thị.
 *
 * Căn cứ thực tế trong source (KHÔNG suy đoán):
 *
 * 1. `incidentType` — models/incident.js khai báo `{ type: String, trim: true }`,
 *    KHÔNG có enum; incidentService.js chỉ kiểm tra bắt buộc + tối đa 200 ký tự.
 *    Vì vậy đây là chuỗi tự do. Dữ liệu local đang lẫn 2 nhóm:
 *      - slug kỹ thuật tiếng Anh do seed sinh ra (bảng INCIDENT_TYPE_SLUGS)
 *      - chuỗi tiếng Việt do người dùng tự nhập ("Hạ đường huyết", "Khó thở cấp"...)
 *    Nhóm 1 được dịch, nhóm 2 giữ nguyên.
 *
 * 2. `severity` — models/enums.js: INCIDENT_SEVERITIES = low | medium | high | critical.
 *
 * 3. `status` — models/enums.js: INCIDENT_STATUSES = open | investigating | resolved | closed.
 *    NHƯNG DB local còn tồn tại `in_progress` và `reported` (do seed cũ ghi bằng
 *    updateOne/insertMany nên Mongoose không chạy validator enum). UI vẫn phải
 *    hiển thị đúng 2 giá trị này thay vì để lộ chuỗi thô.
 *    Lưu ý: `in_progress` ở đây là "Đang xử lý" (ngữ cảnh sự cố), khác với
 *    `status.in_progress` = "Đang làm" dùng cho nhiệm vụ chăm sóc — nên module
 *    sự cố có bộ khoá i18n riêng, không dùng chung `status.*`.
 */

/** Slug kỹ thuật tiếng Anh thực sự xuất hiện trong DB/seed. */
export const INCIDENT_TYPE_SLUGS = [
  'fall',
  'breathing_difficulty',
  'medication',
  'medication_refused',
  'medication_missed',
  'medication_error',
  'behavior',
  'behavior_change',
  'skin_issue',
  'weight_loss',
] as const;

/** enum models/enums.js -> INCIDENT_SEVERITIES */
export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * 4 giá trị theo schema + 2 giá trị lịch sử còn nằm trong DB.
 * Giữ nguyên thứ tự vòng đời để dùng cho luồng chuyển trạng thái.
 */
export const INCIDENT_STATUSES = [
  'reported',
  'open',
  'in_progress',
  'investigating',
  'resolved',
  'closed',
] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const NS = 'nurse.incidents';

/** Slug kỹ thuật = chỉ chữ thường ASCII, số, gạch dưới. Chuỗi tiếng Việt luôn trượt. */
const isTechnicalSlug = (value: string) => /^[a-z0-9_]+$/.test(value);

/** Bỏ dấu + chuẩn hoá khoảng trắng để so khớp các biến thể gõ thiếu dấu. */
const normalizeVi = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Các biến thể tiếng Việt viết tắt / thiếu dấu đang có trong DB, quy về cùng một
 * nhãn chuẩn với slug tương ứng để danh sách không hiện 4 cách viết của một loại.
 */
const VI_TYPE_ALIASES: Record<string, (typeof INCIDENT_TYPE_SLUGS)[number]> = {
  'te nga': 'fall',
  te: 'fall',
  nga: 'fall',
};

/** Slug lạ vẫn phải đọc được: "skin_issue" -> "Skin issue". */
const humanizeSlug = (slug: string) =>
  slug.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Chuỗi tiếng Việt tự do: viết hoa chữ đầu cho đồng nhất ("sốc phản vệ" -> "Sốc phản vệ"). */
const sentenceCase = (value: string) => value.replace(/^./, (c) => c.toUpperCase());

/**
 * Bộ nhãn tiếng Việt cho sự cố. Dùng hook để bám theo ngôn ngữ đang chọn
 * (cùng kiểu với useActivityCategoryLabel).
 */
export const useIncidentLabels = () => {
  const { t } = useTranslation();

  /** Loại sự cố: dịch slug, giữ nguyên chuỗi tiếng Việt, không bao giờ trả về gạch dưới. */
  const getIncidentTypeLabel = (value?: string | null, fallback = ''): string => {
    const raw = (value ?? '').trim();
    if (!raw) return fallback;

    const key = raw.toLowerCase();
    if ((INCIDENT_TYPE_SLUGS as readonly string[]).includes(key)) {
      return t(`${NS}.types.${key}`, { defaultValue: humanizeSlug(key) });
    }

    const aliased = VI_TYPE_ALIASES[normalizeVi(raw)];
    if (aliased) return t(`${NS}.types.${aliased}`, { defaultValue: humanizeSlug(aliased) });

    if (isTechnicalSlug(raw)) return humanizeSlug(raw);
    return sentenceCase(raw);
  };

  /** Mức độ nghiêm trọng: low/medium/high/critical. */
  const getIncidentSeverityLabel = (value?: string | null, fallback = ''): string => {
    const key = (value ?? '').trim().toLowerCase();
    if (!key) return fallback;
    if ((INCIDENT_SEVERITIES as readonly string[]).includes(key)) {
      return t(`${NS}.severities.${key}`, { defaultValue: humanizeSlug(key) });
    }
    return isTechnicalSlug(key) ? humanizeSlug(key) : sentenceCase(key);
  };

  /** Trạng thái xử lý, phủ cả 2 giá trị lịch sử `reported` và `in_progress`. */
  const getIncidentStatusLabel = (value?: string | null, fallback = ''): string => {
    const key = (value ?? '').trim().toLowerCase();
    if (!key) return fallback;
    if ((INCIDENT_STATUSES as readonly string[]).includes(key)) {
      return t(`${NS}.statuses.${key}`, { defaultValue: humanizeSlug(key) });
    }
    return isTechnicalSlug(key) ? humanizeSlug(key) : sentenceCase(key);
  };

  return { getIncidentTypeLabel, getIncidentSeverityLabel, getIncidentStatusLabel };
};
