/* debug-kpi.cjs — cek rendering token KPI di halaman tiket */
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

  const info = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')].filter((s) =>
      typeof s.className === 'string' && s.className.includes('kpi-value-font-size'),
    )
    const vars = getComputedStyle(document.documentElement)
    return {
      kpiVarLg: vars.getPropertyValue('--kpi-value-font-size-lg'),
      kpiVarSm: vars.getPropertyValue('--kpi-value-font-size-sm'),
      kpiVar: vars.getPropertyValue('--kpi-value-font-size'),
      spans: spans.slice(0, 8).map((s) => ({
        cls: s.className.slice(0, 90),
        computed: getComputedStyle(s).fontSize,
        text: s.textContent.trim().slice(0, 20),
      })),
      // cek apakah class tailwind di-generate
      ruleExists: [...document.styleSheets].some((sheet) => {
        try {
          return [...sheet.cssRules].some((r) =>
            r.selectorText && r.selectorText.includes('kpi-value-font-size-lg'),
          )
        } catch {
          return false
        }
      }),
    }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
