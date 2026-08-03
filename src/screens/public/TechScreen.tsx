import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#000666';
const NS = 'publicPages.tech';

const FEATURES = [
  { icon: 'heart-pulse', title: 'Bảng Điều Khiển Sức Khỏe', desc: 'Theo dõi chỉ số sức khỏe (nhịp tim, huyết áp, SpO2...) theo thời gian thực, cập nhật liên tục 24/7.' },
  { icon: 'radar', title: 'Cảm Biến Té Ngã', desc: 'Cảm biến AI phát hiện té ngã tức thì, tự động cảnh báo đội ngũ y tế để hỗ trợ kịp thời.' },
  { icon: 'file-document-outline', title: 'Hồ Sơ Điện Tử', desc: 'Hồ sơ sức khỏe điện tử, đơn thuốc tự động, kế hoạch chăm sóc và lịch sử điều trị đầy đủ.' },
  { icon: 'brain', title: 'Trí Tuệ Nhân Tạo Y Tế', desc: 'AI phân tích điện tâm đồ, dự đoán nguy cơ té ngã, theo dõi SpO2, nhận diện khuôn mặt, phân tích giấc ngủ, cảnh báo dị ứng — độ chính xác 98.7%.' },
  { icon: 'account-heart-outline', title: 'Kết Nối Gia Đình', desc: 'Ứng dụng di động giúp gia đình theo dõi tình trạng sức khỏe và hoạt động của người thân mọi lúc, mọi nơi.' },
];

export const TechScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Công Nghệ Chăm Sóc Thông Minh</Text>
        <Text style={styles.paragraph}>Ứng dụng công nghệ hiện đại để chăm sóc sức khỏe người cao tuổi an toàn và chính xác hơn.</Text>

        {FEATURES.map((f, i) => (
          <Card key={i} style={styles.card} mode="outlined">
            <Card.Content style={styles.row}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={f.icon as any} size={24} color={COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featTitle}>{f.title}</Text>
                <Text style={styles.featDesc}>{f.desc}</Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLOR, marginBottom: 8 },
  paragraph: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 16 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center' },
  featTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  featDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
});
