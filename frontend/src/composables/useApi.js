// ============================================================
// useApi.js - Helper untuk Komunikasi ke Backend API
// ============================================================
// "Composable" di Vue adalah fungsi yang bisa digunakan
// kembali di banyak komponen. File ini menyediakan
// fungsi-fungsi untuk mengirim request ke backend kita.
//
// Cara pakai di komponen Vue:
//   import { useApi } from '@/composables/useApi.js'
//   const { get, post, put, del } = useApi()
//
// Autentikasi: token JWT dibawa oleh cookie HttpOnly (diterbitkan
// backend). fetch dengan credentials:'same-origin' otomatis menyertakan
// cookie tersebut — header Authorization tidak diperlukan lagi.
// ============================================================

// Kosong secara default agar deployment dapat memakai origin yang sama.
// Pada development, request /api diteruskan oleh proxy Vite ke backend.
import { clearAuthSession } from '../utils/authStorage.js'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function createUrl(endpoint) {
  if (!endpoint.startsWith('/')) {
    throw new Error('Endpoint API harus diawali dengan karakter "/".')
  }

  return `${BASE_URL}${endpoint}`
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }

  const text = await response.text()
  return text || null
}

function handleSessionExpired() {
  clearAuthSession()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export function useApi() {
  async function request(endpoint, options = {}) {
    let response
    const { withResponse = false, ...fetchOptions } = options

    const customHeaders = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...fetchOptions.headers,
    }

    try {
      response = await fetch(createUrl(endpoint), {
        ...fetchOptions,
        // Cookie sesi HttpOnly dikirim otomatis untuk request same-origin
        // (dev: proxy Vite; produksi: satu origin di balik reverse proxy).
        credentials: 'same-origin',
        headers: customHeaders,
      })
    } catch (error) {
      if (error?.name === 'AbortError' || fetchOptions.signal?.aborted) {
        const abortErr = new Error('Permintaan dibatalkan.', { cause: error })
        abortErr.name = 'AbortError'
        throw abortErr
      }
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.', {
        cause: error,
      })
    }

    const payload = await parseResponse(response)

    if (response.status === 401) {
      if (endpoint !== '/api/auth/login') {
        handleSessionExpired()
      }

      const message =
        payload?.error?.message || payload?.message || 'Sesi telah berakhir, silakan login kembali.'
      throw new Error(message)
    }

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        (typeof payload?.error === 'string' ? payload.error : null) ||
        `Permintaan gagal (HTTP ${response.status})`
      throw new Error(message)
    }

    return withResponse ? { data: payload, response } : payload
  }

  // ----------------------------------------------------------
  // GET — Mengambil data dari API
  // Contoh: get('/api/assets') → mengambil semua aset
  // ----------------------------------------------------------
  async function get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' })
  }

  // Ambil seluruh halaman dari endpoint REST ber-header pagination. Helper ini
  // menjaga layar dengan filter lokal agar tidak hanya memproses halaman pertama.
  async function getAllPages(endpoint, options = {}) {
    const { limit = 500, maxPages = 1000, signal } = options
    const rows = []
    let page = 1
    let totalPages

    do {
      const url = new URL(endpoint, 'http://local.invalid')
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(limit))

      const { data, response } = await get(`${url.pathname}${url.search}`, {
        withResponse: true,
        signal,
      })
      const pageRows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      rows.push(...pageRows)

      const headerPages = Number(response.headers.get('x-total-pages'))
      const total = Number(response.headers.get('x-total-count') ?? data?.total)
      totalPages =
        Number.isSafeInteger(headerPages) && headerPages > 0
          ? headerPages
          : Number.isFinite(total)
            ? Math.max(1, Math.ceil(total / limit))
            : pageRows.length === limit
              ? page + 1
              : page
      page += 1
    } while (page <= totalPages && page <= maxPages)

    if (page <= totalPages) {
      throw new Error('Jumlah halaman data melebihi batas aman pengambilan.')
    }

    return rows
  }

  // ----------------------------------------------------------
  // POST — Mengirim data baru ke API
  // Contoh: post('/api/assets', { label_aset: 'ESB-LAP-001' })
  // ----------------------------------------------------------
  async function post(endpoint, data) {
    return request(endpoint, {
      method: 'POST',
      headers: {
        // Beritahu server bahwa kita mengirim data dalam format JSON
        'Content-Type': 'application/json',
      },
      // JSON.stringify() mengubah object JavaScript → string JSON
      body: JSON.stringify(data),
    })
  }

  // ----------------------------------------------------------
  // PUT — Mengupdate data yang sudah ada
  // Contoh: put('/api/assets/1', { label_aset: 'ESB-LAP-001' })
  // ----------------------------------------------------------
  async function put(endpoint, data) {
    return request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  // ----------------------------------------------------------
  // DEL — Menghapus data dari API
  // Fungsi ini dinamai "del" bukan "delete" karena
  // "delete" adalah kata kunci (reserved word) di JavaScript
  // Contoh: del('/api/assets/ASSET-001')
  // ----------------------------------------------------------
  async function del(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'DELETE',
    })
  }

  // ----------------------------------------------------------
  // UPLOAD — Mengirim data file / FormData (multipart/form-data)
  // Browser otomatis menyertakan multipart boundary tanpa header Content-Type manual
  // Contoh: upload('/api/admin/database/restore', formData)
  // ----------------------------------------------------------
  async function upload(endpoint, formData, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    })
  }

  // Kembalikan semua fungsi agar bisa digunakan di komponen
  return { get, getAllPages, post, put, del, upload }
}
