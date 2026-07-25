import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Chip, Card, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { useCreateCareNote } from '../../hooks/useCareNotes';
import { useResidents } from '../../hooks/useResidents';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const NS = 'nurse.careNotes';

const ChipGroup: React.FC<{ label: string; options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }> = ({ label, options, selected, onSelect }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.metaLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {options.map(o => (
        <Chip key={o.value} selected={selected === o.value} onPress={() => onSelect(o.value)}
          style={selected === o.value ? { backgroundColor: COLOR } : undefined}
          textStyle={selected === o.value ? { color: '#fff' } : undefined} compact>{o.label}</Chip>
      ))}
    </View>
  </View>
);

export const CreateCareNoteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
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

  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [noteAt, setNoteAt] = useState('');
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
      if (noteAt) body.noteAt = new Date(noteAt).toISOString();
      await createNote.mutateAsync(body);
      toast(t(`${NS}.toastSaved`), 'success');
      navigation.goBack();
    } catch {
      toast(t(`${NS}.toastSaveError`), 'error');
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.createTitle`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

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
              <Button compact mode="text" textColor={COLOR} onPress={() => setSelectedResidentId('')}>{t(`${NS}.change`)}</Button>
            </Card.Content>
          </Card>
        ) : (
          <Button mode="outlined" onPress={() => setShowResidentPicker(!showResidentPicker)} style={styles.selectBtn}>
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
              style={noteType === nt.value ? { backgroundColor: COLOR } : undefined}
              textStyle={noteType === nt.value ? { color: '#fff' } : undefined} compact>
              {nt.label}
            </Chip>
          ))}
        </View>

        <TextInput label={t(`${NS}.contentLabel`)} mode="outlined" value={content} onChangeText={setContent}
          multiline numberOfLines={5} style={styles.textarea} maxLength={500} />
        <Text style={styles.charCount}>{content.length}/500</Text>

        {noteType === 'meal' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>{t(`${NS}.mealDetailTitle`)}</Text>
              <ChipGroup label={t(`${NS}.mealLabel`)} options={MEAL_TYPES} selected={metadata.mealType ?? ''} onSelect={v => updateMeta('mealType', v)} />
              <ChipGroup label={t(`${NS}.intakeLabel`)} options={INTAKE_AMOUNTS} selected={metadata.intakeAmount ?? ''} onSelect={v => updateMeta('intakeAmount', v)} />
              <ChipGroup label={t(`${NS}.appetiteLabel`)} options={APPETITES} selected={metadata.appetite ?? ''} onSelect={v => updateMeta('appetite', v)} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'activity' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>{t(`${NS}.activityDetailTitle`)}</Text>
              <ChipGroup label={t(`${NS}.activityTypeLabel`)} options={ACTIVITY_TYPES} selected={metadata.activityType ?? ''} onSelect={v => updateMeta('activityType', v)} />
              <TextInput label={t(`${NS}.durationLabel`)} mode="outlined" value={String(metadata.duration ?? '')}
                onChangeText={v => updateMeta('duration', Number(v) || 0)} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label={t(`${NS}.participationLabel`)} options={PARTICIPATION} selected={metadata.participationLevel ?? ''} onSelect={v => updateMeta('participationLevel', v)} />
              <ChipGroup label={t(`${NS}.moodLabel`)} options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'health' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>{t(`${NS}.healthDetailTitle`)}</Text>
              <TextInput label={t(`${NS}.symptomsLabel`)} mode="outlined" value={metadata.symptoms?.join(', ') ?? ''}
                onChangeText={v => updateMeta('symptoms', v.split(',').map((s: string) => s.trim()).filter(Boolean))}
                dense multiline style={{ marginBottom: 12 }} placeholder={t(`${NS}.symptomsPlaceholder`)} />
              <ChipGroup label={t(`${NS}.consciousnessLabel`)} options={CONSCIOUSNESS} selected={metadata.consciousness ?? ''} onSelect={v => updateMeta('consciousness', v)} />
              <ChipGroup label={t(`${NS}.fallRiskLabel`)} options={FALL_RISK} selected={metadata.fallRisk ?? ''} onSelect={v => updateMeta('fallRisk', v)} />
              <TextInput label={t(`${NS}.painLevelLabel`)} mode="outlined" value={String(metadata.painLevel ?? '')}
                onChangeText={v => updateMeta('painLevel', Math.min(10, Math.max(0, Number(v) || 0)))}
                keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput label={t(`${NS}.temperatureLabel`)} mode="outlined" value={String(metadata.temperature ?? '')}
                  onChangeText={v => updateMeta('temperature', Number(v) || 0)} keyboardType="numeric" dense style={{ flex: 1 }} />
                <TextInput label={t(`${NS}.pulseLabel`)} mode="outlined" value={String(metadata.pulse ?? '')}
                  onChangeText={v => updateMeta('pulse', Number(v) || 0)} keyboardType="numeric" dense style={{ flex: 1 }} />
              </View>
              <TextInput label={t(`${NS}.observationsLabel`)} mode="outlined" value={metadata.observations ?? ''}
                onChangeText={v => updateMeta('observations', v)} dense multiline style={{ marginBottom: 8 }} />
            </Card.Content>
          </Card>
        )}

        {noteType === 'daily_living' && (
          <Card style={styles.metaCard} mode="outlined">
            <Card.Content>
              <Text style={styles.metaTitle}>{t(`${NS}.dlDetailTitle`)}</Text>
              <ChipGroup label={t(`${NS}.dlActivityTypeLabel`)} options={DL_ACTIVITY_TYPES} selected={metadata.activityType ?? ''} onSelect={v => updateMeta('activityType', v)} />
              <ChipGroup label={t(`${NS}.assistanceLabel`)} options={ASSISTANCE} selected={metadata.assistanceLevel ?? ''} onSelect={v => updateMeta('assistanceLevel', v)} />
              <ChipGroup label={t(`${NS}.completionLabel`)} options={COMPLETION} selected={metadata.completionStatus ?? ''} onSelect={v => updateMeta('completionStatus', v)} />
              <TextInput label={t(`${NS}.durationLabel`)} mode="outlined" value={String(metadata.duration ?? '')}
                onChangeText={v => updateMeta('duration', Number(v) || 0)} keyboardType="numeric" dense style={{ marginBottom: 12 }} />
              <ChipGroup label={t(`${NS}.moodLabel`)} options={MOODS} selected={metadata.mood ?? ''} onSelect={v => updateMeta('mood', v)} />
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

        <Button mode="contained" buttonColor={COLOR} onPress={handleSubmit}
          loading={createNote.isPending} disabled={createNote.isPending} style={styles.submitBtn}>
          {t(`${NS}.save`)}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  body: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  residentCard: { borderRadius: 12, backgroundColor: '#fff' },
  residentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  residentName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  residentCode: { fontSize: 12, color: '#6B7280' },
  selectBtn: { borderRadius: 8, borderColor: COLOR },
  pickerCard: { marginTop: 8, borderRadius: 12, maxHeight: 200 },
  pickerItem: { justifyContent: 'flex-start' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  textarea: { marginTop: 0 },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 2 },
  metaCard: { borderRadius: 12, marginTop: 8, backgroundColor: '#fff' },
  metaTitle: { fontSize: 14, fontWeight: '600', color: COLOR, marginBottom: 12 },
  metaLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  autoCard: { borderRadius: 12, marginTop: 16, backgroundColor: '#F9FAFB' },
  autoLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  autoValue: { fontSize: 13, color: '#111827' },
  submitBtn: { marginTop: 20, borderRadius: 8 },
});
