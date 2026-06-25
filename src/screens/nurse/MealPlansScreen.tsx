import React, { useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Chip, Button, Dialog, Portal, IconButton, TextInput, FAB, Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMealPlans, useMealPlanDetail, useMealPlanTemplates, useMealPlanResidents, useCreateMealPlanDraft, usePublishMealPlan, useDeleteMealPlan } from '../../hooks/useMealPlans';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { useToast } from '../../utils/toast';

const COLOR = '#0F5040';
const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'published', label: 'Đã xuất bản' },
];
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Sáng', defaultTime: '07:30' },
  { value: 'lunch', label: 'Trưa', defaultTime: '11:30' },
  { value: 'dinner', label: 'Tối', defaultTime: '17:30' },
];

type MealEntry = { residentId: string; mealType: string; mealName: string; calories: string; mealTime: string; source: string };

export const MealPlansScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const listQ = useMealPlans({ status: filter || undefined });
  const items = Array.isArray(listQ.data?.data) ? listQ.data.data : [];
  const detailQ = useMealPlanDetail(selectedId ?? undefined);
  const detail = detailQ.data?.data ?? detailQ.data;
  const publishMut = usePublishMealPlan();
  const deleteMut = useDeleteMealPlan();

  // Create form state
  const today = new Date().toISOString().split('T')[0];
  const templatesQ = useMealPlanTemplates();
  const residentsQ = useMealPlanResidents();
  const templates = templatesQ.data?.data ?? templatesQ.data ?? {};
  const careStages: string[] = templates.careStages ?? [];
  const tplList: any[] = templates.templates ?? [];
  const residents = residentsQ.data?.data?.data ?? [];

  const [formDate, setFormDate] = useState(today);
  const [formStage, setFormStage] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const createMut = useCreateMealPlanDraft();

  const toggleResident = (id: string) => {
    setSelectedResidents(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const addFromTemplate = () => {
    const tpl = tplList.find(t => t.key === selectedTemplate);
    if (!tpl || selectedResidents.length === 0) { toast('Chọn template và cư dân', 'warning'); return; }
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
    setEntries(prev => [...prev, ...newEntries]);
    toast(`Đã thêm ${newEntries.length} món`, 'success');
  };

  const addManual = () => {
    if (selectedResidents.length === 0) { toast('Chọn ít nhất 1 cư dân', 'warning'); return; }
    setEntries(prev => [...prev, {
      residentId: selectedResidents[0], mealType: 'breakfast',
      mealName: '', calories: '', mealTime: '07:30', source: 'manual',
    }]);
  };

  const updateEntry = (idx: number, field: string, value: string) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      if (field === 'mealType') {
        updated.mealTime = MEAL_TYPES.find(m => m.value === value)?.defaultTime ?? e.mealTime;
      }
      return updated;
    }));
  };

  const removeEntry = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx));

  const handleSaveDraft = () => {
    if (!formDate) { toast('Chọn ngày áp dụng', 'warning'); return; }
    if (!formStage && careStages.length > 0) { toast('Chọn giai đoạn chăm sóc', 'warning'); return; }
    if (entries.length === 0) { toast('Thêm ít nhất 1 món ăn', 'warning'); return; }
    const invalid = entries.find(e => !e.mealName.trim());
    if (invalid) { toast('Tên món ăn không được để trống', 'warning'); return; }

    createMut.mutate({
      workDate: formDate, careStage: formStage || undefined, title: formTitle || undefined,
      entries: entries.map(e => ({
        residentId: e.residentId, mealType: e.mealType, mealName: e.mealName.trim(),
        calories: e.calories ? Number(e.calories) : undefined, mealTime: e.mealTime, source: e.source,
      })),
    }, {
      onSuccess: () => {
        setShowCreate(false); setEntries([]); setSelectedResidents([]); setFormTitle(''); setFormStage('');
        toast('Đã lưu bản nháp', 'success');
      },
      onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể lưu', 'error'),
    });
  };

  const getResidentName = (id: string) => residents.find((r: any) => r._id === id)?.fullName ?? id.slice(-6);

  if (showCreate) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => setShowCreate(false)} />
            <Text style={styles.topTitle}>Tạo thực đơn</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={styles.createBody} keyboardShouldPersistTaps="handled">
          <CalendarPicker label="Ngày áp dụng *" value={formDate} onChange={setFormDate} minDate={today} color={COLOR} />

          {careStages.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Giai đoạn chăm sóc *</Text>
              <View style={styles.chipRow}>
                {careStages.map(s => (
                  <Chip key={s} selected={formStage === s} onPress={() => setFormStage(s)}
                    style={formStage === s ? { backgroundColor: COLOR } : undefined}
                    textStyle={formStage === s ? { color: '#fff' } : undefined} compact>{s}</Chip>
                ))}
              </View>
            </>
          )}

          <TextInput label="Tiêu đề (tùy chọn)" mode="outlined" value={formTitle}
            onChangeText={setFormTitle} dense style={{ marginBottom: 12 }} />

          <Text style={styles.fieldLabel}>Chọn cư dân *</Text>
          <Card style={styles.residentBox} mode="outlined">
            <Card.Content>
              {residents.length === 0 ? <Text style={{ color: '#9CA3AF' }}>Không có cư dân</Text> : null}
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
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Thêm từ template</Text>
              <View style={styles.chipRow}>
                {tplList.map(t => (
                  <Chip key={t.key} selected={selectedTemplate === t.key}
                    onPress={() => setSelectedTemplate(t.key)}
                    style={selectedTemplate === t.key ? { backgroundColor: COLOR } : undefined}
                    textStyle={selectedTemplate === t.key ? { color: '#fff' } : undefined} compact>{t.name}</Chip>
                ))}
              </View>
              <Button mode="outlined" icon="plus" onPress={addFromTemplate} style={{ marginBottom: 8 }} textColor={COLOR}>
                Thêm từ template
              </Button>
            </>
          )}

          <Button mode="outlined" icon="pencil-plus-outline" onPress={addManual} style={{ marginBottom: 16 }} textColor={COLOR}>
            Thêm thủ công
          </Button>

          {entries.length > 0 && <Text style={styles.fieldLabel}>Danh sách món ({entries.length})</Text>}
          {entries.map((entry, idx) => (
            <Card key={idx} style={styles.entryCard} mode="outlined">
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.entryResident}>{getResidentName(entry.residentId)}</Text>
                  <IconButton icon="close" size={18} onPress={() => removeEntry(idx)} />
                </View>
                <View style={styles.chipRow}>
                  {MEAL_TYPES.map(m => (
                    <Chip key={m.value} selected={entry.mealType === m.value} compact
                      onPress={() => updateEntry(idx, 'mealType', m.value)}
                      style={entry.mealType === m.value ? { backgroundColor: COLOR } : undefined}
                      textStyle={entry.mealType === m.value ? { color: '#fff' } : undefined}>{m.label}</Chip>
                  ))}
                </View>
                <TextInput label="Tên món *" mode="outlined" value={entry.mealName}
                  onChangeText={v => updateEntry(idx, 'mealName', v)} dense style={{ marginBottom: 4 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput label="Kcal" mode="outlined" value={entry.calories} keyboardType="numeric"
                    onChangeText={v => updateEntry(idx, 'calories', v)} dense style={{ flex: 1 }} />
                  <TextInput label="Giờ (HH:MM)" mode="outlined" value={entry.mealTime}
                    onChangeText={v => updateEntry(idx, 'mealTime', v)} dense style={{ flex: 1 }} />
                </View>
              </Card.Content>
            </Card>
          ))}

          <Button mode="contained" buttonColor={COLOR} onPress={handleSaveDraft}
            loading={createMut.isPending} style={styles.saveBtn} icon="content-save-outline">
            Lưu bản nháp
          </Button>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" iconColor="#fff" size={22} onPress={() => navigation.goBack()} />
          <Text style={styles.topTitle}>Kế hoạch bữa ăn</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Chip key={f.value} selected={filter === f.value} onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: COLOR } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined} compact>{f.label}</Chip>
        ))}
      </View>

      <ScreenLayout loading={listQ.isLoading} error={listQ.error ? (listQ.error as Error).message : null}
        onRetry={listQ.refetch} isEmpty={items.length === 0} emptyMessage="Chưa có kế hoạch bữa ăn">
        <FlatList data={items} keyExtractor={(i: any) => i._id} contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={listQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setSelectedId(item._id)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title || 'Kế hoạch bữa ăn'}</Text>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.info}>{item.workDate ? new Date(item.workDate).toLocaleDateString('vi-VN') : ''}</Text>
                    </View>
                    {item.careStage ? <Text style={styles.stage}>{item.careStage}</Text> : null}
                    {item.entries?.length > 0 && (
                      <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#6B7280" />
                        <Text style={styles.info}>{item.entries.length} món</Text>
                      </View>
                    )}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
              {item.status === 'draft' ? (
                <Card.Actions>
                  <Button compact textColor={COLOR} onPress={() => setPublishId(item._id)}>Xuất bản</Button>
                  <Button compact textColor="#991B1B" onPress={() => setDeleteId(item._id)}>Xóa</Button>
                </Card.Actions>
              ) : null}
            </Card>
          )} />
      </ScreenLayout>
      <FAB icon="plus" style={[styles.fab, { backgroundColor: COLOR }]} color="#fff" onPress={() => setShowCreate(true)} />

      <Portal>
        <Dialog visible={!!selectedId && !publishId && !deleteId} onDismiss={() => setSelectedId(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>{detail?.title || 'Chi tiết kế hoạch'}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            {detail ? (
              <View style={{ padding: 4 }}>
                <Text style={styles.detailLabel}>Ngày: <Text style={styles.detailValue}>{detail.workDate ? new Date(detail.workDate).toLocaleDateString('vi-VN') : ''}</Text></Text>
                {detail.careStage ? <Text style={styles.detailLabel}>Giai đoạn: <Text style={styles.detailValue}>{detail.careStage}</Text></Text> : null}
                <Text style={styles.detailLabel}>Trạng thái: <Text style={styles.detailValue}>{detail.status === 'draft' ? 'Nháp' : 'Đã xuất bản'}</Text></Text>
                {detail.entries?.length > 0 ? (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>Danh sách món ({detail.entries.length}):</Text>
                    {detail.entries.map((entry: any, i: number) => (
                      <Card key={i} style={{ marginTop: 6, borderRadius: 8 }} mode="outlined">
                        <Card.Content>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{entry.residentId?.fullName ?? 'Cư dân'}</Text>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>
                            {entry.mealType === 'breakfast' ? 'Sáng' : entry.mealType === 'lunch' ? 'Trưa' : entry.mealType === 'dinner' ? 'Tối' : entry.mealType} · {entry.mealTime ?? ''} — {entry.mealName ?? ''}
                          </Text>
                          {entry.calories ? <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{entry.calories} kcal</Text> : null}
                        </Card.Content>
                      </Card>
                    ))}
                  </>
                ) : <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Chưa có món nào</Text>}
              </View>
            ) : <Text style={{ color: '#9CA3AF' }}>Đang tải...</Text>}
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setSelectedId(null)}>Đóng</Button></Dialog.Actions>
        </Dialog>

        <Dialog visible={!!publishId} onDismiss={() => setPublishId(null)}>
          <Dialog.Title>Xuất bản kế hoạch?</Dialog.Title>
          <Dialog.Content><Text>Sau khi xuất bản, kế hoạch sẽ được áp dụng cho hộ lý ghi nhận bữa ăn.</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPublishId(null)}>Hủy</Button>
            <Button mode="contained" buttonColor={COLOR} loading={publishMut.isPending}
              onPress={() => publishMut.mutate(publishId!, {
                onSuccess: () => { setPublishId(null); setSelectedId(null); toast('Đã xuất bản', 'success'); },
                onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể xuất bản', 'error'),
              })}>Xuất bản</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!deleteId} onDismiss={() => setDeleteId(null)}>
          <Dialog.Title>Xóa bản nháp?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setDeleteId(null)}>Hủy</Button>
            <Button mode="contained" buttonColor="#991B1B" loading={deleteMut.isPending}
              onPress={() => deleteMut.mutate(deleteId!, {
                onSuccess: () => { setDeleteId(null); setSelectedId(null); toast('Đã xóa', 'success'); },
                onError: () => toast('Không thể xóa', 'error'),
              })}>Xóa</Button>
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
