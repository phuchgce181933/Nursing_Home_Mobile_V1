import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  color?: string;
  placeholder?: string;
  otherLabel?: string;
  error?: boolean;
};

// Dropdown with a trailing "khác / tự nhập" option — selecting it switches to a free-text
// field below. Value is always stored as plain text (backend has no enum constraint here),
// so custom entries round-trip exactly like picking a listed option.
export const SelectField: React.FC<Props> = ({
  label,
  value,
  onChange,
  options,
  color = '#000666',
  placeholder = 'Chọn',
  otherLabel = 'Khác (tự nhập)',
  error = false,
}) => {
  const knownLabels = options.map((o) => o.label);
  const [visible, setVisible] = useState(false);
  const [customMode, setCustomMode] = useState(!!value && !knownLabels.includes(value));

  const handleSelect = (label: string) => {
    setCustomMode(false);
    onChange(label);
    setVisible(false);
  };

  const handleOther = () => {
    setCustomMode(true);
    setVisible(false);
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setVisible(true)} style={[styles.trigger, error && styles.triggerError]}>
        <View style={styles.triggerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.triggerLabel}>{label}</Text>
            <Text style={[styles.triggerValue, !value && !customMode && styles.triggerPlaceholder]}>
              {customMode ? otherLabel : value || placeholder}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
        </View>
      </Pressable>

      {customMode && (
        <TextInput
          mode="outlined"
          dense
          value={value}
          onChangeText={onChange}
          placeholder={label}
          style={styles.customInput}
        />
      )}

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{label}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {options.map((o) => (
              <Pressable key={o.value} onPress={() => handleSelect(o.label)} style={styles.optionRow}>
                <Text style={[styles.optionText, value === o.label && !customMode && { color, fontWeight: '700' }]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={handleOther} style={styles.optionRow}>
              <Text style={[styles.optionText, customMode && { color, fontWeight: '700' }]}>{otherLabel}</Text>
            </Pressable>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 8 },
  trigger: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  triggerError: { borderColor: '#DC2626' },
  triggerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  triggerLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 1 },
  triggerValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  triggerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  customInput: { marginTop: 8 },
  dialog: { borderRadius: 20, maxHeight: '75%' },
  dialogTitle: { fontSize: 16 },
  dialogContent: { paddingHorizontal: 0 },
  optionRow: { paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  optionText: { fontSize: 14, color: '#111827' },
});
