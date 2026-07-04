// Checkpoint A — capture the current live Google Sites for content parity.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const pages = [
  ['home', '/home'],
  ['about', '/about-us'],
  ['menu', '/menu'],
  ['reach', '/reach-us'],
  ['franchise', '/stock-franchise'],
  ['achievement', '/achievement'],
  ['banking', '/banking'],
  ['legal', '/legal'],
  ['terms', '/terms-condition'],
];
const widths = { mobile: 390, desktop: 1440 };
const base = 'https://www.yummemomos.com';

mkdirSync('screenshots/before', { recursive: true });
const b = await chromium.launch();
for (const [name, path] of pages) {
  for (const [label, w] of Object.entries(widths)) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    try {
      await p.goto(base + path, { waitUntil: 'networkidle', timeout: 45000 });
      await p.screenshot({ path: `screenshots/before/${name}-${label}.png`, fullPage: true });
      console.log(`✓ before/${name}-${label}.png`);
    } catch (e) {
      console.warn(`✗ ${name}-${label}: ${e.message}`);
    }
    await p.close();
  }
}
await b.close();
