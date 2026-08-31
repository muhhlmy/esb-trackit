// Screenshot helper — captures HomeView at multiple viewports & themes
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = './qa-shots';
mkdirSync(OUT, { recursive: true });

const shots = [
  { name: 'home-desktop-light', width: 1440, height: 1000, dark: false, full: false },
  { name: 'home-desktop-dark',  width: 1440, height: 1000, dark: true,  full: false },
  { name: 'home-mobile-light', width: 390,  height: 844,  dark: false, full: true },
  { name: 'home-tablet-light',  width: 768,  height: 1024, dark: false, full: false },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    colorScheme: s.dark ? 'dark' : 'light',
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  // ensure theme class applied (app uses useTheme with html.light/dark)
  await page.evaluate((dark) => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(dark ? 'dark' : 'light');
  }, s.dark);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: !!s.full });
  await ctx.close();
  console.log('captured', s.name);
}
await browser.close();
console.log('done');
