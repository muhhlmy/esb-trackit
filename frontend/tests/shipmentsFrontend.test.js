import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const routerFileUrl = new URL('../src/router/index.js', import.meta.url)
const navConfigUrl = new URL('../src/config/navigationConfig.js', import.meta.url)
const usersViewFileUrl = new URL('../src/views/UsersView.vue', import.meta.url)
const shipmentsViewFileUrl = new URL('../src/views/ShipmentsView.vue', import.meta.url)
const apiServiceFileUrl = new URL('../src/services/api.js', import.meta.url)

test('Modul Tracker Pengiriman — Frontend Architecture & UI Test Suite', async (t) => {
  const routerSrc = await readFile(routerFileUrl, 'utf8')
  const navConfigSrc = await readFile(navConfigUrl, 'utf8')
  const usersViewSrc = await readFile(usersViewFileUrl, 'utf8')
  const shipmentsViewSrc = await readFile(shipmentsViewFileUrl, 'utf8')
  const apiSrc = await readFile(apiServiceFileUrl, 'utf8')

  await t.test(
    '1. Router configuration includes /shipments, alias /pengiriman, and allowedRouteMap',
    () => {
      assert.ok(routerSrc.includes("'/shipments'"), "Route '/shipments' harus terdaftar di router")
      assert.ok(
        routerSrc.includes("alias: '/pengiriman'"),
        "Alias '/pengiriman' harus terdaftar di router",
      )
      assert.ok(routerSrc.includes("name: 'shipments'"), "Route name 'shipments' harus terdaftar")
      assert.ok(
        routerSrc.includes("title: 'Pengiriman'"),
        "meta.title 'Pengiriman' harus terdaftar",
      )
      assert.ok(
        routerSrc.includes("permission: 'shipments'"),
        "meta.permission 'shipments' harus terdaftar",
      )
      assert.ok(
        routerSrc.includes("{ key: 'shipments', name: 'shipments' }"),
        "allowedRouteMap harus menyertakan { key: 'shipments', name: 'shipments' }",
      )
    },
  )

  await t.test(
    '2. Navigation source of truth includes Pengiriman submenu under TRANSAKSI and BottomNav',
    async () => {
      // navigationConfig.js (source of truth for sidebar + bottom nav)
      assert.ok(
        navConfigSrc.includes("to: '/shipments'"),
        'navigationConfig harus memiliki link ke /shipments',
      )
      assert.ok(
        navConfigSrc.includes("label: 'Pengiriman'"),
        'navigationConfig harus memiliki label Pengiriman',
      )
      assert.ok(
        navConfigSrc.includes("permission: 'shipments'"),
        'navigationConfig harus membatasi item Pengiriman dengan permission shipments',
      )
      assert.ok(
        navConfigSrc.includes("lucide: 'Truck'"),
        'navigationConfig harus menyertakan ikon lucide untuk bottom nav',
      )

      // AppSidebar autoExpand still maps the shipments route
      const sidebarSrc = await readFile(
        new URL('../src/components/layout/AppSidebar.vue', import.meta.url),
        'utf8',
      )
      assert.ok(
        sidebarSrc.includes("'/shipments'"),
        'AppSidebar autoExpandActiveParent harus menyertakan /shipments',
      )
    },
  )

  await t.test(
    '3. UsersView includes shipments in OPERATIONAL_FEATURES and permissions config',
    () => {
      assert.ok(
        usersViewSrc.includes("key: 'shipments'"),
        "UsersView harus menyertakan feature 'shipments'",
      )
      assert.ok(
        usersViewSrc.includes("label: 'Pengiriman'"),
        "UsersView harus menyertakan label 'Pengiriman'",
      )
      assert.ok(
        usersViewSrc.includes("shipments: 'none'"),
        "defaultPermissions di UsersView harus menyertakan shipments: 'none'",
      )
      assert.ok(
        usersViewSrc.includes("shipments: 'full'"),
        "superadminPermissions di UsersView harus menyertakan shipments: 'full'",
      )
    },
  )

  await t.test('4. Frontend API layer exposes canonical shipment operations', () => {
    assert.ok(apiSrc.includes('async getShipments('), 'api.js harus memiliki getShipments')
    assert.ok(apiSrc.includes('async getShipmentById('), 'api.js harus memiliki getShipmentById')
    assert.ok(apiSrc.includes('async createShipment('), 'api.js harus memiliki createShipment')
    assert.ok(apiSrc.includes('async updateShipment('), 'api.js harus memiliki updateShipment')
    assert.ok(apiSrc.includes('async deleteShipment('), 'api.js harus memiliki deleteShipment')
  })

  await t.test(
    '5. ShipmentsView implements required states, cards, and security attributes',
    () => {
      // Page readiness
      assert.ok(
        shipmentsViewSrc.includes(`:data-testid="!isLoading ? 'page-ready' : undefined"`),
        'ShipmentsView harus menandai page-ready hanya setelah loading selesai',
      )
      assert.ok(
        !shipmentsViewSrc.includes('<div data-testid="page-ready"'),
        'ShipmentsView tidak boleh memberi readiness signal statis saat masih loading',
      )

      // Summary cards
      assert.ok(
        shipmentsViewSrc.includes('Total Pengiriman'),
        'Harus menampilkan card Total Pengiriman',
      )
      assert.ok(shipmentsViewSrc.includes('Belum Dikirim'), 'Harus menampilkan card Belum Dikirim')
      assert.ok(
        shipmentsViewSrc.includes('Sedang Dikirim'),
        'Harus menampilkan card Sedang Dikirim',
      )
      assert.ok(shipmentsViewSrc.includes('Diterima'), 'Harus menampilkan card Diterima')

      // Table columns
      assert.ok(
        shipmentsViewSrc.includes('Tanggal Request'),
        'Tabel harus memiliki kolom Tanggal Request',
      )
      assert.ok(
        shipmentsViewSrc.includes('Nama Penerima'),
        'Tabel harus memiliki kolom Nama Penerima',
      )
      assert.ok(
        shipmentsViewSrc.includes('Deskripsi Barang'),
        'Tabel harus memiliki kolom Deskripsi Barang',
      )
      assert.ok(
        shipmentsViewSrc.includes('Tujuan Pengiriman'),
        'Tabel harus memiliki kolom Tujuan Pengiriman',
      )
      assert.ok(shipmentsViewSrc.includes('No Resi'), 'Tabel harus memiliki kolom No Resi')

      // Delivery proof security
      assert.ok(
        shipmentsViewSrc.includes('target="_blank"'),
        'Link bukti pengiriman harus menggunakan target="_blank"',
      )
      assert.ok(
        shipmentsViewSrc.includes('rel="noopener noreferrer"'),
        'Link bukti pengiriman harus menggunakan rel="noopener noreferrer"',
      )

      // Permission-gated actions
      assert.ok(
        shipmentsViewSrc.includes('canWriteShipments'),
        'Tombol create/edit/delete harus terproteksi canWriteShipments',
      )
    },
  )
})
