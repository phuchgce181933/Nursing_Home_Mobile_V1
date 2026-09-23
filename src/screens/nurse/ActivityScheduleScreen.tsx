import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Dialog, Portal, Button, TextInput, Searchbar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { RESIDENTS } from '../../api/endpoints';
import { useActivities, useRecordActivityParticipation } from '../../hooks/useActivities';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { BackHeader } from '../../components/layout/BackHeader';
import { useToast } from '../../utils/toast';
import { useAppTheme } from '../../theme/useAppTheme';
import { useActivityCategoryLabel } from '../../utils/activityCategory';
import type { AppColors } from '../../constants/theme';

const NS = 'nurse.activities';

/**
 * Y tá vẫn được ghi nhận điểm danh trong 2 giờ sau khi hoạt động kết thúc.
 * Con số này khớp với services/activityService.js (backend) và
 * pages/nurse/ActivitySchedulePage.jsx (web) — sửa một nơi phải sửa cả ba.
 */
const RECORD_GRACE_MS = 2 * 60 * 60 * 1000;

/** services/activityService.js -> MAX_NOTE_LENGTH */
const MAX_NOTE_LENGTH = 500;

type AttendanceState = { status: string; note: string };
type ParticipationState = { participationLevel: string; comment: string; incident: string };

/**
 * Cửa sổ truy vấn theo tháng, dựng y hệt web:
 *   from = ngày 1 của tháng, to = ngày cuối tháng (new Date(y, m+1, 0)).
 * Cả hai nền tảng đều dùng giờ thiết bị rồi .toISOString(), nên cùng một máy
 * và cùng một tháng sẽ sinh ra đúng cùng một cặp mốc UTC — không lệch VN/UTC.
 */
const buildMonthRange = (cursor: Date) => ({
  from: new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString(),
  to: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).toISOString(),
});

/** scheduledAt/endAt là mốc thời gian ISO đầy đủ, không phải chuỗi "HH:mm" → parse trực tiếp là đúng. */
const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (value?: string | null) => {
  const d = toDate(value);
  return d ? d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};

/**
 * Điều kiện mở form điểm danh — sao chép nguyên logic canRecordAttendance của web
 * (draft/cancelled bị chặn; ngoài ra chỉ cần now nằm trong [bắt đầu, kết thúc + 2h]).
 * Cố tình KHÔNG chặn 'completed': backend tự chuyển sang completed ngay khi hết giờ,
 * nhưng vẫn cho ghi nhận trong 2 giờ ân hạn.
 */
const canRecordAttendance = (activity: any): boolean => {
  const status = String(activity?.status || '').trim().toLowerCase();
  if (status === 'draft' || status === 'cancelled') return false;

  const start = toDate(activity?.scheduledAt);
  const end = toDate(activity?.endAt) ?? start;
  if (!start || !end) return false;

  const now = Date.now();
  return now >= start.getTime() && now <= end.getTime() + RECORD_GRACE_MS;
};

/** participantResidentIds là mảng ObjectId thô (repository không populate). */
const participantIds = (activity: any): string[] =>
  (activity?.participantResidentIds ?? []).map((id: any) => String(id?._id ?? id));

/** Dòng "nhãn — giá trị" trong hộp thoại chi tiết. */
const DetailRow: React.FC<{
  label: string;
  value?: string | null;
  children?: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, children, styles }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    {children ?? (
      <Text style={styles.detailValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    )}
  </View>
);

export const ActivityScheduleScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const { colors, roleColor } = useAppTheme('nurse');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryLabel = useActivityCategoryLabel();

  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [filter, setFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  // Hộp thoại dựng từ chính bản ghi trong danh sách, giống web: không gọi thêm
  // GET /:id nào cả (endpoint chi tiết không lọc theo y tá nên cũng không nên gọi).
  const [selected, setSelected] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({});
  const [participation, setParticipation] = useState<Record<string, ParticipationState>>({});
  const [overallNotes, setOverallNotes] = useState('');

  // Web chỉ có 4 lựa chọn (không có 'ongoing' và 'draft') — giữ nguyên để hai
  // bên lọc ra cùng một tập dữ liệu.
  const STATUS_FILTERS = [
    { value: '', label: t(`${NS}.filterAll`) },
    { value: 'scheduled', label: t(`${NS}.filterScheduled`) },
    { value: 'completed', label: t(`${NS}.filterCompleted`) },
    { value: 'cancelled', label: t(`${NS}.filterCancelled`) },
  ];

  const ATTENDANCE_OPTIONS = [
    { value: 'present', label: t('status.present') },
    { value: 'absent', label: t('status.absent') },
    { value: 'late', label: t('status.late') },
    { value: 'left_early', label: t('status.left_early') },
  ];

  const PARTICIPATION_OPTIONS = [
    { value: 'passive', label: t(`${NS}.participationPassive`) },
    { value: 'partial', label: t(`${NS}.participationPartial`) },
    { value: 'active', label: t(`${NS}.participationActive`) },
  ];

  // Gõ xong mới gọi API, tránh mỗi ký tự một request.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const range = useMemo(() => buildMonthRange(monthCursor), [monthCursor]);
  const activitiesQ = useActivities({
    from: range.from,
    to: range.to,
    status: filter || undefined,
    search: search || undefined,
  });
  const activities: any[] = activitiesQ.data?.data ?? activitiesQ.data ?? [];

  /**
   * repositories/activityRepository.js không populate gì cả, nên
   * participantResidentIds chỉ là mảng ObjectId. Web giải tên qua
   * GET /residents?page=1&limit=100 — mobile làm đúng như vậy để không bao giờ
   * hiển thị ObjectId ra màn hình.
   */
  const residentsQ = useQuery({
    queryKey: ['residentsForActivities'],
    queryFn: async () => (await api.get(RESIDENTS.LIST, { params: { page: 1, limit: 100 } })).data,
    staleTime: 5 * 60 * 1000,
  });
  const residentNames = useMemo(() => {
    const rows: any[] = residentsQ.data?.data ?? residentsQ.data ?? [];
    const out: Record<string, string> = {};
    rows.forEach((r: any) => {
      if (r?._id) out[String(r._id)] = r.fullName || r.residentCode || '';
    });
    return out;
  }, [residentsQ.data]);

  // Không bao giờ rơi về ObjectId khi thiếu tên.
  const residentLabel = (id: any) => residentNames[String(id)] || t(`${NS}.residentUnknown`);

  // Nạp lại form mỗi khi mở hộp thoại hoặc sau khi lưu, từ dữ liệu đã có sẵn
  // trong bản ghi hoạt động (attendanceRecords/participationRecords).
  useEffect(() => {
    if (!selected) {
      setAttendance({});
      setParticipation({});
      setOverallNotes('');
      return;
    }
    const att: Record<string, AttendanceState> = {};
    const par: Record<string, ParticipationState> = {};
    participantIds(selected).forEach((rid) => {
      const a = (selected.attendanceRecords ?? []).find((r: any) => String(r.residentId) === rid);
      const p = (selected.participationRecords ?? []).find((r: any) => String(r.residentId) === rid);
      att[rid] = { status: a?.status ?? 'present', note: a?.note ?? '' };
      par[rid] = {
        participationLevel: p?.participationLevel ?? 'active',
        comment: p?.comment ?? '',
        incident: p?.incident ?? '',
      };
    });
    setAttendance(att);
    setParticipation(par);
    setOverallNotes(selected.participantResultNotes ?? '');
  }, [selected]);

  /**
   * Cờ "chỉ số bất thường" cạnh tên cư dân, giống web.
   * Web nạp sẵn cho toàn bộ danh sách; ở đây chỉ nạp cho hoạt động đang mở —
   * cùng kết quả hiển thị (cờ chỉ xuất hiện trong hộp thoại) nhưng ít request hơn.
   * Lỗi ở đây không được chặn luồng điểm danh nên luôn nuốt lỗi về `false`.
   */
  const abnormalQ = useQuery({
    queryKey: ['activityParticipantVitals', selected?._id],
    enabled: !!selected && participantIds(selected).length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const ids = participantIds(selected);
      const flags: Record<string, boolean> = {};
      await Promise.all(
        ids.map(async (rid) => {
          try {
            const res = await api.get(RESIDENTS.MEDICAL_RECORDS(rid), { params: { page: 1, limit: 1 } });
            const records = res.data?.data ?? res.data?.records ?? res.data ?? [];
            flags[rid] = (Array.isArray(records) ? records[0] : null)?.abnormalFlag === true;
          } catch {
            flags[rid] = false;
          }
        }),
      );
      return flags;
    },
  });
  const abnormal: Record<string, boolean> = abnormalQ.data ?? {};

  const recordMut = useRecordActivityParticipation();

  const canRecord = !!selected && canRecordAttendance(selected);
  const tooLong =
    overallNotes.length > MAX_NOTE_LENGTH ||
    Object.values(participation).some((p) => p.comment.length > MAX_NOTE_LENGTH || p.incident.length > MAX_NOTE_LENGTH) ||
    Object.values(attendance).some((a) => a.note.length > MAX_NOTE_LENGTH);

  const handleSave = () => {
    if (!selected) return;
    const ids = participantIds(selected);

    // Web gắn occurrenceDate = nửa đêm HÔM NAY theo giờ thiết bị. Backend gộp
    // bản ghi theo khoá `residentId|yyyy-mm-dd`, nên phải giữ đúng quy ước này
    // thì lưu lại lần hai mới ghi đè thay vì tạo bản trùng.
    const today = new Date();
    const occurrenceDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    const payload: Record<string, any> = {
      participantResultNotes: overallNotes.trim(),
      attendanceRecords: ids.map((rid) => ({
        residentId: rid,
        occurrenceDate,
        status: attendance[rid]?.status ?? 'present',
        note: attendance[rid]?.note ?? '',
      })),
      participationRecords: ids.map((rid) => ({
        residentId: rid,
        occurrenceDate,
        participationLevel: participation[rid]?.participationLevel ?? 'active',
        comment: participation[rid]?.comment ?? '',
        incident: participation[rid]?.incident ?? '',
      })),
    };
    // Giống web: ghi nhận xong thì hoạt động coi như đã hoàn thành.
    if (selected.status === 'scheduled') payload.status = 'completed';

    recordMut.mutate(
      { id: selected._id, ...payload },
      {
        onSuccess: (result: any) => {
          const updated = result?.data ?? result;
          // Giữ hộp thoại mở và đồng bộ lại theo dữ liệu server trả về.
          if (updated?._id) setSelected(updated);
          toast(t(`${NS}.toastAttendanceSaved`), 'success');
        },
        onError: () => toast(t(`${NS}.toastAttendanceError`), 'error'),
      },
    );
  };

  const shiftMonth = (delta: number) =>
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const selectedIds = selected ? participantIds(selected) : [];

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation.goBack()} />

      <View style={styles.monthRow}>
        <IconButton icon="chevron-left" size={22} onPress={() => shiftMonth(-1)} />
        <Text style={styles.monthLabel}>
          {t(`${NS}.monthYear`, { month: monthCursor.getMonth() + 1, year: monthCursor.getFullYear() })}
        </Text>
        <IconButton icon="chevron-right" size={22} onPress={() => shiftMonth(1)} />
      </View>

      <Searchbar
        placeholder={t(`${NS}.searchPlaceholder`)}
        value={searchInput}
        onChangeText={setSearchInput}
        style={styles.search}
        inputStyle={styles.searchInput}
      />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
            style={filter === f.value ? { backgroundColor: roleColor } : undefined}
            textStyle={filter === f.value ? { color: '#fff' } : undefined}
            compact
          >
            {f.label}
          </Chip>
        ))}
      </View>

      <ScreenLayout
        loading={activitiesQ.isLoading}
        error={activitiesQ.error ? (activitiesQ.error as Error).message : null}
        onRetry={activitiesQ.refetch}
        isEmpty={activities.length === 0}
        emptyMessage={t(`${NS}.empty`)}
      >
        <FlatList
          data={activities}
          keyExtractor={(i: any) => i._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={activitiesQ.isFetching} onRefresh={activitiesQ.refetch} tintColor={roleColor} />
          }
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined" onPress={() => setSelected(item)}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.category ? (
                      <Text style={[styles.category, { color: roleColor }]}>{categoryLabel(item.category)}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.meta}>{formatDateTime(item.scheduledAt)}</Text>
                    </View>
                    {item.location ? (
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.meta}>{item.location}</Text>
                      </View>
                    ) : null}
                    {participantIds(item).length > 0 ? (
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.meta}>
                          {t(`${NS}.participants`, { count: participantIds(item).length })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
              </Card.Content>
            </Card>
          )}
        />
      </ScreenLayout>

      <Portal>
        <Dialog visible={!!selected} onDismiss={() => setSelected(null)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle} numberOfLines={2}>
            {selected?.title || t(`${NS}.detailTitle`)}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <FlatList
              data={canRecord ? selectedIds : []}
              keyExtractor={(rid) => rid}
              contentContainerStyle={styles.dialogBody}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <View>
                  <DetailRow label={t(`${NS}.status`)} styles={styles}>
                    <StatusBadge status={selected?.status} size="sm" />
                  </DetailRow>
                  <DetailRow label={t(`${NS}.time`)} value={formatDateTime(selected?.scheduledAt)} styles={styles} />
                  {selected?.endAt ? (
                    <DetailRow label={t(`${NS}.endTime`)} value={formatDateTime(selected?.endAt)} styles={styles} />
                  ) : null}
                  <DetailRow label={t(`${NS}.location`)} value={selected?.location} styles={styles} />
                  <DetailRow
                    label={t(`${NS}.duration`)}
                    value={
                      selected?.durationMinutes
                        ? `${selected.durationMinutes} ${t(`${NS}.minutes`)}`
                        : ''
                    }
                    styles={styles}
                  />
                  <DetailRow label={t(`${NS}.category`)} value={categoryLabel(selected?.category)} styles={styles} />
                  <DetailRow
                    label={t(`${NS}.participants`, { count: selectedIds.length })}
                    value={t(`${NS}.residentCount`, { count: selectedIds.length })}
                    styles={styles}
                  />

                  {selected?.description ? (
                    <View style={styles.block}>
                      <Text style={styles.detailLabel}>{t(`${NS}.description`)}</Text>
                      <Text style={styles.blockValue}>{selected.description}</Text>
                    </View>
                  ) : null}

                  {selectedIds.length > 0 ? (
                    <View style={styles.block}>
                      <Text style={styles.detailLabel}>{t(`${NS}.participantList`)}</Text>
                      {selectedIds.map((rid) => (
                        <View key={rid} style={styles.participantRow}>
                          <Text style={styles.blockValue}>• {residentLabel(rid)}</Text>
                          {abnormal[rid] ? (
                            <MaterialCommunityIcons
                              name="alert-outline"
                              size={15}
                              color="#B45309"
                              accessibilityLabel={t(`${NS}.abnormalWarning`)}
                            />
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {canRecord ? (
                    <>
                      <Text style={styles.sectionTitle}>{t(`${NS}.attendanceTitle`)}</Text>
                      <Text style={styles.hint}>
                        {t(`${NS}.attendanceDate`)}: {new Date().toLocaleDateString('vi-VN')}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.locked}>
                      {String(selected?.status).toLowerCase() === 'cancelled' ||
                      String(selected?.status).toLowerCase() === 'draft'
                        ? t(`${NS}.attendanceLocked`)
                        : t(`${NS}.attendanceTimeExpired`)}
                    </Text>
                  )}
                </View>
              }
              renderItem={({ item: rid }) => (
                <View style={styles.residentBlock}>
                  <Text style={styles.residentName}>{residentLabel(rid)}</Text>

                  <Text style={styles.fieldLabel}>{t(`${NS}.attendanceLabel`)}</Text>
                  <View style={styles.chipRow}>
                    {ATTENDANCE_OPTIONS.map((o) => (
                      <Chip
                        key={o.value}
                        compact
                        selected={attendance[rid]?.status === o.value}
                        onPress={() =>
                          setAttendance((s) => ({ ...s, [rid]: { ...s[rid], status: o.value } }))
                        }
                        style={attendance[rid]?.status === o.value ? { backgroundColor: roleColor } : undefined}
                        textStyle={attendance[rid]?.status === o.value ? { color: '#fff' } : undefined}
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>{t(`${NS}.participationLevel`)}</Text>
                  <View style={styles.chipRow}>
                    {PARTICIPATION_OPTIONS.map((o) => (
                      <Chip
                        key={o.value}
                        compact
                        selected={participation[rid]?.participationLevel === o.value}
                        onPress={() =>
                          setParticipation((s) => ({
                            ...s,
                            [rid]: { ...s[rid], participationLevel: o.value },
                          }))
                        }
                        style={
                          participation[rid]?.participationLevel === o.value
                            ? { backgroundColor: roleColor }
                            : undefined
                        }
                        textStyle={
                          participation[rid]?.participationLevel === o.value ? { color: '#fff' } : undefined
                        }
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </View>

                  <TextInput
                    label={t(`${NS}.comment`)}
                    mode="outlined"
                    dense
                    multiline
                    maxLength={MAX_NOTE_LENGTH}
                    value={participation[rid]?.comment ?? ''}
                    onChangeText={(v) =>
                      setParticipation((s) => ({ ...s, [rid]: { ...s[rid], comment: v } }))
                    }
                    style={styles.input}
                  />
                  <TextInput
                    label={t(`${NS}.incident`)}
                    mode="outlined"
                    dense
                    multiline
                    maxLength={MAX_NOTE_LENGTH}
                    value={participation[rid]?.incident ?? ''}
                    onChangeText={(v) =>
                      setParticipation((s) => ({ ...s, [rid]: { ...s[rid], incident: v } }))
                    }
                    style={styles.input}
                  />
                  <TextInput
                    label={t(`${NS}.attendanceNote`)}
                    mode="outlined"
                    dense
                    multiline
                    maxLength={MAX_NOTE_LENGTH}
                    value={attendance[rid]?.note ?? ''}
                    onChangeText={(v) => setAttendance((s) => ({ ...s, [rid]: { ...s[rid], note: v } }))}
                    style={styles.input}
                  />
                </View>
              )}
              ListFooterComponent={
                canRecord ? (
                  <TextInput
                    label={t(`${NS}.overallComment`)}
                    mode="outlined"
                    dense
                    multiline
                    maxLength={MAX_NOTE_LENGTH}
                    value={overallNotes}
                    onChangeText={setOverallNotes}
                    style={styles.input}
                  />
                ) : null
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>{t('common.close')}</Button>
            {canRecord && (
              <Button
                mode="contained"
                buttonColor={roleColor}
                onPress={handleSave}
                loading={recordMut.isPending}
                disabled={recordMut.isPending || tooLong || selectedIds.length === 0}
              >
                {recordMut.isPending ? t(`${NS}.saving`) : t(`${NS}.saveAttendance`)}
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
    monthLabel: { fontSize: 15, fontWeight: '600', color: c.text, minWidth: 150, textAlign: 'center' },
    search: { marginHorizontal: 12, marginTop: 4, backgroundColor: c.surface, borderRadius: 12 },
    searchInput: { fontSize: 14, minHeight: 0 },
    filterRow: { flexDirection: 'row', gap: 6, padding: 12, flexWrap: 'wrap' },
    list: { padding: 16, paddingBottom: 32 },
    card: { borderRadius: 12, marginBottom: 8, backgroundColor: c.surface },
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { fontSize: 14, fontWeight: '600', color: c.text },
    category: { fontSize: 12, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    meta: { fontSize: 12, color: c.textSecondary, flexShrink: 1 },

    dialog: { borderRadius: 16, maxHeight: '88%' },
    dialogTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    scrollArea: { paddingHorizontal: 0 },
    dialogBody: { paddingHorizontal: 24, paddingBottom: 8 },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingVertical: 7,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    detailLabel: { fontSize: 12, color: c.textSecondary },
    detailValue: { fontSize: 13, fontWeight: '600', color: c.text, flexShrink: 1, textAlign: 'right' },
    block: { paddingTop: 10 },
    participantRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    blockValue: { fontSize: 13, color: c.text, marginTop: 4, lineHeight: 19 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 16 },
    hint: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    locked: { fontSize: 12, color: c.textSecondary, marginTop: 16, fontStyle: 'italic', lineHeight: 18 },
    residentBlock: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.divider,
    },
    residentName: { fontSize: 13, fontWeight: '700', color: c.text },
    fieldLabel: { fontSize: 12, color: c.textSecondary, marginTop: 8, marginBottom: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    input: { marginTop: 8, backgroundColor: c.surface },
  });
