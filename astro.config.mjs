// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import adminPanel from './scripts/admin-panel.mjs';

// Static output. On Hostinger the site is served by a small Node server
// (server.mjs) that also hosts the admin panel; when the admin saves, the
// server rewrites content.json and rebuilds the static pages (a few seconds),
// so the fast fully-static site is preserved.
export default defineConfig({
  site: 'https://www.yummemomos.com',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') })],
  vite: {
    // adminPanel is dev-only (apply: 'serve') — /admin never ships in the build
    plugins: [tailwindcss(), adminPanel()],
  },
});
