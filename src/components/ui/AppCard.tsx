import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { RADIUS, SPACING, COLORS, SHADOW } from '../../theme/designSystem';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  floating?: boolean;
  padded?: boolean;
};

// The one card shape every screen in the redesign should use: 20px radius, white
// surface, soft shadow. `floating` uses a stronger shadow for cards meant to sit
// on top of another surface (e.g. overlapping a hero header).
export const AppCard: React.FC<Props> = ({ children, style, onPress, floating, padded = true }) => {
  const content = (
    <View style={[styles.base, padded && styles.padded, floating ? SHADOW.floating : SHADOW.card, style]}>
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: COLORS.gray100 }} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
  },
  padded: { padding: SPACING.md },
  pressed: { opacity: 0.85 },
});
