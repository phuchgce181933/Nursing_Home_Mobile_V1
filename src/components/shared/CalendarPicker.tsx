import React, { useState } from 'react';
import { View, Pressable, StyleSheet, FlatList } from 'react-native';
import { Text, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const MONTHS_SHORT_VI = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];

const toStr = (d: Date) => d.toISOString().split('T')[0];
const parseDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

const YEAR_RANGE_START = new Date().getFullYear() - 100;
const YEAR_RANGE_END = new Date().getFullYear() + 5;
const YEARS = Array.from({ length: YEAR_RANGE_END - YEAR_RANGE_START + 1 }, (_, i) => YEAR_RANGE_END - i);

type ViewMode = 'days' | 'months' | 'years';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minDate?: string;
  color?: string;
};

export const CalendarPicker: React.FC<Props> = ({ label, value, onChange, minDate, color = '#0F5040' }) => {
  const [visible, setVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const selected = value ? parseDate(value) : null;
  const min = minDate ? parseDate(minDate) : null;
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : new Date().getMonth());
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : new Date().getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const today = toStr(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSelect = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (min && dateStr < minDate!) return;
    onChange(dateStr);
    setVisible(false);
  };

  const openPicker = () => { setViewMode('days'); setVisible(true); };
  const closePicker = () => { setVisible(false); setViewMode('days'); };

  const displayText = value
    ? parseDate(value).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Chọn ngày';

  return (
    <>
      <Pressable onPress={openPicker} style={styles.trigger}>
        <View style={styles.triggerContent}>
          <MaterialCommunityIcons name="calendar-outline" size={20} color={color} />
          <View style={{ flex: 1 }}>
            <Text style={styles.triggerLabel}>{label}</Text>
            <Text style={[styles.triggerValue, !value && { color: '#9CA3AF' }]}>{displayText}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
        </View>
      </Pressable>

      <Portal>
        <Dialog visible={visible} onDismiss={closePicker} style={styles.dialog}>
          <View style={styles.header}>
            <IconButton
              icon="chevron-left"
              size={24}
              onPress={prevMonth}
              iconColor={color}
              disabled={viewMode !== 'days'}
              style={viewMode !== 'days' ? { opacity: 0 } : undefined}
            />
            <View style={styles.headerPills}>
              <Pressable
                onPress={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                style={[styles.headerPill, viewMode === 'months' && { backgroundColor: color + '20' }]}
              >
                <Text style={[styles.monthYear, { color }]}>{MONTHS_VI[viewMonth]}</Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                style={[styles.headerPill, viewMode === 'years' && { backgroundColor: color + '20' }]}
              >
                <Text style={[styles.monthYear, { color }]}>{viewYear}</Text>
              </Pressable>
            </View>
            <IconButton
              icon="chevron-right"
              size={24}
              onPress={nextMonth}
              iconColor={color}
              disabled={viewMode !== 'days'}
              style={viewMode !== 'days' ? { opacity: 0 } : undefined}
            />
          </View>

          {viewMode === 'months' && (
            <View style={styles.monthGrid}>
              {MONTHS_SHORT_VI.map((m, i) => {
                const isSelected = viewMonth === i;
                const isDisabled = min ? viewYear < min.getFullYear() || (viewYear === min.getFullYear() && i < min.getMonth()) : false;
                return (
                  <Pressable
                    key={m}
                    onPress={() => { if (!isDisabled) { setViewMonth(i); setViewMode('days'); } }}
                    style={[styles.monthCell, isSelected && { backgroundColor: color, borderRadius: 10 }]}
                  >
                    <Text style={[
                      styles.monthCellText,
                      isSelected && { color: '#fff', fontWeight: '700' },
                      isDisabled && !isSelected && styles.dayDisabled,
                    ]}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {viewMode === 'years' && (
            <FlatList
              data={YEARS}
              keyExtractor={(y) => String(y)}
              numColumns={4}
              style={styles.yearList}
              initialNumToRender={YEARS.length}
              getItemLayout={(_, index) => ({ length: 56, offset: 56 * Math.floor(index / 4), index })}
              renderItem={({ item: y }) => {
                const isSelected = viewYear === y;
                const isDisabled = min ? y < min.getFullYear() : false;
                return (
                  <Pressable
                    onPress={() => { if (!isDisabled) { setViewYear(y); setViewMode('days'); } }}
                    style={[styles.yearCell, isSelected && { backgroundColor: color, borderRadius: 10 }]}
                  >
                    <Text style={[
                      styles.monthCellText,
                      isSelected && { color: '#fff', fontWeight: '700' },
                      isDisabled && !isSelected && styles.dayDisabled,
                    ]}>
                      {y}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          {viewMode === 'days' && (
            <>
              <View style={styles.weekRow}>
                {DAYS_VI.map(d => (
                  <Text key={d} style={[styles.weekDay, d === 'CN' && { color: '#EF4444' }]}>{d}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (day === null) return <View key={`e${i}`} style={styles.cell} />;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = value === dateStr;
                  const isToday = today === dateStr;
                  const isDisabled = min ? dateStr < minDate! : false;
                  const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
                  const isSunday = dayOfWeek === 0;

                  return (
                    <Pressable
                      key={day}
                      onPress={() => !isDisabled && handleSelect(day)}
                      style={[
                        styles.cell,
                        isSelected && [styles.cellSelected, { backgroundColor: color }],
                        isToday && !isSelected && styles.cellToday,
                      ]}
                    >
                      <Text style={[
                        styles.dayText,
                        isDisabled && styles.dayDisabled,
                        isSelected && styles.daySelected,
                        isSunday && !isSelected && !isDisabled && { color: '#EF4444' },
                        isToday && !isSelected && { color, fontWeight: '700' },
                      ]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Dialog.Actions>
            <Button onPress={closePicker}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  triggerLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 1 },
  triggerValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  dialog: { borderRadius: 20, paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerPills: { flexDirection: 'row', gap: 8 },
  headerPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  monthYear: { fontSize: 16, fontWeight: '700' },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    borderRadius: 999,
  },
  cellToday: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  dayText: { fontSize: 14, color: '#111827' },
  dayDisabled: { color: '#D1D5DB' },
  daySelected: { color: '#fff', fontWeight: '700' },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthCell: {
    width: '25%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCellText: { fontSize: 14, color: '#111827' },
  yearList: {
    maxHeight: 280,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  yearCell: {
    width: '25%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
