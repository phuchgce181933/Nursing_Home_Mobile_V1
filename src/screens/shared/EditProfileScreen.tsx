import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, KeyboardAvoidingView, TextInput as RNTextInput } from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { CalendarPicker } from '../../components/shared/CalendarPicker';
import { BackHeader } from '../../components/layout/BackHeader';
import { getRoleColor } from '../../theme/theme';
import { useToast } from '../../utils/toast';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';

const NS = 'editProfile';

export const EditProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const roleColor = getRoleColor(user?.role);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [gender, setGender] = useState(user?.gender ?? 'male');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth?.split('T')[0] ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const phoneRef = useRef<RNTextInput>(null);
  const addressRef = useRef<RNTextInput>(null);

  if (!user) return null;

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast(t(`${NS}.toastGalleryPermission`), 'warning');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      toast(t(`${NS}.toastImagePickError`), 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('phone', phone);
      formData.append('gender', gender);
      if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
      if (address) formData.append('address', address);
      if (avatarUri) {
        const filename = avatarUri.split('/').pop() ?? 'avatar.jpg';
        const ext = filename.split('.').pop()?.toLowerCase();
        const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        formData.append('avatar', { uri: avatarUri, name: filename, type } as any);
      }

      await api.put(AUTH.UPDATE_PROFILE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      });
      await refreshUser();
      toast(t(`${NS}.toastSuccess`), 'success');
      navigation.goBack();
    } catch (err: any) {
      console.error('[EditProfile] update failed:', err?.response?.data ?? err?.message ?? err);
      const errorCode = err?.response?.data?.errorCode;
      if (errorCode === 'AUTH_PHONE_IN_USE') {
        toast(t(`${NS}.toastPhoneInUse`), 'error');
      } else {
        toast(t(`${NS}.toastError`), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.title`)} color={roleColor} onBack={() => navigation?.goBack()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            <AvatarCircle name={fullName || user.fullName} size={88} uri={avatarUri ?? user.avatarUrl} />
            <View style={[styles.avatarEditBadge, { backgroundColor: roleColor }]}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.changePhotoText, { color: roleColor }]} onPress={pickImage}>
            {t(`${NS}.changePhoto`)}
          </Text>

          <TextInput
            label={t(`${NS}.fullNameLabel`)}
            mode="outlined"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <TextInput
            ref={phoneRef}
            label={t(`${NS}.phoneLabel`)}
            mode="outlined"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => addressRef.current?.focus()}
          />

          <Text style={styles.label}>{t(`${NS}.genderLabel`)}</Text>
          <View style={styles.chipRow}>
            {(['male', 'female', 'other'] as const).map((g) => (
              <Chip
                key={g}
                selected={gender === g}
                onPress={() => setGender(g)}
                style={gender === g ? { backgroundColor: roleColor } : undefined}
                textStyle={gender === g ? { color: '#fff' } : undefined}
              >
                {g === 'male' ? t(`${NS}.male`) : g === 'female' ? t(`${NS}.female`) : t(`${NS}.otherGender`)}
              </Chip>
            ))}
          </View>

          <CalendarPicker
            label={t(`${NS}.dateOfBirthLabel`)}
            value={dateOfBirth}
            onChange={setDateOfBirth}
            color={roleColor}
          />

          <TextInput
            ref={addressRef}
            label={t(`${NS}.addressLabel`)}
            mode="outlined"
            value={address}
            onChangeText={setAddress}
            multiline
            style={styles.input}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
          />

          <Button
            mode="contained"
            buttonColor={roleColor}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
            contentStyle={{ height: 48 }}
          >
            {t(`${NS}.save`)}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  body: { padding: 16, paddingBottom: 32, alignItems: 'center' },
  avatarWrap: { marginTop: 8 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F5F5F5',
  },
  changePhotoText: { fontSize: 13, fontWeight: '500', marginTop: 10, marginBottom: 20 },
  input: { width: '100%', marginBottom: 12, backgroundColor: '#fff' },
  label: { alignSelf: 'flex-start', fontSize: 13, color: '#6B7280', marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start', marginBottom: 12 },
  saveBtn: { width: '100%', borderRadius: 8, marginTop: 8 },
});
