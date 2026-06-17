import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMealIntakeNotes, useCreateMealIntake } from '../../hooks/useMealIntake';
import { useCaregiverResidents } from '../../hooks/useResidents';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';

const COLOR = '#6B4200';
const today = () => new Date().toISOString().split('T')[0];

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Sáng' },
  { value: 'lunch', label: 'Trưa' },
  { value: 'dinner', label: 'Tối' },
];

const getCurrentMeal = (): string => {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  return 'dinner';
};

export const MealSupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [mealType, setMealType] = useState(getCurrentMeal());
  const [confirmVisible, setConfirmVisible] = useState(false);

  const notesQ = useMealIntakeNotes({ workDate: today(), mealType });
  const residentsQ = useCaregiverResidents();
  const createIntake = useCreateMealIntake();

  const notes = notesQ.data?.data ?? notesQ.data ?? [];
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const residentsWithNotes = residents.map((r: any) => {
    const note = notes.find((n: any) => {
      const rId = typeof n.residentId === 'object' ? n.residentId?._id : n.residentId;
      return rId === r._id;
    });
    return { ...r, mealNote: note };
  });

  const specialDietCount = residentsWithNotes.filter((r: any) => r.chronicConditions?.length > 0 || r.allergies?.length > 0).length;
  const pendingCount = residentsWithNotes.filter((r: any) => !r.mealNote).length;
  const refusedNotes = notes.filter((n: any) => n.intakeStatus === 'refused');

  const mealLabel = MEAL_TYPES.find((m) => m.value === mealType)?.label ?? mealType;

  const handleConfirmMeal = () => {
    setConfirmVisible(false);
    toast(`Xác nhận bữa ${mealLabel} hoàn tất`, 'success');
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Hỗ trợ bữa ăn</Text>
        <Text style={styles.topSub}>{mealLabel} · {today()}</Text>
      </View>

      <View style={styles.mealRow}>
        {MEAL_TYPES.map((m) => (
          <Chip
            key={m.value}
            selected={mealType === m.value}
            onPress={() => setMealType(m.value)}
            style={mealType === m.value ? { backgroundColor: COLOR } : undefined}
            textStyle={mealType === m.value ? { color: '#fff' } : undefined}
            compact
          >
            {m.label}
          </Chip>
        ))}
      </View>

      {specialDietCount > 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <AlertBanner message={`${specialDietCount} cư dân có chế độ ăn đặc biệt`} severity="info" />
        </View>
      ) : null}

      <ScreenLayout
        loading={notesQ.isLoading || residentsQ.isLoading}
        error={notesQ.error ? (notesQ.error as Error).message : null}
        onRetry={() => { notesQ.refetch(); residentsQ.refetch(); }}
        isEmpty={residentsWithNotes.length === 0}
        emptyMessage="Không có cư dân nào"
      >
        <FlatList
          data={residentsWithNotes}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => { notesQ.refetch(); residentsQ.refetch(); }} tintColor={COLOR} />}
          ListFooterComponent={
            <Button
              mode="contained"
              buttonColor={COLOR}
              style={styles.confirmBtn}
              onPress={() => setConfirmVisible(true)}
              disabled={pendingCount > 0}
            >
              {`Xác nhận bữa ${mealLabel} hoàn tất`}
            </Button>
          }
          renderItem={({ item }) => {
            const note = item.mealNote;
            const status = note?.intakeStatus;
            const isRefused = status === 'refused';

            return (
              <Card style={[styles.mealCard, isRefused && styles.refusedCard]} mode="outlined">
                <Card.Content style={styles.cardRow}>
                  <AvatarCircle name={item.fullName} size={36} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.fullName}</Text>
                    {item.chronicConditions?.length > 0 ? (
                      <Text style={styles.dietNote} numberOfLines={1}>
                        Chế độ đặc biệt: {item.chronicConditions.join(', ')}
                      </Text>
                    ) : null}
                    {isRefused ? (
                      <Text style={styles.refusedText}>
                        {note?.notes ?? 'Từ chối'} — đã báo Y tá
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={status ?? 'pending'} size="sm" />
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Xác nhận bữa ăn hoàn tất cho tầng này?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleConfirmMeal}>Xác nhận</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  mealRow: { flexDirection: 'row', gap: 8, padding: 12 },
  list: { padding: 16, paddingBottom: 32 },
  mealCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  refusedCard: { backgroundColor: '#FEF2F2' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  dietNote: { fontSize: 11, color: '#92400E', marginTop: 2 },
  refusedText: { fontSize: 11, color: '#991B1B', marginTop: 2, fontStyle: 'italic' },
  confirmBtn: { marginTop: 16, borderRadius: 8 },
});
