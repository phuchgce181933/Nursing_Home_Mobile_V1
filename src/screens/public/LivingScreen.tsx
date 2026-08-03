import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#000666';
const NS = 'publicPages.living';

const AMENITIES = [
  { icon: 'bed-king-outline', badge: 'Nghỉ Ngơi', title: 'Phòng Nghỉ Cao Cấp', desc: 'Không gian riêng tư, ánh sáng tự nhiên, thiết kế tối giản theo phong cách Nhật Bản.' },
  { icon: 'flower-tulip-outline', badge: 'Thư Giãn', title: 'Khu Vườn Thiền', desc: 'Không gian xanh mát để cư dân dạo bộ, thư giãn và tĩnh tâm mỗi ngày.' },
  { icon: 'silverware-fork-knife', badge: 'Dinh Dưỡng', title: 'Nhà Ăn Dinh Dưỡng', desc: 'Thực đơn cân bằng dinh dưỡng, không gian ăn uống ấm cúng, sạch sẽ.' },
  { icon: 'run', badge: 'Y Tế', title: 'Khu Phục Hồi Chức Năng', desc: 'Trang thiết bị vật lý trị liệu hiện đại, hỗ trợ phục hồi vận động.' },
  { icon: 'account-group-outline', badge: 'Cộng Đồng', title: 'Sinh Hoạt Cộng Đồng', desc: 'Các hoạt động giao lưu, giải trí giúp cư dân kết nối và vui sống mỗi ngày.' },
];

export const LivingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Trải Nghiệm Không Gian Sống Chuẩn Nhật</Text>
        <Text style={styles.paragraph}>Lấy cảm hứng từ triết lý không gian "Ma" tối giản của Nhật Bản, mang lại sự bình yên cho mỗi cư dân.</Text>

        {AMENITIES.map((a, i) => (
          <Card key={i} style={styles.card} mode="outlined">
            <Card.Content style={styles.row}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={a.icon as any} size={24} color={COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.badge}>{a.badge}</Text>
                <Text style={styles.title}>{a.title}</Text>
                <Text style={styles.desc}>{a.desc}</Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Button mode="outlined" textColor={COLOR} style={styles.cta} contentStyle={{ height: 48 }} onPress={() => navigation.navigate('GuestAdmissionRequest')}>
          Khám Phá Trực Tiếp Không Gian
        </Button>
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
  badge: { fontSize: 10, fontWeight: '700', color: COLOR, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  desc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  cta: { borderRadius: 8, marginTop: 8, borderColor: COLOR },
});
