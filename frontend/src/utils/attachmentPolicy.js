export const ALLOWED_ATTACHMENT_MIME_TYPES = Object.freeze([
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
])

export const ALLOWED_ATTACHMENT_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
])

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

export function validateAttachmentFile(file) {
  if (!file) {
    return 'Lampiran tidak boleh kosong.'
  }

  const fileName = (file.name || '').toLowerCase()
  const hasValidExt = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => fileName.endsWith(ext))
  const hasValidMime = ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)

  if (!hasValidMime && !hasValidExt) {
    return 'Lampiran harus berupa gambar (PNG, JPG, GIF, WEBP) atau dokumen (PDF, Word, Excel, PowerPoint).'
  }

  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_ATTACHMENT_BYTES) {
    return 'Ukuran lampiran maksimal 5 MiB.'
  }

  return null
}
