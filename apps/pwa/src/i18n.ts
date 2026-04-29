import { createI18n } from 'vue-i18n';
import es from './locales/es.json';
import en from './locales/en.json';

// Single canonical URL strategy (DC-04): locale lives in a cookie, not in the URL.
// Search engines pick up the right variant via <link rel="alternate" hreflang> in index.html.
function readLocaleCookie(): 'es' | 'en' {
  if (typeof document === 'undefined') return 'es';
  const match = document.cookie.match(/(?:^|;\s*)locale=(es|en)/);
  return match && match[1] === 'en' ? 'en' : 'es';
}

export const i18n = createI18n({
  legacy: false,
  locale: readLocaleCookie(),
  fallbackLocale: 'es',
  messages: {
    es,
    en,
  },
});
