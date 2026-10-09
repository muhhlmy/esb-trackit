/* debug-page.cjs — dump console/page errors untuk satu route */
const fs = require('node:fs')
const { chromium } = require('@playwright/test')

function cred(key) {
  const l = fs.readFileSync('.env.e2e', 'utf8').split(/\r?\n/).find((x) => x.startsWith(key + '='))
  return l ? l.slice(key.length + 1).trim() : ''
}

const route = process.argv[2] || '/tickets'
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE: ' + m.text().slice(0, 300)))
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)))
  page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url().slice(0, 120) + ' ' + (r.failure() || {}).errorText))

  await page.goto('http://127.0.0.1:5175/login', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#email')
  await page.locator('#email').fill(cred('E2E_SUPERADMIN_EMAIL'))
  await page.locator('#password').fill(cred('E2E_SUPERADMIN_PASSWORD'))
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL((u) => !u.href.includes('/login'))
  await page.goto('http://127.0.0.1:5175' + route, { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(3000)
  const info = await page.evaluate(() => ({
    url: location.href,
    h1: document.querySelectorAll('h1').length,
    bodyText: document.body.innerText.slice(0, 200),
  }))
  console.log(JSON.stringify(info, null, 2))
  console.log('ERRORS (' + errors.length + '):')
  errors.slice(0, 10).forEach((e) => console.log(' -', e))
  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
