import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';

type Props = { color?: string };

export const LanguageSwitcher: React.FC<Props> = ({ color = '#1B3A6B' }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: 'vi' | 'en') => {
    i18n.changeLanguage(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t('profile.language')}</Text>
      <View style={styles.chips}>
        <Chip
          selected={i18n.language === 'vi'}
          onPress={() => changeLanguage('vi')}
          style={i18n.language === 'vi' ? { backgroundColor: color } : undefined}
          textStyle={i18n.language === 'vi' ? { color: '#fff' } : undefined}
          compact
        >
          {t('profile.languageVi')}
        </Chip>
        <Chip
          selected={i18n.language === 'en'}
          onPress={() => changeLanguage('en')}
          style={i18n.language === 'en' ? { backgroundColor: color } : undefined}
          textStyle={i18n.language === 'en' ? { color: '#fff' } : undefined}
          compact
        >
          {t('profile.languageEn')}
        </Chip>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { marginTop: 16 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8 },
});
