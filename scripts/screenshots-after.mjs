// Checkpoint B/C — capture the new local build at 3 widths, full page.
// Run the dev server first: `npm run dev` (defaults to http://localhost:4321).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE_URL || 'http://localhost:4321';
const pages = [
  ['home', '/'],
  ['menu', '/menu'],
  ['about', '/about'],
  ['franchise', '/franchise'],
  ['achievements', '/achievements'],
  ['contact', '/contact'],
  ['legal', '/legal'],
];
const widths = { mobile: 390, tablet: 768, desktop: 1440 };

mkdirSync('screenshots/after', { recursive: true });
const b = await chromium.launch();
for (const [name, path] of pages) {
  for (const [label, w] of Object.entries(widths)) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    try {
      await p.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
      // trigger reveal animations
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(600);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(300);
      await p.screenshot({ path: `screenshots/after/${name}-${label}.png`, fullPage: true });
      console.log(`✓ after/${name}-${label}.png`);
    } catch (e) {
      console.warn(`✗ ${name}-${label}: ${e.message}`);
    }
    await p.close();
  }
}
await b.close();
