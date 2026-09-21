import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  onBack: () => void;
  color: string;
  titleColor?: string;
  right?: React.ReactNode;
};

export const BackHeader: React.FC<Props> = ({ title, onBack, color, titleColor = '#fff', right }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { backgroundColor: color, paddingTop: insets.top + 8 }]}>
      <IconButton icon="arrow-left" iconColor={titleColor} size={22} onPress={onBack} style={styles.backBtn} />
      <Text style={[styles.topTitle, { color: titleColor }]} numberOfLines={1}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 8, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { margin: 0 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center' },
});
