import React, { useState } from 'react';
import { ScrollView, View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';

const COLOR = '#2E7D32';
const NS = 'family.health';

export const FamilyHealthScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const SHORTCUTS = [
    { route: 'Medications', label: t(`${NS}.shortcutMedications`), icon: 'pill' },
    { route: 'DailyCare', label: t(`${NS}.shortcutDailyCare`), icon: 'calendar-heart' },
    { route: 'Activities', label: t(`${NS}.shortcutActivities`), icon: 'run' },
    { route: 'Photos', label: t(`${NS}.shortcutPhotos`), icon: 'image-multiple-outline' },
  ] as const;

  const residentsQ = useQuery({
    queryKey: ['familyResidents'],
    queryFn: async () => { const r = await api.get(FAMILY.RESIDENTS); return r.data; },
  });
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? residents[0]?._id;

  const historyQ = useQuery({
    queryKey: ['familyHealth', activeId],
    queryFn: async () => { const r = await api.get(FAMILY.HEALTH_HISTORY(activeId!)); return r.data; },
    enabled: !!activeId,
  });

  const careNotesQ = useQuery({
    queryKey: ['familyCareNotes', activeId],
    queryFn: async () => { const r = await api.get(FAMILY.CARE_NOTES(activeId!)); return r.data; },
    enabled: !!activeId,
  });

  const records = historyQ.data?.data ?? historyQ.data ?? [];
  const careNotes = careNotesQ.data?.data ?? careNotesQ.data ?? [];
  const loading = residentsQ.isLoading || historyQ.isLoading;
  const refetch = () => { historyQ.refetch(); careNotesQ.refetch(); };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
      </View>

      {residents.length > 1 ? (
        <View style={styles.chipRow}>
          {residents.map((r: any) => (
            <Chip key={r._id} selected={activeId === r._id} onPress={() => setSelectedId(r._id)}
              style={activeId === r._id ? { backgroundColor: COLOR } : undefined}
              textStyle={activeId === r._id ? { color: '#fff' } : undefined} compact>{r.fullName}</Chip>
          ))}
        </View>
      ) : null}

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLOR} />}>
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map((s) => (
            <Pressable key={s.route} style={styles.shortcutItem} onPress={() => navigation.navigate(s.route)}>
              <View style={[styles.shortcutIcon, { backgroundColor: COLOR }]}>
                <MaterialCommunityIcons name={s.icon as any} size={22} color="#fff" />
              </View>
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <ScreenLayout loading={loading} error={historyQ.error ? (historyQ.error as Error).message : null} onRetry={refetch}>
          <SectionHeader title={t(`${NS}.historyTitle`)} roleColor={COLOR} />
          {records.length === 0 ? <Text style={styles.empty}>{t(`${NS}.noData`)}</Text> : null}
          {records.slice(0, 10).map((rec: any) => (
            <Card key={rec._id} style={styles.card} mode="outlined">
              <Card.Content>
                <Text style={styles.recDate}>
                  {rec.measuredAt ? new Date(rec.measuredAt).toLocaleString('vi-VN') : ''}
                </Text>
                <Text style={styles.recVitals}>
                  HA: {rec.bloodPressureSystolic ?? '--'}/{rec.bloodPressureDiastolic ?? '--'} · Tim: {rec.pulse ?? '--'} · SpO2: {rec.oxygenSaturation ?? '--'}% · T°: {rec.temperatureCelsius ?? '--'}°C
                </Text>
                {rec.summary ? <Text style={styles.recSummary}>{rec.summary}</Text> : null}
              </Card.Content>
            </Card>
          ))}

          <SectionHeader title={t(`${NS}.careNotesTitle`)} roleColor={COLOR} />
          {careNotes.length === 0 ? <Text style={styles.empty}>{t(`${NS}.noCareNotes`)}</Text> : null}
          {careNotes.slice(0, 10).map((note: any) => (
            <Card key={note._id} style={styles.card} mode="outlined">
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status={note.noteType} size="sm" />
                  <Text style={styles.noteDate}>
                    {note.noteAt ? new Date(note.noteAt).toLocaleString('vi-VN') : ''}
                  </Text>
                </View>
                <Text style={styles.noteContent} numberOfLines={3}>{note.content}</Text>
              </Card.Content>
            </Card>
          ))}
        </ScreenLayout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  body: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  recDate: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  recVitals: { fontSize: 13, color: '#111827', fontWeight: '500' },
  recSummary: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  noteDate: { fontSize: 11, color: '#9CA3AF' },
  noteContent: { fontSize: 13, color: '#374151', marginTop: 6 },
  empty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  shortcutItem: { alignItems: 'center', flex: 1, gap: 6 },
  shortcutIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 11, color: '#374151', textAlign: 'center' },
});
