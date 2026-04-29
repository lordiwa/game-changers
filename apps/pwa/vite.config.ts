import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    tailwind(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      includeAssets: ['fonts/*.woff2'],
      manifest: {
        name: 'GameChangers',
        short_name: 'GameChangers',
        theme_color: '#0F0F1A',
        background_color: '#0F0F1A',
        display: 'standalone',
        start_url: '/',
        lang: 'es-EC',
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/(consent|health|auth)\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/content\//,
            handler: 'StaleWhileRevalidate',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
