// helpers/monitor.js — console & network monitoring untuk Phase 5
// Membedakan application error vs noise third-party/browser.

const IGNORE_NOISE = [
  // Browser-level, bukan error app
  'Cross-Origin-Opener-Policy header has been ignored',
  'Download the React DevTools',
  'third-party cookie will be blocked',
  'A third-party cookie',
  'Failed to load resource: net::ERR_CLEARTEXT_NOT_PERMITTED',
  'favicon',
]

export function attachPageMonitor(page, { onHttp500, onUncaught } = {}) {
  const consoleErrors = []
  const uncaughtErrors = []
  const failedRequests = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORE_NOISE.some((n) => text.includes(n))) return
    if (text.includes('Failed to load resource')) return // difilter via request handler
    consoleErrors.push(text)
  })

  page.on('pageerror', (err) => {
    const text = err.message || String(err)
    if (IGNORE_NOISE.some((n) => text.includes(n))) return
    uncaughtErrors.push(text)
    onUncaught?.(text)
  })

  page.on('requestfailed', (req) => {
    const url = req.url()
    if (url.includes('favicon')) return
    // NS_BINDING_ABORTED = koneksi dibatalkan browser saat navigasi/reload
    // (mis. koneksi SSE /api/tickets/events ditutup ketika pindah halaman).
    // Artefak siklus hidup halaman, bukan error aplikasi.
    if (req.failure()?.errorText === 'NS_BINDING_ABORTED') return
    failedRequests.push({ url, failure: req.failure()?.errorText })
  })

  page.on('response', (res) => {
    const status = res.status()
    if (status >= 500) {
      onHttp500?.({ url: res.url(), status })
    }
    if (status === 401 || status === 403) {
      // Aman dicatat: banyak guard app memang sengaja 401/403
      failedRequests.push({ url: res.url(), status })
    }
  })

  return {
    consoleErrors,
    uncaughtErrors,
    failedRequests,
    /** Assertion helper: 0 uncaught + 0 console error app */
    assertClean(expect, label = 'page') {
      expect(uncaughtErrors, `[${label}] uncaught exceptions: ${uncaughtErrors.join(' | ')}`).toHaveLength(0)
      expect(consoleErrors, `[${label}] console.error: ${consoleErrors.join(' | ')}`).toHaveLength(0)
    },
    /** Hanya 5xx yang gagal (401/403 saat guard memang expected tidak dihitung) */
    expectNoServerErrors(expect, label = 'page') {
      const serverErrors = failedRequests.filter((r) => r.status >= 500 || !r.status)
      expect(serverErrors, `[${label}] failed requests: ${JSON.stringify(serverErrors)}`).toHaveLength(0)
    },
  }
}
