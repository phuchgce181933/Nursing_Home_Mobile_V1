import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../../theme/designSystem';

type Props = {
  icon: string;
  label: string;
  color?: string;
  onPress?: () => void;
};

// One quick-action tile for the Home screen's 2x4 grid — same shape everywhere
// (rounded icon chip + label), with a subtle scale-down press effect instead of
// the default opacity-only feedback.
export const QuickActionTile: React.FC<Props> = ({ icon, label, color = COLORS.primary, onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      style={styles.tile}
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.94, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); }}
    >
      <Animated.View style={[styles.iconWrap, { backgroundColor: color + '15' }, animatedStyle]}>
        <MaterialCommunityIcons name={icon as any} size={26} color={color} />
      </Animated.View>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: { width: '25%', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm },
  iconWrap: {
    width: 56, height: 56, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11.5, fontWeight: '500', color: COLORS.dark, textAlign: 'center', lineHeight: 14 },
});
