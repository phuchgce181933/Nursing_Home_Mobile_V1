import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

type Props = {
  title: string;
  roleColor: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const SectionHeader: React.FC<Props> = ({ title, roleColor, actionLabel, onAction }) => (
  <View style={styles.container}>
    <Text style={[styles.title, { color: roleColor }]}>{title}</Text>
    {actionLabel && onAction ? (
      <Button mode="text" compact textColor={roleColor} onPress={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: '500' },
});
