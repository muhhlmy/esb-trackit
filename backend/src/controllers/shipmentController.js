import { pool } from '../config/database.js'
import {
  assertAllowedFields,
  assertNoActiveMarkup,
  assertPlainObject,
  createHttpError,
  parsePaginationQuery,
  parsePositiveIntegerParam,
  parseSearchQuery,
  setPaginationHeaders,
} from '../security/requestValidation.js'

export const VALID_SHIPMENT_STATUSES = Object.freeze([
  'belum_dikirim',
  'pending',
  'sedang_dikirim',
  'diterima',
  'cancel',
])

const SHIPMENT_STATUS_SET = new Set(VALID_SHIPMENT_STATUSES)

const MAX_RECIPIENT_NAME_LENGTH = 150
const MAX_ITEM_DESCRIPTION_LENGTH = 5000
const MAX_DESTINATION_LENGTH = 255
const MAX_TRACKING_NUMBER_LENGTH = 100
const MAX_URL_LENGTH = 2048

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const SHIPMENT_CREATE_FIELDS = new Set([
  'request_date',
  'recipient_name',
  'item_description',
  'destination',
  'tracking_number',
  'status',
  'delivery_proof_url',
])

const SHIPMENT_UPDATE_FIELDS = new Set([
  'request_date',
  'recipient_name',
  'item_description',
  'destination',
  'tracking_number',
  'status',
  'delivery_proof_url',
])

function isValidCalendarDate(dateString) {
  if (typeof dateString !== 'string' || !DATE_PATTERN.test(dateString)) return false
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function normalizeRequestDate(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Tanggal request wajib diisi.')
    return undefined
  }
  if (typeof value !== 'string') {
    throw createHttpError(400, 'Format tanggal request tidak valid. Gunakan format YYYY-MM-DD.')
  }
  const trimmed = value.trim()
  if (!isValidCalendarDate(trimmed)) {
    throw createHttpError(400, 'Tanggal request harus berupa tanggal kalender yang valid (YYYY-MM-DD).')
  }
  return trimmed
}

function normalizeRecipientName(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Nama penerima wajib diisi.')
    return undefined
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Nama penerima wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) throw createHttpError(400, 'Nama penerima wajib diisi.')
  if (trimmed.length > MAX_RECIPIENT_NAME_LENGTH) {
    throw createHttpError(400, `Nama penerima maksimal ${MAX_RECIPIENT_NAME_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Nama penerima')
  return trimmed
}

function normalizeItemDescription(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Deskripsi barang wajib diisi.')
    return undefined
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Deskripsi barang wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) throw createHttpError(400, 'Deskripsi barang wajib diisi.')
  if (trimmed.length > MAX_ITEM_DESCRIPTION_LENGTH) {
    throw createHttpError(400, `Deskripsi barang maksimal ${MAX_ITEM_DESCRIPTION_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Deskripsi barang')
  return trimmed
}

function normalizeDestination(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Tujuan pengiriman wajib diisi.')
    return undefined
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Tujuan pengiriman wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) throw createHttpError(400, 'Tujuan pengiriman wajib diisi.')
  if (trimmed.length > MAX_DESTINATION_LENGTH) {
    throw createHttpError(400, `Tujuan pengiriman maksimal ${MAX_DESTINATION_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Tujuan pengiriman')
  return trimmed
}

function normalizeTrackingNumber(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw createHttpError(400, 'No resi wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_TRACKING_NUMBER_LENGTH) {
    throw createHttpError(400, `No resi maksimal ${MAX_TRACKING_NUMBER_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'No resi')
  return trimmed
}

function normalizeStatus(value, { defaultStatus = 'belum_dikirim' } = {}) {
  if (value === undefined || value === null || value === '') return defaultStatus
  if (typeof value !== 'string') throw createHttpError(400, 'Status tidak valid.')
  const normalized = value.trim().toLowerCase()
  if (!SHIPMENT_STATUS_SET.has(normalized)) {
    throw createHttpError(
      400,
      `Status tidak valid. Status yang diizinkan: ${VALID_SHIPMENT_STATUSES.join(', ')}.`,
    )
  }
  return normalized
}

function normalizeDeliveryProofUrl(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw createHttpError(400, 'Link bukti pengiriman wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_URL_LENGTH) {
    throw createHttpError(400, `Link bukti pengiriman maksimal ${MAX_URL_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Link bukti pengiriman')

  let parsedUrl
  try {
    parsedUrl = new URL(trimmed)
  } catch {
    throw createHttpError(400, 'Format link bukti pengiriman tidak valid. Harus URL web lengkap.')
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw createHttpError(400, 'Link bukti pengiriman harus menggunakan protokol http:// atau https://.')
  }

  return trimmed
}

function mapShipmentRow(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    request_date: row.request_date instanceof Date
      ? row.request_date.toISOString().substring(0, 10)
      : String(row.request_date || '').substring(0, 10),
    recipient_name: row.recipient_name,
    item_description: row.item_description,
    destination: row.destination,
    tracking_number: row.tracking_number || null,
    status: row.status,
    delivery_proof_url: row.delivery_proof_url || null,
    created_by: row.created_by ? Number(row.created_by) : null,
    created_by_name: row.created_by_name || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const SHIPMENT_SELECT_FIELDS = `
  s.id,
  s.request_date,
  s.recipient_name,
  s.item_description,
  s.destination,
  s.tracking_number,
  s.status,
  s.delivery_proof_url,
  s.created_by,
  u.nama AS created_by_name,
  s.created_at,
  s.updated_at
`

// GET /api/shipments
export async function listShipments(req, res) {
  const { page, limit, offset } = parsePaginationQuery(req.query)
  const search = parseSearchQuery(req.query.search, 100)
  const statusParam = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : ''
  const dateFromParam = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : ''
  const dateToParam = typeof req.query.dateTo === 'string' ? req.query.dateTo.trim() : ''

  const conditions = []
  const params = []

  if (statusParam && statusParam !== 'all' && statusParam !== 'semua') {
    if (!SHIPMENT_STATUS_SET.has(statusParam)) {
      throw createHttpError(
        400,
        `Filter status tidak valid. Pilihan: ${VALID_SHIPMENT_STATUSES.join(', ')}.`,
      )
    }
    params.push(statusParam)
    conditions.push(`s.status = $${params.length}`)
  }

  if (dateFromParam) {
    if (!isValidCalendarDate(dateFromParam)) {
      throw createHttpError(400, 'Parameter dateFrom harus berupa tanggal YYYY-MM-DD yang valid.')
    }
    params.push(dateFromParam)
    conditions.push(`s.request_date >= $${params.length}::date`)
  }

  if (dateToParam) {
    if (!isValidCalendarDate(dateToParam)) {
      throw createHttpError(400, 'Parameter dateTo harus berupa tanggal YYYY-MM-DD yang valid.')
    }
    params.push(dateToParam)
    conditions.push(`s.request_date <= $${params.length}::date`)
  }

  if (search) {
    params.push(`%${search}%`)
    const pIdx = params.length
    conditions.push(`(
      s.recipient_name ILIKE $${pIdx} OR
      s.item_description ILIKE $${pIdx} OR
      s.destination ILIKE $${pIdx} OR
      s.tracking_number ILIKE $${pIdx}
    )`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `SELECT COUNT(*)::int AS total FROM asset_shipments s ${whereClause}`
  const countResult = await pool.query(countQuery, params)
  const total = Number(countResult.rows[0]?.total) || 0

  const dataParams = [...params, limit, offset]
  const dataQuery = `
    SELECT ${SHIPMENT_SELECT_FIELDS}
    FROM asset_shipments s
    LEFT JOIN users u ON s.created_by = u.id
    ${whereClause}
    ORDER BY s.request_date DESC, s.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `
  const dataResult = await pool.query(dataQuery, dataParams)
  const rows = dataResult.rows.map(mapShipmentRow)

  // Server-side summary metrics
  const summaryResult = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'belum_dikirim')::int AS belum_dikirim,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'sedang_dikirim')::int AS sedang_dikirim,
      COUNT(*) FILTER (WHERE status = 'diterima')::int AS diterima,
      COUNT(*) FILTER (WHERE status = 'cancel')::int AS cancel
    FROM asset_shipments
  `)
  const summaryRow = summaryResult.rows[0] || {}
  const summary = {
    total: Number(summaryRow.total) || 0,
    belum_dikirim: Number(summaryRow.belum_dikirim) || 0,
    pending: Number(summaryRow.pending) || 0,
    sedang_dikirim: Number(summaryRow.sedang_dikirim) || 0,
    diterima: Number(summaryRow.diterima) || 0,
    cancel: Number(summaryRow.cancel) || 0,
  }

  const pagination = setPaginationHeaders(res, total, page, limit)

  res.json({
    data: rows,
    total,
    page,
    pageSize: limit,
    totalPages: pagination.totalPages,
    summary,
  })
}

// GET /api/shipments/:id
export async function getShipmentById(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Shipment ID')
  const result = await pool.query(
    `SELECT ${SHIPMENT_SELECT_FIELDS}
     FROM asset_shipments s
     LEFT JOIN users u ON s.created_by = u.id
     WHERE s.id = $1`,
    [id],
  )
  if (result.rowCount === 0) {
    throw createHttpError(404, 'Data pengiriman tidak ditemukan.')
  }
  res.json(mapShipmentRow(result.rows[0]))
}

// POST /api/shipments
export async function createShipment(req, res) {
  assertPlainObject(req.body, 'Payload pengiriman harus berupa object JSON.')
  assertAllowedFields(req.body, SHIPMENT_CREATE_FIELDS, 'Payload pengiriman')

  const requestDate = normalizeRequestDate(req.body.request_date, { required: true })
  const recipientName = normalizeRecipientName(req.body.recipient_name, { required: true })
  const itemDescription = normalizeItemDescription(req.body.item_description, { required: true })
  const destination = normalizeDestination(req.body.destination, { required: true })
  const trackingNumber = normalizeTrackingNumber(req.body.tracking_number)
  const status = normalizeStatus(req.body.status, { defaultStatus: 'belum_dikirim' })
  const deliveryProofUrl = normalizeDeliveryProofUrl(req.body.delivery_proof_url)

  // Identity is securely bound to the authenticated user; client cannot spoof
  const createdBy = req.user?.id || null

  const result = await pool.query(
    `INSERT INTO asset_shipments (
       request_date,
       recipient_name,
       item_description,
       destination,
       tracking_number,
       status,
       delivery_proof_url,
       created_by,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      requestDate,
      recipientName,
      itemDescription,
      destination,
      trackingNumber,
      status,
      deliveryProofUrl,
      createdBy,
    ],
  )

  const newId = result.rows[0].id
  const fetchResult = await pool.query(
    `SELECT ${SHIPMENT_SELECT_FIELDS}
     FROM asset_shipments s
     LEFT JOIN users u ON s.created_by = u.id
     WHERE s.id = $1`,
    [newId],
  )

  res.status(201).json(mapShipmentRow(fetchResult.rows[0]))
}

// PUT / PATCH /api/shipments/:id
export async function updateShipment(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Shipment ID')
  assertPlainObject(req.body, 'Payload pengiriman harus berupa object JSON.')
  assertAllowedFields(req.body, SHIPMENT_UPDATE_FIELDS, 'Payload pengiriman')

  const existingResult = await pool.query('SELECT id FROM asset_shipments WHERE id = $1', [id])
  if (existingResult.rowCount === 0) {
    throw createHttpError(404, 'Data pengiriman tidak ditemukan.')
  }

  const updates = []
  const values = [id]

  if (req.body.request_date !== undefined) {
    const requestDate = normalizeRequestDate(req.body.request_date, { required: true })
    values.push(requestDate)
    updates.push(`request_date = $${values.length}`)
  }

  if (req.body.recipient_name !== undefined) {
    const recipientName = normalizeRecipientName(req.body.recipient_name, { required: true })
    values.push(recipientName)
    updates.push(`recipient_name = $${values.length}`)
  }

  if (req.body.item_description !== undefined) {
    const itemDescription = normalizeItemDescription(req.body.item_description, { required: true })
    values.push(itemDescription)
    updates.push(`item_description = $${values.length}`)
  }

  if (req.body.destination !== undefined) {
    const destination = normalizeDestination(req.body.destination, { required: true })
    values.push(destination)
    updates.push(`destination = $${values.length}`)
  }

  if (req.body.tracking_number !== undefined) {
    const trackingNumber = normalizeTrackingNumber(req.body.tracking_number)
    values.push(trackingNumber)
    updates.push(`tracking_number = $${values.length}`)
  }

  if (req.body.status !== undefined) {
    const status = normalizeStatus(req.body.status)
    values.push(status)
    updates.push(`status = $${values.length}`)
  }

  if (req.body.delivery_proof_url !== undefined) {
    const deliveryProofUrl = normalizeDeliveryProofUrl(req.body.delivery_proof_url)
    values.push(deliveryProofUrl)
    updates.push(`delivery_proof_url = $${values.length}`)
  }

  if (updates.length === 0) {
    throw createHttpError(400, 'Tidak ada field yang diberikan untuk diubah.')
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  await pool.query(
    `UPDATE asset_shipments
     SET ${updates.join(', ')}
     WHERE id = $1`,
    values,
  )

  const updatedResult = await pool.query(
    `SELECT ${SHIPMENT_SELECT_FIELDS}
     FROM asset_shipments s
     LEFT JOIN users u ON s.created_by = u.id
     WHERE s.id = $1`,
    [id],
  )

  res.json(mapShipmentRow(updatedResult.rows[0]))
}

// DELETE /api/shipments/:id
export async function deleteShipment(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Shipment ID')
  const result = await pool.query('DELETE FROM asset_shipments WHERE id = $1 RETURNING id', [id])
  if (result.rowCount === 0) {
    throw createHttpError(404, 'Data pengiriman tidak ditemukan.')
  }
  res.json({ message: 'Data pengiriman berhasil dihapus.' })
}
