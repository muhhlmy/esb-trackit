// Functional smoke test — verify no regressions on HomeView
import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// 1. Hero renders
const heroTitle = await page.textContent('h1');
assert(heroTitle && heroTitle.includes('Apa yang dapat kami bantu'), 'Hero title present');

// 2. Search input exists & accepts text
const searchInput = page.locator('input[type="text"]').first();
await searchInput.fill('laptop');
await page.waitForTimeout(300);
const searchVal = await searchInput.inputValue();
assert(searchVal === 'laptop', 'Search input accepts text');

// 3. Live suggestions appear when focused + typed
// (cases seeded from useCases DEFAULT_CASES contain 'laptop' in titles)
await searchInput.focus();
await page.waitForTimeout(200);
const suggestions = await page.locator('div[class*="divide-y"] button').count();
assert(suggestions > 0, `Live suggestions appeared (count=${suggestions})`);

// 4. Clear button (X) clears input
const clearBtn = page.locator('button[aria-label="Bersihkan pencarian"]');
await clearBtn.waitFor({ state: 'visible', timeout: 2000 });
await clearBtn.click();
await page.waitForTimeout(200);
const cleared = await searchInput.inputValue();
assert(cleared === '', 'Clear button clears search');

// 5. Category card navigation -> routes to /cases
await page.locator('button:has-text("Buka SOP")').first().click();
await page.waitForURL('**/cases**', { timeout: 5000 });
assert(page.url().includes('/cases'), `Category navigate -> ${page.url()}`);
await page.goBack();
await page.waitForURL('http://localhost:5173/');

// 6. FAQ accordion toggle
const faqBtn = page.locator('button:has-text("Bagaimana cara melakukan reset password")').first();
await faqBtn.click();
await page.waitForTimeout(200);
const expanded = await faqBtn.getAttribute('aria-expanded');
assert(expanded === 'true', `FAQ expanded (aria-expanded=${expanded})`);

// 7. No JS errors
assert(errors.length === 0, `No JS errors: ${JSON.stringify(errors)}`);

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

await browser.close();
console.log('\nAll functional checks passed.');
