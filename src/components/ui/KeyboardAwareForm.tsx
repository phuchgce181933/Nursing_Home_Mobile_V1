import React, { useCallback, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  keyboardVerticalOffset?: number;
}

export const KeyboardAwareForm: React.FC<Props> = ({
  children,
  keyboardVerticalOffset = 0,
  contentContainerStyle,
  style,
  ...scrollProps
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollProps.onScroll?.(e);
    },
    [scrollProps.onScroll],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
