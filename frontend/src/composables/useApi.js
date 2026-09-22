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

function jsonRequest(method) {
  return (endpoint, data, options = {}) =>
    request(endpoint, {
      ...options,
      method,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(data),
    })
}

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

export function useApi() {
  const get = (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' })
  const post = jsonRequest('POST')
  const put = jsonRequest('PUT')

  async function getAllPages(endpoint, options = {}) {
    const { limit = 500, maxPages = 1000, signal } = options
    const rows = []
    let page = 1
    let totalPages

    do {
      // Relative path amankan dari search di base dummy; dipakai murni untuk parsing query.
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
      const { data, response } = await get(`${endpoint}?${qs}`, {
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

  async function del(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'DELETE',
    })
  }

  async function upload(endpoint, formData, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    })
  }

  return { get, getAllPages, post, put, del, upload }
}
