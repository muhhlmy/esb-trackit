// Built-dist UI regression fixture. Never build/deploy, authenticate remotely, or write data.
// Run: node scripts/check-tickets-ui-fixture.mjs (optional WIDTHS=390,1440).
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium, expect } from '@playwright/test'

const widths = (process.env.WIDTHS || '360,390,768,1024,1440,1920').split(',').map(Number)
assert.ok(widths.length && widths.every(w => Number.isInteger(w) && w >= 320 && w <= 3840), 'Invalid WIDTHS')
const root = resolve('frontend/dist')
await readFile(resolve(root, 'index.html'))
const failures = [], cases = [], escapedApis = []
const artifacts = resolve(tmpdir(), `tickets-ui-fixture-${process.pid}`)
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path.startsWith('/api/')) {
    escapedApis.push(path); res.writeHead(500); res.end('Unmocked API'); return
  }
  try {
    const file = path.startsWith('/assets/') ? resolve(root, '.' + path) : resolve(root, 'index.html')
    if (!file.startsWith(root + sep)) throw new Error('Invalid static path')
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end() }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
const check = (condition, label, detail) => { if (!condition) failures.push({ label, detail }) }

// Soft geometry assertions keep exercising other surfaces when an old dist fails sizing.
async function geometry(page, scope, label, groups = []) {
  const layout = await scope.evaluate(el => {
    const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'
    const measure = e => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e)
      return { name: e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent.trim().replace(/\s+/g, ' ').slice(0, 100), width: r.width, height: r.height, padding: s.padding, radius: s.borderRadius, font: s.fontSize, minWidth: s.minWidth }
    }
    const r = el.getBoundingClientRect()
    return { documentOverflow: document.documentElement.scrollWidth - innerWidth, scopeOverflow: el.scrollWidth - el.clientWidth, left: r.left, right: r.right, viewport: innerWidth, buttons: [...el.querySelectorAll('button')].filter(visible).map(measure) }
  })
  check(layout.documentOverflow <= 1, label + ': document overflow', layout.documentOverflow)
  check(layout.left >= -1 && layout.right <= layout.viewport + 1, label + ': surface bounds', layout)
  // Tables may scroll inside their wrapper; dialogs/forms must fit without horizontal scrolling.
  if (await scope.evaluate(e => e.matches('[role="dialog"], form'))) check(layout.scopeOverflow <= 1, label + ': internal overflow', layout.scopeOverflow)
  for (const b of layout.buttons) check(b.height >= 43.9 && b.width >= 43.9, label + ': target >=44px', b)
  for (const [name, locator] of groups) {
    const boxes = await locator.evaluateAll(elements => elements.filter(e => e.getClientRects().length).map(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect()
      return { height: Math.round(r.height * 10) / 10, padding: s.padding, radius: s.borderRadius, font: s.fontSize, minWidth: s.minWidth }
    }))
    check(boxes.length >= 2, label + ': group present ' + name, boxes)
    for (const key of ['height', 'padding', 'radius', 'font', 'minWidth']) check(new Set(boxes.map(b => b[key])).size <= 1, label + ': equivalent ' + name + '/' + key, boxes)
  }
  console.log(JSON.stringify({ label, layout }))
}
async function keyboardFocus(page, target, label) {
  await target.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(target).toBeFocused()
  const style = await target.evaluate(e => { const s = getComputedStyle(e); return { outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow, visible: e.matches(':focus-visible') } })
  check(style.visible && ((style.outline !== 'none' && parseFloat(style.width) > 0) || style.shadow !== 'none'), label + ': visible keyboard focus', style)
}
async function dialogCheck(page, name, label, groups = []) {
  const dialog = page.getByRole('dialog', { name, exact: true })
  await expect(dialog).toBeVisible()
  await geometry(page, dialog, label, groups)
  await page.keyboard.press('Tab')
  check(await dialog.evaluate(e => e.contains(document.activeElement)), label + ': focus contained')
  return dialog
}

try {
  browser = await chromium.launch({ headless: true })
  for (const width of widths) for (const scenario of ['populated', 'empty', 'error', 'long-labels']) {
    const label = `${width}/${scenario}`, start = failures.length
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
    await context.tracing.start({ screenshots: true, snapshots: true })
    const user = { id: 1, nama: 'Fixture', role: 'superadmin', permissions: { tickets: 'full', submissions: 'full' } }
    const long = scenario === 'long-labels'
    const title = long ? 'Permintaan pemeriksaan perangkat jaringan operasional seluruh kantor ' + 'LabelTanpaSpasi'.repeat(8) : 'Fixture jaringan kantor'
    const person = long ? 'Nama pelapor dan penanggung jawab operasional sangat panjang '.repeat(3) : 'Pelapor Fixture'
    const ticket = { id: 7, nomor_tiket: 'TCK-FIXTURE-007', judul: title, deskripsi: long ? title.repeat(3) : 'Koneksi jaringan membutuhkan pemeriksaan.', kategori: 'Support', queue_id: 1, queue_kode: 'IT', queue_nama: long ? 'IT Support operasional jaringan seluruh cabang '.repeat(3) : 'IT Support', prioritas: 'High', status_tiket: 'Open', pelapor: person, pelapor_nama: person, pelapor_user_id: 2, assigned_to_user_id: 1, assigned_to_nama: person, dibuat_pada: '2026-09-22T08:00:00Z', total_komentar: 0, has_attachment: false }
    const payload = { pemberiNik: 'EMP1', pemberiNama: person, pemberiDirektorat: 'IT', penerimaNik: '', isPenerimaLainnya: true, penerimaNama: person, penerimaDirektorat: 'Operasional', tanggal: '2026-09-22', tujuan: 'baru', asetBaruList: [{ id_aset: 1, tipe: 'Laptop', qty: 1, spesifikasi: title }], asetLamaList: [] }
    const submission = { id: 7, submission_number: 'BAST-FIXTURE', status: 'draft', payload }
    const requests = [], writes = [], pageErrors = []
    await context.addInitScript(user => localStorage.setItem('user', JSON.stringify(user)), user)
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      if (url.origin !== origin) return route.abort()
      if (!path.startsWith('/api/')) return request.method() === 'GET' ? route.continue() : route.abort()
      requests.push(path + url.search)
      if (request.method() !== 'GET') { writes.push(request.method() + ' ' + path); return route.fulfill({ status: 405, json: { message: 'UI fixture prohibits writes' } }) }
      let json = []
      if (path === '/api/auth/me') json = user
      else if (path === '/api/ticket-queues') json = [{ id: 1, kode: 'IT', nama: ticket.queue_nama }, { id: 2, kode: 'HR', nama: 'HR Support' }, { id: 3, kode: 'GA', nama: 'GA Support' }]
      else if (/^\/api\/ticket-queues\/\d+\/admins$/.test(path)) json = [user]
      else if (path === '/api/tickets/reporters') json = { reporters: [{ id: 2, nama: person }] }
      else if (path === '/api/tickets/stats') json = { totalTickets: scenario === 'empty' ? 0 : 1, openTickets: 1, pendingTickets: 0, closedTickets: 0, unassignedTickets: 0, assignedTickets: 1 }
      else if (path === '/api/tickets') {
        if (scenario === 'error') return route.fulfill({ status: 500, json: { message: 'Fixture tickets unavailable' } })
        const rows = scenario === 'empty' || (url.searchParams.get('search') && !title.includes(url.searchParams.get('search'))) ? [] : [ticket]
        json = { data: rows, total: rows.length, totalPages: 1 }
      } else if (path === '/api/tickets/7') json = ticket
      else if (path === '/api/tickets/7/casp') json = { eligible: false, rating: null }
      else if (path === '/api/submissions') json = { data: [submission], total: 1, totalPages: 1 }
      else if (path === '/api/submissions/7') json = submission
      else if (path === '/api/karyawan') json = [{ nik: 'EMP1', nama_karyawan: person, departemen: 'IT' }]
      else if (path === '/api/assets') json = [{ id: 1, hostname: title, nik_pemegang_asset: 'EMP1' }]
      return route.fulfill({ json })
    })
    const page = await context.newPage()
    page.setDefaultTimeout(8000)
    page.on('pageerror', e => pageErrors.push(e.message))
    try {
      await page.goto(origin + '/tickets')
      const ready = page.getByTestId('page-ready')
      await expect(ready).toBeVisible()
      if (scenario === 'empty') await expect(page.getByRole('heading', { name: 'Inbox tiket kosong' })).toBeVisible()
      else if (scenario === 'error') await expect(page.getByText('Fixture tickets unavailable', { exact: true })).toBeVisible()
      else await expect(page.getByLabel('Lihat tiket ' + title, { exact: true }).filter({ visible: true })).toBeVisible()
      for (const mode of ['Kartu', 'Tabel']) {
        const toggle = page.getByTitle('Tampilan ' + mode, { exact: true })
        await toggle.click()
        await expect(toggle).toHaveAttribute('aria-pressed', 'true')
        if (!['empty', 'error'].includes(scenario)) {
          await expect(page.getByLabel('Lihat tiket ' + title, { exact: true }).filter({ visible: true })).toBeVisible()
          if (width >= 1280) await expect(page.getByRole('table', { name: 'Daftar tiket kendala' })).toHaveCount(mode === 'Tabel' ? 1 : 0)
        }
        await geometry(page, ready, `${label}/${mode}`, [['view toggles', page.getByRole('group', { name: 'Mode tampilan daftar' }).getByRole('button')], ['inbox tabs', ready.getByRole('button', { name: /^(Inbox|Belum Diambil|Ditangani Saya|Selesai)(\s|$)/ })]])
      }
      await keyboardFocus(page, page.getByRole('button', { name: 'Filter', exact: true }), label)
      await page.keyboard.press('Enter')
      let dialog = await dialogCheck(page, 'Filter Tiket', label + '/filter', [['filter actions', page.getByRole('dialog').getByRole('button', { name: /^(Reset|Terapkan Filter)$/ })]])
      await dialog.getByRole('button', { name: 'Filter status', exact: true }).click()
      await page.getByRole('option', { name: 'Closed', exact: true }).click()
      await dialog.getByRole('button', { name: 'Terapkan Filter', exact: true }).click()
      if (scenario !== 'error') await expect(page.getByRole('heading', { name: 'Tidak ada tiket yang cocok' })).toBeVisible()
      await page.getByRole('button', { name: 'Filter', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Reset', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Terapkan Filter', exact: true }).click()
      await page.getByRole('button', { name: 'Buat Tiket', exact: true }).click()
      dialog = await dialogCheck(page, 'Buat Tiket Baru', label + '/create', [['support units', page.getByRole('dialog').getByRole('button', { name: /^(IT|HR|GA) Support/ })], ['form actions', page.getByRole('dialog').getByRole('button', { name: /^(Batal|Buat Tiket)$/ })]])
      await dialog.getByRole('textbox', { name: 'Judul Tiket', exact: true }).fill(title.slice(0, 150))
      await dialog.getByRole('textbox', { name: 'Deskripsi Kendala Tiket' }).fill(title)
      await dialog.getByRole('button', { name: /^HR Support/ }).click()
      await expect(dialog.getByRole('button', { name: /^HR Support/ })).toHaveAttribute('aria-pressed', 'true')
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      if (!['empty', 'error'].includes(scenario)) {
        const row = page.getByLabel('Lihat tiket ' + title, { exact: true }).filter({ visible: true })
        await keyboardFocus(page, row, label + '/row')
        await page.keyboard.press('Enter')
        // Enter can open on keydown then activate newly focused close on keyup.
        // Record that real keyboard defect, but continue testing remaining surfaces.
        try { await expect(page.getByRole('dialog', { name: ticket.nomor_tiket, exact: true })).toBeVisible({ timeout: 1500 }) }
        catch { failures.push({ label: label + ': keyboard Enter must leave detail open' }); await row.click() }
        dialog = await dialogCheck(page, ticket.nomor_tiket, label + '/detail', [['detail tabs', page.getByRole('dialog').getByRole('button', { name: /^(Ringkasan|Aktivitas|Diskusi)(\s|$)/ })]])
        await dialog.getByRole('button', { name: /^Aktivitas/ }).click()
        await expect(dialog.getByText('Belum ada riwayat aktivitas pada tiket ini.')).toBeVisible()
        await dialog.getByRole('button', { name: /^Diskusi/ }).click()
        await expect(dialog.getByText('Belum ada diskusi pada tiket ini.')).toBeVisible()
        await geometry(page, dialog, label + '/discussion')
        await dialog.getByRole('button', { name: 'Tutup', exact: true }).click()
        for (const [action, name] of [['Edit & Status Tiket', 'Edit Tiket Kendala'], ['Hapus Tiket', 'Hapus Tiket']]) {
          const trigger = page.getByRole('button', { name: 'Aksi tiket ' + ticket.nomor_tiket, exact: true }).filter({ visible: true })
          await trigger.click()
          await expect(page.getByRole('menu')).toBeVisible()
          await geometry(page, page.getByRole('menu'), label + '/action-menu')
          await page.keyboard.press('Escape')
          await expect(trigger).toBeFocused()
          await trigger.press('Enter')
          await page.getByRole('menuitem', { name: action, exact: true }).click()
          dialog = await dialogCheck(page, name, label + '/' + name, [['dialog actions', page.getByRole('dialog').getByRole('button', { name: /^(Batal|Simpan Perubahan|Ya, Hapus)$/ })]])
          if (action.startsWith('Edit')) await expect(dialog.getByRole('textbox', { name: 'Judul Tiket', exact: true })).toHaveValue(title)
          await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
        }
      }
      // BAST geometry complements, never replaces, check-submissions-fixture.mjs functional checks.
      if (scenario === 'populated' || long) {
        await page.goto(origin + '/submissions')
        await expect(page.getByRole('link', { name: 'BAST-FIXTURE', exact: true })).toBeVisible()
        for (const mode of ['Kartu', 'Tabel']) {
          await page.getByTitle('Tampilan ' + mode).click()
          await geometry(page, page.getByTestId('page-ready'), label + '/BAST-' + mode, [['BAST toggles', page.getByRole('group', { name: 'Mode tampilan daftar' }).getByRole('button')]])
        }
        await page.getByRole('link', { name: 'BAST-FIXTURE', exact: true }).click()
        await expect(page.getByLabel('Tanggal Formulir Serah Terima')).toHaveValue(payload.tanggal)
        await geometry(page, page.locator('.submission-form'), label + '/BAST-saved-form')
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
        await page.getByRole('button', { name: 'BAST Baru', exact: true }).click()
        await expect(page.getByLabel('Tanggal Formulir Serah Terima')).toBeVisible()
        await geometry(page, page.locator('.submission-form'), label + '/BAST-new-form')
        await keyboardFocus(page, page.getByRole('button', { name: 'Cancel', exact: true }), label + '/BAST')
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      }
    } catch (error) { failures.push({ label, interaction: error.message, dialogs: await page.getByRole('dialog').ariaSnapshot().catch(() => 'No unique dialog') }) }
    check(writes.length === 0, label + ': zero attempted API writes', writes)
    check(pageErrors.length === 0, label + ': zero page errors', pageErrors)
    const failed = failures.length > start
    if (failed) {
      await mkdir(artifacts, { recursive: true })
      await page.screenshot({ path: resolve(artifacts, `${width}-${scenario}.png`), fullPage: true }).catch(() => {})
      await context.tracing.stop({ path: resolve(artifacts, `${width}-${scenario}.zip`) })
    } else await context.tracing.stop()
    cases.push({ width, scenario, passed: !failed, requests: requests.length, attemptedWrites: writes.length })
    await context.close()
  }
} finally {
  await browser?.close()
  await new Promise(r => server.close(r))
}
check(escapedApis.length === 0, 'No API reached static server', escapedApis)
assert.equal(cases.length, widths.length * 4, 'All requested cases exercised')
console.log(JSON.stringify({ cases, failures, artifacts: failures.length ? artifacts : null, apiMode: 'GET-only local mocks; external requests blocked; save/delete confirmation deliberately not submitted' }, null, 2))
if (failures.length) process.exitCode = 1
