/* ui-layout-probe.cjs — Verifikasi konsistensi LAYOUT antarhalaman:
   1 h1 per halaman, PageHeader ada & seragam, gap section 12px, sticky toolbar ada. */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5175'
const OUT = path.resolve('reports/ui-audit')

function cred(key) {
  const l = fs.readFileSync('.env.e2e', 'utf8').split(/\r?\n/).find((x) => x.startsWith(key + '='))
  return l ? l.slice(key.length + 1).trim() : ''
}

const ROUTES = [
  ['dashboard', '/dashboard'],
  ['tickets', '/tickets'],
  ['assets', '/assets'],
  ['assets-ga', '/assets-ga'],
  ['assets-ops', '/assets-ops'],
  ['karyawan', '/karyawan'],
  ['users', '/users'],
  ['submissions', '/submissions'],
  ['shipments', '/shipments'],
  ['logs', '/logs'],
  ['export', '/export'],
  ['database', '/database'],
  ['faqs', '/faqs'],
  ['admin-cases', '/admin/cases'],
  ['kb-categories', '/admin/kb-categories'],
  ['my-assets', '/my-assets'],
]

const PROBE = `(() => {
  const r = {}
  r.h1Count = document.querySelectorAll('h1').length
  const h1 = document.querySelector('h1')
  r.h1Size = h1 ? getComputedStyle(h1).fontSize : null
  r.pageHeader = !!document.querySelector('.page-header')
  const ph = document.querySelector('.page-header')
  if (ph) {
    r.phPadding = getComputedStyle(ph).padding
    r.phRadius = getComputedStyle(ph).borderTopLeftRadius
  }
  // gap PageHeader → section berikutnya (kolom flex pertama)
  const root = document.querySelector('main .max-w\\\\[1560px\\\\] > div > div, main > div > div > div')
  if (root) {
    const cs = getComputedStyle(root)
    r.rootGap = cs.columnGap || cs.rowGap || (cs.display.includes('flex') || cs.display.includes('grid') ? cs.gap : null)
  }
  r.stickyToolbar = !!document.querySelector('[class*="toolbar-sticky"], .ws-toolbar-flat, .tck-toolbar-sticky, .it-list-heading-sticky')
  return r
})()`

;(async () => {
  const browser = await chromium.launch()
  const results = []
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForSelector('#email', { timeout: 10000 })
  await page.locator('#email').fill(cred('E2E_SUPERADMIN_EMAIL'))
  await page.locator('#password').fill(cred('E2E_SUPERADMIN_PASSWORD'))
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL((u) => !u.href.includes('/login'), { timeout: 20000 })

  for (const [name, route] of ROUTES) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 })
      // tunggu PageHeader/h1 mount (data async), maksimum 8 detik
      try {
        await page.waitForSelector('.page-header, h1', { timeout: 8000 })
      } catch {
        /* lanjut — ukur apa adanya */
      }
      await page.waitForTimeout(600)
      const probe = await page.evaluate(PROBE)
      results.push({ page: name, ...probe })
    } catch (e) {
      results.push({ page: name, error: String(e).slice(0, 200) })
    }
  }
  await context.close()
  await browser.close()

  fs.writeFileSync(path.join(OUT, 'layout-probe.json'), JSON.stringify(results, null, 2))
  console.log('page             | h1# | h1px | PageHeader | ph-pad      | gap  | stickyToolbar')
  for (const r of results) {
    if (r.error) {
      console.log(`${r.page.padEnd(16)}| ERR ${r.error.slice(0, 40)}`)
      continue
    }
    console.log(
      `${r.page.padEnd(16)}| ${String(r.h1Count).padEnd(3)}| ${String(r.h1Size).padEnd(5)}| ${String(!!r.pageHeader).padEnd(10)}| ${String(r.phPadding).padEnd(12)}| ${String(r.rootGap).padEnd(5)}| ${!!r.stickyToolbar}`,
    )
  }
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
