import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  isEmpty?: boolean;
};

export const ScreenLayout: React.FC<Props> = ({ children, loading, error, onRetry, emptyMessage, isEmpty }) => {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <View style={styles.skeletons}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Không thể tải dữ liệu</Text>
        <Text style={styles.errorSub}>{error}</Text>
        {onRetry ? (
          <Button mode="outlined" onPress={onRetry} style={styles.retryBtn}>
            Thử lại
          </Button>
        ) : null}
      </View>
    );
  }

  if (isEmpty && emptyMessage) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="inbox-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  skeletons: { marginTop: 24, width: '100%', gap: 12 },
  skeleton: { height: 72, backgroundColor: '#E5E7EB', borderRadius: 12, width: '100%' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#EF4444', marginTop: 12 },
  errorSub: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
});
