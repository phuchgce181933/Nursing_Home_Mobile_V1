// Nguồn giá trị enum + nhãn tiếng Việt DÙNG CHUNG cho luồng nhập viện của Gia đình.
// Các value ở đây khớp CHÍNH XÁC với web (Nursing_Home_Fe_V1) và backend
// (Nursing_Home_Be_V1/models/enums.js). KHÔNG tự bịa thêm value: dropdown gửi lên
// đúng chuỗi backend chờ nhận, còn nhãn chỉ dùng để hiển thị.
//
// - Giới tính: khớp GENDERS = ['male','female','other','unknown'] (web chỉ cho chọn 3).
// - Quan hệ: khớp <select> web Step1 (child/spouse/sibling/legal_guardian).
// - Lý do nhập viện: khớp ADMISSION_REASONS web Step3.
// - Nhóm máu: khớp BLOOD_TYPES web Step2 (backend enum còn có 'unknown' làm mặc định).
// - Bệnh mãn tính gợi ý: khớp CHRONIC_SUGGESTIONS web ChronicSelector.

export type Option = { value: string; label: string };

export const GENDER_OPTIONS: Option[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

export const RELATIONSHIP_OPTIONS: Option[] = [
  { value: 'child', label: 'Con cái' },
  { value: 'spouse', label: 'Vợ/Chồng' },
  { value: 'sibling', label: 'Anh/Chị/Em' },
  { value: 'legal_guardian', label: 'Người giám hộ hợp pháp' },
];

export const ADMISSION_REASON_OPTIONS: Option[] = [
  { value: 'long_term_care', label: 'Chăm sóc dài hạn' },
  { value: 'rehabilitation', label: 'Phục hồi chức năng & Trị liệu' },
  { value: 'post_surgery', label: 'Phục hồi sau phẫu thuật' },
  { value: 'hospice', label: 'Chăm sóc giảm nhẹ cuối đời' },
  { value: 'other', label: 'Lý do khác' },
];

export const BLOOD_TYPE_OPTIONS: Option[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(
  (bt) => ({ value: bt, label: bt }),
);

export const CHRONIC_SUGGESTIONS: string[] = [
  'Tiểu đường',
  'Cao huyết áp',
  'Bệnh tim mạch',
  'Hen suyễn',
  'Alzheimer',
  'Parkinson',
  'Suy thận mãn tính',
  'Viêm khớp',
];

const labelFrom = (options: Option[], value?: string | null): string => {
  if (!value) return '';
  return options.find((o) => o.value === value)?.label ?? value;
};

// Nhãn hiển thị cho danh sách/chi tiết. Nếu value không nằm trong bộ enum đã biết
// (ví dụ dữ liệu cũ nhập tay), trả về nguyên value để không mất thông tin.
export const formatRelationship = (value?: string | null) => labelFrom(RELATIONSHIP_OPTIONS, value);
export const formatAdmissionReason = (value?: string | null) => labelFrom(ADMISSION_REASON_OPTIONS, value);
export const formatGender = (value?: string | null) => {
  if (value === 'unknown') return 'Chưa xác định';
  return labelFrom(GENDER_OPTIONS, value);
};
