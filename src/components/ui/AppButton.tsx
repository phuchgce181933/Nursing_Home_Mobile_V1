import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { BUTTON_HEIGHT, COLORS, RADIUS } from '../../theme/designSystem';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  // Overrides the variant's default color (e.g. an outlined button in the danger color,
  // for a "log out" action that's outlined-not-filled but still reads as sensitive).
  color?: string;
};

// Standardizes every button in the app to the same 16px radius and 52px height —
// wraps react-native-paper's Button (already the app's button primitive) instead
// of replacing it, so ripple/loading/disabled behavior stays consistent.
export const AppButton: React.FC<Props> = ({
  children,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  fullWidth = true,
  style,
  color: colorOverride,
}) => {
  const mode = variant === 'outline' ? 'outlined' : 'contained';
  const color = colorOverride ?? (variant === 'danger' ? COLORS.danger : COLORS.primary);

  return (
    <PaperButton
      mode={mode}
      icon={icon}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      buttonColor={mode === 'contained' ? color : undefined}
      textColor={mode === 'outlined' ? color : undefined}
      style={[{ borderRadius: RADIUS.button, borderColor: mode === 'outlined' ? color : undefined, width: fullWidth ? '100%' : undefined }, style]}
      contentStyle={{ height: BUTTON_HEIGHT }}
    >
      {children}
    </PaperButton>
  );
};
