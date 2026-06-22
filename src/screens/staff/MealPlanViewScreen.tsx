import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { MEAL_PLANS } from '../../api/endpoints';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

const COLOR = '#0F5040';
const today = () => new Date().toISOString().split('T')[0];

const MEAL_ICONS: Record<string, string> = {
  breakfast: 'coffee',
  lunch: 'food',
  dinner: 'silverware-fork-knife',
  snack: 'fruit-cherries',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
  snack: 'Phụ',
};

const shiftDate = (base: string, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const MealPlanViewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(today());

  const plansQ = useQuery({
    queryKey: ['mealPlans', { workDate: date, status: 'published' }],
    queryFn: async () => {
      const res = await api.get(MEAL_PLANS.LIST, { params: { workDate: date, status: 'published' } });
      return res.data;
    },
  });

  const plans = plansQ.data?.data ?? plansQ.data ?? [];

  const allEntries = plans.flatMap((p: any) =>
    (p.entries ?? p.days?.[0]?.entries ?? []).map((e: any) => ({ ...e, planTitle: p.title }))
  );

  const formatDateVi = (d: string) => {
    try { return new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
    catch { return d; }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Kế hoạch bữa ăn</Text>
        <Text style={styles.topSub}>{formatDateVi(date)}</Text>
      </View>

      <View style={styles.dateNav}>
        <Button compact textColor={COLOR} onPress={() => setDate(shiftDate(date, -1))}>
          ← Hôm trước
        </Button>
        <Chip compact onPress={() => setDate(today())} style={date === today() ? { backgroundColor: COLOR } : undefined} textStyle={date === today() ? { color: '#fff' } : undefined}>
          Hôm nay
        </Chip>
        <Button compact textColor={COLOR} onPress={() => setDate(shiftDate(date, 1))}>
          Hôm sau →
        </Button>
      </View>

      <ScreenLayout
        loading={plansQ.isLoading}
        error={plansQ.error ? (plansQ.error as Error).message : null}
        onRetry={plansQ.refetch}
        isEmpty={allEntries.length === 0}
        emptyMessage="Chưa có kế hoạch bữa ăn nào cho ngày này"
      >
        <FlatList
          data={allEntries}
          keyExtractor={(item: any, i: number) => item._id ?? `${i}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={plansQ.refetch} tintColor={COLOR} />}
          renderItem={({ item }) => {
            const mealType = item.mealType ?? 'lunch';
            const icon = MEAL_ICONS[mealType] ?? 'food';
            const label = MEAL_LABELS[mealType] ?? mealType;
            return (
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.mealBadge}>
                      <MaterialCommunityIcons name={icon as any} size={16} color={COLOR} />
                      <Text style={styles.mealLabel}>{label}</Text>
                    </View>
                    {item.time && <Text style={styles.timeText}>{item.time}</Text>}
                  </View>
                  <Text style={styles.dishName}>{item.dishName ?? item.name ?? 'Chưa có tên'}</Text>
                  {item.residentId?.fullName && (
                    <Text style={styles.resName}>{item.residentId.fullName}</Text>
                  )}
                  <View style={styles.metaRow}>
                    {item.calories && (
                      <Text style={styles.metaChip}>{item.calories} kcal</Text>
                    )}
                    {item.ingredients && (
                      <Text style={styles.metaText} numberOfLines={1}>Nguyên liệu: {item.ingredients}</Text>
                    )}
                  </View>
                  {item.nutritionNotes && (
                    <Text style={styles.notes} numberOfLines={2}>{item.nutritionNotes}</Text>
                  )}
                </Card.Content>
              </Card>
            );
          }}
        />
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  topBar: { backgroundColor: COLOR, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  topSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mealBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  mealLabel: { fontSize: 12, fontWeight: '600', color: COLOR },
  timeText: { fontSize: 12, color: '#6B7280' },
  dishName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  resName: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip: { fontSize: 11, color: '#92400E', backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  metaText: { fontSize: 11, color: '#6B7280', flex: 1 },
  notes: { fontSize: 11, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
});
