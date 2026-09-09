import { assertNoActiveMarkup } from './requestValidation.js'

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const MAX_COMMENT_LENGTH = 4000
const MAX_COMMENT_ATTACHMENT_LENGTH = 7_000_000
const COMMENT_BODY_FIELDS = new Set(['pesan', 'attachment', 'attachment_name'])
const ATTACHMENT_DATA_URL_PATTERN = /^data:([a-z0-9-]+\/[a-z0-9-+.]+);base64,([a-z0-9+/]+={0,2})$/i
const MAX_RASTER_ATTACHMENT_BYTES = 5 * 1024 * 1024
const MAX_TICKET_TITLE_LENGTH = 255
const MAX_TICKET_DESCRIPTION_LENGTH = 20_000
const MAX_TICKET_ATTACHMENT_LENGTH = 7_000_000
const TICKET_CREATE_FIELDS = new Set(['judul', 'deskripsi', 'kategori', 'prioritas', 'queue_id', 'attachment', 'attachments', 'pelapor_user_id'])
const TICKET_UPDATE_FIELDS = new Set([
  'judul',
  'deskripsi',
  'kategori',
  'prioritas',
  'status_tiket',
  'queue_id',
  'attachment',
  'attachments',
])
const TICKET_CATEGORIES = new Set(['Request', 'Support', 'Incident', 'QNA', 'request', 'support', 'incident', 'qna'])
const TICKET_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Critical'])
const TICKET_STATUSES = new Set([
  'Open',
  'In Progress',
  'Pending',
  'Resolved',
  'Closed',
  'Cancelled',
])
const TICKET_LIST_QUERY_FIELDS = new Set([
  'search',
  'status',
  'prioritas',
  'queue_id',
  'tab',
  'page',
  'limit',
  'sort',
])
const TICKET_LIST_TABS = new Set([
  '',
  'all',
  'open',
  'pending',
  'closed',
  'resolved',
  'assigned',
  'mine',
  'reported',
  'created',
  'unassigned',
])
const MAX_TICKET_SEARCH_LENGTH = 150
const DEFAULT_TICKET_PAGE_SIZE = 50
const MAX_TICKET_PAGE_SIZE = 100

function parsePositiveId(value, message = 'ID tiket tidak valid.') {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) throw createHttpError(400, message)
  return id
}

function parsePositiveQueryInteger(value, fallback, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === '') return fallback
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw createHttpError(400, `${label} tidak valid.`)
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw createHttpError(400, `${label} tidak valid.`)
  }
  return parsed
}

function validateTicketListQuery(query) {
  const unknownField = Object.keys(query).find((field) => !TICKET_LIST_QUERY_FIELDS.has(field))
  if (unknownField) {
    throw createHttpError(400, `Parameter daftar tiket tidak diizinkan: ${unknownField}.`)
  }

  const normalizeOptionalText = (value, label) => {
    if (value === undefined || value === '') return ''
    if (typeof value !== 'string') throw createHttpError(400, `${label} tidak valid.`)
    return value.trim()
  }

  const search = normalizeOptionalText(query.search, 'Pencarian tiket')
  if (search.length > MAX_TICKET_SEARCH_LENGTH) {
    throw createHttpError(400, `Pencarian tiket maksimal ${MAX_TICKET_SEARCH_LENGTH} karakter.`)
  }

  const status = normalizeOptionalText(query.status, 'Status tiket')
  if (status && !TICKET_STATUSES.has(status)) {
    throw createHttpError(400, 'Status tiket tidak valid.')
  }

  // Validasi ENUM prioritas tiket
  const prioritas = normalizeOptionalText(query.prioritas, 'Prioritas tiket');
  if (prioritas && !TICKET_PRIORITIES.has(prioritas)) {
    throw createHttpError(400, `Prioritas tidak valid. Harus salah satu dari: ${[...TICKET_PRIORITIES].join(', ')}`);
  }

  const tab = normalizeOptionalText(query.tab, 'Tab tiket').toLowerCase()
  if (!TICKET_LIST_TABS.has(tab)) throw createHttpError(400, 'Tab tiket tidak valid.')

  const sortRaw = normalizeOptionalText(query.sort, 'Urutan tiket').toLowerCase()
  const sort = sortRaw === '' ? 'terbaru' : sortRaw
  if (sort !== 'terbaru' && sort !== 'terlama') {
    throw createHttpError(400, 'Urutan tiket harus terbaru atau terlama.')
  }

  return {
    search,
    status,
    prioritas,
    tab,
    sort,
    queueId:
      query.queue_id === undefined || query.queue_id === ''
        ? null
        : parsePositiveId(query.queue_id, 'Queue ID tidak valid.'),
    page: parsePositiveQueryInteger(query.page, 1, 'Halaman tiket'),
    limit: parsePositiveQueryInteger(
      query.limit,
      DEFAULT_TICKET_PAGE_SIZE,
      'Batas tiket',
      MAX_TICKET_PAGE_SIZE,
    ),
  }
}

function assertPlainObject(body, message) {
  if (
    body == null ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    (Object.getPrototypeOf(body) !== Object.prototype && Object.getPrototypeOf(body) !== null)
  ) {
    throw createHttpError(400, message)
  }
}

function hasRasterMagicBytes(mimeSubtype, bytes) {
  if (mimeSubtype === 'png') {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    )
  }
  if (mimeSubtype === 'jpeg' || mimeSubtype === 'jpg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mimeSubtype === 'gif') {
    if (bytes.length < 6) return false
    const signature = bytes.subarray(0, 6).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }
  return (
    mimeSubtype === 'webp' &&
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  )
}

function normalizeFileAttachment(attachment, label, maxLength) {
  if (attachment !== null && attachment !== undefined && typeof attachment !== 'string') {
    throw createHttpError(400, `Attachment ${label} tidak valid.`)
  }
  if (typeof attachment === 'string' && attachment.length > maxLength) {
    throw createHttpError(413, `Attachment ${label} terlalu besar.`)
  }

  const normalized = typeof attachment === 'string' && attachment.trim() ? attachment.trim() : null
  if (!normalized) return null

  const match = ATTACHMENT_DATA_URL_PATTERN.exec(normalized)
  if (!match || match[2].length % 4 !== 0) {
    throw createHttpError(400, `Attachment ${label} tidak valid.`)
  }

  const mimeType = match[1].toLowerCase()
  const encoded = match[2]
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length > MAX_RASTER_ATTACHMENT_BYTES) {
    throw createHttpError(413, `Attachment ${label} terlalu besar.`)
  }

  if (mimeType.startsWith('image/')) {
    const mimeSubtype = mimeType.replace('image/', '')
    if (bytes.toString('base64') !== encoded || !hasRasterMagicBytes(mimeSubtype, bytes)) {
      throw createHttpError(400, `Attachment ${label} tidak cocok dengan format gambar.`)
    }
  }

  return normalized
}

// Accepts either a single attachment (legacy `attachment` field) or an array of
// attachments (`attachments` field). Each item may be a plain data-URL string
// (legacy) or an object `{ name, data }`. Returns a deduplicated, normalized
// array of `{ name, data }`.
function normalizeTicketAttachments(value) {
  if (value === undefined || value === null) return []

  const list = Array.isArray(value) ? value : [value]
  const normalized = []
  for (const item of list) {
    let name = null
    let data = item

    if (item && typeof item === 'object' && !Array.isArray(item)) {
      name = item.name ?? null
      data = item.data ?? item.attachment ?? null
    }

    const normalizedData = normalizeFileAttachment(data, 'tiket', MAX_TICKET_ATTACHMENT_LENGTH)
    if (!normalizedData) continue

    const normalizedName = normalizeAttachmentName(name)
    normalized.push({ name: normalizedName, data: normalizedData })
  }
  return normalized
}

// Sanitize the original file name for storage: strip path separators and
// control characters, cap length, and fall back to a stable default.
function normalizeAttachmentName(name) {
  if (typeof name !== 'string') return null
  const cleaned = name
    .replace(/[\\/]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
  if (!cleaned) return null
  return cleaned.slice(0, 255)
}

function withoutInlineAttachment(record) {
  if (!record || typeof record !== 'object') return record

  const {
    attachment,
    deleted_at: _deletedAt,
    deleted_by_user_id: _deletedByUserId,
    deletion_reason: _deletionReason,
    ...safeRecord
  } = record
  return {
    ...safeRecord,
    has_attachment:
      safeRecord.has_attachment === true ||
      (typeof attachment === 'string' && attachment.trim().length > 0),
  }
}

function validateTicketCreateBody(body) {
  assertPlainObject(body, 'Payload pembuatan tiket tidak valid.')

  const unknownField = Object.keys(body).find((field) => !TICKET_CREATE_FIELDS.has(field))
  if (unknownField) {
    throw createHttpError(400, `Field pembuatan tiket tidak diizinkan: ${unknownField}.`)
  }

  if (typeof body.judul !== 'string' || !body.judul.trim()) {
    throw createHttpError(400, 'Judul tiket wajib diisi.')
  }
  const judul = body.judul.trim()
  if (judul.length > MAX_TICKET_TITLE_LENGTH) {
    throw createHttpError(400, `Judul tiket maksimal ${MAX_TICKET_TITLE_LENGTH} karakter.`)
  }

  if (body.deskripsi !== undefined && typeof body.deskripsi !== 'string') {
    throw createHttpError(400, 'Deskripsi tiket harus berupa teks.')
  }
  const deskripsi = typeof body.deskripsi === 'string' ? body.deskripsi.trim() : ''
  if (deskripsi.length > MAX_TICKET_DESCRIPTION_LENGTH) {
    throw createHttpError(
      400,
      `Deskripsi tiket maksimal ${MAX_TICKET_DESCRIPTION_LENGTH} karakter.`,
    )
  }

  if (!Number.isSafeInteger(body.queue_id) || body.queue_id <= 0) {
    throw createHttpError(400, 'Unit tujuan tidak valid.')
  }
  if (
    body.prioritas !== undefined &&
    (typeof body.prioritas !== 'string' || !TICKET_PRIORITIES.has(body.prioritas))
  ) {
    throw createHttpError(400, 'Prioritas tiket tidak valid.')
  }

  let kategori = 'Support'
  if (body.kategori !== undefined && body.kategori !== null && body.kategori !== '') {
    if (typeof body.kategori !== 'string' || !TICKET_CATEGORIES.has(body.kategori)) {
      throw createHttpError(400, 'Kategori tiket tidak valid. Harus Request, Support, Incident, atau QNA.')
    }
    const lowerCat = body.kategori.trim().toLowerCase()
    if (lowerCat === 'request') kategori = 'Request'
    else if (lowerCat === 'support') kategori = 'Support'
    else if (lowerCat === 'incident') kategori = 'Incident'
    else if (lowerCat === 'qna') kategori = 'QNA'
    else kategori = body.kategori.trim()
  }

  return {
    judul,
    deskripsi,
    kategori,
    queue_id: body.queue_id,
    prioritas: body.prioritas ?? 'Medium',
    pelapor_user_id:
      body.pelapor_user_id === undefined || body.pelapor_user_id === null || body.pelapor_user_id === ''
        ? null
        : parsePositiveId(body.pelapor_user_id, 'Pelapor tidak valid.'),
    attachments: normalizeTicketAttachments(body.attachments ?? body.attachment),
  }
}

function validateTicketUpdateBody(body) {
  assertPlainObject(body, 'Payload pembaruan tiket tidak valid.')

  const fields = Object.keys(body)
  if (fields.length === 0) {
    throw createHttpError(400, 'Payload pembaruan tiket tidak boleh kosong.')
  }
  const unknownField = fields.find((field) => !TICKET_UPDATE_FIELDS.has(field))
  if (unknownField) {
    throw createHttpError(400, `Field pembaruan tiket tidak diizinkan: ${unknownField}.`)
  }

  const normalized = {}
  const hasField = (field) => Object.prototype.hasOwnProperty.call(body, field)

  if (hasField('judul')) {
    if (typeof body.judul !== 'string') {
      throw createHttpError(400, 'Judul tiket harus berupa teks.')
    }
    normalized.judul = body.judul.trim()
    if (!normalized.judul) throw createHttpError(400, 'Judul tiket wajib diisi.')
    if (normalized.judul.length > MAX_TICKET_TITLE_LENGTH) {
      throw createHttpError(400, `Judul tiket maksimal ${MAX_TICKET_TITLE_LENGTH} karakter.`)
    }
  }

  if (hasField('deskripsi')) {
    if (typeof body.deskripsi !== 'string') {
      throw createHttpError(400, 'Deskripsi tiket harus berupa teks.')
    }
    normalized.deskripsi = body.deskripsi.trim()
    if (normalized.deskripsi.length > MAX_TICKET_DESCRIPTION_LENGTH) {
      throw createHttpError(
        400,
        `Deskripsi tiket maksimal ${MAX_TICKET_DESCRIPTION_LENGTH} karakter.`,
      )
    }
  }

  if (hasField('kategori')) {
    if (typeof body.kategori !== 'string' || !TICKET_CATEGORIES.has(body.kategori)) {
      throw createHttpError(400, 'Kategori tiket tidak valid. Harus Request, Support, Incident, atau QNA.')
    }
    const lowerCat = body.kategori.trim().toLowerCase()
    if (lowerCat === 'request') normalized.kategori = 'Request'
    else if (lowerCat === 'support') normalized.kategori = 'Support'
    else if (lowerCat === 'incident') normalized.kategori = 'Incident'
    else if (lowerCat === 'qna') normalized.kategori = 'QNA'
    else normalized.kategori = body.kategori.trim()
  }

  if (hasField('prioritas')) {
    if (typeof body.prioritas !== 'string' || !TICKET_PRIORITIES.has(body.prioritas)) {
      throw createHttpError(400, 'Prioritas tiket tidak valid.')
    }
    normalized.prioritas = body.prioritas
  }

  if (hasField('status_tiket')) {
    if (typeof body.status_tiket !== 'string' || !TICKET_STATUSES.has(body.status_tiket)) {
      throw createHttpError(400, 'Status tiket tidak valid.')
    }
    normalized.status_tiket = body.status_tiket
  }

  if (hasField('queue_id')) {
    if (
      typeof body.queue_id !== 'number' ||
      !Number.isSafeInteger(body.queue_id) ||
      body.queue_id <= 0
    ) {
      throw createHttpError(400, 'Unit tujuan tidak valid.')
    }
    normalized.queue_id = body.queue_id
  }

  if (hasField('attachment')) {
    normalized.attachments = normalizeTicketAttachments(body.attachment)
  }
  if (hasField('attachments')) {
    normalized.attachments = normalizeTicketAttachments(body.attachments)
  }

  return normalized
}


export { createHttpError, parsePositiveId, assertPlainObject, normalizeFileAttachment, normalizeAttachmentName, withoutInlineAttachment, validateTicketListQuery, validateTicketCreateBody, validateTicketUpdateBody, MAX_COMMENT_LENGTH, MAX_COMMENT_ATTACHMENT_LENGTH, COMMENT_BODY_FIELDS }
