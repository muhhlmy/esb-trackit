import { expect, test } from '../../fixtures/auth.fixture.js'

/**
 * Suite: View Toggle Tabel/Kartu — Shipments, Logs, Admin CMS
 *
 * Memverifikasi mode tampilan daftar (pola useViewMode + AppViewToggle):
 *  - Toggle terlihat, semantik grup benar, aria-pressed eksklusif
 *  - Mode Tabel menampilkan tabel data pada viewport desktop (1280px ≥ breakpoint xl)
 *  - Mode Kartu menyembunyikan tabel dan menampilkan daftar kartu
 *  - Preferensi mode dipersist di localStorage antar reload
 *  - Mode Kartu tetap menjadi representasi list di viewport mobile (375px)
 *
 * Catatan teknis:
 *  - Mode disimpan per modul: trackit_view_mode_shipments / _logs-assets / _admin-cms
 *  - Superadmin dipakai agar semua route (shipments, logs, admin/cases) lolos RBAC
 *  - Setiap test men-seed data minimalnya lewat API (fullyParallel: test berjalan
 *    paralel, tanpa asumsi data dari test lain). Database _test bersifat disposable,
 *    konsisten dengan konvensi spec lain yang tidak melakukan cleanup.
 */

const API = process.env.E2E_API_URL || 'http://localhost:3000'
const DESKTOP = { width: 1280, height: 720 }
const MOBILE = { width: 375, height: 667 }

const MODULES = [
  {
    name: 'Shipments',
    route: '/shipments',
    storageKey: 'trackit_view_mode_shipments',
    tableSelector: '.shipment-table',
    cardsSelector: '.shipment-cards',
    seed: async (request) => {
      const res = await request.post(`${API}/api/shipments`, {
        data: {
          request_date: new Date().toISOString().slice(0, 10),
          recipient_name: `E2E VT Shipments ${Date.now()}`,
          item_description: 'Unit laptop untuk pengujian view toggle',
          destination: 'Kantor Pusat - Lantai 3',
        },
      })
      expect(res.status(), 'Seed shipment harus 201').toBe(201)
    },
  },
  {
    name: 'Logs',
    route: '/logs',
    storageKey: 'trackit_view_mode_logs-assets',
    tableSelector: 'div[aria-label="Tabel riwayat perubahan aset"]',
    cardsSelector: '.admin-log-list',
    // Membuat aset mencatat log 'TAMBAH' via recordAssetLog, sehingga tab
    // Riwayat Aset dijamin memiliki data tanpa bergantung seed lain.
    seed: async (request) => {
      const res = await request.post(`${API}/api/assets`, {
        data: {
          hostname: `E2E-VT-${Date.now()}`,
          serial_number: `SN-VT-${Date.now()}`,
          tipe_perangkat: 'Laptop',
          brand_merek: 'Lenovo',
          status: 'In Use',
          kondisi: 'Normal',
        },
      })
      expect(res.status(), 'Seed asset harus 201').toBe(201)
    },
  },
  {
    name: 'Admin CMS',
    route: '/admin/cases',
    storageKey: 'trackit_view_mode_admin-cms',
    tableSelector: 'table',
    cardsSelector: '.cms-cards',
    seed: async (request) => {
      const res = await request.post(`${API}/api/cases`, {
        data: {
          title: `E2E VT Case ${Date.now()}`,
          category: 'hardware',
          severity: 'low',
          tags: ['e2e'],
          summary: 'Artikel untuk pengujian view toggle Admin CMS.',
          contentHtml: '<p>Isi artikel pengujian view toggle.</p>',
          status: 'PUBLISHED',
        },
      })
      expect(res.status(), 'Seed case harus 201').toBe(201)
    },
  },
]

/**
 * Hapus kunci mode sekali (navigasi pertama) agar mode default 'table' berlaku.
 * One-shot via flag sessionStorage sehingga reload berikutnya tidak menghapus
 * lagi preferensi yang sedang diuji pada test persistensi.
 */
function clearViewMode(page, moduleKey) {
  return page.addInitScript((key) => {
    try {
      if (window.sessionStorage.getItem('__e2e_viewmode_cleared')) return
      window.sessionStorage.setItem('__e2e_viewmode_cleared', '1')
      window.localStorage.removeItem(key)
    } catch {
      /* storage tidak tersedia — abaikan */
    }
  }, moduleKey)
}

async function seedAndOpen(page, mod) {
  await clearViewMode(page, mod.storageKey)
  await mod.seed(page.request)
  await page.goto(mod.route, { waitUntil: 'domcontentloaded' })
  // 30s: saat full suite paralel, Vite meng-compile chunk view on-demand
  // dan bisa lambat — bukan indikasi bug aplikasi.
  await expect(page.locator('[aria-busy="true"]')).toBeHidden({ timeout: 30000 })
}

function getToggle(page) {
  return page.getByRole('group', { name: 'Mode tampilan daftar' })
}

/**
 * Klik opsi Kartu dan pastikan state benar-benar berubah.
 * Saat data selesai dimuat Vue mere-render ulang area list; klik yang
 * bertepatan dengan render ulang bisa hilang, jadi beri satu kali retry.
 */
async function pilihModeKartu(page) {
  const toggle = getToggle(page)
  const kartu = toggle.getByRole('button', { name: /^Kartu$/ })
  for (let attempt = 0; attempt < 2; attempt++) {
    await kartu.click()
    try {
      await expect(kartu).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })
      return toggle
    } catch (error) {
      if (attempt === 1) throw error
    }
  }
  /* istanbul ignore next */
  return toggle
}

test.describe('View Toggle Tabel/Kartu', () => {
  // Seed via API + double render Vue + paralel 2 browser: beri ruang lebih
  // dari timeout default 30s agar tidak flake saat mesin penuh beban.
  test.setTimeout(90000)

  for (const mod of MODULES) {
    test.describe(mod.name, () => {
      test(`${mod.name}: default mode Tabel menampilkan tabel di desktop`, async ({
        superAdminPage: page,
      }) => {
        await page.setViewportSize(DESKTOP)
        await seedAndOpen(page, mod)

        const toggle = getToggle(page)
        await expect(toggle).toBeVisible()
        await expect(toggle.getByRole('button', { name: /^Tabel$/ })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expect(page.locator(mod.tableSelector).first()).toBeVisible({ timeout: 30000 })
      })

      test(`${mod.name}: beralih ke Kartu menyembunyikan tabel dan menampilkan kartu`, async ({
        superAdminPage: page,
      }) => {
        await page.setViewportSize(DESKTOP)
        await seedAndOpen(page, mod)

        const toggle = await pilihModeKartu(page)
        await expect(page.locator(mod.tableSelector).first()).toBeHidden()
        await expect(page.locator(mod.cardsSelector).first()).toBeVisible()
      })

      test(`${mod.name}: preferensi mode persist di localStorage antar reload`, async ({
        superAdminPage: page,
      }) => {
        await page.setViewportSize(DESKTOP)
        await seedAndOpen(page, mod)

        await pilihModeKartu(page)
        const stored = await page.evaluate(
          (key) => window.localStorage.getItem(key),
          mod.storageKey,
        )
        expect(stored).toBe('card')

        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(page.locator('[aria-busy="true"]')).toBeHidden({ timeout: 20000 })

        const toggle = getToggle(page)
        await expect(toggle.getByRole('button', { name: /^Kartu$/ })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expect(page.locator(mod.tableSelector).first()).toBeHidden()
        await expect(page.locator(mod.cardsSelector).first()).toBeVisible()
      })

      test(`${mod.name}: mode Kartu menjadi representasi list di mobile (375px)`, async ({
        superAdminPage: page,
      }) => {
        await page.setViewportSize(MOBILE)
        await seedAndOpen(page, mod)

        await expect(page.locator(mod.cardsSelector).first()).toBeVisible({ timeout: 30000 })
        await expect(getToggle(page)).toBeVisible()
      })
    })
  }

  test('Toggle memiliki aria-pressed eksklusif (hanya satu opsi aktif)', async ({
    superAdminPage: page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await seedAndOpen(page, MODULES[0])

    const toggle = getToggle(page)
    await toggle.getByRole('button', { name: /^Kartu$/ }).click()
    await expect(toggle.getByRole('button', { name: /^Kartu$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(toggle.getByRole('button', { name: /^Tabel$/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await toggle.getByRole('button', { name: /^Tabel$/ }).click()
    await expect(toggle.getByRole('button', { name: /^Tabel$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(toggle.getByRole('button', { name: /^Kartu$/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
