import { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Pressable, Animated as RNAnimated,
  ScrollView, RefreshControl,
} from 'react-native';
import { ThemedText } from './themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';

// ─── Status badge ──────────────────────────────────────────────────────────────
type StatusKey =
  | 'STABLE' | 'MONITORING' | 'CRITICAL'
  | 'DONE' | 'PENDING' | 'UPCOMING' | 'MISSED' | 'OVERDUE'
  | 'ADMINISTERED' | 'SKIPPED' | 'REFUSED'
  | 'CLEAN' | 'IN_PROGRESS' | 'NEEDS_CLEANING'
  | 'ON_DUTY' | 'BREAK' | 'OFF'
  | 'URGENT' | 'IMPORTANT' | 'NORMAL'
  | 'EATEN'
  | string;

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  STABLE:          { bg: '#E8F5E9', text: '#2E7D32', label: 'Bình thường' },
  MONITORING:      { bg: '#FFF3E0', text: '#E65100', label: 'Theo dõi' },
  CRITICAL:        { bg: '#FFEBEE', text: '#C62828', label: 'Nguy kịch' },
  DONE:            { bg: '#E8F5E9', text: '#2E7D32', label: 'Đã xong' },
  PENDING:         { bg: '#FFF3E0', text: '#E65100', label: 'Chờ' },
  UPCOMING:        { bg: '#E3F2FD', text: '#1565C0', label: 'Sắp tới' },
  MISSED:          { bg: '#FFEBEE', text: '#C62828', label: 'Bỏ lỡ' },
  OVERDUE:         { bg: '#FFEBEE', text: '#C62828', label: 'Quá hạn' },
  ADMINISTERED:    { bg: '#E8F5E9', text: '#2E7D32', label: 'Đã cho' },
  SKIPPED:         { bg: '#FFEBEE', text: '#C62828', label: 'Bỏ qua' },
  REFUSED:         { bg: '#FFEBEE', text: '#C62828', label: 'Từ chối' },
  CLEAN:           { bg: '#E8F5E9', text: '#2E7D32', label: 'Sạch' },
  IN_PROGRESS:     { bg: '#FFF3E0', text: '#E65100', label: 'Đang làm' },
  NEEDS_CLEANING:  { bg: '#FFEBEE', text: '#C62828', label: 'Cần dọn' },
  ON_DUTY:         { bg: '#E8F5E9', text: '#2E7D32', label: 'Đang trực' },
  BREAK:           { bg: '#FFF3E0', text: '#E65100', label: 'Nghỉ giải lao' },
  OFF:             { bg: '#F5F5F5', text: '#9E9E9E', label: 'Nghỉ' },
  URGENT:          { bg: '#FFEBEE', text: '#C62828', label: 'Khẩn cấp' },
  IMPORTANT:       { bg: '#FFF3E0', text: '#E65100', label: 'Quan trọng' },
  NORMAL:          { bg: '#E8F5E9', text: '#2E7D32', label: 'Bình thường' },
  EATEN:           { bg: '#E8F5E9', text: '#2E7D32', label: 'Đã ăn' },
  WARNING:         { bg: '#FFF3E0', text: '#E65100', label: 'Cảnh báo' },
  DANGER:          { bg: '#FFEBEE', text: '#C62828', label: 'Nguy hiểm' },
  INFO:            { bg: '#E3F2FD', text: '#1565C0', label: 'Thông tin' },
};

export function StatusBadge({ status, label }: { status: StatusKey; label?: string }) {
  const cfg = STATUS_MAP[status] ?? { bg: '#F5F5F5', text: '#9E9E9E', label: status };
  return (
    <View style={[sb.badge, { backgroundColor: cfg.bg }]}>
      <ThemedText style={[sb.text, { color: cfg.text }]}>{label ?? cfg.label}</ThemedText>
    </View>
  );
}
const sb = StyleSheet.create({
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: Radius.full },
  text:  { fontSize: 11, fontWeight: '600' },
});

// ─── Skeleton line ─────────────────────────────────────────────────────────────
export function SkeletonLine({ w = '100%', h = 14, mt = 0 }: { w?: string | number; h?: number; mt?: number }) {
  const anim = useRef(new RNAnimated.Value(0.4)).current;
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        RNAnimated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <RNAnimated.View
      style={{ width: w as any, height: h, borderRadius: 6, backgroundColor: '#E0E0E0', marginTop: mt, opacity: anim }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={sk.card}>
      <View style={sk.row}>
        <View style={sk.circle} />
        <View style={{ flex: 1, gap: 8 }}>
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonLine key={i} w={i === 0 ? '70%' : i % 2 === 0 ? '50%' : '90%'} />
          ))}
        </View>
      </View>
    </View>
  );
}
const sk = StyleSheet.create({
  card:   { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.two },
  row:    { flexDirection: 'row', gap: Spacing.two },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0' },
});

// ─── Error banner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={eb.wrap}>
      <ThemedText style={eb.msg}>⚠️ {message}</ThemedText>
      <Pressable style={eb.btn} onPress={onRetry}>
        <ThemedText style={eb.btnTxt}>Thử lại</ThemedText>
      </Pressable>
    </View>
  );
}
const eb = StyleSheet.create({
  wrap:   { backgroundColor: '#FFEBEE', borderRadius: Radius.md, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  msg:    { fontSize: 13, color: '#C62828', flex: 1 },
  btn:    { backgroundColor: '#C62828', paddingVertical: 5, paddingHorizontal: Spacing.two, borderRadius: Radius.sm, marginLeft: Spacing.two },
  btnTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },
});

// ─── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', message = 'Không có dữ liệu' }: { icon?: string; message?: string }) {
  return (
    <View style={es.wrap}>
      <ThemedText style={es.icon}>{icon}</ThemedText>
      <ThemedText style={es.msg}>{message}</ThemedText>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: Spacing.five, gap: Spacing.two },
  icon: { fontSize: 40 },
  msg:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});

// ─── Offline banner ────────────────────────────────────────────────────────────
export function OfflineBanner() {
  return (
    <View style={ob.wrap}>
      <ThemedText style={ob.txt}>📡 Mất kết nối — dữ liệu có thể chưa cập nhật</ThemedText>
    </View>
  );
}
const ob = StyleSheet.create({
  wrap: { backgroundColor: '#E65100', paddingVertical: 8, paddingHorizontal: Spacing.three },
  txt:  { fontSize: 12, color: '#fff', textAlign: 'center', fontWeight: '500' },
});

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onDismiss }: {
  message: string; type?: 'success' | 'error'; onDismiss?: () => void;
}) {
  const anim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    if (type === 'success') {
      const t = setTimeout(() => onDismiss?.(), 3000);
      return () => clearTimeout(t);
    }
  }, []);
  const bg = type === 'success' ? '#2E7D32' : '#C62828';
  return (
    <RNAnimated.View style={[t.wrap, { backgroundColor: bg, opacity: anim }]}>
      <ThemedText style={t.txt}>{message}</ThemedText>
      <Pressable onPress={onDismiss} style={t.close}>
        <ThemedText style={t.closeTxt}>✕</ThemedText>
      </Pressable>
    </RNAnimated.View>
  );
}
const t = StyleSheet.create({
  wrap:     { position: 'absolute', bottom: 80, left: 16, right: 16, borderRadius: Radius.md, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', zIndex: 999 },
  txt:      { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  close:    { paddingLeft: Spacing.two },
  closeTxt: { color: '#fff', fontSize: 16 },
});

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, badge }: { title: string; badge?: string | number }) {
  return (
    <View style={sh.row}>
      <ThemedText style={sh.title}>{title}</ThemedText>
      {badge !== undefined && (
        <View style={sh.badge}><ThemedText style={sh.badgeTxt}>{badge}</ThemedText></View>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  title:    { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  badge:    { backgroundColor: Colors.borderLight, paddingVertical: 2, paddingHorizontal: Spacing.one, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
});

// ─── Stat box ─────────────────────────────────────────────────────────────────
export function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <View style={[stb.box, { borderTopColor: color }]}>
      <ThemedText style={stb.icon}>{icon}</ThemedText>
      <ThemedText style={[stb.val, { color }]}>{value}</ThemedText>
      <ThemedText style={stb.label}>{label}</ThemedText>
    </View>
  );
}
const stb = StyleSheet.create({
  box:   { flex: 1, backgroundColor: '#fff', borderRadius: Radius.md, padding: Spacing.two, alignItems: 'center', borderTopWidth: 3, elevation: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' } as any,
  icon:  { fontSize: 20, marginBottom: 3 },
  val:   { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center', marginTop: 2 },
});

// ─── Filter pills row ─────────────────────────────────────────────────────────
export function FilterPills<T extends string>({
  options, active, onSelect, color,
}: { options: { key: T; label: string }[]; active: T; onSelect: (k: T) => void; color: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.two }}>
      {options.map(o => (
        <Pressable
          key={o.key}
          style={[fp.pill, active === o.key && { backgroundColor: color, borderColor: color }]}
          onPress={() => onSelect(o.key)}
        >
          <ThemedText style={[fp.txt, active === o.key && fp.txtActive]}>{o.label}</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const fp = StyleSheet.create({
  pill:      { paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, borderRadius: Radius.full, backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border },
  txt:       { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  txtActive: { color: '#fff', fontWeight: '700' },
});

// ─── Avatar initials ──────────────────────────────────────────────────────────
export function Avatar({ name, size = 44, color }: { name: string; size?: number; color: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText style={{ fontSize: size * 0.36, fontWeight: '700', color }}>{initials}</ThemedText>
    </View>
  );
}

// ─── Screen scaffold (handles loading / error / empty / pull-to-refresh) ──────
export function ScreenScaffold({
  loading, error, onRetry, empty, emptyIcon, emptyMsg, refreshing, onRefresh, children,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: boolean;
  emptyIcon?: string;
  emptyMsg?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}) {
  const ctrl = onRefresh ? (
    <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
  ) : undefined;

  if (loading) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.three }}>
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two, paddingBottom: 80 }}
      refreshControl={ctrl}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {!error && empty && <EmptyState icon={emptyIcon} message={emptyMsg} />}
      {!error && !empty && children}
    </ScrollView>
  );
}
