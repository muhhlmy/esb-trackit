import { expect, test } from '../../fixtures/auth.fixture.js'
import { randomUUID } from 'node:crypto'

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3000'

test.describe('Ticket CASP Rating Flow', () => {
  test('CASP-01: Reporter can rate resolved ticket with 1-5 stars @smoke', async ({
    userPage,
    adminPage,
  }) => {
    const title = 'E2E CASP ' + randomUUID()
    const created = await userPage.request.post(API_BASE_URL + '/api/tickets', {
      data: { judul: title, deskripsi: 'Test rating flow', queue_id: 1, prioritas: 'Medium' },
    })
    expect(created.ok()).toBeTruthy()
    const ticket = await created.json()
    const claimed = await adminPage.request.post(API_BASE_URL + '/api/tickets/' + ticket.id + '/claim')
    expect(claimed.ok()).toBeTruthy()
    const resolved = await adminPage.request.put(API_BASE_URL + '/api/tickets/' + ticket.id, {
      data: { status_tiket: 'Resolved' },
    })
    expect(resolved.ok()).toBeTruthy()

    await userPage.goto('/tickets', { waitUntil: 'domcontentloaded' })
    // Judul dapat muncul di dua tempat (heading list + heading detail): pilih yang pertama
    await userPage.getByText(title, { exact: true }).first().click()
    await userPage.getByRole('button', { name: 'Bintang 4: Puas', exact: true }).click()
    await userPage.getByRole('button', { name: 'Kirim Penilaian', exact: true }).click()
    await expect(userPage.getByText('4 / 5', { exact: true })).toBeVisible()
    const rating = await userPage.request.get(API_BASE_URL + '/api/tickets/' + ticket.id + '/casp')
    expect((await rating.json()).rating.value).toBe(4)
  })

  test('CASP-02: CASP form not shown for unassigned tickets', async ({ userPage }) => {
    const title = 'E2E Unassigned CASP ' + randomUUID()
    const created = await userPage.request.post(API_BASE_URL + '/api/tickets', {
      data: { judul: title, queue_id: 1, prioritas: 'Medium' },
    })
    expect(created.ok()).toBeTruthy()
    await userPage.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Judul tiket tampil di beberapa tempat (sel tabel + kartu + detail modal
    // sibling render). Klik representasi pertama via role-aware locator.
    await userPage.getByRole('table').getByText(title, { exact: true }).click()
    await expect(userPage.getByRole('button', { name: /^Bintang/ })).toHaveCount(0)
  })
})
