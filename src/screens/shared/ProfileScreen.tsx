import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/useAuth';
import { AvatarCircle } from '../../components/shared/AvatarCircle';
import { LanguageSwitcher } from '../../components/shared/LanguageSwitcher';
import { ThemeSwitcher } from '../../components/shared/ThemeSwitcher';
import { getRoleColor, shadeColor } from '../../theme/theme';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const roleColor = getRoleColor(user?.role);

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
        <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={styles.body}>
            <Card style={styles.card}>
              <Card.Content>
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
                <ThemeSwitcher color={roleColor} />
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              buttonColor={roleColor}
              icon="account-edit-outline"
              onPress={() => navigation?.navigate('EditProfile')}
              style={styles.editBtn}
            >
              {t('profile.editProfile')}
            </Button>

            <Button
              mode="outlined"
              onPress={logout}
              textColor="#991B1B"
              style={styles.logoutBtn}
            >
              {t('profile.logout')}
            </Button>
          </View>
        </ScrollView>
      </View>
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
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    alignItems: 'center',
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  name: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 12 },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  contentSheet: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  body: { padding: 16 },
  card: { borderRadius: 12 },
  divider: { marginVertical: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#111827' },
  editBtn: { marginTop: 24, borderRadius: 8 },
  logoutBtn: { marginTop: 12, borderColor: '#991B1B', borderRadius: 8 },
});
