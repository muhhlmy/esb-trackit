// ============================================================
// services/api.js - Lapisan API terpadu (satu-satunya jalur HTTP)
// ============================================================
// Gabungan dari pola lama (services/api.js manual-fetch) dan pola modern
// (useApi composable). SELURUH komunikasi HTTP frontend sekarang memakai
// implementasi `useApi`:
//   - cookie sesi HttpOnly dikirim otomatis (credentials: same-origin)
//   - penanganan 401 global (auto-logout + redirect /login)
//   - pesan error terstruktur dari backend
//
// Konsumen lama (useCases, useKbCategories, useBookmarks, AnalyticsView,
// TemplatesView, HomeView) tetap memakai API permukaan yang sama
// (api.getCases, api.createCase, ...), sehingga tidak ada perubahan
// perilaku.
// ============================================================

import { useApi } from '../composables/useApi.js'

const { get, post, put, del } = useApi()

export const api = {
  // Cases — public Help Center (published only)
  async getPublicCases() {
    return get('/api/cases/public')
  },

  // Cases — admin CMS (all)
  async getCases(params = {}) {
    const query = new URLSearchParams()
    if (params.search) query.append('search', params.search)
    if (params.category && params.category !== 'all') query.append('category', params.category)
    if (params.severity && params.severity !== 'all') query.append('severity', params.severity)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return get(`/api/cases${queryString}`)
  },

  async getCaseById(id) {
    return get(`/api/cases/${id}`)
  },

  async createCase(caseData) {
    return post('/api/cases', caseData)
  },

  async updateCase(id, caseData) {
    return put(`/api/cases/${id}`, caseData)
  },

  async deleteCase(id) {
    return del(`/api/cases/${id}`)
  },

  // KB Categories — public Help Center (published only)
  async getPublicKbCategories() {
    return get('/api/kb-categories/public')
  },

  // KB Categories — admin CMS (all)
  async getKbCategories() {
    return get('/api/kb-categories')
  },

  async createKbCategory(data) {
    return post('/api/kb-categories', data)
  },

  async updateKbCategory(id, data) {
    return put(`/api/kb-categories/${id}`, data)
  },

  async deleteKbCategory(id) {
    return del(`/api/kb-categories/${id}`)
  },

  // FAQs — public Help Center (published only)
  async getPublicFaqs() {
    return get('/api/faqs/public')
  },

  // KB Search logs
  async logKbSearch(query, resultsCount = 0) {
    return post('/api/kb-search-logs', { query, results_count: resultsCount })
  },

  async getPopularKbSearches() {
    return get('/api/kb-search-logs/popular')
  },

  async getKbSearchStats() {
    return get('/api/kb-search-logs/stats')
  },

  // Case bookmarks (konteks user login)
  async getCaseBookmarks() {
    return get('/api/case-bookmarks')
  },

  async addCaseBookmark(caseId) {
    return post(`/api/case-bookmarks/${caseId}`)
  },

  async removeCaseBookmark(caseId) {
    return del(`/api/case-bookmarks/${caseId}`)
  },

  // Shipments — Tracker Pengiriman
  async getShipments(params = {}) {
    const query = new URLSearchParams()
    if (params.page) query.append('page', params.page)
    if (params.pageSize || params.limit) query.append('pageSize', params.pageSize || params.limit)
    if (params.search) query.append('search', params.search)
    if (params.status && params.status !== 'all' && params.status !== 'semua') {
      query.append('status', params.status)
    }
    if (params.dateFrom) query.append('dateFrom', params.dateFrom)
    if (params.dateTo) query.append('dateTo', params.dateTo)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return get(`/api/shipments${queryString}`)
  },

  async getShipmentById(id) {
    return get(`/api/shipments/${id}`)
  },

  async createShipment(data) {
    return post('/api/shipments', data)
  },

  async updateShipment(id, data) {
    return put(`/api/shipments/${id}`, data)
  },

  async deleteShipment(id) {
    return del(`/api/shipments/${id}`)
  },
}
