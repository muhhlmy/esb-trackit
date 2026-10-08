/* ui-style-probe.cjs — Verifikasi komputasi skala tipografi & density.
   Mengecek computed style elemen kunci di halaman utama, desktop + mobile. */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5175'
const OUT = path.resolve('reports/ui-audit')

function readE2ECredential(key) {
  const line = fs
    .readFileSync('.env.e2e', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(key + '='))
  return line ? line.slice(key.length + 1).trim() : ''
}

const PROBE = `(() => {
  const gcs = (el) => (el ? getComputedStyle(el) : null)
  const px = (v) => (v ? parseFloat(v) : null)
  const pick = (sel) => document.querySelector(sel)
  const out = {}

  const body = gcs(pick('body'))
  const bodyLh = parseFloat(body.lineHeight)
  out.body = { font: px(body.fontSize), lh: Number.isNaN(bodyLh) ? null : bodyLh }

  const h1 = pick('h1')
  if (h1) out.h1 = { font: px(gcs(h1).fontSize), weight: gcs(h1).fontWeight }

  // KPI: ambil elemen dengan token kpi (StatCard/dash-stat/tickets-kpis)
  const kpiValue = [...document.querySelectorAll('span')].find((s) =>
    /var\\(--kpi-value-font-size/.test(s.className || ''),
  )
  if (kpiValue) out.kpiValue = px(gcs(kpiValue).fontSize)

  // Tombol terbesar di viewport (toolbar/aksi) — teks & tinggi
  const buttons = [...document.querySelectorAll('button')].filter(
    (b) => b.offsetParent && b.textContent.trim().length > 2,
  )
  if (buttons.length) {
    const byArea = buttons.map((b) => {
      const cs = gcs(b)
      return { t: px(cs.fontSize), h: b.getBoundingClientRect().height }
    })
    out.buttonMaxFont = Math.max(...byArea.map((x) => x.t))
    out.buttonMaxH = Math.max(...byArea.map((x) => x.h))
  }

  // Kartu: elemen dengan border tipis + background putih (card-ish)
  const cards = [...document.querySelectorAll('div')].filter((d) => {
    if (!(d.offsetParent && d.className && typeof d.className === 'string')) return false
    return /card|panel|shadow-card|ui-card|stat/.test(d.className) && !d.className.includes('skeleton')
  })
  const radiuses = cards.slice(0, 40).map((d) => px(gcs(d).borderTopLeftRadius))
  const radii = radiuses.filter((r) => r !== null)
  if (radii.length) out.cardMaxRadius = Math.max(...radii)

  // Tabel
  const td = pick('table tbody td')
  if (td) out.td = { font: px(gcs(td).fontSize), padV: px(gcs(td).paddingTop) }
  const th = pick('table thead th')
  if (th) out.th = { font: px(gcs(th).fontSize), padV: px(gcs(th).paddingTop) }

  // Input teks
  const input = [...document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')].find(
    (i) => i.offsetParent,
  )
  if (input) {
    const cs = gcs(input)
    out.input = { font: px(cs.fontSize), h: input.getBoundingClientRect().height }
  }

  // Judul bagian h2/h3 (card title)
  const h3 = pick('.dashboard-panel h3, h3')
  if (h3) out.h3 = px(gcs(h3).fontSize)

  return out
})()`

const ROUTES = [
  ['dashboard', '/dashboard'],
  ['tickets', '/tickets'],
  ['assets', '/assets'],
  ['karyawan', '/karyawan'],
  ['shipments', '/shipments'],
  ['submissions', '/submissions'],
  ['users', '/users'],
  ['logs', '/logs'],
]
const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
]

;(async () => {
  const browser = await chromium.launch()
  const results = []
  for (const [vkey, w, h] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await context.newPage()
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForSelector('#email', { timeout: 10000 })
    await page.locator('#email').fill(readE2ECredential('E2E_SUPERADMIN_EMAIL'))
    await page.locator('#password').fill(readE2ECredential('E2E_SUPERADMIN_PASSWORD'))
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
    await page.waitForURL((u) => !u.href.includes('/login'), { timeout: 20000 })

    for (const [name, route] of ROUTES) {
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 })
        await page.waitForTimeout(1500)
        const probe = await page.evaluate(PROBE)
        results.push({ viewport: vkey, page: name, ...probe })
      } catch (e) {
        results.push({ viewport: vkey, page: name, error: String(e).slice(0, 200) })
      }
    }
    await context.close()
  }
  await browser.close()

  fs.writeFileSync(path.join(OUT, 'style-probe.json'), JSON.stringify(results, null, 2))
  const fmt = (n) => (n == null ? '–' : Math.round(n * 10) / 10)
  console.log('page            | vp      | body | h1   | h3   | kpi  | btnMax(f/h) | cardR | td(f/pad)')
  for (const r of results) {
    if (r.error) {
      console.log(`${r.page.padEnd(16)}| ${r.viewport.padEnd(7)}| ERROR ${r.error.slice(0, 40)}`)
      continue
    }
    console.log(
      `${r.page.padEnd(16)}| ${r.viewport.padEnd(7)}| ${fmt(r.body?.font)}   | ${fmt(r.h1?.font)} | ${fmt(r.h3)} | ${fmt(r.kpiValue)} | ${fmt(r.buttonMaxFont)}/${fmt(r.buttonMaxH)}  | ${fmt(r.cardMaxRadius)}   | ${fmt(r.td?.font)}/${fmt(r.td?.padV)}`,
    )
  }
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
