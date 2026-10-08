/* debug-btn.cjs — temukan tombol tertinggi di halaman tickets desktop */
const fs = require('node:fs')
const { chromium } = require('@playwright/test')

function cred(key) {
  const l = fs.readFileSync('.env.e2e', 'utf8').split(/\r?\n/).find((x) => x.startsWith(key + '='))
  return l ? l.slice(key.length + 1).trim() : ''
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://127.0.0.1:5175/login', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#email')
  await page.locator('#email').fill(cred('E2E_SUPERADMIN_EMAIL'))
  await page.locator('#password').fill(cred('E2E_SUPERADMIN_PASSWORD'))
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL((u) => !u.href.includes('/login'))
  await page.goto('http://127.0.0.1:5175/tickets', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const tall = await page.evaluate(() => {
    return [...document.querySelectorAll('button')]
      .filter((b) => b.offsetParent && b.textContent.trim().length > 2)
      .map((b) => ({
        h: Math.round(b.getBoundingClientRect().height * 10) / 10,
        text: b.textContent.trim().slice(0, 30),
        cls: (b.className.toString() || '').slice(0, 100),
        aria: b.getAttribute('aria-label') || '',
      }))
      .sort((a, b) => b.h - a.h)
      .slice(0, 6)
  })
  console.log(JSON.stringify(tall, null, 2))
  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
