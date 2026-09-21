import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#000666';
const NS = 'publicPages.news';

const FILTERS = ['Tất cả', 'Chăm sóc người già', 'Dinh dưỡng', 'Alzheimer', 'Sức khỏe tinh thần', 'Công nghệ chăm sóc'];

const ARTICLES = [
  { title: 'Phương pháp tiếp cận mới trong chăm sóc người cao tuổi tại An Nhiên', date: '15/10/2024', badge: 'Chăm sóc người già', excerpt: 'Khám phá cách tiếp cận toàn diện kết hợp y học hiện đại và sự thấu hiểu tâm lý người cao tuổi.' },
  { title: 'Thực đơn cá nhân hóa cho từng thể trạng cư dân', date: '12/10/2024', badge: 'Dinh dưỡng', excerpt: 'Đội ngũ chuyên gia dinh dưỡng thiết kế thực đơn riêng biệt dựa trên tình trạng sức khỏe từng người.' },
  { title: 'Liệu pháp nghệ thuật trong việc duy trì trí nhớ', date: '08/10/2024', badge: 'Alzheimer', excerpt: 'Các hoạt động nghệ thuật trị liệu giúp cư dân mắc Alzheimer duy trì kết nối và trí nhớ.' },
  { title: 'Cảm biến thông minh: Theo dõi sức khỏe 24/7', date: '05/10/2024', badge: 'Công nghệ chăm sóc', excerpt: 'Hệ thống cảm biến IoT giúp phát hiện sớm các bất thường về sức khỏe của cư dân.' },
  { title: 'Thiết kế không gian "Ma" cho người bệnh Alzheimer', date: '01/10/2024', badge: 'Sức khỏe tinh thần', excerpt: 'Triết lý không gian tối giản Nhật Bản giúp giảm căng thẳng cho người bệnh Alzheimer.' },
];

export const NewsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('Tất cả');

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Tin Tức & Kiến Thức</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}
              style={filter === f ? { backgroundColor: COLOR } : undefined}
              textStyle={filter === f ? { color: '#fff' } : undefined} compact>{f}</Chip>
          ))}
        </ScrollView>

        {ARTICLES.filter((a) => filter === 'Tất cả' || a.badge === filter).map((a, i) => (
          <Card key={i} style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.badge}>{a.badge}</Text>
              <Text style={styles.articleTitle}>{a.title}</Text>
              <Text style={styles.excerpt}>{a.excerpt}</Text>
              <Text style={styles.date}>{a.date}</Text>
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
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLOR, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  badge: { fontSize: 10, fontWeight: '700', color: COLOR, textTransform: 'uppercase', marginBottom: 4 },
  articleTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 19 },
  excerpt: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 6 },
  date: { fontSize: 11, color: '#9CA3AF' },
});
