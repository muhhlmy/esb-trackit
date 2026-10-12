import { chromium } from '@playwright/test';

const routesToTest = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/assets', name: 'Aset IT' },
  { path: '/assets-ga', name: 'Aset GA' },
  { path: '/assets-ops', name: 'Aset Ops' },
  { path: '/tickets', name: 'Tiket' },
  { path: '/submissions', name: 'Pengajuan' },
  { path: '/shipments', name: 'Pengiriman' },
  { path: '/karyawan', name: 'Karyawan' },
  { path: '/users', name: 'Pengguna' },
  { path: '/logs', name: 'Log Aktivitas' },
  { path: '/export', name: 'Ekspor Data' },
  { path: '/database', name: 'Database & Backup' },
  { path: '/settings', name: 'Settings' },
  { path: '/admin/cases', name: 'Admin Cases' },
  { path: '/admin/faq', name: 'Admin FAQ' },
  { path: '/admin/kb-categories', name: 'Admin KB Categories' },
  { path: '/my-assets', name: 'Profil' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    errors.push(`[PAGE ERROR on ${page.url()}] ${err.message}`);
  });

  console.log('1. Navigating to login...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email');

  console.log('2. Logging in as superadmin...');
  await page.locator('#email').fill('superadmin@admin.com');
  await page.locator('#password').fill('Password123!');
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('3. Logged in successfully. Current URL:', page.url());

  const results = [];

  for (const target of routesToTest) {
    const url = `http://127.0.0.1:5173${target.path}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const htmlLen = (await page.locator('#app').innerHTML()).length;
      const textLen = (await page.locator('body').innerText()).length;
      const hasContent = htmlLen > 1000 && textLen > 50;

      const passed = hasContent && !page.url().includes('/login');
      results.push({
        name: target.name,
        path: target.path,
        status: passed ? 'PASS' : 'FAIL',
        htmlLength: htmlLen,
        textLength: textLen,
        currentUrl: page.url(),
      });
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${target.name} (${target.path}) - HTML len: ${htmlLen}, Text len: ${textLen}`);
    } catch (err) {
      results.push({
        name: target.name,
        path: target.path,
        status: 'ERROR',
        error: err.message,
      });
      console.error(`[ERROR] ${target.name} (${target.path}):`, err.message);
    }
  }

  // Take full screenshot of dashboard
  await page.goto('http://127.0.0.1:5173/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scripts/dashboard-verified.png', fullPage: true });

  await browser.close();

  console.log('\n--- SUMMARY ---');
  console.log(`Total checked: ${results.length}`);
  const passCount = results.filter(r => r.status === 'PASS').length;
  console.log(`Passed: ${passCount}/${results.length}`);
  if (errors.length > 0) {
    console.error('Page errors encountered during run:', errors);
  } else {
    console.log('Zero page errors encountered across all tested routes.');
  }

  if (passCount !== results.length || errors.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
