import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import itTranslations from '../locales/it.js';
import enTranslations from '../locales/en.js';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: {
        translation: itTranslations
      },
      en: {
        translation: enTranslations
      }
    },
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;
