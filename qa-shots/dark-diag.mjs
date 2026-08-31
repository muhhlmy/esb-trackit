// Diagnose: does toggling .dark on <html> actually change any dark: utility?
import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const probe = async () => {
  return page.evaluate(() => {
    const html = document.documentElement;
    const before = { class: html.className };
    // pick a known dark: utility element (hero bg)
    const el = document.querySelector('main section') || document.querySelector('h1');
    const compute = (e) => {
      if (!e) return null;
      const cs = getComputedStyle(e);
      return { bg: cs.backgroundColor, color: cs.color };
    };
    const a = compute(el);
    html.classList.remove('light'); html.classList.add('dark');
    html.setAttribute('data-theme','dark');
    const b = compute(el);
    html.classList.remove('dark'); html.classList.add('light');
    html.setAttribute('data-theme','light');
    return { before, light: a, dark: b, changed: JSON.stringify(a) !== JSON.stringify(b) };
  });
};

console.log(JSON.stringify(await probe(), null, 2));
await browser.close();
