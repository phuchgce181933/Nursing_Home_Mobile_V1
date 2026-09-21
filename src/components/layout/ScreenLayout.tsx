import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme/useAppTheme';
import type { AppColors } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  isEmpty?: boolean;
};

export const ScreenLayout: React.FC<Props> = ({ children, loading, error, onRetry, emptyMessage, isEmpty }) => {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const errorColor = isDark ? '#FCA5A5' : '#EF4444';

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
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={errorColor} />
        <Text style={[styles.errorText, { color: errorColor }]}>{t('common.loadErrorTitle')}</Text>
        <Text style={styles.errorSub}>{error}</Text>
        {onRetry ? (
          <Button mode="outlined" onPress={onRetry} style={styles.retryBtn}>
            {t('common.retry')}
          </Button>
        ) : null}
      </View>
    );
  }

  if (isEmpty && emptyMessage) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="inbox-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const createStyles = (c: AppColors) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: c.background },
  skeletons: { marginTop: 24, width: '100%', gap: 12 },
  skeleton: { height: 72, backgroundColor: c.skeleton, borderRadius: 12, width: '100%' },
  errorText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  errorSub: { fontSize: 13, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: 16 },
  emptyText: { fontSize: 14, color: c.textMuted, marginTop: 12, textAlign: 'center' },
});
