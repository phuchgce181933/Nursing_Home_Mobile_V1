import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Searchbar, IconButton, Dialog, Portal, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCaregiverResidents, useCaregiverResidentDetail } from '../../hooks/useResidents';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';

const COLOR = '#6B4200';
const NS = 'assistant.residents';

export const AssignedResidentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const listQ = useCaregiverResidents({ search: search || undefined });
  const residents = listQ.data?.data ?? [];

  const detailQ = useCaregiverResidentDetail(detailId ?? undefined);
  const resident = detailQ.data?.data ?? detailQ.data;

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

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={residents.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={residents} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setDetailId(item._id)}>
              <Card.Content style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: COLOR + '15' }]}>
                  <MaterialCommunityIcons name="account" size={22} color={COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.meta}>{item.residentCode} {item.room ? `· ${t(`${NS}.room`)} ${item.room}` : ''}</Text>
                  {(item.drugAllergies?.length || item.allergies?.length) ? (
                    <Text style={styles.allergyText} numberOfLines={1}>
                      {t(`${NS}.allergies`)}: {[...(item.drugAllergies ?? []), ...(item.allergies ?? [])].join(', ')}
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!detailId} onDismiss={() => setDetailId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{resident?.fullName ?? t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            {detailQ.isLoading ? (
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            ) : (
              <View style={{ paddingVertical: 8 }}>
                <Text style={styles.detailRow}>{t(`${NS}.residentCode`)}: {resident?.residentCode ?? '—'}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.age`)}: {resident?.age ?? '—'}</Text>
                <Text style={styles.detailRow}>{t(`${NS}.bloodType`)}: {resident?.bloodType ?? '—'}</Text>
                <Text style={styles.detailRow}>
                  {t(`${NS}.location`)}: {[resident?.building, resident?.floor, resident?.room, resident?.bed].filter(Boolean).join(' · ') || '—'}
                </Text>
                <Divider style={{ marginVertical: 10 }} />
                <Text style={styles.sectionTitle}>{t(`${NS}.drugAllergies`)}</Text>
                <Text style={styles.detailText}>{resident?.drugAllergies?.length ? resident.drugAllergies.join(', ') : t(`${NS}.none`)}</Text>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t(`${NS}.otherAllergies`)}</Text>
                <Text style={styles.detailText}>{resident?.allergies?.length ? resident.allergies.join(', ') : t(`${NS}.none`)}</Text>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t(`${NS}.chronicConditions`)}</Text>
                <Text style={styles.detailText}>{resident?.chronicConditions?.length ? resident.chronicConditions.join(', ') : t(`${NS}.none`)}</Text>
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
