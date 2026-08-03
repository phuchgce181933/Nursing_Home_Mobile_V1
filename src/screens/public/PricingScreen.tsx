import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#000666';
const NS = 'publicPages.pricing';

const PACKAGES = [
  { name: 'Cơ Bản', price: '12.000.000đ', items: ['Chăm sóc sinh hoạt hằng ngày', 'Theo dõi sức khỏe định kỳ', '3 bữa ăn dinh dưỡng/ngày'] },
  { name: 'Tiêu Chuẩn', price: '18.000.000đ', items: ['Tất cả quyền lợi gói Cơ Bản', 'Vật lý trị liệu 2 buổi/tuần', 'Phòng riêng tiện nghi', 'Bác sĩ thăm khám hàng tuần'] },
  { name: 'Cao Cấp', price: '28.000.000đ', items: ['Tất cả quyền lợi gói Tiêu Chuẩn', 'Điều dưỡng riêng theo ca', 'Phòng cao cấp view vườn', 'Bác sĩ thăm khám hàng ngày', 'Xe đưa đón khi cần'] },
  { name: 'VIP Toàn Diện', price: '45.000.000đ', items: ['Dịch vụ chuẩn 5 sao', 'Điều dưỡng riêng 24/7', 'Bác sĩ thăm khám hàng ngày', 'Xe riêng đưa đón', 'Concierge hỗ trợ mọi nhu cầu', 'Phòng VIP cao cấp nhất'] },
];

const FAQS = [
  { q: 'Chi phí hằng tháng đã bao gồm những gì?', a: 'Bao gồm ăn uống, sinh hoạt, theo dõi sức khỏe định kỳ và các dịch vụ cơ bản theo từng gói.' },
  { q: 'Có thể đổi gói dịch vụ giữa chừng không?', a: 'Có, gia đình có thể yêu cầu đổi gói bất kỳ lúc nào, chi phí sẽ được điều chỉnh tương ứng.' },
  { q: 'Giờ thăm cư dân là khi nào?', a: 'Từ 7:00 đến 20:00 hằng ngày, kể cả ngày lễ, Tết.' },
  { q: 'Có hình thức thanh toán trả góp không?', a: 'Có, thanh toán theo quý/năm được giảm 5-10%, hoặc trả góp qua ngân hàng liên kết.' },
  { q: 'Chính sách hoàn tiền khi xuất viện sớm?', a: 'Hoàn tiền phần chưa sử dụng trong vòng 7 ngày làm việc kể từ ngày xuất viện.' },
];

export const PricingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heroTitle}>Gói chăm sóc phù hợp với mọi nhu cầu</Text>

        {PACKAGES.map((pkg, i) => (
          <Card key={i} style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.pkgName}>{pkg.name}</Text>
              <Text style={styles.pkgPrice}>{pkg.price}<Text style={styles.pkgPer}>/tháng</Text></Text>
              {pkg.items.map((item, j) => (
                <View key={j} style={styles.itemRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLOR} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}

        <Text style={styles.sectionTitle}>Giải đáp thắc mắc về chi phí</Text>
        {FAQS.map((f, i) => (
          <Card key={i} style={styles.faqCard} mode="outlined" onPress={() => setOpenFaq(openFaq === i ? null : i)}>
            <Card.Content>
              <View style={styles.faqRow}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <MaterialCommunityIcons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={20} color={COLOR} />
              </View>
              {openFaq === i ? <Text style={styles.faqA}>{f.a}</Text> : null}
            </Card.Content>
          </Card>
        ))}

        <Button mode="contained" buttonColor={COLOR} style={styles.cta} contentStyle={{ height: 48 }} onPress={() => navigation.navigate('Contact')}>
          Chưa chắc gói nào phù hợp? Liên hệ ngay
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLOR, marginBottom: 16 },
  card: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  pkgName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  pkgPrice: { fontSize: 17, fontWeight: '700', color: COLOR, marginTop: 2, marginBottom: 10 },
  pkgPer: { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemText: { fontSize: 12, color: '#374151', flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  faqCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  faqA: { fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  cta: { borderRadius: 8, marginTop: 8 },
});
