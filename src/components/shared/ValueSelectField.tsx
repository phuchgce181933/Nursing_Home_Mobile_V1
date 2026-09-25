import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Portal, Dialog, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  color?: string;
  placeholder?: string;
  error?: boolean;
  required?: boolean;
};

// Dropdown "đúng nghĩa Select" cho các trường có enum cố định (giới tính, quan hệ,
// lý do, nhóm máu). Khác với SelectField (gửi lên NHÃN + có ô tự nhập), component này
// LƯU & GỬI đúng `value` enum, còn màn hình chỉ thấy nhãn tiếng Việt — khớp cách web
// dùng <select> với <option value="..."> và không cho nhập tự do.
export const ValueSelectField: React.FC<Props> = ({
  label,
  value,
  onChange,
  options,
  color = '#2E7D32',
  placeholder = 'Chọn',
  error = false,
  required = false,
}) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  const handleSelect = (v: string) => {
    onChange(v);
    setVisible(false);
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setVisible(true)} style={[styles.trigger, error && styles.triggerError]}>
        <View style={styles.triggerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.triggerLabel}>
              {label}
              {required ? <Text style={styles.req}> *</Text> : null}
            </Text>
            <Text style={[styles.triggerValue, !selectedLabel && styles.triggerPlaceholder]}>
              {selectedLabel || placeholder}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
        </View>
      </Pressable>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{label}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {options.map((o) => {
              const active = value === o.value;
              return (
                <Pressable key={o.value} onPress={() => handleSelect(o.value)} style={styles.optionRow}>
                  <Text style={[styles.optionText, active && { color, fontWeight: '700' }]}>{o.label}</Text>
                  {active ? <MaterialCommunityIcons name="check" size={18} color={color} /> : null}
                </Pressable>
              );
            })}
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
  wrap: { width: '100%', marginBottom: 12 },
  trigger: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  triggerError: { borderColor: '#DC2626' },
  triggerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  triggerLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 1 },
  req: { color: '#DC2626' },
  triggerValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  triggerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  dialog: { borderRadius: 20, maxHeight: '75%' },
  dialogTitle: { fontSize: 16 },
  dialogContent: { paddingHorizontal: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  optionText: { fontSize: 14, color: '#111827' },
});
