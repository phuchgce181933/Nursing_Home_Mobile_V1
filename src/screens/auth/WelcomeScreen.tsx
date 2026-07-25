import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AvatarCircle } from '../../components/shared/AvatarCircle';

const NAVY = '#000666';
const TEAL = '#003731';
const NS = 'welcome';

export const WelcomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const STATS = [
    { icon: 'medal-outline', value: '10+', label: t(`${NS}.statYears`), color: NAVY },
    { icon: 'account-group-outline', value: '500+', label: t(`${NS}.statResidents`), color: TEAL },
    { icon: 'clock-outline', value: '24/7', label: t(`${NS}.statMonitoring`), color: NAVY },
    { icon: 'thumb-up-outline', value: '98%', label: t(`${NS}.statSatisfaction`), color: TEAL },
  ];

  const TESTIMONIALS = [
    { name: 'Nguyễn Hoàng', role: t(`${NS}.roleRelative`), quote: t(`${NS}.quote1`) },
    { name: 'Trần Minh', role: t(`${NS}.roleSon`), quote: t(`${NS}.quote2`) },
    { name: 'Lê Hạnh', role: t(`${NS}.roleResident`), quote: t(`${NS}.quote3`) },
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <Image
          source={require('../../../assets/images/logo-annhien.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>{t(`${NS}.brand`)}</Text>
        <Text style={styles.headline}>{t(`${NS}.headline`)}</Text>
        <Text style={styles.subtext}>{t(`${NS}.subtext`)}</Text>

        <View style={styles.ctaRow}>
          <Button
            mode="contained"
            buttonColor="#fff"
            textColor={NAVY}
            style={styles.ctaBtn}
            contentStyle={{ height: 48 }}
            onPress={() => navigation?.navigate('Login')}
          >
            {t(`${NS}.loginCta`)}
          </Button>
          <Button
            mode="outlined"
            textColor="#fff"
            style={[styles.ctaBtn, styles.ctaBtnOutline]}
            contentStyle={{ height: 48 }}
            onPress={() => navigation?.navigate('Register')}
          >
            {t(`${NS}.registerCta`)}
          </Button>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <MaterialCommunityIcons name={s.icon as any} size={26} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t(`${NS}.testimonialsTitle`)}</Text>
        <Text style={styles.sectionSubtitle}>{t(`${NS}.testimonialsSubtitle`)}</Text>

        {TESTIMONIALS.map((item, i) => (
          <View key={i} style={styles.testimonialCard}>
            <MaterialCommunityIcons name="format-quote-open" size={28} color="#D1D5DB" />
            <Text style={styles.quote}>{item.quote}</Text>
            <View style={styles.testimonialFooter}>
              <AvatarCircle name={item.name} size={36} />
              <View>
                <Text style={styles.testimonialName}>{item.name}</Text>
                <Text style={styles.testimonialRole}>{item.role}</Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.footerText}>{t(`${NS}.footerText`)}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  hero: { backgroundColor: NAVY, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  logo: { width: 64, height: 64, marginBottom: 8 },
  brand: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
  headline: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 32 },
  subtext: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  ctaBtn: { flex: 1, borderRadius: 24 },
  ctaBtnOutline: { borderColor: '#fff' },
  body: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', paddingVertical: 18 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginTop: 32 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  testimonialCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  quote: { fontSize: 13, color: '#374151', fontStyle: 'italic', marginTop: 4, marginBottom: 12, lineHeight: 19 },
  testimonialFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  testimonialRole: { fontSize: 11, color: '#9CA3AF' },
  footerText: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 24 },
});
