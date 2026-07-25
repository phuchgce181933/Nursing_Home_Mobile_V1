import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, IconButton, Dialog, Portal, Button, TextInput, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNutritionSummary, useNutritionResidents, useNutritionResidentDetail } from '../../hooks/useNutritionReports';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { CalendarPicker } from '../../components/shared/CalendarPicker';

const COLOR = '#0F5040';
const NS = 'nurse.nutritionReports';

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (dateStr: string, delta: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + delta));
};

const today = () => toDateStr(new Date());

const fmtDate = (str?: string) => {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};

export const NutritionReportsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const KPI_CONFIG = [
    { key: 'totalAdmittedResidents',       label: t(`${NS}.kpiAdmitted`),        icon: 'account-group-outline',    color: '#3b5bdb' },
    { key: 'residentsWithMealPlan',         label: t(`${NS}.kpiHasMealPlan`),  icon: 'silverware-fork-knife',    color: '#0891b2' },
    { key: 'residentsWithSpecialDiet',      label: t(`${NS}.kpiSpecialDiet`),      icon: 'food-apple-outline',       color: '#7c3aed' },
    { key: 'residentsWithMealTimeSchedule', label: t(`${NS}.kpiMealTimeSchedule`),       icon: 'clock-outline',            color: '#0d9488' },
    { key: 'totalMealIntakeRecords',        label: t(`${NS}.kpiIntakeRecords`),  icon: 'note-text-outline',        color: '#2563eb' },
    { key: 'residentsWithMealIntake',       label: t(`${NS}.kpiHasIntake`),      icon: 'account-check-outline',    color: '#059669' },
    { key: 'totalMealNotes',               label: t(`${NS}.kpiMealNotes`),          icon: 'chat-outline',             color: '#6366f1' },
    { key: 'residentsMissingMealPlan',      label: t(`${NS}.kpiMissingMealPlan`),        icon: 'alert-circle-outline',    color: '#dc2626' },
  ];

  const MEAL_TYPE_LABEL: Record<string, string> = {
    breakfast: t(`${NS}.mealBreakfast`), lunch: t(`${NS}.mealLunch`), dinner: t(`${NS}.mealDinner`),
  };

  const DIET_TYPE_LABEL: Record<string, string> = {
    diabetic: t(`${NS}.dietDiabetic`), low_sodium: t(`${NS}.dietLowSodium`), vegetarian: t(`${NS}.dietVegetarian`),
    high_protein: t(`${NS}.dietHighProtein`), low_fat: t(`${NS}.dietLowFat`), renal: t(`${NS}.dietRenal`),
    texture_modified: t(`${NS}.dietTextureModified`), other: t(`${NS}.dietOther`),
  };

  const INTAKE_STATUS_LABEL: Record<string, string> = {
    ate_all: t(`${NS}.intakeAteAll`), partial: t(`${NS}.intakePartial`), refused: t(`${NS}.intakeRefused`), not_applicable: t(`${NS}.intakeNotApplicable`),
  };

  const [toDate, setToDate]   = useState(today());
  const [fromDate, setFromDate] = useState(addDays(today(), -6));
  const [search, setSearch]   = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const dateParams = { from: fromDate, to: toDate };
  const residentParams = { ...dateParams, search: search.trim() || undefined, missingMealPlan: missingOnly ? 'true' : undefined, limit: 100 };

  const summaryQ  = useNutritionSummary(dateParams);
  const residentsQ = useNutritionResidents(residentParams);
  const detailQ   = useNutritionResidentDetail(selectedId ?? undefined, dateParams);

  const summary   = summaryQ.data?.data ?? summaryQ.data ?? {};
  const residents: any[] = Array.isArray(residentsQ.data?.data) ? residentsQ.data.data : [];
  const detail    = detailQ.data?.data ?? detailQ.data;

  const refetch = () => { summaryQ.refetch(); residentsQ.refetch(); };

  const setLast7 = () => { const t2 = today(); setToDate(t2); setFromDate(addDays(t2, -6)); };
  const setTodayOnly = () => { const t2 = today(); setFromDate(t2); setToDate(t2); };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <IconButton icon="filter-variant" iconColor="#fff" size={22} onPress={() => setShowFilters(v => !v)} />
        </View>
      </View>

      {showFilters && (
        <View style={styles.filterBox}>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <CalendarPicker label={t(`${NS}.fromDate`)} value={fromDate} onChange={setFromDate} color={COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <CalendarPicker label={t(`${NS}.toDate`)} value={toDate} onChange={setToDate} color={COLOR} />
            </View>
          </View>
          <TextInput
            placeholder={t(`${NS}.searchPlaceholder`)}
            mode="outlined" value={search} onChangeText={setSearch}
            dense style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
            right={search ? <TextInput.Icon icon="close" onPress={() => setSearch('')} /> : undefined}
          />
          <View style={styles.presetRow}>
            <Button compact mode="outlined" textColor={COLOR} style={styles.presetBtn} onPress={setLast7}>{t(`${NS}.last7Days`)}</Button>
            <Button compact mode="outlined" textColor={COLOR} style={styles.presetBtn} onPress={setTodayOnly}>{t(`${NS}.today`)}</Button>
            <Chip selected={missingOnly} onPress={() => setMissingOnly(v => !v)} compact
              style={missingOnly ? { backgroundColor: '#FEE2E2' } : undefined}
              textStyle={missingOnly ? { color: '#991B1B' } : undefined}>
              {t(`${NS}.missingMealPlan`)}
            </Chip>
          </View>
          <Text style={styles.rangeLabel}>{fmtDate(fromDate)} – {fmtDate(toDate)}</Text>
        </View>
      )}

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}>
        <ScreenLayout loading={summaryQ.isLoading} error={summaryQ.error ? (summaryQ.error as Error).message : null} onRetry={refetch}>

          {/* KPI grid */}
          <View style={styles.kpiGrid}>
            {KPI_CONFIG.map(cfg => (
              <Card key={cfg.key} style={styles.kpiCard}>
                <Card.Content style={styles.kpiContent}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
                  <Text style={[styles.kpiValue, { color: cfg.color }]}>{summary[cfg.key] ?? 0}</Text>
                  <Text style={styles.kpiLabel}>{cfg.label}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          {/* Resident list */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t(`${NS}.residentListTitle`)}</Text>
            <Text style={styles.sectionCount}>{t(`${NS}.resultsCount`, { count: residents.length })}</Text>
          </View>

          {residentsQ.isLoading ? (
            <Text style={styles.empty}>{t(`${NS}.loading`)}</Text>
          ) : residents.length === 0 ? (
            <Text style={styles.empty}>{t(`${NS}.noMatchingResidents`)}</Text>
          ) : (
            residents.map((r: any) => (
              <Card key={r.residentId} style={styles.resCard} mode="outlined">
                <Card.Content style={styles.resRow}>
                  <AvatarCircle name={r.fullName ?? ''} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resName}>{r.fullName ?? ''}</Text>
                    <Text style={styles.resCode}>{r.residentCode ?? ''}</Text>
                    <View style={styles.resBadges}>
                      <ResBadge ok={r.hasMealPlan} label={t(`${NS}.badgeMealPlan`)} />
                      <ResBadge ok={r.hasSpecialDiet} label={t(`${NS}.badgeSpecialDiet`)} neutral />
                      <ResBadge ok={r.hasMealTimeSchedule} label={t(`${NS}.badgeMealTime`)} neutral />
                      {r.mealIntakeCount > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{t(`${NS}.intakeCount`, { count: r.mealIntakeCount })}</Text>
                        </View>
                      )}
                      {r.mealNotesCount > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{t(`${NS}.notesCount`, { count: r.mealNotesCount })}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <IconButton icon="chevron-right" size={18} iconColor="#9CA3AF"
                    onPress={() => setSelectedId(r.residentId)} />
                </Card.Content>
              </Card>
            ))
          )}
        </ScreenLayout>
      </ScrollView>

      {/* Detail dialog */}
      <Portal>
        <Dialog visible={!!selectedId} onDismiss={() => setSelectedId(null)} style={{ borderRadius: 16 }}>
          <Dialog.ScrollArea style={{ maxHeight: 520 }}>
            {!detail ? (
              <View style={{ padding: 16 }}>
                <Text style={{ color: '#9CA3AF', textAlign: 'center' }}>
                  {detailQ.isLoading ? t(`${NS}.loading`) : t(`${NS}.noData`)}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ padding: 4 }}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <AvatarCircle name={detail.resident?.fullName ?? ''} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dName}>{detail.resident?.fullName ?? ''}</Text>
                    <Text style={styles.dCode}>{detail.resident?.residentCode ?? ''}</Text>
                  </View>
                </View>

                {/* Meta */}
                <View style={styles.detailInfo}>
                  {detail.period && (
                    <Text style={styles.dLabel}>{t(`${NS}.period`)}: <Text style={styles.dValue}>
                      {fmtDate(detail.period.from)} – {fmtDate(detail.period.to)}
                    </Text></Text>
                  )}
                  {detail.resident?.allergies?.length > 0 && (
                    <Text style={styles.dLabel}>{t(`${NS}.allergies`)}: <Text style={styles.dAllergyValue}>{detail.resident.allergies.join(', ')}</Text></Text>
                  )}
                  {detail.resident?.chronicConditions?.length > 0 && (
                    <Text style={styles.dLabel}>{t(`${NS}.chronicConditions`)}: <Text style={styles.dChronicValue}>{detail.resident.chronicConditions.join(', ')}</Text></Text>
                  )}
                </View>

                {/* Summary chips */}
                {detail.summary && (
                  <View style={styles.chipRow}>
                    <InfoChip value={detail.summary.mealPlanMealCount ?? 0} label={t(`${NS}.mealsWithPlan`)} />
                    <InfoChip value={detail.summary.mealIntakeCount ?? 0} label={t(`${NS}.intakeRecorded`)} />
                    <InfoChip value={detail.summary.mealNotesCount ?? 0} label={t(`${NS}.mealNotesLabel`)} />
                    <InfoChip value={detail.summary.daysWithData ?? 0} label={t(`${NS}.daysWithData`)} />
                  </View>
                )}

                {/* Days */}
                {!detail.days?.length ? (
                  <Text style={{ color: '#9CA3AF', marginTop: 8 }}>{t(`${NS}.noNutritionData`)}</Text>
                ) : (
                  detail.days.map((day: any, i: number) => (
                    <Card key={day.workDate ?? i} style={styles.dayCard} mode="outlined">
                      <Card.Content>
                        <Text style={styles.dayDate}>{fmtDate(day.workDate)}</Text>

                        {day.mealTimeSchedule && (
                          <DaySection title={t(`${NS}.mealTimeTitle`)}>
                            <Text style={styles.dayText}>
                              {t(`${NS}.mealBreakfast`)}: {day.mealTimeSchedule.breakfastTime ?? '--'} · {t(`${NS}.mealLunch`)}: {day.mealTimeSchedule.lunchTime ?? '--'} · {t(`${NS}.mealDinner`)}: {day.mealTimeSchedule.dinnerTime ?? '--'}
                            </Text>
                            {day.mealTimeSchedule.notes ? <Text style={styles.dayNote}>{day.mealTimeSchedule.notes}</Text> : null}
                          </DaySection>
                        )}

                        {day.mealPlanEntries?.length > 0 && (
                          <DaySection title={t(`${NS}.mealPlanTitle`)}>
                            {day.mealPlanEntries.map((m: any, j: number) => (
                              <Text key={j} style={styles.dayText}>
                                {MEAL_TYPE_LABEL[m.mealType] ?? m.mealType}: {m.mealName ?? ''}
                                {m.mealTime ? ` · ${m.mealTime}` : ''}
                                {m.calories ? ` · ${m.calories} kcal` : ''}
                              </Text>
                            ))}
                          </DaySection>
                        )}

                        {day.specialDietEntries?.length > 0 && (
                          <DaySection title={t(`${NS}.specialDietTitle`)}>
                            {day.specialDietEntries.map((s: any, j: number) => (
                              <Text key={j} style={styles.dayText}>
                                {DIET_TYPE_LABEL[s.dietType] ?? s.dietType}
                                {s.restrictions?.length ? `: ${s.restrictions.join(', ')}` : ''}
                                {s.nutritionGoal ? ` · ${s.nutritionGoal}` : ''}
                                {s.effectiveTime ? ` · ${s.effectiveTime}` : ''}
                              </Text>
                            ))}
                          </DaySection>
                        )}

                        {day.mealIntakeNotes?.length > 0 && (
                          <DaySection title={t(`${NS}.intakeTitle`)}>
                            {day.mealIntakeNotes.map((n: any, j: number) => (
                              <View key={j} style={styles.noteCard}>
                                <Text style={styles.noteTime}>
                                  {MEAL_TYPE_LABEL[n.mealType] ?? n.mealType} · {INTAKE_STATUS_LABEL[n.intakeStatus] ?? n.intakeStatus}
                                  {n.portionPercent != null && n.intakeStatus === 'partial' ? ` · ${n.portionPercent}%` : ''}
                                </Text>
                                {n.plannedMealName ? <Text style={styles.noteContent}>{t(`${NS}.plannedMeal`, { name: n.plannedMealName })}</Text> : null}
                                {n.notes ? <Text style={styles.noteContent}>{n.notes}</Text> : null}
                                <Text style={styles.noteTime}>
                                  {n.recordedAt ? new Date(n.recordedAt).toLocaleString('vi-VN') : ''}
                                  {n.authorName ? ` — ${n.authorName}` : ''}
                                </Text>
                              </View>
                            ))}
                          </DaySection>
                        )}

                        {day.mealNotes?.length > 0 && (
                          <DaySection title={t(`${NS}.mealNotesTitle`)}>
                            {day.mealNotes.map((n: any, j: number) => (
                              <View key={j} style={styles.noteCard}>
                                <Text style={styles.noteTime}>
                                  {n.noteAt ? new Date(n.noteAt).toLocaleString('vi-VN') : ''}
                                </Text>
                                <Text style={styles.noteContent}>
                                  {n.authorName ? `${n.authorName}: ` : ''}{n.content ?? ''}
                                </Text>
                              </View>
                            ))}
                          </DaySection>
                        )}
                      </Card.Content>
                    </Card>
                  ))
                )}
              </ScrollView>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSelectedId(null)} textColor={COLOR}>{t('common.close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const ResBadge: React.FC<{ ok: boolean; label: string; neutral?: boolean }> = ({ ok, label, neutral }) => (
  ok ? (
    <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
      <MaterialCommunityIcons name="check-circle" size={10} color="#065F46" />
      <Text style={[styles.badgeText, { color: '#065F46' }]}>{label}</Text>
    </View>
  ) : neutral ? null : (
    <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
      <MaterialCommunityIcons name="close-circle" size={10} color="#991B1B" />
      <Text style={[styles.badgeText, { color: '#991B1B' }]}>{label}</Text>
    </View>
  )
);

const InfoChip: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <View style={styles.infoChip}>
    <Text style={styles.infoChipText}>{value} {label}</Text>
  </View>
);

const DaySection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.daySection}>
    <Text style={styles.daySectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500', flex: 1, textAlign: 'center' },
  filterBox: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: { marginBottom: 8, backgroundColor: '#fff' },
  presetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
  presetBtn: { borderRadius: 20 },
  rangeLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  body: { padding: 12, paddingBottom: 32 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kpiCard: { width: '47.5%', borderRadius: 12 },
  kpiContent: { alignItems: 'center', paddingVertical: 10 },
  kpiValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  kpiLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionCount: { fontSize: 12, color: '#6B7280' },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  resCard: { borderRadius: 12, marginBottom: 6, backgroundColor: '#fff' },
  resRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingRight: 0 },
  resName: { fontSize: 13, fontWeight: '500', color: '#111827' },
  resCode: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  resBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '500' },
  countBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 10, color: '#0369A1', fontWeight: '500' },
  // Detail dialog
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, paddingTop: 4 },
  dName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dCode: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  detailInfo: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginBottom: 10 },
  dLabel: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  dValue: { fontWeight: '500', color: '#111827' },
  dAllergyValue: { fontWeight: '600', color: '#DC2626' },
  dChronicValue: { fontWeight: '600', color: '#D97706' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  infoChipText: { fontSize: 11, color: '#0369A1', fontWeight: '500' },
  dayCard: { marginTop: 8, borderRadius: 10, backgroundColor: '#fff' },
  dayDate: { fontSize: 14, fontWeight: '700', color: COLOR, marginBottom: 6 },
  daySection: { marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
  daySectionTitle: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dayText: { fontSize: 12, color: '#374151', marginBottom: 2 },
  dayNote: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  noteCard: { backgroundColor: '#FFFBEB', borderRadius: 6, padding: 6, marginTop: 4 },
  noteTime: { fontSize: 10, color: '#9CA3AF' },
  noteContent: { fontSize: 12, color: '#374151', marginTop: 2 },
});
