/**
 * Page Object Model for the Ticket List page.
 *
 * Encapsulates all locators and interactions for the /tickets view,
 * keeping test files focused on intent rather than selector details.
 */
export class TicketListPage {
  constructor(page) {
    this.page = page

    // Navigation
    this.ticketNav = page.getByRole('link', { name: /tiket|ticket/i }).first()

    // Page elements
    this.ticketItems = page.locator('.tck-list-item')
    this.createTicketBtn = page.getByRole('button', { name: /buat tiket|request ticket/i }).first()

    // Search
    this.searchInput = page.getByPlaceholder(/cari ticket/i)

    // Tabs
    this.tabInbox = page.getByRole('button', { name: /inbox/i })
    this.tabUnclaimed = page.getByRole('button', { name: /belum diambil/i })
    this.tabAssigned = page.getByRole('button', { name: /ditangani saya/i })
    this.tabResolved = page.getByRole('button', { name: /selesai/i })

    // Status filter
    this.statusFilter = page.locator('select').filter({ hasText: /status/i })

    // Create modal
    this.modalTitleInput = page.getByPlaceholder(/laptop tidak dapat/i)
    this.modalDescInput = page.getByPlaceholder(/jelaskan kendala/i)
    this.modalSubmitBtn = page.locator('form button[type="submit"]').last()

    // Detail modal
    this.statusBtn = page.getByRole('button', { name: 'Ubah status tiket', exact: true })
    this.undoBtn = page.getByRole('button', { name: /urungkan/i })
    this.commentInput = page.getByPlaceholder(/ketik komentar/i)

    // CASP rating
    this.caspStars = page.locator('[data-testid="casp-star"]')
    this.caspSubmit = page.getByRole('button', { name: /kirim penilaian/i })
  }

  // ── Navigation ──

  async goto() {
    await this.page.goto('/tickets', { waitUntil: 'domcontentloaded' })
    await expect(this.page.getByTestId('page-ready')).toBeVisible()
  }

  // ── List interactions ──

  async waitForList() {
    await expect(this.ticketItems.first()).toBeVisible({ timeout: 10000 })
  }

  async getTicketCount() {
    return this.ticketItems.count()
  }

  async clickFirstTicket() {
    await this.ticketItems.first().click()
  }

  async searchFor(term) {
    await this.searchInput.fill(term)
    await this.searchInput.press('Enter')
  }

  async clearSearch() {
    await this.searchInput.fill('')
    await this.searchInput.press('Enter')
  }

  // ── Tab navigation ──

  async switchTab(tab) {
    const tabMap = {
      inbox: this.tabInbox,
      unclaimed: this.tabUnclaimed,
      assigned: this.tabAssigned,
      resolved: this.tabResolved,
    }
    const target = tabMap[tab]
    if (target && await target.isVisible()) {
      await target.click()
      // Wait for tab content to load
      await expect(this.page.getByTestId('page-ready')).toBeVisible()
    }
  }

  // ── Create ticket ──

  async openCreateModal() {
    await this.createTicketBtn.click()
    await expect(this.modalTitleInput).toBeVisible({ timeout: 5000 })
  }

  async fillTicketForm({ title, description }) {
    await this.modalTitleInput.fill(title)
    if (description && await this.modalDescInput.isVisible()) {
      await this.modalDescInput.fill(description)
    }
  }

  async submitTicket() {
    await this.modalSubmitBtn.click()
  }

  async createTicket({ title, description }) {
    await this.openCreateModal()
    await this.fillTicketForm({ title, description })
    await this.submitTicket()
  }

  // ── Status changes ──

  async changeStatus(newStatus) {
    if (await this.statusBtn.isVisible({ timeout: 5000 })) {
      await this.statusBtn.click()
      const option = this.page.getByRole('option', { name: new RegExp(newStatus, 'i') })
      if (await option.isVisible()) {
        await option.click()
      }
    }
  }

  async undoStatusChange() {
    if (await this.undoBtn.isVisible({ timeout: 3000 })) {
      await this.undoBtn.click()
    }
  }

  // ── Comments ──

  async addComment(text) {
    if (await this.commentInput.isVisible()) {
      await this.commentInput.fill(text)
      await this.commentInput.press('Enter')
    }
  }
}

// Import expect for internal assertions
import { expect } from '@playwright/test'
