import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import viCommon from './locales/vi/common';
import viNurse from './locales/vi/nurse';
import viFamily from './locales/vi/family';
import viAssistant from './locales/vi/assistant';
import enCommon from './locales/en/common';
import enNurse from './locales/en/nurse';
import enFamily from './locales/en/family';
import enAssistant from './locales/en/assistant';

export const LANGUAGE_STORAGE_KEY = 'language';

const resources = {
  vi: { translation: { ...viCommon, ...viNurse, ...viFamily, ...viAssistant } },
  en: { translation: { ...enCommon, ...enNurse, ...enFamily, ...enAssistant } },
};

// eslint-disable-next-line import/no-named-as-default-member -- i18next's default export intentionally exposes `.use`
i18next.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'vi',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
  if (stored && stored !== i18next.language) {
    // eslint-disable-next-line import/no-named-as-default-member -- i18next's default export intentionally exposes `.changeLanguage`
    i18next.changeLanguage(stored);
  }
});

export default i18next;
