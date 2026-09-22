// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sentry from '@sentry/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://qayra.in',
  output: 'server',
  adapter: vercel(),

  security: {
    checkOrigin: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    sentry({
      // DSN/init is controlled by sentry.client.config.ts and sentry.server.config.ts.
      // The integration mounts unconditionally; the config files short-circuit
      // when PUBLIC_SENTRY_DSN is unset.
      sourceMapsUploadOptions: { telemetry: false },
    }),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/ops') &&
        !page.includes('/account') &&
        !page.includes('/checkout') &&
        !page.includes('/auth') &&
        !page.includes('/api/'),
    }),
  ],
});
