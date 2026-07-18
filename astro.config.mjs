// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import adminPanel from './scripts/admin-panel.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.yummemomos.com',
  integrations: [sitemap()],
  vite: {
    // adminPanel is dev-only (apply: 'serve') — /admin never ships in the build
    plugins: [tailwindcss(), adminPanel()],
  },
});
