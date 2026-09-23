import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, TextInput as RNTextInput } from 'react-native';
import { Text, Button, Divider, Portal, Dialog, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosInstance';
import { AUTH } from '../../api/endpoints';
import { useAuth } from '../../auth/useAuth';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher';
import { getRoleColor, shadeColor } from '../../theme/theme';
import { useToast } from '../../utils/toast';
import { AppCard } from '../../components/ui/AppCard';
import { AppButton } from '../../components/ui/AppButton';
import { COLORS, RADIUS, SPACING } from '../../theme/designSystem';

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const roleColor = getRoleColor(user?.role);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const newPasswordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const closeChangePassword = () => {
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwError('');
  };

  const changePasswordMut = useMutation({
    mutationFn: async () => (await api.put(AUTH.CHANGE_PASSWORD, { currentPassword, newPassword })).data,
    onSuccess: () => {
      toast(t('changePasswordDialog.toastSuccess'), 'success');
      closeChangePassword();
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const msg = status === 401 ? t('changePasswordDialog.toastCurrentIncorrect') : t('changePasswordDialog.toastError');
      setPwError(msg);
    },
  });

  const submitChangePassword = () => {
    if (!currentPassword.trim()) {
      setPwError(t('changePasswordDialog.warnCurrentRequired'));
      return;
    }
    if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
      setPwError(t('changePasswordDialog.warnPasswordPolicy'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('changePasswordDialog.warnPasswordMismatch'));
      return;
    }
    setPwError('');
    changePasswordMut.mutate();
  };

  if (!user) return null;

  const roleLabels = t('profile.roleLabels', { returnObjects: true }) as Record<string, string>;

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[shadeColor(roleColor, -25), roleColor, shadeColor(roleColor, 25)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <AvatarCircle name={user.fullName} size={64} uri={user.avatarUrl} />
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.role}>{roleLabels?.[user.role] ?? user.role}</Text>
      </LinearGradient>

      <View style={styles.contentSheet}>
        <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}>
          <View style={styles.body}>
            <AppCard floating style={styles.card}>
              <InfoRow label={t('profile.email')} value={user.email} />
              <Divider style={styles.divider} />
              <InfoRow label={t('profile.phone')} value={user.phone || t('profile.notUpdated')} />
              <Divider style={styles.divider} />
              <InfoRow label={t('profile.gender')} value={user.gender === 'male' ? t('profile.male') : user.gender === 'female' ? t('profile.female') : t('profile.otherGender')} />
              {user.staffProfile ? (
                <>
                  <Divider style={styles.divider} />
                  <InfoRow label={t('profile.staffCode')} value={user.staffProfile.staffCode} />
                  {user.staffProfile.specialty ? (
                    <>
                      <Divider style={styles.divider} />
                      <InfoRow label={t('profile.specialty')} value={user.staffProfile.specialty} />
                    </>
                  ) : null}
                </>
              ) : null}

              <Divider style={styles.divider} />
              <LanguageSwitcher color={roleColor} />
            </AppCard>

            <View style={styles.actions}>
              <AppButton icon="account-edit-outline" onPress={() => navigation?.navigate('EditProfile')} color={roleColor}>
                {t('profile.editProfile')}
              </AppButton>

              <AppButton variant="outline" icon="lock-outline" onPress={() => setShowChangePassword(true)} color={roleColor}>
                {t('profile.changePassword')}
              </AppButton>

              <AppButton variant="outline" color={COLORS.danger} icon="logout" onPress={logout}>
                {t('profile.logout')}
              </AppButton>
            </View>
          </View>
        </ScrollView>
      </View>

      <Portal>
        <Dialog visible={showChangePassword} onDismiss={closeChangePassword} dismissable={false} dismissableBackButton style={styles.dialog}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Dialog.Title>{t('changePasswordDialog.title')}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label={t('changePasswordDialog.currentPasswordLabel')}
                mode="outlined"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                dense
                style={styles.pwInput}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <TextInput
                ref={newPasswordRef}
                label={t('changePasswordDialog.newPasswordLabel')}
                mode="outlined"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                dense
                style={styles.pwInput}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TextInput
                ref={confirmPasswordRef}
                label={t('changePasswordDialog.confirmPasswordLabel')}
                mode="outlined"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                dense
                style={styles.pwInput}
                returnKeyType="done"
                onSubmitEditing={submitChangePassword}
              />
              {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={closeChangePassword}>{t('changePasswordDialog.cancel')}</Button>
              <Button mode="contained" buttonColor={roleColor} loading={changePasswordMut.isPending} onPress={submitChangePassword}>
                {t('changePasswordDialog.submit')}
              </Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.gray50 },
  header: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  name: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: SPACING.sm },
  role: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  contentSheet: { flex: 1, marginTop: -36 },
  body: { padding: SPACING.md },
  card: { marginBottom: SPACING.lg },
  divider: { marginVertical: SPACING.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: COLORS.gray500 },
  infoValue: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
  actions: { gap: SPACING.sm },
  dialog: { borderRadius: RADIUS.card },
  pwInput: { marginBottom: SPACING.sm },
  pwError: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
});
