import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  name: string;
  size?: number;
  colorSeed?: string;
};

const COLORS = ['#1B3A6B', '#0F5040', '#6B4200', '#7C3AED', '#B45309', '#0369A1'];

const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AvatarCircle: React.FC<Props> = ({ name, size = 40, colorSeed }) => {
  const seed = colorSeed ?? name;
  const bg = COLORS[hashCode(seed) % COLORS.length];
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontWeight: '700' },
});
