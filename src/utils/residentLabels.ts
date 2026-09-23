import { useTranslation } from 'react-i18next';

/**
 * Nhãn + định dạng dùng chung cho màn hình Cư dân (danh sách và chi tiết).
 *
 * Giá trị enum lấy từ `Nursing_Home_Be_V1/models/resident.js`:
 *   gender          : male | female | other
 *   residencyStatus : admitted | discharged | transferred | pending
 *   bloodType       : A+ A- B+ B- AB+ AB- O+ O- unknown
 *
 * `bloodType: 'unknown'` được Web cố ý ẩn (`resident.bloodType !== 'unknown'`
 * trong AssignedResidentDetailPage.jsx), Mobile theo đúng quy tắc đó thay vì
 * in ra chữ "unknown".
 */

const NS = 'nurse.residents';

export const GENDERS = ['male', 'female', 'other'] as const;
export const RESIDENCY_STATUSES = ['admitted', 'discharged', 'transferred', 'pending'] as const;

const isTechnicalSlug = (value: string) => /^[a-z0-9_]+$/.test(value);
const humanize = (value: string) => value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Tuổi tính theo ngày sinh; trả null nếu thiếu/không hợp lệ để phía gọi tự ẩn dòng. */
export const getAge = (dob?: string | null): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

export const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
};

/**
 * Chuẩn hoá mảng chuỗi từ API: bỏ rỗng, bỏ trùng, cắt khoảng trắng.
 * Dùng cho dị ứng / bệnh mãn tính vốn có thể chứa phần tử rỗng trong dữ liệu cũ.
 */
export const cleanList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const s = String(item ?? '').trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
};

/**
 * Tách dị ứng thuốc / dị ứng khác theo đúng quy tắc của Web
 * (`pickDrugAllergiesList` + `formatAllergies`): cột `drugAllergies` được ưu tiên,
 * `allergies` chỉ là nguồn dự phòng khi `drugAllergies` không phải mảng; phần
 * còn lại của `allergies` (không trùng) mới tính là dị ứng khác.
 */
export const splitAllergies = (resident: any): { drug: string[]; other: string[] } => {
  const drug = Array.isArray(resident?.drugAllergies)
    ? cleanList(resident.drugAllergies)
    : cleanList(resident?.allergies);
  const other = cleanList(resident?.allergies).filter(
    (a) => !drug.some((d) => d.toLowerCase() === a.toLowerCase())
  );
  return { drug, other };
};

/**
 * Gỡ `roomNumber` / `bedCode` ... từ object đã populate. Trả chuỗi rỗng nếu API
 * chỉ trả về ObjectId dạng chuỗi — thà bỏ trống còn hơn in ObjectId ra màn hình.
 */
const pickPopulated = (value: any, ...fields: string[]): string => {
  if (!value || typeof value !== 'object') return '';
  for (const f of fields) {
    const v = value[f];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

export const useResidentLabels = () => {
  const { t } = useTranslation();

  const lookup = (group: string, known: readonly string[]) =>
    (value?: string | null, fallback = ''): string => {
      const key = (value ?? '').trim().toLowerCase();
      if (!key) return fallback;
      if (known.includes(key)) return t(`${NS}.${group}.${key}`, { defaultValue: humanize(key) });
      return isTechnicalSlug(key) ? humanize(key) : String(value).trim();
    };

  const getGenderLabel = lookup('genders', GENDERS);
  const getResidencyLabel = lookup('residencyStatuses', RESIDENCY_STATUSES);

  /** '' khi chưa ghi nhận hoặc bằng 'unknown' — theo đúng cách Web ẩn trường này. */
  const getBloodTypeLabel = (value?: string | null): string => {
    const raw = (value ?? '').trim();
    if (!raw || raw.toLowerCase() === 'unknown') return '';
    return raw.toUpperCase();
  };

  /**
   * Tách khối vị trí của cư dân theo đúng thứ tự ưu tiên mà Web dùng
   * (`Fe/src/utils/residentArea.js`): `label` > `name` > số thứ tự kèm tiền tố.
   * Nhờ vậy cùng một cư dân, Mobile và Web đọc ra y hệt một chuỗi.
   *
   * API trả sẵn khối `area` đã populate (room/floor/building/bed); nếu thiếu thì
   * lùi về các trường phẳng. Không bao giờ in `_id`.
   */
  const getArea = (resident: any): { building: string; floor: string; room: string; bed: string } => {
    const src = resident?.area && typeof resident.area === 'object'
      ? {
          room: resident.area.room ?? resident.room,
          floor: resident.area.floor ?? resident.floor,
          building: resident.area.building ?? resident.building,
          bed: resident.area.bed ?? resident.bed,
        }
      : { room: resident?.room, floor: resident?.floor, building: resident?.building, bed: resident?.bed };

    const building = pickPopulated(src.building, 'name', 'code');

    let floor = pickPopulated(src.floor, 'label', 'name');
    if (!floor && src.floor?.floorNumber != null) {
      floor = t(`${NS}.floorValue`, { value: src.floor.floorNumber });
    }

    let room = pickPopulated(src.room, 'label');
    if (!room && src.room?.roomNumber != null && String(src.room.roomNumber) !== '') {
      room = t(`${NS}.roomValue`, { value: src.room.roomNumber });
    }

    const bedCode = pickPopulated(src.bed, 'bedCode');
    // `bedType` là enum thô của backend ('normal' | 'electric' | 'icu'); phải đi qua
    // bảng nhãn dùng chung `status.*`, nếu không màn hình in thẳng chữ "normal".
    const bedType = pickPopulated(src.bed, 'bedType');
    const bedTypeLabel = bedType ? t(`status.${bedType}`, { defaultValue: '' }) : '';
    const bed = bedCode ? (bedTypeLabel ? `${bedCode} (${bedTypeLabel})` : bedCode) : '';

    return { building, floor, room, bed };
  };

  /** true khi có ít nhất một phần vị trí — tương đương `hasAssignedArea` của Web. */
  const hasArea = (resident: any): boolean => {
    const a = getArea(resident);
    return Boolean(a.building || a.floor || a.room);
  };

  return { getGenderLabel, getResidencyLabel, getBloodTypeLabel, getArea, hasArea };
};
