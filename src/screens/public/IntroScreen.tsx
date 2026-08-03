import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { BackHeader } from '../../components/layout/BackHeader';
import { AvatarCircle } from '../../components/shared/AvatarCircle';

const COLOR = '#000666';
const NS = 'publicPages.intro';

const TEAM = [
  { name: 'BS. Nguyễn Văn A', role: 'Giám đốc Y khoa', desc: 'Hơn 20 năm kinh nghiệm lão khoa, dẫn dắt đội ngũ y tế của An Nhiên.' },
  { name: 'ĐD. Trần Thị B', role: 'Trưởng Điều dưỡng', desc: 'Chuyên trách chăm sóc điều dưỡng toàn diện, tận tâm với từng cư dân.' },
  { name: 'ThS. Lê Văn C', role: 'Chuyên gia Dinh dưỡng', desc: 'Thiết kế thực đơn cá nhân hóa phù hợp thể trạng từng người cao tuổi.' },
  { name: 'Đội Ngũ Chăm Sóc', role: 'Điều dưỡng viên & Hộ lý', desc: 'Đội ngũ tận tâm, túc trực 24/7 hỗ trợ sinh hoạt hằng ngày cho cư dân.' },
];

const TIMELINE = [
  { year: '2018', text: 'Hình thành ý tưởng An Nhiên Care Home, lấy cảm hứng từ triết lý chăm sóc Omotenashi.' },
  { year: '2020', text: 'Khởi công xây dựng cơ sở đầu tiên tại Cần Thơ.' },
  { year: '2022', text: 'Đón những cư dân đầu tiên, quy mô 100 giường.' },
  { year: 'Hiện nay', text: 'Không ngừng mở rộng, tích hợp công nghệ IoT vào chăm sóc sức khỏe.' },
];

export const IntroScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Triết Lý Chăm Sóc Từ Trái Tim</Text>
        <Text style={styles.paragraph}>
          An Nhiên Care Home được xây dựng trên tinh thần Omotenashi — sự tận tâm phục vụ không vụ lợi của người Nhật,
          kết hợp cùng trái tim ấm áp của người Việt, để mang đến cho người cao tuổi một nơi an cư đúng nghĩa.
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.cardTitle}>Tầm Nhìn</Text>
            <Text style={styles.paragraph}>Trở thành mô hình chăm sóc người cao tuổi kiểu mẫu tại Việt Nam, chuẩn quốc tế.</Text>
          </Card.Content>
        </Card>
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.cardTitle}>Sứ Mệnh</Text>
            <Text style={styles.paragraph}>Mang đến dịch vụ chăm sóc y tế và tinh thần toàn diện, giúp người cao tuổi sống vui, sống khỏe.</Text>
          </Card.Content>
        </Card>

        <Text style={styles.sectionTitle}>Đội Ngũ Chuyên Gia</Text>
        {TEAM.map((m, i) => (
          <Card key={i} style={styles.card} mode="outlined">
            <Card.Content style={styles.teamRow}>
              <AvatarCircle name={m.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{m.name}</Text>
                <Text style={styles.teamRole}>{m.role}</Text>
                <Text style={styles.teamDesc}>{m.desc}</Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Text style={styles.sectionTitle}>Hành Trình Phát Triển</Text>
        {TIMELINE.map((item, i) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.timelineDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineYear}>{item.year}</Text>
              <Text style={styles.paragraph}>{item.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLOR, marginBottom: 8 },
  paragraph: { fontSize: 13, color: '#374151', lineHeight: 20 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  teamRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  teamName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  teamRole: { fontSize: 12, color: COLOR, marginTop: 1, marginBottom: 4 },
  teamDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLOR, marginTop: 4 },
  timelineYear: { fontSize: 13, fontWeight: '700', color: COLOR, marginBottom: 2 },
});
