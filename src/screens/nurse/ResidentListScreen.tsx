import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Searchbar, Chip, Portal, Dialog, Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResidents } from '../../hooks/useResidents';
import { ResidentCard } from '../../components/cards/ResidentCard';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.residents';

const getAge = (dob?: string): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const getRoomLabel = (roomId: any): string => {
  if (!roomId) return '';
  if (typeof roomId === 'object' && roomId.roomNumber) return roomId.roomNumber;
  return '';
};

export const ResidentListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const STATUS_OPTIONS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'admitted', label: t(`${NS}.filterAdmitted`) },
    { value: 'pending', label: t(`${NS}.filterPending`) },
    { value: 'discharged', label: t(`${NS}.filterDischarged`) },
  ];

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (text: string) => {
    setSearch(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  };

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  }), [debouncedSearch, statusFilter]);

  const { data, isLoading, isFetching, error, refetch } = useResidents(params);
  const residents = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Searchbar
          placeholder={t(`${NS}.searchPlaceholder`)}
          value={search}
          onChangeText={onSearch}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
        <View style={styles.chips}>
          {STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={statusFilter === opt.value}
              onPress={() => setStatusFilter(opt.value)}
              style={[styles.chip, statusFilter === opt.value && { backgroundColor: roleColor }]}
              textStyle={statusFilter === opt.value ? { color: '#fff' } : undefined}
              compact
            >
              {opt.label}
            </Chip>
          ))}
        </View>
      </View>

      <ScreenLayout
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={refetch}
        isEmpty={residents.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={residents}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }) => (
            <ResidentCard resident={item} onPress={() => setSelected(item)} />
          )}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={roleColor} />}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!selected} onDismiss={() => setSelected(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{selected?.fullName}</Dialog.Title>
          <Dialog.Content>
            {selected?.residentCode ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(`${NS}.residentCode`)}</Text>
                <Text style={styles.detailValue}>{selected.residentCode}</Text>
              </View>
            ) : null}
            {getAge(selected?.dateOfBirth) != null ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(`${NS}.age`)}</Text>
                <Text style={styles.detailValue}>{getAge(selected?.dateOfBirth)}</Text>
              </View>
            ) : null}
            {getRoomLabel(selected?.roomId) ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(`${NS}.room`)}</Text>
                <Text style={styles.detailValue}>{getRoomLabel(selected?.roomId)}</Text>
              </View>
            ) : null}
            {selected?.gender ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t(`${NS}.gender`)}</Text>
                <Text style={styles.detailValue}>{selected.gender}</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t(`${NS}.status`)}</Text>
              <StatusBadge status={selected?.residencyStatus} size="sm" />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>{t('common.close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  header: { backgroundColor: c.surface, paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: { marginBottom: 8, elevation: 0, backgroundColor: c.surfaceAlt },
  searchInput: { fontSize: 14 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { fontSize: 12, color: c.textSecondary },
  detailValue: { fontSize: 14, color: c.text, fontWeight: '500' },
});
