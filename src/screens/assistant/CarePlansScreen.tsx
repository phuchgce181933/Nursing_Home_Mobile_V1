import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMealPlans } from '../../hooks/useMealPlans';
import { useSpecialDiets } from '../../hooks/useSpecialDiets';
import { useNutritionSummary } from '../../hooks/useNutritionReports';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';

const COLOR = '#6B4200';
const NS = 'assistant.carePlans';

export const CarePlansScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const MEAL_TYPE_LABEL: Record<string, string> = {
    breakfast: t(`${NS}.mealBreakfast`), lunch: t(`${NS}.mealLunch`), dinner: t(`${NS}.mealDinner`),
  };
  const DIET_TYPE_LABEL: Record<string, string> = {
    diabetic: t(`${NS}.dietDiabetic`), low_sodium: t(`${NS}.dietLowSodium`), renal: t(`${NS}.dietRenal`),
    high_protein: t(`${NS}.dietHighProtein`), soft_texture: t(`${NS}.dietSoftTexture`), liquid_only: t(`${NS}.dietLiquidOnly`), custom: t(`${NS}.dietCustom`),
  };

  const mealPlansQ = useMealPlans({ status: 'published' });
  const specialDietsQ = useSpecialDiets({ status: 'published' });
  const summaryQ = useNutritionSummary();

  const mealPlanDays = Array.isArray(mealPlansQ.data?.data) ? mealPlansQ.data.data : [];
  const dietDays = Array.isArray(specialDietsQ.data?.data) ? specialDietsQ.data.data : [];
  const summary = summaryQ.data?.data;

  const loading = mealPlansQ.isLoading || specialDietsQ.isLoading || summaryQ.isLoading;
  const refetch = () => { mealPlansQ.refetch(); specialDietsQ.refetch(); summaryQ.refetch(); };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
        <Text style={styles.topSub}>{t(`${NS}.subtitle`)}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}
      >
        <ScreenLayout loading={loading} error={null} onRetry={refetch}>
          {summary ? (
            <>
              <SectionHeader title={t(`${NS}.summaryTitle`)} roleColor={COLOR} />
              <View style={styles.summaryGrid}>
                {[
                  { label: t(`${NS}.kpiHasMealPlan`), value: summary.residentsWithMealPlan },
                  { label: t(`${NS}.kpiSpecialDiet`), value: summary.residentsWithSpecialDiet },
                  { label: t(`${NS}.kpiMissingMealPlan`), value: summary.residentsMissingMealPlan },
                ].map((s, i) => (
                  <Card key={i} style={styles.summaryCard}>
                    <Card.Content style={styles.summaryContent}>
                      <Text style={styles.summaryValue}>{s.value}</Text>
                      <Text style={styles.summaryLabel}>{s.label}</Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title={t(`${NS}.mealPlansTitle`)} roleColor={COLOR} />
          {mealPlanDays.length ? (
            mealPlanDays.map((day: any) => (
              <Card key={day._id} style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.cardTitle}>{day.title || new Date(day.workDate).toLocaleDateString('vi-VN')} · {day.careStage}</Text>
                  {(day.entries ?? []).map((entry: any) => (
                    <View key={entry._id} style={styles.entryRow}>
                      <Chip compact style={styles.mealChip}>{MEAL_TYPE_LABEL[entry.mealType] ?? entry.mealType}</Chip>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryName}>{entry.residentId?.fullName ?? '--'} · {entry.mealName}</Text>
                      </View>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>{t(`${NS}.emptyMealPlans`)}</Text>
          )}

          <SectionHeader title={t(`${NS}.specialDietsTitle`)} roleColor={COLOR} />
          {dietDays.length ? (
            dietDays.map((day: any) => (
              <Card key={day._id} style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.cardTitle}>{day.title || new Date(day.workDate).toLocaleDateString('vi-VN')}</Text>
                  {(day.entries ?? []).map((entry: any) => (
                    <View key={entry._id} style={styles.entryRow}>
                      <Chip compact style={styles.dietChip}>{DIET_TYPE_LABEL[entry.dietType] ?? entry.dietType}</Chip>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryName}>{entry.residentId?.fullName ?? '--'}</Text>
                        {entry.notes ? <Text style={styles.entryNote} numberOfLines={2}>{entry.notes}</Text> : null}
                      </View>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>{t(`${NS}.emptySpecialDiets`)}</Text>
          )}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  body: { padding: 16, paddingBottom: 32 },

  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  summaryCard: { flex: 1, borderRadius: 12 },
  summaryContent: { alignItems: 'center', paddingVertical: 12 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLOR },
  summaryLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: 'center' },

  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8, textTransform: 'capitalize' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  mealChip: { backgroundColor: '#FEF3C7' },
  dietChip: { backgroundColor: '#EDE9FE' },
  entryName: { fontSize: 13, color: '#111827', fontWeight: '500' },
  entryNote: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
});
