import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Button, Chip, Dialog, Portal, IconButton, TextInput, RadioButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMealIntakeNotes, useCreateMealIntake } from '../../hooks/useMealIntake';
import { useCaregiverResidents } from '../../hooks/useResidents';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AlertBanner } from '../../components/shared/AlertBanner';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';

const COLOR = '#6B4200';
const NS = 'assistant.mealSupport';
const INTAKE_STATUSES = ['full', 'partial', 'refused', 'assisted'] as const;
const today = () => new Date().toISOString().split('T')[0];

const getCurrentMeal = (): string => {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  return 'dinner';
};

export const MealSupportScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const [mealType, setMealType] = useState(getCurrentMeal());
  const [recordingFor, setRecordingFor] = useState<any>(null);
  const [intakeStatus, setIntakeStatus] = useState<typeof INTAKE_STATUSES[number]>('full');
  const [portionPercent, setPortionPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const MEAL_TYPES = [
    { value: 'breakfast', label: t(`${NS}.mealBreakfast`) },
    { value: 'lunch', label: t(`${NS}.mealLunch`) },
    { value: 'dinner', label: t(`${NS}.mealDinner`) },
  ];

  const STATUS_LABELS: Record<string, string> = {
    full: t(`${NS}.statusFull`, 'Ăn hết'),
    partial: t(`${NS}.statusPartial`, 'Ăn một phần'),
    refused: t(`${NS}.statusRefused`, 'Từ chối ăn'),
    assisted: t(`${NS}.statusAssisted`, 'Cần hỗ trợ'),
  };

  const notesQ = useMealIntakeNotes({ workDate: today(), mealType });
  const residentsQ = useCaregiverResidents();
  const createIntake = useCreateMealIntake();

  const notes_ = notesQ.data?.data ?? notesQ.data ?? [];
  const residents = residentsQ.data?.data ?? residentsQ.data ?? [];

  const residentsWithNotes = residents.map((r: any) => {
    const note = notes_.find((n: any) => {
      const rId = typeof n.residentId === 'object' ? n.residentId?._id : n.residentId;
      return rId === r._id;
    });
    return { ...r, mealNote: note };
  });

  const specialDietCount = residentsWithNotes.filter((r: any) => r.chronicConditions?.length > 0 || r.allergies?.length > 0).length;
  const pendingCount = residentsWithNotes.filter((r: any) => !r.mealNote).length;

  const mealLabel = MEAL_TYPES.find((m) => m.value === mealType)?.label ?? mealType;

  const openRecordDialog = (resident: any) => {
    if (resident.mealNote) return; // already recorded for this meal today
    setRecordingFor(resident);
    setIntakeStatus('full');
    setPortionPercent('');
    setNotes('');
    setFormError('');
  };

  const handleSaveIntake = async () => {
    if (!recordingFor) return;
    if (intakeStatus === 'partial') {
      const pct = Number(portionPercent);
      if (portionPercent === '' || Number.isNaN(pct) || pct < 0 || pct > 100) {
        setFormError(t(`${NS}.errPortionRequired`, 'Vui lòng nhập % đã ăn (0-100) khi chọn "Ăn một phần".'));
        return;
      }
    }
    if (notes.length > 500) {
      setFormError(t(`${NS}.errNotesTooLong`, 'Ghi chú không được vượt quá 500 ký tự.'));
      return;
    }
    try {
      await createIntake.mutateAsync({
        residentId: recordingFor._id,
        workDate: today(),
        mealType,
        intakeStatus,
        portionPercent: intakeStatus === 'partial' ? Number(portionPercent) : undefined,
        notes: notes.trim() || undefined,
      });
      setRecordingFor(null);
      toast(t(`${NS}.toastMealConfirmed`, { meal: mealLabel }), 'success');
    } catch (e: any) {
      setFormError(e?.response?.data?.message || t(`${NS}.toastSaveError`, 'Không thể lưu. Thử lại.'));
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation?.goBack()} style={styles.backBtn} />
        <View>
          <Text style={styles.topTitle}>{t(`${NS}.title`)}</Text>
          <Text style={styles.topSub}>{mealLabel} · {today()}</Text>
        </View>
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
          <AlertBanner message={t(`${NS}.specialDietAlert`, { count: specialDietCount })} severity="info" />
        </View>
      ) : null}

      <ScreenLayout
        loading={notesQ.isLoading || residentsQ.isLoading}
        error={notesQ.error ? (notesQ.error as Error).message : null}
        onRetry={() => { notesQ.refetch(); residentsQ.refetch(); }}
        isEmpty={residentsWithNotes.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={residentsWithNotes}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => { notesQ.refetch(); residentsQ.refetch(); }} tintColor={COLOR} />}
          ListHeaderComponent={
            pendingCount > 0 ? (
              <Text style={styles.pendingHint}>{t(`${NS}.pendingHint`, { count: pendingCount, defaultValue: `${pendingCount} resident(s) still need this meal recorded — tap a card to record.` })}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const note = item.mealNote;
            const status = note?.intakeStatus;
            const isRefused = status === 'refused';

            return (
              <Pressable onPress={() => openRecordDialog(item)} disabled={!!note}>
                <Card style={[styles.mealCard, isRefused && styles.refusedCard]} mode="outlined">
                  <Card.Content style={styles.cardRow}>
                    <AvatarCircle name={item.fullName} size={36} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.fullName}</Text>
                      {item.chronicConditions?.length > 0 ? (
                        <Text style={styles.dietNote} numberOfLines={1}>
                          {t(`${NS}.dietNote`, { conditions: item.chronicConditions.join(', ') })}
                        </Text>
                      ) : null}
                      {isRefused ? (
                        <Text style={styles.refusedText}>
                          {t(`${NS}.refusedReported`, { note: note?.notes ?? t(`${NS}.refusedDefault`) })}
                        </Text>
                      ) : null}
                    </View>
                    <StatusBadge status={status ?? 'pending'} size="sm" />
                  </Card.Content>
                </Card>
              </Pressable>
            );
          }}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!recordingFor} onDismiss={() => setRecordingFor(null)}>
          <Dialog.Title>{recordingFor?.fullName}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <Text style={styles.radioLabel}>{t(`${NS}.intakeStatusLabel`, 'Tình trạng ăn uống')}</Text>
            <RadioButton.Group onValueChange={(v) => setIntakeStatus(v as any)} value={intakeStatus}>
              {INTAKE_STATUSES.map((s) => (
                <RadioButton.Item key={s} label={STATUS_LABELS[s]} value={s} color={COLOR} />
              ))}
            </RadioButton.Group>
            {intakeStatus === 'partial' && (
              <TextInput
                label={t(`${NS}.portionLabel`, '% đã ăn')}
                mode="outlined"
                keyboardType="numeric"
                value={portionPercent}
                onChangeText={setPortionPercent}
                dense
                style={styles.formInput}
              />
            )}
            <TextInput
              label={t(`${NS}.notesLabel`, 'Ghi chú')}
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              dense
              multiline
              maxLength={500}
              style={styles.formInput}
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setRecordingFor(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} onPress={handleSaveIntake} loading={createIntake.isPending}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 8, paddingBottom: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  mealRow: { flexDirection: 'row', gap: 8, padding: 12 },
  list: { padding: 16, paddingBottom: 32 },
  pendingHint: { fontSize: 12, color: '#92400E', marginBottom: 8 },
  mealCard: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  refusedCard: { backgroundColor: '#FEF2F2' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  dietNote: { fontSize: 11, color: '#92400E', marginTop: 2 },
  refusedText: { fontSize: 11, color: '#991B1B', marginTop: 2, fontStyle: 'italic' },
  radioLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, marginTop: 4 },
  formInput: { marginBottom: 8 },
  errorText: { color: '#DC2626', fontSize: 11, marginBottom: 8 },
});
