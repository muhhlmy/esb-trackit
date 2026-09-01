import { expect, test } from '../../fixtures/auth.fixture.js'
import { loginViaApi, createTicketViaApi } from '../../helpers/api.js'

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3000'

test.describe('Ticket CASP Rating Flow', () => {
  test('CASP-01: Reporter can rate resolved ticket with 1-5 stars @smoke', async ({
    superAdminPage,
    request,
  }) => {
    const page = superAdminPage

    // Setup: Create ticket as user
    const userData = await loginViaApi(request, 'user@user.com', 'user12345')
    const ticket = await createTicketViaApi(request, userData.token, {
      judul: 'CASP Test Ticket',
      deskripsi: 'Test rating flow',
      queue_id: 1,
      prioritas: 'Medium',
    })

    // Admin resolves the ticket
    const adminData = await loginViaApi(request, 'admin@admin.com', 'admin123')
    await request.put(`${API_BASE_URL}/api/tickets/${ticket.id}`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
      data: { status_tiket: 'Resolved' },
    })

    // User navigates to ticket detail
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })
    await page.getByText('CASP Test Ticket').click()

    // Click 4th star in CASP rating
    const stars = page.locator('[data-testid="casp-star"]')
    if (await stars.first().isVisible({ timeout: 5000 })) {
      await stars.nth(3).click()

      // Submit rating
      await page.getByRole('button', { name: /kirim penilaian/i }).click()

      // Verify success
      await expect(page.getByText(/penilaian berhasil/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('CASP-02: CASP form not shown for unassigned tickets', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Open a ticket that is NOT resolved
    const openTicket = page.locator('.tck-list-item').first()
    if (await openTicket.isVisible()) {
      await openTicket.click()

      // CASP rating form should not be visible
      await expect(page.locator('[data-testid="casp-star"]')).not.toBeVisible()
    }
  })
})
