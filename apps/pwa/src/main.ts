import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueFire, VueFireAuth } from 'vuefire';
import * as Sentry from '@sentry/vue';

import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';
import { firebaseApp } from './firebase';
import { makeBeforeSend } from './composables/useSentryScrub';
import { usePosthog } from './composables/usePosthog';

import './assets/tailwind.css';
import './assets/fonts.css';

// Set <html lang> from the i18n locale (single canonical URL per DC-04;
// locale switches via cookie + <link rel="alternate" hreflang>, not URL prefix).
document.documentElement.lang = (i18n.global.locale as { value: string }).value === 'en' ? 'en' : 'es-EC';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(VueFire, {
  firebaseApp,
  modules: [VueFireAuth()],
});

// Sentry — beforeSend scrubs PII before any event leaves the device.
Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  beforeSend: makeBeforeSend(),
  // Conservative defaults — heavy tracing reserved for Phase 3 budget review.
  tracesSampleRate: 0.0,
});

// PostHog — initialized but opt_out_capturing_by_default: true. Plan 04 calls
// optIn() ONLY after basic_profile consent grant.
usePosthog();

app.mount('#app');
