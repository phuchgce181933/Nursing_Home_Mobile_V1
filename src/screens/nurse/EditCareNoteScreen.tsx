import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Chip, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUpdateCareNote } from '../../hooks/useCareNotes';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.careNotes';

const ChipGroup: React.FC<{ label: string; options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void; color: string; styles: ReturnType<typeof createStyles> }> = ({ label, options, selected, onSelect, color, styles }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.metaLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {options.map(o => (
        <Chip key={o.value} selected={selected === o.value} onPress={() => onSelect(o.value)}
          style={selected === o.value ? { backgroundColor: color } : undefined}
          textStyle={selected === o.value ? { color: '#fff' } : undefined} compact>{o.label}</Chip>
      ))}
    </View>
  </View>
);

export const EditCareNoteScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateNote = useUpdateCareNote();
  const note = route.params?.note;
  // Doctor/caregiver reach this screen read-only (backend only authorizes nurse to write).
  const readOnly = !!route.params?.readOnly;

  const NOTE_TYPES = [
    { value: 'general', label: t(`${NS}.typeGeneral`) },
    { value: 'meal', label: t(`${NS}.typeMeal`) },
    { value: 'activity', label: t(`${NS}.typeActivity`) },
    { value: 'daily_living', label: t(`${NS}.typeDailyLiving`) },
    { value: 'health', label: t(`${NS}.typeHealth`) },
  ];
  const MEAL_TYPES = [{ value: 'breakfast', label: t(`${NS}.mealBreakfast`) }, { value: 'lunch', label: t(`${NS}.mealLunch`) }, { value: 'dinner', label: t(`${NS}.mealDinner`) }, { value: 'snack', label: t(`${NS}.mealSnack`) }];
  const INTAKE_AMOUNTS = [{ value: 'none', label: t(`${NS}.intakeNone`) }, { value: 'little', label: t(`${NS}.intakeLittle`) }, { value: 'half', label: t(`${NS}.intakeHalf`) }, { value: 'most', label: t(`${NS}.intakeMost`) }, { value: 'all', label: t(`${NS}.intakeAll`) }];
  const APPETITES = [{ value: 'poor', label: t(`${NS}.appetitePoor`) }, { value: 'fair', label: t(`${NS}.appetiteFair`) }, { value: 'good', label: t(`${NS}.appetiteGood`) }, { value: 'excellent', label: t(`${NS}.appetiteExcellent`) }];
  const ACTIVITY_TYPES = [{ value: 'walking', label: t(`${NS}.activityWalking`) }, { value: 'exercise', label: t(`${NS}.activityExercise`) }, { value: 'physiotherapy', label: t(`${NS}.activityPhysiotherapy`) }, { value: 'reading', label: t(`${NS}.activityReading`) }, { value: 'socializing', label: t(`${NS}.activitySocializing`) }, { value: 'entertainment', label: t(`${NS}.activityEntertainment`) }, { value: 'other', label: t(`${NS}.activityOther`) }];
  const PARTICIPATION = [{ value: 'refused', label: t(`${NS}.participationRefused`) }, { value: 'assisted', label: t(`${NS}.participationAssisted`) }, { value: 'supervised', label: t(`${NS}.participationSupervised`) }, { value: 'independent', label: t(`${NS}.participationIndependent`) }];
  const MOODS = [{ value: 'happy', label: t(`${NS}.moodHappy`) }, { value: 'neutral', label: t(`${NS}.moodNeutral`) }, { value: 'sad', label: t(`${NS}.moodSad`) }, { value: 'agitated', label: t(`${NS}.moodAgitated`) }, { value: 'anxious', label: t(`${NS}.moodAnxious`) }];
  const CONSCIOUSNESS = [{ value: 'alert', label: t(`${NS}.consciousAlert`) }, { value: 'confused', label: t(`${NS}.consciousConfused`) }, { value: 'drowsy', label: t(`${NS}.consciousDrowsy`) }, { value: 'unresponsive', label: t(`${NS}.consciousUnresponsive`) }];
  const FALL_RISK = [{ value: 'low', label: t(`${NS}.fallRiskLow`) }, { value: 'medium', label: t(`${NS}.fallRiskMedium`) }, { value: 'high', label: t(`${NS}.fallRiskHigh`) }];
  const DL_ACTIVITY_TYPES = [{ value: 'bathing', label: t(`${NS}.dlBathing`) }, { value: 'grooming', label: t(`${NS}.dlGrooming`) }, { value: 'dressing', label: t(`${NS}.dlDressing`) }, { value: 'eating', label: t(`${NS}.dlEating`) }, { value: 'mobility', label: t(`${NS}.dlMobility`) }, { value: 'toileting', label: t(`${NS}.dlToileting`) }, { value: 'sleeping', label: t(`${NS}.dlSleeping`) }, { value: 'other', label: t(`${NS}.dlOther`) }];
  const ASSISTANCE = [{ value: 'independent', label: t(`${NS}.assistIndependent`) }, { value: 'supervised', label: t(`${NS}.assistSupervised`) }, { value: 'assisted', label: t(`${NS}.assistAssisted`) }, { value: 'total_care', label: t(`${NS}.assistTotalCare`) }];
  const COMPLETION = [{ value: 'completed', label: t(`${NS}.completeCompleted`) }, { value: 'partial', label: t(`${NS}.completePartial`) }, { value: 'refused', label: t(`${NS}.completeRefused`) }];

  const [noteType, setNoteType] = useState(note?.noteType ?? 'general');
  const [content, setContent] = useState(note?.content ?? '');
  const [metadata, setMetadata] = useState<Record<string, any>>(note?.metadata ?? {});

  const residentName = note?.residentId?.fullName ?? '';

  const updateMeta = (key: string, value: any) => setMetadata(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!content.trim() || content.trim().length < 5) {
      toast(t(`${NS}.warnContentLength`), 'warning');
      return;
    }
    try {
      await updateNote.mutateAsync({ id: note._id, content: content.trim(), noteType, metadata });
      toast(t(`${NS}.toastUpdated`), 'success');
      navigation.goBack();
    } catch {
      toast(t(`${NS}.toastUpdateError`), 'error');
    }
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.${readOnly ? 'viewTitleShort' : 'editTitleShort'}`)} color={roleColor} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View pointerEvents={readOnly ? 'none' : 'auto'}>
        <Card style={styles.residentCard} mode="outlined">
          <Card.Content style={styles.residentRow}>
            <AvatarCircle name={residentName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.residentName}>{residentName}</Text>
              <Text style={styles.residentCode}>{note?.residentId?.residentCode ?? ''}</Text>
            </View>
          </Card.Content>
        </Card>

        <Text style={[styles.label, { marginTop: 16 }]}>{t(`${NS}.noteTypeLabel`)}</Text>
        <View style={styles.chipRow}>
          {NOTE_TYPES.map(nt => (
            <Chip key={nt.value} selected={noteType === nt.value} onPress={() => { setNoteType(nt.value); setMetadata({}); }}
              style={noteType === nt.value ? { backgroundColor: roleColor } : undefined}
              textStyle={noteType === nt.value ? { color: '#fff' } : undefined} compact>{nt.label}</Chip>
          ))}
        </View>

        <TextInput label={t(`${NS}.contentLabel`)} mode="outlined" value={content} onChangeText={setContent}
          multiline numberOfLines={5} style={styles.textarea} maxLength={500} />
        <Text style={styles.charCount}>{content.length}/500</Text>

        {noteType === 'meal' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={[styles.metaTitle, { color: roleColor }]}>{t(`${NS}.mealDetailTitle`)}</Text>
              <ChipGroup label={t(`${NS}.mealLabel`)} options={MEAL_TYPES} selected={metadata.mealType ?? ''} onSelect={v => updateMeta('mealType', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.intakeLabel`)} options={INTAKE_AMOUNTS} selected={metadata.intakeAmount ?? ''} onSelect={v => updateMeta('intakeAmount', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.appetiteLabel`)} options={APPETITES} selected={metadata.appetite ?? ''} onSelect={v => updateMeta('appetite', v)} color={roleColor} styles={styles} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'activity' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={[styles.metaTitle, { color: roleColor }]}>{t(`${NS}.activityDetailTitle`)}</Text>
              <ChipGroup label={t(`${NS}.activityTypeLabel`)} options={ACTIVITY_TYPES} selected={metadata.activityType ?? ''} onSelect={v => updateMeta('activityType', v)} color={roleColor} styles={styles} />
              <TextInput label={t(`${NS}.durationLabel`)} mode="outlined" value={String(metadata.duration ?? '')} onChangeText={v => updateMeta('duration', Number(v) || 0)} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label={t(`${NS}.participationLabel`)} options={PARTICIPATION} selected={metadata.participationLevel ?? ''} onSelect={v => updateMeta('participationLevel', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.moodLabel`)} options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} color={roleColor} styles={styles} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'health' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={[styles.metaTitle, { color: roleColor }]}>{t(`${NS}.healthDetailTitle`)}</Text>
              <TextInput label={t(`${NS}.symptomsLabel`)} mode="outlined" value={metadata.symptoms?.join(', ') ?? ''} onChangeText={v => updateMeta('symptoms', v.split(',').map((s: string) => s.trim()).filter(Boolean))} dense multiline style={{ marginBottom: 12 }} placeholder={t(`${NS}.symptomsPlaceholder`)} />
              <ChipGroup label={t(`${NS}.consciousnessLabel`)} options={CONSCIOUSNESS} selected={metadata.consciousness ?? ''} onSelect={v => updateMeta('consciousness', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.fallRiskLabel`)} options={FALL_RISK} selected={metadata.fallRisk ?? ''} onSelect={v => updateMeta('fallRisk', v)} color={roleColor} styles={styles} />
              <TextInput label={t(`${NS}.painLevelLabel`)} mode="outlined" value={String(metadata.painLevel ?? '')} onChangeText={v => updateMeta('painLevel', Math.min(10, Math.max(0, Number(v) || 0)))} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput label={t(`${NS}.temperatureLabel`)} mode="outlined" value={String(metadata.temperature ?? '')} onChangeText={v => updateMeta('temperature', Number(v) || 0)} keyboardType="numeric" dense style={{ flex: 1 }} />
                <TextInput label={t(`${NS}.pulseLabel`)} mode="outlined" value={String(metadata.pulse ?? '')} onChangeText={v => updateMeta('pulse', Number(v) || 0)} keyboardType="numeric" dense style={{ flex: 1 }} />
              </View>
              <TextInput label={t(`${NS}.observationsLabel`)} mode="outlined" value={metadata.observations ?? ''} onChangeText={v => updateMeta('observations', v)} dense multiline style={{ marginBottom: 8 }} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'daily_living' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={[styles.metaTitle, { color: roleColor }]}>{t(`${NS}.dlDetailTitle`)}</Text>
              <ChipGroup label={t(`${NS}.dlActivityTypeLabel`)} options={DL_ACTIVITY_TYPES} selected={metadata.activityType ?? ''} onSelect={v => updateMeta('activityType', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.assistanceLabel`)} options={ASSISTANCE} selected={metadata.assistanceLevel ?? ''} onSelect={v => updateMeta('assistanceLevel', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.completionLabel`)} options={COMPLETION} selected={metadata.completionStatus ?? ''} onSelect={v => updateMeta('completionStatus', v)} color={roleColor} styles={styles} />
              <TextInput label={t(`${NS}.durationLabel`)} mode="outlined" value={String(metadata.duration ?? '')} onChangeText={v => updateMeta('duration', Number(v) || 0)} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label={t(`${NS}.moodLabel`)} options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} color={roleColor} styles={styles} />
            </Card.Content>
          </Card>
        )}

        {!readOnly && (
          <Button mode="contained" buttonColor={roleColor} onPress={handleSubmit}
            loading={updateNote.isPending} disabled={updateNote.isPending} style={styles.submitBtn}>
            {t(`${NS}.update`)}
          </Button>
        )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (c: AppColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  body: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: c.text, marginBottom: 8 },
  residentCard: { borderRadius: 12, backgroundColor: c.surface },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  residentName: { fontSize: 14, fontWeight: '500', color: c.text },
  residentCode: { fontSize: 12, color: c.textSecondary },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  textarea: { marginTop: 0 },
  charCount: { fontSize: 11, color: c.textMuted, textAlign: 'right', marginTop: 2 },
  metaCard: { borderRadius: 12, marginTop: 16, backgroundColor: c.surface },
  metaTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  metaLabel: { fontSize: 12, fontWeight: '500', color: c.textSecondary, marginBottom: 6 },
  submitBtn: { marginTop: 20, borderRadius: 8 },
});
