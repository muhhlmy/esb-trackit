/* debug-profile.cjs — ukur anatomy tombol profil header */
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
  await page.goto('http://127.0.0.1:5175/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => {
    const btn = document.querySelector("button[aria-label='Menu profil']")
    const cs = getComputedStyle(btn)
    const kids = [...btn.children].map((k) => ({
      tag: k.tagName,
      h: k.getBoundingClientRect().height,
      cls: (k.className || '').toString().slice(0, 70),
    }))
    return { h: btn.getBoundingClientRect().height, minHeight: cs.minHeight, padding: cs.padding, kids }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
