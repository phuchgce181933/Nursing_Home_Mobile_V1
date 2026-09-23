import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  /** Dòng phụ tuỳ chọn dưới tiêu đề (ví dụ CarePlans: "Xem thực đơn và chế độ ăn do y tá lập"). */
  subtitle?: string;
  onBack: () => void;
  color: string;
  titleColor?: string;
  right?: React.ReactNode;
};

export const BackHeader: React.FC<Props> = ({ title, subtitle, onBack, color, titleColor = '#fff', right }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { backgroundColor: color, paddingTop: insets.top + 8 }]}>
      <IconButton icon="arrow-left" iconColor={titleColor} size={22} onPress={onBack} style={styles.backBtn} />
      {/* Khối tiêu đề giữ `flex: 1` thay cho chính dòng tiêu đề, để khi có
          `subtitle` hai dòng xếp dọc mà bố cục một dòng vẫn y như cũ. */}
      <View style={styles.titleBox}>
        <Text style={[styles.topTitle, { color: titleColor }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.topSub, { color: titleColor }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 8, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  titleBox: { flex: 1 },
  topTitle: { fontSize: 16, fontWeight: '500' },
  topSub: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  right: { flexDirection: 'row', alignItems: 'center' },
});
