const HTML_ENTITIES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})

export function toDisplayText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value !== 'object') return String(value)

  try {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? String(value) : serialized
  } catch {
    return String(value)
  }
}

export function escapeHtml(value, fallback = '') {
  return toDisplayText(value, fallback).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character])
}

/**
 * Ubah nilai bebas menjadi token CSS aman (slug). Fallback `'default'`
 * dipakai bila input kosong/non-string — pemanggil wajib menyiapkan style
 * untuk class `.default` karena token ini tidak menggambarkan input asli.
 */
export function safeCssToken(value, safeFallback = 'default') {
  const token = toDisplayText(value)
    .trim()
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // safeFallback hanya untuk input kosong/non-string — class CSS bernama
  // .badge-<safeFallback> wajib ada di stylesheet cetak; ini bukan tebakan
  // nilai asli status, melainkan label netral untuk data tak terbaca.
  return token || safeFallback
}

export function printHtmlDocument(
  html,
  blockedMessage = 'Pop-up terblokir. Harap izinkan pop-up untuk mencetak dokumen.',
) {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return false

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    if (typeof alert === 'function') alert(blockedMessage)
    return false
  }

  const printAndClose = () => {
    if (typeof printWindow.print === 'function') printWindow.print()
  }

  if (typeof printWindow.addEventListener === 'function') {
    printWindow.addEventListener('load', printAndClose, { once: true })
    printWindow.addEventListener('afterprint', () => printWindow.close?.(), { once: true })
  } else {
    printWindow.onload = printAndClose
    printWindow.onafterprint = () => printWindow.close?.()
  }

  printWindow.document.write(String(html))
  printWindow.document.close()
  return true
}
