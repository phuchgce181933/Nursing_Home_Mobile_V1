import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#000666';
const NS = 'publicPages.services';

const PACKAGES = [
  { name: 'Cơ Bản', price: '12.000.000đ/tháng', items: ['Chăm sóc sinh hoạt hằng ngày', 'Theo dõi sức khỏe định kỳ', '3 bữa ăn dinh dưỡng/ngày'] },
  { name: 'Tiêu Chuẩn', price: '18.000.000đ/tháng', items: ['Tất cả quyền lợi gói Cơ Bản', 'Vật lý trị liệu 2 buổi/tuần', 'Phòng riêng tiện nghi', 'Bác sĩ thăm khám hàng tuần'] },
  { name: 'Cao Cấp', price: '28.000.000đ/tháng', items: ['Tất cả quyền lợi gói Tiêu Chuẩn', 'Điều dưỡng riêng theo ca', 'Phòng cao cấp view vườn', 'Bác sĩ thăm khám hàng ngày', 'Xe đưa đón khi cần'] },
];

export const ServicesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const admissionTarget = token && user?.role === 'family' ? 'GuestAdmissionRequest' : 'Contact';
  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Các Gói Dịch Vụ Chăm Sóc</Text>
        <Text style={styles.paragraph}>Lựa chọn gói dịch vụ phù hợp với nhu cầu và điều kiện của gia đình bạn.</Text>

        {PACKAGES.map((pkg, i) => (
          <Card key={i} style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.pkgName}>{pkg.name}</Text>
              <Text style={styles.pkgPrice}>{pkg.price}</Text>
              {pkg.items.map((item, j) => (
                <View key={j} style={styles.itemRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLOR} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}

        <Button
          mode="contained"
          buttonColor={COLOR}
          style={styles.cta}
          contentStyle={{ height: 48 }}
          onPress={() => navigation.navigate(admissionTarget)}
        >
          Đăng ký nhập viện
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
  pkgName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  pkgPrice: { fontSize: 15, fontWeight: '700', color: COLOR, marginTop: 2, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemText: { fontSize: 12, color: '#374151', flex: 1 },
  cta: { borderRadius: 8, marginTop: 8 },
});
