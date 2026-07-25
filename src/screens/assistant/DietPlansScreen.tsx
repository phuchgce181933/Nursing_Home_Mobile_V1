import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton, Dialog, Portal, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCaregiverDietPlanResidents, useCaregiverDietPlanOverview, useCaregiverDietPlanDetail } from '../../hooks/useCaregiverDietPlans';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';

const COLOR = '#6B4200';
const NS = 'assistant.dietPlans';
const today = () => new Date().toISOString().split('T')[0];

export const DietPlansScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [workDate, setWorkDate] = useState(today());
  const [residentId, setResidentId] = useState('');
  const [detailResidentId, setDetailResidentId] = useState<string | null>(null);

  const residentsQ = useCaregiverDietPlanResidents();
  const residents = residentsQ.data?.data ?? [];

  const overviewQ = useCaregiverDietPlanOverview({ workDate, residentId: residentId || undefined });
  const rows = overviewQ.data?.data ?? [];

  const detailQ = useCaregiverDietPlanDetail(detailResidentId ?? undefined, { workDate });
  const detail = detailQ.data?.data ?? detailQ.data;

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.filters}>
        <CalendarPicker label={t(`${NS}.dateLabel`)} value={workDate} onChange={setWorkDate} color={COLOR} />
        {residents.length > 0 && (
          <View style={styles.chipRow}>
            <Chip selected={!residentId} onPress={() => setResidentId('')}
              style={!residentId ? { backgroundColor: COLOR } : undefined}
              textStyle={!residentId ? { color: '#fff' } : undefined} compact>{t(`${NS}.filterAll`)}</Chip>
            {residents.map((r: any) => (
              <Chip key={r._id} selected={residentId === r._id} onPress={() => setResidentId(r._id)}
                style={residentId === r._id ? { backgroundColor: COLOR } : undefined}
                textStyle={residentId === r._id ? { color: '#fff' } : undefined} compact>{r.fullName}</Chip>
            ))}
          </View>
        )}
      </View>

      <ScreenLayout loading={overviewQ.isLoading} error={overviewQ.error ? (overviewQ.error as Error).message : null}
        onRetry={overviewQ.refetch} isEmpty={rows.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={rows} keyExtractor={(i: any) => i.residentId} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={overviewQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setDetailResidentId(item.residentId)}>
              <Card.Content>
                <Text style={styles.name}>{item.fullName} {item.residentCode ? `(${item.residentCode})` : ''}</Text>
                <View style={styles.badgeRow}>
                  <Chip compact icon={item.hasMealPlan ? 'check-circle' : 'close-circle-outline'}
                    style={item.hasMealPlan ? styles.badgeOn : styles.badgeOff}>
                    {t(`${NS}.mealPlan`)}{item.hasMealPlan ? ` (${item.mealPlanMealCount ?? 0})` : ''}
                  </Chip>
                  <Chip compact icon={item.hasSpecialDiet ? 'check-circle' : 'close-circle-outline'}
                    style={item.hasSpecialDiet ? styles.badgeOn : styles.badgeOff}>
                    {t(`${NS}.specialDiet`)}{item.hasSpecialDiet ? ` (${item.specialDietCount ?? 0})` : ''}
                  </Chip>
                </View>
                {item.allergies?.length ? (
                  <Text style={styles.allergyText}>{t(`${NS}.allergies`)}: {item.allergies.join(', ')}</Text>
                ) : null}
              </Card.Content>
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!detailResidentId} onDismiss={() => setDetailResidentId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detail?.resident?.fullName ?? t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            {detailQ.isLoading ? (
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            ) : (
              <View style={{ paddingVertical: 8 }}>
                <Text style={styles.sectionTitle}>{t(`${NS}.mealPlanSection`)}</Text>
                {detail?.mealPlan?.published ? (
                  (detail.mealPlan.meals ?? []).map((m: any, i: number) => (
                    <View key={i} style={styles.entryRow}>
                      <Text style={styles.entryMeal}>{m.mealTime ?? ''} · {m.mealType}</Text>
                      <Text style={styles.entryName}>{m.mealName}</Text>
                      {m.nutritionNote ? <Text style={styles.entryNote}>{m.nutritionNote}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>{t(`${NS}.emptyMealPlans`)}</Text>
                )}

                <Divider style={{ marginVertical: 10 }} />

                <Text style={styles.sectionTitle}>{t(`${NS}.specialDietSection`)}</Text>
                {detail?.specialDiets?.published ? (
                  (detail.specialDiets.entries ?? []).map((e: any, i: number) => (
                    <View key={i} style={styles.entryRow}>
                      <Text style={styles.entryMeal}>{e.dietType}</Text>
                      {e.restrictions ? <Text style={styles.entryName}>{e.restrictions}</Text> : null}
                      {e.notes ? <Text style={styles.entryNote}>{e.notes}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>{t(`${NS}.emptySpecialDiets`)}</Text>
                )}
              </View>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <IconButton icon="close" onPress={() => setDetailResidentId(null)} />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  filters: { padding: 12 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badgeOn: { backgroundColor: '#DCFCE7' },
  badgeOff: { backgroundColor: '#F3F4F6' },
  allergyText: { fontSize: 11, color: '#991B1B', marginTop: 6 },
  loadingText: { textAlign: 'center', paddingVertical: 24, color: '#6B7280' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLOR, marginBottom: 6 },
  entryRow: { marginBottom: 8 },
  entryMeal: { fontSize: 12, fontWeight: '600', color: '#111827' },
  entryName: { fontSize: 13, color: '#374151' },
  entryNote: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  emptyText: { fontSize: 12, color: '#9CA3AF' },
});
