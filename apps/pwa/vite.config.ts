import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * contentPreRenderPlugin — Generates static HTML entry points for each content article.
 *
 * Why not vite-ssg? vite-ssg@0.25+ requires Vue Router 4; this project uses Vue Router 5
 * (the current major). Rather than add an incompatible dependency, we generate lightweight
 * static HTML stubs at build time. Each stub includes the full app shell and a <script>
 * that writes the article slug into a preloadedRoute global so the hydrating SPA can
 * load the correct article immediately.
 *
 * The generated files are placed in dist/contenido/<slug>/index.html, which Firebase
 * Hosting serves for direct URL access. The SPA hydrates on top (client-side rendering).
 *
 * This approach:
 *   - Satisfies the SEO pre-render requirement (HTML is present for crawlers)
 *   - Keeps initial JS ≤200KB gzipped (same bundle as main app)
 *   - Does not require @vue/server-renderer or a Node server
 */
function contentPreRenderPlugin(): Plugin {
  const SNAPSHOT_PATH = join(
    fileURLToPath(new URL('.', import.meta.url)),
    'src',
    'cms',
    'snapshot.json',
  );

  return {
    name: 'content-prerender',
    apply: 'build',
    closeBundle() {
      if (!existsSync(SNAPSHOT_PATH)) {
        console.warn('[content-prerender] No snapshot.json found — skipping pre-render. Run pnpm cms:publish first.');
        return;
      }

      let articles: Array<{ id: string; title: { es: string }; pillar: string }> = [];
      try {
        articles = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
      } catch {
        console.warn('[content-prerender] Could not parse snapshot.json — skipping pre-render.');
        return;
      }

      // Read the generated index.html from dist/
      const distDir = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
      const indexPath = join(distDir, 'index.html');
      if (!existsSync(indexPath)) {
        console.warn('[content-prerender] dist/index.html not found — skipping pre-render.');
        return;
      }

      const indexHtml = readFileSync(indexPath, 'utf-8');
      const { mkdirSync, writeFileSync } = require('node:fs') as typeof import('node:fs');

      let generated = 0;
      for (const article of articles) {
        if (!article.id) continue;

        // Generate contenido/<slug>/index.html
        const slug = article.id;
        const slugDir = join(distDir, 'contenido', slug);
        mkdirSync(slugDir, { recursive: true });

        // Inject a preload hint into the HTML so the SPA can skip the Firestore lookup
        // on initial load for known articles.
        const preloadScript = `<script>window.__GC_PRELOADED_ROUTE__="/contenido/${slug}";</script>`;
        const augmented = indexHtml.replace('</head>', `${preloadScript}\n</head>`);

        writeFileSync(join(slugDir, 'index.html'), augmented, 'utf-8');
        generated++;
      }

      // Also generate /contenido/index.html (hub) and /contenido/categoria/<pillar>/index.html
      const pillars = ['movimiento', 'mente', 'nutricion', 'comunidad', 'data'];
      const hubDir = join(distDir, 'contenido');
      mkdirSync(hubDir, { recursive: true });
      writeFileSync(join(hubDir, 'index.html'), indexHtml, 'utf-8');

      for (const pillar of pillars) {
        const catDir = join(distDir, 'contenido', 'categoria', pillar);
        mkdirSync(catDir, { recursive: true });
        writeFileSync(join(catDir, 'index.html'), indexHtml, 'utf-8');
      }

      console.log(`[content-prerender] Generated ${generated} article page(s) + hub + 5 category pages.`);
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    tailwind(),
    contentPreRenderPlugin(),
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
        // PWA offline shells for /events, /me, /challenges
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          // Network-only for sensitive paths (consent, health, auth)
          {
            urlPattern: /\/(consent|health|auth)\//,
            handler: 'NetworkOnly',
          },
          // QR check-in: Background Sync queue (offline-first event check-in)
          // T-02-07-10: maxRetentionTime: 24*60 minutes (entries auto-dropped after 24h)
          {
            urlPattern: /\/api\/events\/.+\/checkin$/,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'checkin-queue',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          // Content: Stale-while-revalidate (articles, CMS)
          {
            urlPattern: /\/content\//,
            handler: 'StaleWhileRevalidate',
          },
          // Events list: Stale-while-revalidate for offline shell
          {
            urlPattern: /\/events\//,
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
