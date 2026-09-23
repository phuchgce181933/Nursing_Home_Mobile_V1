import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Searchbar, IconButton, Dialog, Portal, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCaregiverResidents, useCaregiverResidentDetail } from '../../hooks/useResidents';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { cleanList, splitAllergies, useResidentLabels } from '../../utils/residentLabels';

const COLOR = '#6B4200';
const NS = 'assistant.residents';

/**
 * Cư dân được phân công (hộ lý).
 *
 * `GET /api/caregiver/residents` trả về khối vị trí đã populate dưới dạng OBJECT:
 *   room     { _id, roomNumber, label: 'Phòng 101' }
 *   floor    { _id, name: 'Tầng 1', floorNumber, label: 'Tầng 1 · Tòa điều dưỡng chính' }
 *   building { _id, code, name: 'Tòa điều dưỡng chính' }
 *   bed      { _id, bedCode: '101-A', bedType }
 * (services/assignedResidentService.js -> formatResident/mapAreaFromRoom)
 *
 * Nội suy thẳng các object này vào chuỗi sinh ra "[object Object]" — đó chính là
 * lỗi cũ. Mọi nhãn vị trí/nhóm máu/dị ứng đều đi qua `useResidentLabels`, vốn áp
 * đúng thứ tự ưu tiên mà Web dùng (Fe/src/utils/residentArea.js) nên cùng một cư
 * dân đọc ra giống hệt nhau trên hai nền tảng.
 */
export const AssignedResidentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const { getArea, getBloodTypeLabel } = useResidentLabels();

  const listQ = useCaregiverResidents({ search: search || undefined });
  const residents = listQ.data?.data ?? [];

  const detailQ = useCaregiverResidentDetail(detailId ?? undefined);
  const resident = detailQ.data?.data ?? detailQ.data;

  const notUpdated = t('profile.notUpdated');

  /** Dị ứng trên thẻ danh sách: cùng cách ghép của Web `formatAllergies`. */
  const allergySummary = (item: any): string => {
    const { drug, other } = splitAllergies(item);
    const parts: string[] = [];
    if (drug.length) parts.push(`${t(`${NS}.allergiesDrug`)}: ${drug.join(', ')}`);
    if (other.length) parts.push(`${t(`${NS}.allergiesOther`)}: ${other.join(', ')}`);
    return parts.join(' · ');
  };

  const detail = resident ? getArea(resident) : { building: '', floor: '', room: '', bed: '' };
  const detailAllergies = splitAllergies(resident);
  const chronic = cleanList(resident?.chronicConditions);
  const bloodType = getBloodTypeLabel(resident?.bloodType);

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={COLOR} onBack={() => navigation.goBack()} />
      <View style={styles.searchBarWrap}>
        <Searchbar
          placeholder={t(`${NS}.searchPlaceholder`)}
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      <ScreenLayout
        loading={listQ.isLoading}
        // Không in message của axios — đó là chuỗi kỹ thuật tiếng Anh.
        error={listQ.error ? t(`${NS}.loadError`) : null}
        onRetry={listQ.refetch}
        isEmpty={residents.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList data={residents} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const area = getArea(item);
            const allergies = allergySummary(item);
            const meta = [item.residentCode, area.room, area.bed].filter(Boolean).join(' · ');
            return (
              <Card style={styles.card} mode="outlined" onPress={() => setDetailId(item._id)}>
                <Card.Content style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: COLOR + '15' }]}>
                    <MaterialCommunityIcons name="account" size={22} color={COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.meta}>{meta}</Text>
                    {allergies ? (
                      <Text style={styles.allergyText} numberOfLines={1}>{allergies}</Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
                </Card.Content>
              </Card>
            );
          }} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!detailId} onDismiss={() => setDetailId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{resident?.fullName ?? t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            {detailQ.isLoading ? (
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            ) : (
              <View style={{ paddingVertical: 8 }}>
                <Text style={styles.detailRow}>{t(`${NS}.residentCode`)}: {resident?.residentCode || notUpdated}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.age`)}: {resident?.age ?? notUpdated}</Text>
                {/* bloodType mặc định của schema là 'unknown' — Web ẩn hẳn dòng này,
                    Mobile hiển thị "Chưa cập nhật" thay vì in ra chữ "unknown". */}
                <Text style={styles.detailRow}>{t(`${NS}.bloodType`)}: {bloodType || notUpdated}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.building`)}: {detail.building || notUpdated}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.floor`)}: {detail.floor || notUpdated}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.room`)}: {detail.room || notUpdated}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.bed`)}: {detail.bed || notUpdated}</Text>
                <Divider style={{ marginVertical: 10 }} />
                {/* Hai cột dị ứng KHÔNG được hoán đổi: `drugAllergies` -> "Dị ứng thuốc",
                    phần còn lại của `allergies` -> "Dị ứng khác" (quy tắc của Web
                    pickDrugAllergiesList + formatAllergies). */}
                <Text style={styles.sectionTitle}>{t(`${NS}.drugAllergies`)}</Text>
                <Text style={styles.detailText}>{detailAllergies.drug.length ? detailAllergies.drug.join(', ') : t(`${NS}.none`)}</Text>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t(`${NS}.otherAllergies`)}</Text>
                <Text style={styles.detailText}>{detailAllergies.other.length ? detailAllergies.other.join(', ') : t(`${NS}.none`)}</Text>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t(`${NS}.chronicConditions`)}</Text>
                <Text style={styles.detailText}>{chronic.length ? chronic.join(', ') : t(`${NS}.none`)}</Text>
                {resident?.initialHealthCondition ? (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t(`${NS}.healthCondition`)}</Text>
                    <Text style={styles.detailText}>{resident.initialHealthCondition}</Text>
                  </>
                ) : null}
              </View>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <IconButton icon="close" onPress={() => setDetailId(null)} />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  searchBarWrap: { backgroundColor: COLOR, paddingBottom: 12 },
  searchbar: { marginHorizontal: 12, marginTop: 4, borderRadius: 10, elevation: 0 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  allergyText: { fontSize: 11, color: '#991B1B', marginTop: 4 },
  loadingText: { textAlign: 'center', paddingVertical: 24, color: '#6B7280' },
  detailRow: { fontSize: 13, color: '#374151', marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLOR },
  detailText: { fontSize: 13, color: '#374151', marginTop: 2 },
});
