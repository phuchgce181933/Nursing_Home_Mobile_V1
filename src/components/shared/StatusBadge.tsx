import React from 'react';
import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { getStatusEntry } from '../../utils/statusMap';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = {
  status?: string | null;
  size?: 'sm' | 'md';
  /**
   * Nhãn hiển thị do phía gọi cung cấp, ghi đè bản dịch mặc định `status.*`.
   *
   * Cần thiết khi cùng một mã trạng thái mang nghĩa khác nhau theo nghiệp vụ —
   * ví dụ `in_progress` là "Đang làm" với nhiệm vụ chăm sóc nhưng là "Đang xử lý"
   * với sự cố. Bỏ trống thì hành vi giữ nguyên như cũ.
   */
  label?: string;
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md', label: labelOverride }) => {
  const { t } = useTranslation();
  const { effectiveScheme } = useThemeMode();
  const entry = getStatusEntry(status, effectiveScheme);
  const fontSize = size === 'sm' ? 10 : 11;
  const paddingH = size === 'sm' ? 8 : 10;
  const label =
    labelOverride ?? (entry.i18nKey ? t(entry.i18nKey, { defaultValue: status ?? '' }) : (status ?? ''));

  return (
    <Chip
      compact
      textStyle={{ fontSize, color: entry.textColor, fontWeight: '600' }}
      style={{
        backgroundColor: entry.bgColor,
        paddingHorizontal: paddingH,
        // minHeight (not height): a hard height can clip the label on longer status
        // strings, since Paper's Chip has its own internal vertical padding/line-height.
        minHeight: size === 'sm' ? 24 : 28,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label}
    </Chip>
  );
};
