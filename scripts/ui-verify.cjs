/* ui-verify.cjs — Screenshot sweep untuk audit UI (desktop/tablet/mobile).
   Jalankan setelah stack e2e (backend 3005 + vite 5175) menyala.
   Output: reports/ui-audit/screens/*.png + reports/ui-audit/verify-report.json */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5175'
const OUT = path.resolve('reports/ui-audit')
const SCREENS = path.join(OUT, 'screens')
fs.mkdirSync(SCREENS, { recursive: true })

const ROUTES = [
  { name: 'dashboard', path: '/dashboard', auth: true },
  { name: 'tickets', path: '/tickets', auth: true },
  { name: 'assets', path: '/assets', auth: true },
  { name: 'assets-ga', path: '/assets-ga', auth: true },
  { name: 'assets-ops', path: '/assets-ops', auth: true },
  { name: 'my-assets', path: '/my-assets', auth: true },
  { name: 'karyawan', path: '/karyawan', auth: true },
  { name: 'users', path: '/users', auth: true },
  { name: 'submissions', path: '/submissions', auth: true },
  { name: 'shipments', path: '/shipments', auth: true },
  { name: 'logs', path: '/logs', auth: true },
  { name: 'export', path: '/export', auth: true },
  { name: 'database', path: '/database', auth: true },
  { name: 'faqs', path: '/faqs', auth: true },
  { name: 'admin-cases', path: '/admin/cases', auth: true },
  { name: 'kb-categories', path: '/admin/kb-categories', auth: true },
  { name: 'home', path: '/', auth: false },
  { name: 'cases', path: '/cases', auth: false },
  { name: 'login', path: '/login', auth: false },
]

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'mobile', width: 390, height: 844 },
].filter((v) => !process.env.VERIFY_VIEWPORT || v.key === process.env.VERIFY_VIEWPORT)

function readE2ECredential(key) {
  const line = fs
    .readFileSync('.env.e2e', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(key + '='))
  return line ? line.slice(key.length + 1).trim() : ''
}

;(async () => {
  const report = { base: BASE, generatedAt: new Date().toISOString(), pages: [] }
  const browser = await chromium.launch()

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
    })

    // Login sekali per viewport (superadmin melihat semua menu)
    let loggedIn = false
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForSelector('#email', { timeout: 10000 })
      await page.locator('#email').fill(readE2ECredential('E2E_SUPERADMIN_EMAIL'))
      await page.locator('#password').fill(readE2ECredential('E2E_SUPERADMIN_PASSWORD'))
      await page.getByRole('button', { name: 'Masuk', exact: true }).click()
      await page.waitForURL((u) => !u.href.includes('/login'), { timeout: 20000 })
      loggedIn = true
    } catch (e) {
      report.pages.push({
        viewport: vp.key,
        route: 'login',
        error: 'LOGIN FAILED: ' + String(e).slice(0, 300),
      })
    }

    for (const route of ROUTES) {
      if (route.auth && !loggedIn) continue
      const entry = { viewport: vp.key, route: route.name, path: route.path }
      try {
        await page.goto(`${BASE}${route.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        })
        await page.waitForTimeout(1600) // settle fetch + skeleton→content

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement
          const overflowX = doc.scrollWidth - doc.clientWidth
          // Elemen yang melebihi lebar viewport (sumber potensial geser horizontal)
          const wide = []
          const vw = doc.clientWidth
          document.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect()
            if (r.width > vw + 8 && el.offsetParent !== null) {
              const cls = (el.className && el.className.toString().slice(0, 80)) || el.tagName
              if (wide.length < 5) wide.push(cls)
            }
          })
          return {
            overflowX,
            title: document.title,
            wide,
          }
        })
        entry.overflowX = metrics.overflowX
        entry.wideElements = metrics.wide
        entry.status = 'ok'
        await page.screenshot({
          path: path.join(SCREENS, `${route.name}--${vp.key}.png`),
          fullPage: false,
        })
      } catch (e) {
        entry.status = 'error'
        entry.error = String(e).slice(0, 300)
      }
      if (consoleErrors.length) {
        entry.consoleErrors = consoleErrors.splice(0, 5)
      }
      report.pages.push(entry)
    }

    await context.close()
  }

  await browser.close()
  fs.writeFileSync(path.join(OUT, 'verify-report.json'), JSON.stringify(report, null, 2))

  const bad = report.pages.filter(
    (p) => p.status !== 'ok' || (p.overflowX && p.overflowX > 2),
  )
  console.log(
    `Halaman dicek: ${report.pages.length}, bermasalah: ${bad.length} (error/overflow-x)`,
  )
  for (const b of bad) {
    console.log(
      `- [${b.viewport}] ${b.route}: status=${b.status || '?'} overflowX=${b.overflowX ?? '?'} ${b.error || ''}`,
    )
  }
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
