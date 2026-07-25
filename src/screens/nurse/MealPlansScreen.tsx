import React, { useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal, IconButton, TextInput, FAB, Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMealPlans, useMealPlanDetail, useMealPlanTemplates, useMealPlanResidents, useCreateMealPlanDraft, usePublishMealPlan, useDeleteMealPlan } from '../../hooks/useMealPlans';
import { useMealTimeSchedules, useMealTimeScheduleDetail, useMealTimeScheduleTemplates, useMealTimeScheduleResidents, useCreateMealTimeScheduleDraft, usePublishMealTimeSchedule, useDeleteMealTimeSchedule } from '../../hooks/useMealTimeSchedules';
import { useSpecialDiets, useSpecialDietDetail, useSpecialDietTemplates, useSpecialDietResidents, useCreateSpecialDietDraft, usePublishSpecialDiet, useDeleteSpecialDiet } from '../../hooks/useSpecialDiets';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';

const NS = 'nurse.mealPlans';

type MealEntry = { residentId: string; mealType: string; mealName: string; calories: string; mealTime: string; source: string };
type ScheduleEntry = { residentId: string; breakfastTime: string; lunchTime: string; dinnerTime: string; notes: string; source: string };
type DietEntry = { residentId: string; dietType: string; restrictions: string; nutritionGoal: string; effectiveTime: string; notes: string; source: string };

type Tab = 'schedule' | 'plan' | 'diet';

export const MealPlansScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('plan');
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const TABS: { value: Tab; label: string }[] = [
    { value: 'schedule', label: t(`${NS}.tabSchedule`) },
    { value: 'plan', label: t(`${NS}.tabPlan`) },
    { value: 'diet', label: t(`${NS}.tabDiet`) },
  ];
  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.statusAll`) },
    { value: 'draft', label: t(`${NS}.statusDraft`) },
    { value: 'published', label: t(`${NS}.statusPublished`) },
  ];
  const MEAL_TYPES = [
    { value: 'breakfast', label: t(`${NS}.mealBreakfast`), defaultTime: '07:30' },
    { value: 'lunch', label: t(`${NS}.mealLunch`), defaultTime: '11:30' },
    { value: 'dinner', label: t(`${NS}.mealDinner`), defaultTime: '17:30' },
  ];
  const MEAL_TYPE_LABEL: Record<string, string> = {
    breakfast: t(`${NS}.mealBreakfast`), lunch: t(`${NS}.mealLunch`), dinner: t(`${NS}.mealDinner`),
  };
  const CARE_STAGE_LABEL: Record<string, string> = {
    recovery: t(`${NS}.careStageRecovery`), maintenance: t(`${NS}.careStageMaintenance`), special_monitoring: t(`${NS}.careStageSpecialMonitoring`),
  };
  const DIET_TYPE_LABEL: Record<string, string> = {
    diabetic: t(`${NS}.dietDiabetic`), low_sodium: t(`${NS}.dietLowSodium`), renal: t(`${NS}.dietRenal`), high_protein: t(`${NS}.dietHighProtein`),
    soft_texture: t(`${NS}.dietSoftTexture`), liquid_only: t(`${NS}.dietLiquidOnly`), custom: t(`${NS}.dietCustom`),
  };

  const today = new Date().toISOString().split('T')[0];

  // ---- Meal Plan (thực đơn) data ----
  const planListQ = useMealPlans({ status: filter || undefined });
  const planItems = Array.isArray(planListQ.data?.data) ? planListQ.data.data : [];
  const planDetailQ = useMealPlanDetail(tab === 'plan' ? selectedId ?? undefined : undefined);
  const planPublishMut = usePublishMealPlan();
  const planDeleteMut = useDeleteMealPlan();
  const planTemplatesQ = useMealPlanTemplates();
  const planResidentsQ = useMealPlanResidents();
  const planTemplates = planTemplatesQ.data?.data ?? planTemplatesQ.data ?? {};
  const careStages: string[] = planTemplates.careStages ?? [];
  const planTplList: any[] = planTemplates.templates ?? [];
  const planResidents = planResidentsQ.data?.data?.data ?? [];
  const createPlanMut = useCreateMealPlanDraft();

  // ---- Meal Time Schedule (lịch giờ ăn) data ----
  const scheduleListQ = useMealTimeSchedules({ status: filter || undefined });
  const scheduleItems = Array.isArray(scheduleListQ.data?.data) ? scheduleListQ.data.data : [];
  const scheduleDetailQ = useMealTimeScheduleDetail(tab === 'schedule' ? selectedId ?? undefined : undefined);
  const schedulePublishMut = usePublishMealTimeSchedule();
  const scheduleDeleteMut = useDeleteMealTimeSchedule();
  const scheduleTemplatesQ = useMealTimeScheduleTemplates();
  const scheduleResidentsQ = useMealTimeScheduleResidents();
  const scheduleTemplates = scheduleTemplatesQ.data?.data ?? scheduleTemplatesQ.data ?? {};
  const scheduleTplList: any[] = scheduleTemplates.templates ?? [];
  const scheduleResidents = scheduleResidentsQ.data?.data?.data ?? [];
  const createScheduleMut = useCreateMealTimeScheduleDraft();

  // ---- Special Diet (chế độ ăn đặc biệt) data ----
  const dietListQ = useSpecialDiets({ status: filter || undefined });
  const dietItems = Array.isArray(dietListQ.data?.data) ? dietListQ.data.data : [];
  const dietDetailQ = useSpecialDietDetail(tab === 'diet' ? selectedId ?? undefined : undefined);
  const dietPublishMut = usePublishSpecialDiet();
  const dietDeleteMut = useDeleteSpecialDiet();
  const dietTemplatesQ = useSpecialDietTemplates();
  const dietResidentsQ = useSpecialDietResidents();
  const dietTemplates = dietTemplatesQ.data?.data ?? dietTemplatesQ.data ?? {};
  const dietTypeOptions: string[] = dietTemplates.dietTypes ?? Object.keys(DIET_TYPE_LABEL);
  const dietTplList: any[] = dietTemplates.templates ?? [];
  const dietResidents = dietResidentsQ.data?.data?.data ?? [];
  const createDietMut = useCreateSpecialDietDraft();

  // ---- Tab-aware pickers ----
  const listQ = tab === 'plan' ? planListQ : tab === 'schedule' ? scheduleListQ : dietListQ;
  const items = tab === 'plan' ? planItems : tab === 'schedule' ? scheduleItems : dietItems;
  const detailQ = tab === 'plan' ? planDetailQ : tab === 'schedule' ? scheduleDetailQ : dietDetailQ;
  const detail = detailQ.data?.data ?? detailQ.data;
  const publishMut = tab === 'plan' ? planPublishMut : tab === 'schedule' ? schedulePublishMut : dietPublishMut;
  const deleteMut = tab === 'plan' ? planDeleteMut : tab === 'schedule' ? scheduleDeleteMut : dietDeleteMut;
  const residents = tab === 'plan' ? planResidents : tab === 'schedule' ? scheduleResidents : dietResidents;

  const switchTab = (t2: Tab) => {
    setTab(t2);
    setShowCreate(false);
    setSelectedId(null);
  };

  // ---- Form state (shared date/title/residents, per-tab entries) ----
  const [formDate, setFormDate] = useState(today);
  const [formStage, setFormStage] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [planEntries, setPlanEntries] = useState<MealEntry[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [dietEntries, setDietEntries] = useState<DietEntry[]>([]);

  const toggleResident = (id: string) => {
    setSelectedResidents(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const getResidentName = (id: string) => residents.find((r: any) => r._id === id)?.fullName ?? id.slice(-6);

  const resetForm = () => {
    setShowCreate(false); setPlanEntries([]); setScheduleEntries([]); setDietEntries([]);
    setSelectedResidents([]); setFormTitle(''); setFormStage(''); setSelectedTemplate('');
  };

  // ---- Plan tab handlers ----
  const addPlanFromTemplate = () => {
    const tpl = planTplList.find(tp => tp.key === selectedTemplate);
    if (!tpl || selectedResidents.length === 0) { toast(t(`${NS}.warnSelectTemplateResident`), 'warning'); return; }
    const newEntries: MealEntry[] = [];
    selectedResidents.forEach(rid => {
      (tpl.entries ?? []).forEach((e: any) => {
        newEntries.push({
          residentId: rid, mealType: e.mealType ?? 'breakfast',
          mealName: e.mealName ?? e.dishName ?? '', calories: String(e.calories ?? ''),
          mealTime: e.mealTime ?? MEAL_TYPES.find(m => m.value === e.mealType)?.defaultTime ?? '07:30',
          source: 'template',
        });
      });
    });
    setPlanEntries(prev => [...prev, ...newEntries]);
    toast(t(`${NS}.warnAddedItems`, { count: newEntries.length }), 'success');
  };

  const addPlanManual = () => {
    if (selectedResidents.length === 0) { toast(t(`${NS}.warnSelectResident`), 'warning'); return; }
    setPlanEntries(prev => [...prev, {
      residentId: selectedResidents[0], mealType: 'breakfast',
      mealName: '', calories: '', mealTime: '07:30', source: 'manual',
    }]);
  };

  const updatePlanEntry = (idx: number, field: string, value: string) => {
    setPlanEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      if (field === 'mealType') {
        updated.mealTime = MEAL_TYPES.find(m => m.value === value)?.defaultTime ?? e.mealTime;
      }
      return updated;
    }));
  };

  const removePlanEntry = (idx: number) => setPlanEntries(prev => prev.filter((_, i) => i !== idx));

  const handleSavePlanDraft = () => {
    if (!formDate) { toast(t(`${NS}.warnSelectDate`), 'warning'); return; }
    if (!formStage && careStages.length > 0) { toast(t(`${NS}.warnSelectCareStage`), 'warning'); return; }
    if (planEntries.length === 0) { toast(t(`${NS}.warnAddOneMeal`), 'warning'); return; }
    const invalid = planEntries.find(e => !e.mealName.trim());
    if (invalid) { toast(t(`${NS}.warnMealNameRequired`), 'warning'); return; }
    const dup = new Set<string>();
    for (const e of planEntries) {
      const key = `${e.residentId}-${e.mealType}`;
      if (dup.has(key)) { toast(t(`${NS}.warnNoDuplicateMealType`), 'warning'); return; }
      dup.add(key);
    }

    createPlanMut.mutate({
      workDate: formDate, careStage: formStage || undefined, title: formTitle || undefined,
      entries: planEntries.map(e => ({
        residentId: e.residentId, mealType: e.mealType, mealName: e.mealName.trim(),
        calories: e.calories ? Number(e.calories) : undefined, mealTime: e.mealTime, source: e.source,
      })),
    }, {
      onSuccess: () => { resetForm(); toast(t(`${NS}.toastSaved`), 'success'); },
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSaveError`), 'error'),
    });
  };

  // ---- Schedule tab handlers (one row per resident) ----
  const addScheduleFromTemplate = () => {
    const tpl = scheduleTplList.find(tp => tp.key === selectedTemplate);
    if (!tpl || selectedResidents.length === 0) { toast(t(`${NS}.warnSelectTemplateResident`), 'warning'); return; }
    setScheduleEntries(prev => {
      const existingIds = new Set(prev.map(e => e.residentId));
      const additions = selectedResidents.filter(rid => !existingIds.has(rid)).map(rid => ({
        residentId: rid, breakfastTime: tpl.breakfastTime ?? '07:30', lunchTime: tpl.lunchTime ?? '11:30',
        dinnerTime: tpl.dinnerTime ?? '17:30', notes: '', source: 'template',
      }));
      return [...prev, ...additions];
    });
  };

  const addScheduleManual = () => {
    if (selectedResidents.length === 0) { toast(t(`${NS}.warnSelectResident`), 'warning'); return; }
    const rid = selectedResidents[0];
    if (scheduleEntries.some(e => e.residentId === rid)) { toast(t(`${NS}.warnResidentHasSchedule`), 'warning'); return; }
    setScheduleEntries(prev => [...prev, { residentId: rid, breakfastTime: '07:30', lunchTime: '11:30', dinnerTime: '17:30', notes: '', source: 'manual' }]);
  };

  const updateScheduleEntry = (idx: number, field: string, value: string) => {
    setScheduleEntries(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const removeScheduleEntry = (idx: number) => setScheduleEntries(prev => prev.filter((_, i) => i !== idx));

  const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const toMinutes = (hhmm: string) => {
    const m = TIME_REGEX.exec(hhmm || '');
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const handleSaveScheduleDraft = () => {
    if (!formDate) { toast(t(`${NS}.warnSelectDate`), 'warning'); return; }
    if (scheduleEntries.length === 0) { toast(t(`${NS}.warnAddOneResident`), 'warning'); return; }

    for (const e of scheduleEntries) {
      const b = toMinutes(e.breakfastTime);
      const l = toMinutes(e.lunchTime);
      const d = toMinutes(e.dinnerTime);
      if (b === null || l === null || d === null) {
        toast(t(`${NS}.warnInvalidTimeFormat`, 'Meal times must be in HH:mm format.'), 'warning');
        return;
      }
      if (!(b < l && l < d)) {
        toast(t(`${NS}.warnMealTimeOrder`, 'Breakfast time must be before lunch, which must be before dinner.'), 'warning');
        return;
      }
    }

    createScheduleMut.mutate({
      workDate: formDate, title: formTitle || undefined,
      entries: scheduleEntries.map(e => ({
        residentId: e.residentId, breakfastTime: e.breakfastTime, lunchTime: e.lunchTime,
        dinnerTime: e.dinnerTime, notes: e.notes || undefined, source: e.source,
      })),
    }, {
      onSuccess: () => { resetForm(); toast(t(`${NS}.toastSaved`), 'success'); },
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSaveError`), 'error'),
    });
  };

  // ---- Diet tab handlers ----
  const addDietFromTemplate = () => {
    const tpl = dietTplList.find(tp => tp.key === selectedTemplate);
    if (!tpl || selectedResidents.length === 0) { toast(t(`${NS}.warnSelectTemplateResident`), 'warning'); return; }
    const newEntries: DietEntry[] = selectedResidents.map(rid => ({
      residentId: rid, dietType: tpl.dietType, restrictions: (tpl.restrictions ?? []).join(', '),
      nutritionGoal: tpl.nutritionGoal ?? '', effectiveTime: tpl.effectiveTime ?? '07:00', notes: '', source: 'template',
    }));
    setDietEntries(prev => [...prev, ...newEntries]);
    toast(t(`${NS}.warnAddedDiets`, { count: newEntries.length }), 'success');
  };

  const addDietManual = () => {
    if (selectedResidents.length === 0) { toast(t(`${NS}.warnSelectResident`), 'warning'); return; }
    setDietEntries(prev => [...prev, {
      residentId: selectedResidents[0], dietType: dietTypeOptions[0] ?? 'custom', restrictions: '',
      nutritionGoal: '', effectiveTime: '07:00', notes: '', source: 'manual',
    }]);
  };

  const updateDietEntry = (idx: number, field: string, value: string) => {
    setDietEntries(prev => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const removeDietEntry = (idx: number) => setDietEntries(prev => prev.filter((_, i) => i !== idx));

  const handleSaveDietDraft = () => {
    if (!formDate) { toast(t(`${NS}.warnSelectDate`), 'warning'); return; }
    if (dietEntries.length === 0) { toast(t(`${NS}.warnAddOneDiet`), 'warning'); return; }
    const invalid = dietEntries.find(e => !e.dietType || !e.effectiveTime);
    if (invalid) { toast(t(`${NS}.warnDietTypeRequired`), 'warning'); return; }

    createDietMut.mutate({
      workDate: formDate, title: formTitle || undefined,
      entries: dietEntries.map(e => ({
        residentId: e.residentId, dietType: e.dietType,
        restrictions: e.restrictions ? e.restrictions.split(',').map(s => s.trim()).filter(Boolean) : [],
        nutritionGoal: e.nutritionGoal || undefined, effectiveTime: e.effectiveTime, notes: e.notes || undefined, source: e.source,
      })),
    }, {
      onSuccess: () => { resetForm(); toast(t(`${NS}.toastSaved`), 'success'); },
      onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastSaveError`), 'error'),
    });
  };

  const createMut = tab === 'plan' ? createPlanMut : tab === 'schedule' ? createScheduleMut : createDietMut;
  const handleSaveDraft = tab === 'plan' ? handleSavePlanDraft : tab === 'schedule' ? handleSaveScheduleDraft : handleSaveDietDraft;
  const createTitle = tab === 'plan' ? t(`${NS}.createTitle`) : tab === 'schedule' ? t(`${NS}.createScheduleTitle`) : t(`${NS}.createDietTitle`);
  const tplList = tab === 'plan' ? planTplList : tab === 'schedule' ? scheduleTplList : dietTplList;

  if (showCreate) {
    return (
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View style={styles.topRow}>
            <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => setShowCreate(false)} />
            <Text style={styles.topTitle}>{createTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={styles.createBody} keyboardShouldPersistTaps="handled">
          <CalendarPicker label={t(`${NS}.applyDate`)} value={formDate} onChange={setFormDate} minDate={today} color={COLOR} />

          {tab === 'plan' && careStages.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>{t(`${NS}.careStage`)}</Text>
              <View style={styles.chipRow}>
                {careStages.map(s => (
                  <Chip key={s} selected={formStage === s} onPress={() => setFormStage(s)}
                    style={formStage === s ? { backgroundColor: COLOR } : undefined}
                    textStyle={formStage === s ? { color: '#fff' } : undefined} compact>{CARE_STAGE_LABEL[s] ?? s}</Chip>
                ))}
              </View>
            </>
          )}

          <TextInput label={t(`${NS}.titlePlaceholder`)} mode="outlined" value={formTitle}
            onChangeText={setFormTitle} dense style={{ marginBottom: 12 }} />

          <Text style={styles.fieldLabel}>{t(`${NS}.selectResidents`)}</Text>
          <Card style={styles.residentBox} mode="outlined">
            <Card.Content>
              {residents.length === 0 ? <Text style={{ color: '#9CA3AF' }}>{t(`${NS}.noResidents`)}</Text> : null}
              {residents.map((r: any) => (
                <Pressable key={r._id} onPress={() => toggleResident(r._id)} style={styles.resCheck}>
                  <Checkbox status={selectedResidents.includes(r._id) ? 'checked' : 'unchecked'} color={COLOR} />
                  <Text style={styles.resCheckName}>{r.fullName}</Text>
                </Pressable>
              ))}
            </Card.Content>
          </Card>

          {tplList.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{t(`${NS}.addFromTemplate`)}</Text>
              <View style={styles.chipRow}>
                {tplList.map(tp => (
                  <Chip key={tp.key} selected={selectedTemplate === tp.key}
                    onPress={() => setSelectedTemplate(tp.key)}
                    style={selectedTemplate === tp.key ? { backgroundColor: COLOR } : undefined}
                    textStyle={selectedTemplate === tp.key ? { color: '#fff' } : undefined} compact>{tp.name}</Chip>
                ))}
              </View>
              <Button mode="outlined" icon="plus"
                onPress={tab === 'plan' ? addPlanFromTemplate : tab === 'schedule' ? addScheduleFromTemplate : addDietFromTemplate}
                style={{ marginBottom: 8 }} textColor={COLOR}>
                {t(`${NS}.addFromTemplate`)}
              </Button>
            </>
          )}

          <Button mode="outlined" icon="pencil-plus-outline"
            onPress={tab === 'plan' ? addPlanManual : tab === 'schedule' ? addScheduleManual : addDietManual}
            style={{ marginBottom: 16 }} textColor={COLOR}>
            {t(`${NS}.addManual`)}
          </Button>

          {tab === 'plan' && (
            <>
              {planEntries.length > 0 && <Text style={styles.fieldLabel}>{t(`${NS}.mealListCount`, { count: planEntries.length })}</Text>}
              {planEntries.map((entry, idx) => (
                <Card key={idx} style={styles.entryCard} mode="outlined">
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.entryResident}>{getResidentName(entry.residentId)}</Text>
                      <IconButton icon="close" size={18} onPress={() => removePlanEntry(idx)} />
                    </View>
                    <View style={styles.chipRow}>
                      {MEAL_TYPES.map(m => (
                        <Chip key={m.value} selected={entry.mealType === m.value} compact
                          onPress={() => updatePlanEntry(idx, 'mealType', m.value)}
                          style={entry.mealType === m.value ? { backgroundColor: COLOR } : undefined}
                          textStyle={entry.mealType === m.value ? { color: '#fff' } : undefined}>{m.label}</Chip>
                      ))}
                    </View>
                    <TextInput label={t(`${NS}.mealNameLabel`)} mode="outlined" value={entry.mealName}
                      onChangeText={v => updatePlanEntry(idx, 'mealName', v)} dense style={{ marginBottom: 4 }} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput label={t(`${NS}.kcalLabel`)} mode="outlined" value={entry.calories} keyboardType="numeric"
                        onChangeText={v => updatePlanEntry(idx, 'calories', v)} dense style={{ flex: 1 }} />
                      <TextInput label={t(`${NS}.timeLabel`)} mode="outlined" value={entry.mealTime}
                        onChangeText={v => updatePlanEntry(idx, 'mealTime', v)} dense style={{ flex: 1 }} />
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {tab === 'schedule' && (
            <>
              {scheduleEntries.length > 0 && <Text style={styles.fieldLabel}>{t(`${NS}.scheduleListCount`, { count: scheduleEntries.length })}</Text>}
              {scheduleEntries.map((entry, idx) => (
                <Card key={idx} style={styles.entryCard} mode="outlined">
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.entryResident}>{getResidentName(entry.residentId)}</Text>
                      <IconButton icon="close" size={18} onPress={() => removeScheduleEntry(idx)} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput label={t(`${NS}.breakfastLabel`)} mode="outlined" value={entry.breakfastTime}
                        onChangeText={v => updateScheduleEntry(idx, 'breakfastTime', v)} dense style={{ flex: 1 }} />
                      <TextInput label={t(`${NS}.lunchLabel`)} mode="outlined" value={entry.lunchTime}
                        onChangeText={v => updateScheduleEntry(idx, 'lunchTime', v)} dense style={{ flex: 1 }} />
                      <TextInput label={t(`${NS}.dinnerLabel`)} mode="outlined" value={entry.dinnerTime}
                        onChangeText={v => updateScheduleEntry(idx, 'dinnerTime', v)} dense style={{ flex: 1 }} />
                    </View>
                    <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={entry.notes}
                      onChangeText={v => updateScheduleEntry(idx, 'notes', v)} dense style={{ marginTop: 4 }} />
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {tab === 'diet' && (
            <>
              {dietEntries.length > 0 && <Text style={styles.fieldLabel}>{t(`${NS}.dietListCount`, { count: dietEntries.length })}</Text>}
              {dietEntries.map((entry, idx) => (
                <Card key={idx} style={styles.entryCard} mode="outlined">
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.entryResident}>{getResidentName(entry.residentId)}</Text>
                      <IconButton icon="close" size={18} onPress={() => removeDietEntry(idx)} />
                    </View>
                    <View style={styles.chipRow}>
                      {dietTypeOptions.map(dt => (
                        <Chip key={dt} selected={entry.dietType === dt} compact
                          onPress={() => updateDietEntry(idx, 'dietType', dt)}
                          style={entry.dietType === dt ? { backgroundColor: COLOR } : undefined}
                          textStyle={entry.dietType === dt ? { color: '#fff' } : undefined}>{DIET_TYPE_LABEL[dt] ?? dt}</Chip>
                      ))}
                    </View>
                    <TextInput label={t(`${NS}.restrictionsLabel`)} mode="outlined" value={entry.restrictions}
                      onChangeText={v => updateDietEntry(idx, 'restrictions', v)} dense style={{ marginBottom: 4 }} />
                    <TextInput label={t(`${NS}.nutritionGoalLabel`)} mode="outlined" value={entry.nutritionGoal}
                      onChangeText={v => updateDietEntry(idx, 'nutritionGoal', v)} dense style={{ marginBottom: 4 }} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput label={t(`${NS}.effectiveTimeLabel`)} mode="outlined" value={entry.effectiveTime}
                        onChangeText={v => updateDietEntry(idx, 'effectiveTime', v)} dense style={{ flex: 1 }} />
                    </View>
                    <TextInput label={t(`${NS}.notesLabel`)} mode="outlined" value={entry.notes}
                      onChangeText={v => updateDietEntry(idx, 'notes', v)} dense style={{ marginTop: 4 }} />
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          <Button mode="contained" buttonColor={COLOR} onPress={handleSaveDraft}
            loading={createMut.isPending} style={styles.saveBtn} icon="content-save-outline">
            {t(`${NS}.saveDraft`)}
          </Button>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>{t(`${NS}.listTitle`)}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tb => (
          <Chip key={tb.value} selected={tab === tb.value} onPress={() => switchTab(tb.value)}
            style={tab === tb.value ? { backgroundColor: COLOR } : undefined}
            textStyle={tab === tb.value ? { color: '#fff' } : undefined}>{tb.label}</Chip>
        ))}
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage={t(`${NS}.noData`)}>
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setSelectedId(item._id)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title || t(`${NS}.noTitle`)}</Text>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.info}>{item.workDate ? new Date(item.workDate).toLocaleDateString('vi-VN') : ''}</Text>
                    </View>
                    {item.careStage ? <Text style={styles.stage}>{CARE_STAGE_LABEL[item.careStage] ?? item.careStage}</Text> : null}
                    {item.entries?.length > 0 && (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.entries.length} {tab === 'plan' ? t(`${NS}.itemsMeal`) : tab === 'schedule' ? t(`${NS}.itemsSchedule`) : t(`${NS}.itemsDiet`)}</Text>
                      </View>
                    )}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'draft' ? (
                <Card.Actions>
                  <Button compact textColor={COLOR} onPress={() => setPublishId(item._id)}>{t(`${NS}.publish`)}</Button>
                  <Button compact textColor="#991B1B" onPress={() => setDeleteId(item._id)}>{t(`${NS}.delete`)}</Button>
                </Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={!!selectedId && !publishId && !deleteId} onDismiss={() => setSelectedId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detail?.title || t(`${NS}.detailTitle`)}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            {detail ? (
              <View style={{ padding: 4 }}>
                <Text style={styles.detailLabel}>{t(`${NS}.dateLabel`)}: <Text style={styles.detailValue}>{detail.workDate ? new Date(detail.workDate).toLocaleDateString('vi-VN') : ''}</Text></Text>
                {detail.careStage ? <Text style={styles.detailLabel}>{t(`${NS}.stageLabel`)}: <Text style={styles.detailValue}>{CARE_STAGE_LABEL[detail.careStage] ?? detail.careStage}</Text></Text> : null}
                <Text style={styles.detailLabel}>{t(`${NS}.statusLabel`)}: <Text style={styles.detailValue}>{detail.status === 'draft' ? t(`${NS}.statusDraft`) : t(`${NS}.statusPublished`)}</Text></Text>
                {detail.entries?.length > 0 ? (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>{t(`${NS}.detailListCount`, { count: detail.entries.length })}</Text>
                    {detail.entries.map((entry: any, i: number) => (
                      <Card key={i} style={{ marginTop: 6, borderRadius: 8 }} mode="outlined">
                        <Card.Content>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{entry.residentId?.fullName ?? getResidentName(entry.residentId)}</Text>
                          {tab === 'plan' ? (
                            <>
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                {MEAL_TYPE_LABEL[entry.mealType] ?? entry.mealType} · {entry.mealTime ?? ''} — {entry.mealName ?? ''}
                              </Text>
                              {entry.calories ? <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{entry.calories} kcal</Text> : null}
                            </>
                          ) : tab === 'schedule' ? (
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>
                              {t(`${NS}.breakfastLabel`)} {entry.breakfastTime} · {t(`${NS}.lunchLabel`)} {entry.lunchTime} · {t(`${NS}.dinnerLabel`)} {entry.dinnerTime}
                            </Text>
                          ) : (
                            <>
                              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                {DIET_TYPE_LABEL[entry.dietType] ?? entry.dietType} · {entry.effectiveTime}
                              </Text>
                              {entry.restrictions?.length ? <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{entry.restrictions.join(', ')}</Text> : null}
                              {entry.nutritionGoal ? <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{entry.nutritionGoal}</Text> : null}
                            </>
                          )}
                        </Card.Content>
                      </Card>
                    ))}
                  </>
                ) : <Text style={{ color: '#9CA3AF', marginTop: 8 }}>{t(`${NS}.noData`)}</Text>}
              </View>
            ) : <Text style={{ color: '#9CA3AF' }}>{t('common.loading')}</Text>}
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setSelectedId(null)}>{t('common.close')}</Button></Dialog.Actions>
        </Dialog>

        <Dialog visible={!!publishId} onDismiss={() => setPublishId(null)}>
          <Dialog.Title>{t(`${NS}.publishConfirmTitle`)}</Dialog.Title>
          <Dialog.Content><Text>{t(`${NS}.publishConfirmContent`)}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPublishId(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor={COLOR} loading={publishMut.isPending}
              onPress={() => publishMut.mutate(publishId!, {
                onSuccess: () => { setPublishId(null); setSelectedId(null); toast(t(`${NS}.toastPublished`), 'success'); },
                onError: (e: any) => toast(e.response?.data?.message ?? t(`${NS}.toastPublishError`), 'error'),
              })}>{t(`${NS}.publish`)}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}>
          <Dialog.Title>{t(`${NS}.deleteConfirmTitle`)}</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setDeleteId(null)}>{t('common.cancel')}</Button>
            <Button mode="contained" buttonColor="#991B1B" loading={deleteMut.isPending}
              onPress={() => deleteMut.mutate(deleteId!, {
                onSuccess: () => { setDeleteId(null); setSelectedId(null); toast(t(`${NS}.toastDeleted`), 'success'); },
                onError: () => toast(t(`${NS}.toastDeleteError`), 'error'),
              })}>{t(`${NS}.delete`)}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 4, paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
  list: { padding: 16, paddingBottom: 80 },
  card: { borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  stage: { fontSize: 11, color: COLOR, marginTop: 2, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  info: { fontSize: 12, color: '#6B7280' },
  fab: { position: 'absolute', bottom: 16, right: 16 },
  detailLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 4 },
  detailValue: { fontWeight: '400', color: '#111827' },
  // Create form
  createBody: { padding: 16, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  residentBox: { borderRadius: 12, marginBottom: 8, maxHeight: 200 },
  resCheck: { flexDirection: 'row', alignItems: 'center' },
  resCheckName: { fontSize: 13, color: '#111827' },
  entryCard: { borderRadius: 10, marginBottom: 8, backgroundColor: '#fff' },
  entryResident: { fontSize: 13, fontWeight: '600', color: COLOR },
  saveBtn: { borderRadius: 8, marginTop: 8 },
});
