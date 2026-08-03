import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Chip, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useCreateCareNote } from '../../hooks/useCareNotes';
import { useResidents } from '../../hooks/useResidents';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { BackHeader } from '../../components/layout/BackHeader';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
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

export const CreateCareNoteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const createNote = useCreateCareNote();
  const residentsQ = useResidents({ status: 'admitted' });
  const residents = Array.isArray(residentsQ.data) ? residentsQ.data : (residentsQ.data?.data ?? []);

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
  const PRIORITIES = [{ value: 'normal', label: t(`${NS}.priorityNormal`) }, { value: 'important', label: t(`${NS}.priorityImportant`) }, { value: 'urgent', label: t(`${NS}.priorityUrgent`) }];

  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [noteDate, setNoteDate] = useState('');
  const [showResidentPicker, setShowResidentPicker] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  const selectedResident = residents.find((r: any) => r._id === selectedResidentId);
  const updateMeta = (key: string, value: any) => setMetadata(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!selectedResidentId) {
      toast(t(`${NS}.warnSelectResident`), 'warning');
      return;
    }
    if (!content.trim() || content.trim().length < 5) {
      toast(t(`${NS}.warnContentLength`), 'warning');
      return;
    }
    try {
      const meta = { ...metadata, priority };
      const body: any = { residentId: selectedResidentId, content: content.trim(), noteType, metadata: meta };
      if (noteDate) {
        const now = new Date();
        const [y, m, d] = noteDate.split('-').map(Number);
        body.noteAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
      }
      await createNote.mutateAsync(body);
      toast(t(`${NS}.toastSaved`), 'success');
      navigation.goBack();
    } catch {
      toast(t(`${NS}.toastSaveError`), 'error');
    }
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.createTitle`)} color={roleColor} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t(`${NS}.residentLabel`)}</Text>
        {selectedResident ? (
          <Card style={styles.residentCard} mode="outlined" onPress={() => setShowResidentPicker(!showResidentPicker)}>
            <Card.Content style={styles.residentRow}>
              <AvatarCircle name={selectedResident.fullName} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.residentName}>{selectedResident.fullName}</Text>
                <Text style={styles.residentCode}>{selectedResident.residentCode}</Text>
              </View>
              <Button compact mode="text" textColor={roleColor} onPress={() => setSelectedResidentId('')}>{t(`${NS}.change`)}</Button>
            </Card.Content>
          </Card>
        ) : (
          <Button mode="outlined" onPress={() => setShowResidentPicker(!showResidentPicker)} style={[styles.selectBtn, { borderColor: roleColor }]}>
            {t(`${NS}.selectResident`)}
          </Button>
        )}

        {showResidentPicker ? (
          <Card style={styles.pickerCard}>
            <Card.Content>
              {residents.slice(0, 20).map((r: any) => (
                <Button key={r._id} mode="text" compact
                  onPress={() => { setSelectedResidentId(r._id); setShowResidentPicker(false); }}
                  style={styles.pickerItem}>
                  {r.fullName} — {r.residentCode}
                </Button>
              ))}
            </Card.Content>
          </Card>
        ) : null}

        <Text style={[styles.label, { marginTop: 16 }]}>{t(`${NS}.noteTypeLabel`)}</Text>
        <View style={styles.chipRow}>
          {NOTE_TYPES.map((nt) => (
            <Chip key={nt.value} selected={noteType === nt.value}
              onPress={() => { setNoteType(nt.value); setMetadata({}); }}
              style={noteType === nt.value ? { backgroundColor: roleColor } : undefined}
              textStyle={noteType === nt.value ? { color: '#fff' } : undefined} compact>
              {nt.label}
            </Chip>
          ))}
        </View>

        <TextInput label={t(`${NS}.contentLabel`)} mode="outlined" value={content} onChangeText={setContent}
          multiline numberOfLines={5} style={styles.textarea} maxLength={500} />
        <Text style={styles.charCount}>{content.length}/500</Text>

        <ChipGroup label={t(`${NS}.priorityLabel`)} options={PRIORITIES} selected={priority} onSelect={setPriority} color={roleColor} styles={styles} />

        <CalendarPicker label={t(`${NS}.noteDateLabel`)} value={noteDate} onChange={setNoteDate} color={roleColor} />

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
              <TextInput label={t(`${NS}.durationLabel`)} mode="outlined" value={String(metadata.duration ?? '')}
                onChangeText={v => updateMeta('duration', Math.max(0, Number(v) || 0))} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label={t(`${NS}.participationLabel`)} options={PARTICIPATION} selected={metadata.participationLevel ?? ''} onSelect={v => updateMeta('participationLevel', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.moodLabel`)} options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} color={roleColor} styles={styles} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'health' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={[styles.metaTitle, { color: roleColor }]}>{t(`${NS}.healthDetailTitle`)}</Text>
              <TextInput label={t(`${NS}.symptomsLabel`)} mode="outlined" value={metadata.symptoms?.join(', ') ?? ''}
                onChangeText={v => updateMeta('symptoms', v.split(',').map((s: string) => s.trim()).filter(Boolean))}
                dense multiline style={{ marginBottom: 12 }} placeholder={t(`${NS}.symptomsPlaceholder`)} />
              <ChipGroup label={t(`${NS}.consciousnessLabel`)} options={CONSCIOUSNESS} selected={metadata.consciousness ?? ''} onSelect={v => updateMeta('consciousness', v)} color={roleColor} styles={styles} />
              <ChipGroup label={t(`${NS}.fallRiskLabel`)} options={FALL_RISK} selected={metadata.fallRisk ?? ''} onSelect={v => updateMeta('fallRisk', v)} color={roleColor} styles={styles} />
              <TextInput label={t(`${NS}.painLevelLabel`)} mode="outlined" value={String(metadata.painLevel ?? '')}
                onChangeText={v => updateMeta('painLevel', Math.min(10, Math.max(0, Number(v) || 0)))}
                keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput label={t(`${NS}.temperatureLabel`)} mode="outlined" value={String(metadata.temperature ?? '')}
                  onChangeText={v => updateMeta('temperature', Number(v) || 0)}
                  onBlur={() => { if (metadata.temperature) updateMeta('temperature', Math.min(45, Math.max(30, metadata.temperature))); }}
                  keyboardType="numeric" dense style={{ flex: 1 }} />
                <TextInput label={t(`${NS}.pulseLabel`)} mode="outlined" value={String(metadata.pulse ?? '')}
                  onChangeText={v => updateMeta('pulse', Math.max(0, Number(v) || 0))}
                  onBlur={() => { if (metadata.pulse) updateMeta('pulse', Math.min(250, metadata.pulse)); }}
                  keyboardType="numeric" dense style={{ flex: 1 }} />
              </View>
              <TextInput label={t(`${NS}.observationsLabel`)} mode="outlined" value={metadata.observations ?? ''}
                onChangeText={v => updateMeta('observations', v)} dense multiline style={{ marginBottom: 8 }} />
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
              <TextInput label={t(`${NS}.durationLabel`)} mode="outlined" value={String(metadata.duration ?? '')}
                onChangeText={v => updateMeta('duration', Math.max(0, Number(v) || 0))} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label={t(`${NS}.moodLabel`)} options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} color={roleColor} styles={styles} />
            </Card.Content>
          </Card>
        )}

        <Card style={styles.autoCard} mode="outlined">
          <Card.Content>
            <Text style={styles.autoLabel}>{t(`${NS}.authorLabel`)}</Text>
            <Text style={styles.autoValue}>{user?.fullName ?? ''}</Text>
            <Text style={styles.autoLabel}>{t(`${NS}.timeLabel`)}</Text>
            <Text style={styles.autoValue}>{new Date().toLocaleString('vi-VN')}</Text>
          </Card.Content>
        </Card>

        <Button mode="contained" buttonColor={roleColor} onPress={handleSubmit}
          loading={createNote.isPending} disabled={createNote.isPending} style={styles.submitBtn}>
          {t(`${NS}.save`)}
        </Button>
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
  selectBtn: { borderRadius: 8 },
  pickerCard: { marginTop: 8, borderRadius: 12, maxHeight: 200 },
  pickerItem: { justifyContent: 'flex-start' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  textarea: { marginTop: 0 },
  charCount: { fontSize: 11, color: c.textMuted, textAlign: 'right', marginTop: 2 },
  metaCard: { borderRadius: 12, marginTop: 8, backgroundColor: c.surface },
  metaTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  metaLabel: { fontSize: 12, fontWeight: '500', color: c.textSecondary, marginBottom: 6 },
  autoCard: { borderRadius: 12, marginTop: 16, backgroundColor: c.surfaceAlt },
  autoLabel: { fontSize: 11, color: c.textMuted, marginTop: 4 },
  autoValue: { fontSize: 13, color: c.text },
  submitBtn: { marginTop: 20, borderRadius: 8 },
});
