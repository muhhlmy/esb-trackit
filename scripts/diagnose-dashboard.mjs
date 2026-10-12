import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const requestFailures = [];

  page.on('console', (msg) => {
    const entry = `[CONSOLE ${msg.type()}] ${msg.text()}`;
    console.log(entry);
    consoleLogs.push(entry);
  });

  page.on('pageerror', (err) => {
    const entry = `[PAGE ERROR] ${err.message}\n${err.stack}`;
    console.error(entry);
    pageErrors.push(entry);
  });

  page.on('requestfailed', (req) => {
    const entry = `[REQ FAILED] ${req.url()} (${req.failure()?.errorText})`;
    console.warn(entry);
    requestFailures.push(entry);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.warn(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log('--- Navigating to http://127.0.0.1:5173/login ---');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 10000 });

  console.log('--- Filling login form ---');
  await page.locator('#email').fill('superadmin@admin.com');
  await page.locator('#password').fill('Password123!');
  await page.locator('button[type="submit"]').click();

  console.log('--- Waiting for navigation or networkidle ---');
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Successfully navigated to URL:', page.url());
  } catch (e) {
    console.log('Current URL after submit:', page.url());
  }

  await page.waitForTimeout(4000);
  console.log('Current URL after timeout:', page.url());

  const content = await page.content();
  const bodyText = await page.locator('body').innerText();
  console.log('Body text length:', bodyText.length);
  console.log('Body snippet:\n', bodyText.slice(0, 500));

  const appHtml = await page.locator('#app').innerHTML();
  console.log('App HTML length:', appHtml.length);
  console.log('App HTML snippet:\n', appHtml.slice(0, 500));

  await page.screenshot({ path: 'scripts/dashboard-debug.png', fullPage: true });
  console.log('Screenshot saved to scripts/dashboard-debug.png');

  await browser.close();
}

run().catch((err) => {
  console.error('Diagnostic run failed:', err);
  process.exit(1);
});
