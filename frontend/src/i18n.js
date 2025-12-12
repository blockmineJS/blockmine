import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({

    fallbackLng: 'ru',

    supportedLngs: ['ru', 'en'],

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Namespaces
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'sidebar', 'bots', 'console', 'minecraft-viewer', 'plugins', 'websocket', 'management', 'event-graphs', 'visual-editor', 'nodes', 'login', 'admin', 'tasks', 'servers', 'proxies', 'graph-store', 'plugin-detail', 'configuration', 'api-keys', 'setup', 'permissions', 'dialogs'],

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'blockmine-language',
    },

    // debug: true,
  });

export default i18n;
