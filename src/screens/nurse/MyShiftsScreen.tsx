import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMyShifts, useConfirmShift, useCheckInShift, useCheckOutShift, useCompleteShift } from '../../hooks/useShifts';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.myShifts';

export const MyShiftsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'published', label: t(`${NS}.filterPublished`) },
    { value: 'confirmed', label: t(`${NS}.filterConfirmed`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
    { value: 'cancelled', label: t(`${NS}.filterCancelled`) },
  ];

  const shiftsQ = useMyShifts({ status: filter || undefined });
  const items = shiftsQ.data?.data?.data ?? [];
  const confirmMut = useConfirmShift();
  const checkInMut = useCheckInShift();
  const checkOutMut = useCheckOutShift();
  const completeMut = useCompleteShift();

  const handleConfirm = () => {
    if (!confirmId) return;
    confirmMut.mutate(confirmId, {
      onSuccess: () => { setConfirmId(null); toast(t(`${NS}.toastConfirmed`), 'success'); },
      onError: () => toast(t(`${NS}.toastError`), 'error'),
    });
  };

  const handleCheckIn = (id: string) => {
    checkInMut.mutate(id, {
      onSuccess: () => toast(t(`${NS}.toastCheckInSuccess`), 'success'),
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastActionError`), 'error'),
    });
  };

  const handleCheckOut = (id: string) => {
    checkOutMut.mutate(id, {
      onSuccess: () => toast(t(`${NS}.toastCheckOutSuccess`), 'success'),
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastActionError`), 'error'),
    });
  };

  const handleComplete = (id: string) => {
    completeMut.mutate(id, {
      onSuccess: () => toast(t(`${NS}.toastCompleteSuccess`), 'success'),
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastActionError`), 'error'),
    });
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation.goBack()} />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: roleColor } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={shiftsQ.isLoading} error={shiftsQ.error ? (shiftsQ.error as Error).message : null}
        onRetry={shiftsQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.empty`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={shiftsQ.isFetching} onRefresh={shiftsQ.refetch} tintColor={roleColor} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.date}>
                      {item.workDate ? new Date(item.workDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                    </Text>
                    <View style={styles.timeRow}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                      <Text style={styles.time}>{item.startTime ?? ''} - {item.endTime ?? ''}</Text>
                    </View>
                    {item.location ? (
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B7280" />
                        <Text style={styles.location}>{item.location}</Text>
                      </View>
                    ) : null}
                    {item.shiftTemplateId?.name ? <Text style={[styles.template, { color: roleColor }]}>{item.shiftTemplateId.name}</Text> : null}
                    {item.checkInTime ? (
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="login" size={14} color="#065F46" />
                        <Text style={styles.checkText}>{t(`${NS}.checkedInAt`, { time: new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })}</Text>
                      </View>
                    ) : null}
                    {item.checkOutTime ? (
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="logout" size={14} color="#991B1B" />
                        <Text style={styles.checkText}>{t(`${NS}.checkedOutAt`, { time: new Date(item.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })}</Text>
                      </View>
                    ) : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'published' ? (
                <Card.Actions>
                  <Button compact mode="contained" buttonColor={roleColor} onPress={() => setConfirmId(item._id)}>{t(`${NS}.confirmButton`)}</Button>
                </Card.Actions>
              ) : null}
              {item.status === 'confirmed' && !item.checkInTime ? (
                <Card.Actions>
                  <Button compact mode="contained" buttonColor={roleColor} icon="login" onPress={() => handleCheckIn(item._id)} loading={checkInMut.isPending}>{t(`${NS}.checkIn`)}</Button>
                </Card.Actions>
              ) : null}
              {item.checkInTime && !item.checkOutTime ? (
                <Card.Actions>
                  <Button compact mode="contained" buttonColor="#991B1B" icon="logout" onPress={() => handleCheckOut(item._id)} loading={checkOutMut.isPending}>{t(`${NS}.checkOut`)}</Button>
                </Card.Actions>
              ) : null}
              {item.status === 'confirmed' ? (
                <Card.Actions>
                  <Button compact mode="contained" buttonColor={roleColor} icon="check-circle-outline" onPress={() => handleComplete(item._id)} loading={completeMut.isPending}>{t(`${NS}.complete`)}</Button>
                </Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!confirmId} onDismiss={() => setConfirmId(null)}>
          <Dialog.Title>{t(`${NS}.confirmTitle`)}</Dialog.Title>
          <Dialog.Content><Text>{t(`${NS}.confirmContent`)}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmId(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={roleColor} onPress={handleConfirm} loading={confirmMut.isPending}>{t(`${NS}.confirmButton`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface },
  row: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 14, fontWeight: '600', color: c.text, textTransform: 'capitalize' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { fontSize: 13, color: c.text },
  location: { fontSize: 12, color: c.textSecondary },
  template: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  checkText: { fontSize: 12, color: c.text },
});
