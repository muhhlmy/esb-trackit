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

export const STANDARD_SHIPMENT_STATUSES = Object.freeze([
  'Menunggu Pickup',
  'Di Pickup',
  'Dalam Pengiriman',
  'Terkirim',
  'Dibatalkan',
])

export const VALID_SHIPMENT_STATUSES = Object.freeze([
  ...STANDARD_SHIPMENT_STATUSES,
  'belum_dikirim',
  'pending',
  'sedang_dikirim',
  'diterima',
  'cancel',
])

const STATUS_MAP = new Map([
  ['menunggu pickup', 'Menunggu Pickup'],
  ['belum_dikirim', 'Menunggu Pickup'],
  ['di pickup', 'Di Pickup'],
  ['pending', 'Di Pickup'],
  ['dalam pengiriman', 'Dalam Pengiriman'],
  ['sedang_dikirim', 'Dalam Pengiriman'],
  ['terkirim', 'Terkirim'],
  ['diterima', 'Terkirim'],
  ['dibatalkan', 'Dibatalkan'],
  ['cancel', 'Dibatalkan'],
])

const REVERSE_LEGACY_MAP = new Map([
  ['Menunggu Pickup', 'belum_dikirim'],
  ['Di Pickup', 'pending'],
  ['Dalam Pengiriman', 'sedang_dikirim'],
  ['Terkirim', 'diterima'],
  ['Dibatalkan', 'cancel'],
])

const AWB_REQUIRED_STATUSES = new Set(['Di Pickup', 'Dalam Pengiriman', 'Terkirim'])

const MAX_SENDER_NAME_LENGTH = 150
const MAX_SENDER_ADDRESS_LENGTH = 5000
const MAX_RECIPIENT_NAME_LENGTH = 150
const MAX_RECIPIENT_ADDRESS_LENGTH = 5000
const MAX_ITEM_DESCRIPTION_LENGTH = 5000
const MAX_DESTINATION_LENGTH = 255
const MAX_TRACKING_NUMBER_LENGTH = 100
const MAX_URL_LENGTH = 2048

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const SHIPMENT_CREATE_FIELDS = new Set([
  'request_date',
  'sender_name',
  'sender_address',
  'recipient_name',
  'recipient_address',
  'item_description',
  'item_detail',
  'destination',
  'tracking_number',
  'awb_number',
  'status',
  'delivery_proof_url',
])

const SHIPMENT_UPDATE_FIELDS = new Set([
  'request_date',
  'sender_name',
  'sender_address',
  'recipient_name',
  'recipient_address',
  'item_description',
  'item_detail',
  'destination',
  'tracking_number',
  'awb_number',
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

function normalizeSenderName(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Nama pengirim wajib diisi.')
    return ''
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Nama pengirim wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed && required) throw createHttpError(400, 'Nama pengirim wajib diisi.')
  if (trimmed.length > MAX_SENDER_NAME_LENGTH) {
    throw createHttpError(400, `Nama pengirim maksimal ${MAX_SENDER_NAME_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Nama pengirim')
  return trimmed
}

function normalizeSenderAddress(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Alamat pengirim wajib diisi.')
    return ''
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Alamat pengirim wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed && required) throw createHttpError(400, 'Alamat pengirim wajib diisi.')
  if (trimmed.length > MAX_SENDER_ADDRESS_LENGTH) {
    throw createHttpError(400, `Alamat pengirim maksimal ${MAX_SENDER_ADDRESS_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Alamat pengirim')
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

function normalizeRecipientAddress(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Alamat penerima wajib diisi.')
    return undefined
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Alamat penerima wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed && required) throw createHttpError(400, 'Alamat penerima wajib diisi.')
  if (trimmed.length > MAX_RECIPIENT_ADDRESS_LENGTH) {
    throw createHttpError(400, `Alamat penerima maksimal ${MAX_RECIPIENT_ADDRESS_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Alamat penerima')
  return trimmed
}

function normalizeItemDetail(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createHttpError(400, 'Detail barang wajib diisi.')
    return undefined
  }
  if (typeof value !== 'string') throw createHttpError(400, 'Detail barang wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) throw createHttpError(400, 'Detail barang wajib diisi.')
  if (trimmed.length > MAX_ITEM_DESCRIPTION_LENGTH) {
    throw createHttpError(400, `Detail barang maksimal ${MAX_ITEM_DESCRIPTION_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'Detail barang')
  return trimmed
}

function normalizeAwbNumber(value, { required = false, statusName = '' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw createHttpError(
        400,
        statusName
          ? `No. AWB / Resi wajib diisi untuk status ${statusName}.`
          : 'No. AWB / Resi wajib diisi.',
      )
    }
    return null
  }
  if (typeof value !== 'string') throw createHttpError(400, 'No. AWB / Resi wajib berupa teks.')
  const trimmed = value.trim()
  if (!trimmed) {
    if (required) {
      throw createHttpError(
        400,
        statusName
          ? `No. AWB / Resi wajib diisi untuk status ${statusName}.`
          : 'No. AWB / Resi wajib diisi.',
      )
    }
    return null
  }
  if (trimmed.length > MAX_TRACKING_NUMBER_LENGTH) {
    throw createHttpError(400, `No. AWB / Resi maksimal ${MAX_TRACKING_NUMBER_LENGTH} karakter.`)
  }
  assertNoActiveMarkup(trimmed, 'No. AWB / Resi')
  return trimmed
}

function normalizeStatus(value, { defaultStatus = 'Menunggu Pickup' } = {}) {
  if (value === undefined || value === null || value === '') return defaultStatus
  if (typeof value !== 'string') throw createHttpError(400, 'Status tidak valid.')
  const key = value.trim().toLowerCase()
  const normalized = STATUS_MAP.get(key)
  if (!normalized) {
    throw createHttpError(
      400,
      `Status tidak valid. Pilihan: ${STANDARD_SHIPMENT_STATUSES.join(', ')}.`,
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
  const recipientAddr = row.recipient_address || row.destination || ''
  const itemDetail = row.item_detail || row.item_description || ''
  const awb = row.awb_number || row.tracking_number || null
  return {
    id: Number(row.id),
    request_date: row.request_date instanceof Date
      ? row.request_date.toISOString().substring(0, 10)
      : String(row.request_date || '').substring(0, 10),
    sender_name: row.sender_name || '',
    sender_address: row.sender_address || '',
    recipient_name: row.recipient_name,
    recipient_address: recipientAddr,
    destination: row.destination || recipientAddr,
    item_description: itemDetail,
    item_detail: itemDetail,
    tracking_number: awb,
    awb_number: awb,
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
  s.sender_name,
  s.sender_address,
  s.recipient_name,
  s.recipient_address,
  s.destination,
  s.item_description,
  s.item_detail,
  s.tracking_number,
  s.awb_number,
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
    const normalizedFilter = STATUS_MAP.get(statusParam)
    if (!normalizedFilter) {
      throw createHttpError(
        400,
        `Filter status tidak valid. Pilihan: ${STANDARD_SHIPMENT_STATUSES.join(', ')}.`,
      )
    }
    const legacyAlt = REVERSE_LEGACY_MAP.get(normalizedFilter)
    if (legacyAlt) {
      params.push(normalizedFilter, legacyAlt)
      conditions.push(`s.status IN ($${params.length - 1}, $${params.length})`)
    } else {
      params.push(normalizedFilter)
      conditions.push(`s.status = $${params.length}`)
    }
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
      s.sender_name ILIKE $${pIdx} OR
      s.sender_address ILIKE $${pIdx} OR
      s.recipient_name ILIKE $${pIdx} OR
      s.recipient_address ILIKE $${pIdx} OR
      s.destination ILIKE $${pIdx} OR
      s.item_description ILIKE $${pIdx} OR
      s.item_detail ILIKE $${pIdx} OR
      s.tracking_number ILIKE $${pIdx} OR
      s.awb_number ILIKE $${pIdx}
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

  // Server-side summary metrics for both standard and legacy labels
  const summaryResult = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('Menunggu Pickup', 'belum_dikirim'))::int AS menunggu_pickup,
      COUNT(*) FILTER (WHERE status IN ('Di Pickup', 'pending'))::int AS di_pickup,
      COUNT(*) FILTER (WHERE status IN ('Dalam Pengiriman', 'sedang_dikirim'))::int AS dalam_pengiriman,
      COUNT(*) FILTER (WHERE status IN ('Terkirim', 'diterima'))::int AS terkirim,
      COUNT(*) FILTER (WHERE status IN ('Dibatalkan', 'cancel'))::int AS dibatalkan
    FROM asset_shipments
  `)
  const summaryRow = summaryResult.rows[0] || {}
  const summary = {
    total: Number(summaryRow.total) || 0,
    menunggu_pickup: Number(summaryRow.menunggu_pickup) || 0,
    di_pickup: Number(summaryRow.di_pickup) || 0,
    dalam_pengiriman: Number(summaryRow.dalam_pengiriman) || 0,
    terkirim: Number(summaryRow.terkirim) || 0,
    dibatalkan: Number(summaryRow.dibatalkan) || 0,
    // Legacy keys compatibility
    belum_dikirim: Number(summaryRow.menunggu_pickup) || 0,
    pending: Number(summaryRow.di_pickup) || 0,
    sedang_dikirim: Number(summaryRow.dalam_pengiriman) || 0,
    diterima: Number(summaryRow.terkirim) || 0,
    cancel: Number(summaryRow.dibatalkan) || 0,
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
  const senderName = normalizeSenderName(req.body.sender_name, { required: true })
  const senderAddress = normalizeSenderAddress(req.body.sender_address, { required: true })
  const recipientName = normalizeRecipientName(req.body.recipient_name, { required: true })

  const rawRecipientAddress = req.body.recipient_address ?? req.body.destination
  const recipientAddress = normalizeRecipientAddress(rawRecipientAddress, { required: true })
  const destination = recipientAddress.length <= MAX_DESTINATION_LENGTH
    ? recipientAddress
    : recipientAddress.substring(0, MAX_DESTINATION_LENGTH)

  const rawItemDetail = req.body.item_detail ?? req.body.item_description
  const itemDetail = normalizeItemDetail(rawItemDetail, { required: true })
  const itemDescription = itemDetail

  const status = normalizeStatus(req.body.status, { defaultStatus: 'Menunggu Pickup' })

  const isAwbRequired = AWB_REQUIRED_STATUSES.has(status)
  const rawAwb = req.body.awb_number !== undefined ? req.body.awb_number : req.body.tracking_number
  const awbNumber = normalizeAwbNumber(rawAwb, { required: isAwbRequired, statusName: status })
  const trackingNumber = awbNumber

  const deliveryProofUrl = normalizeDeliveryProofUrl(req.body.delivery_proof_url)
  const createdBy = req.user?.id || null

  const result = await pool.query(
    `INSERT INTO asset_shipments (
       request_date,
       sender_name,
       sender_address,
       recipient_name,
       recipient_address,
       destination,
       item_description,
       item_detail,
       tracking_number,
       awb_number,
       status,
       delivery_proof_url,
       created_by,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      requestDate,
      senderName,
      senderAddress,
      recipientName,
      recipientAddress,
      destination,
      itemDescription,
      itemDetail,
      trackingNumber,
      awbNumber,
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

  const existingResult = await pool.query(
    'SELECT id, status, awb_number, tracking_number FROM asset_shipments WHERE id = $1',
    [id],
  )
  if (existingResult.rowCount === 0) {
    throw createHttpError(404, 'Data pengiriman tidak ditemukan.')
  }
  const existingRow = existingResult.rows[0]
  const existingAwb = existingRow.awb_number || existingRow.tracking_number || null

  const updates = []
  const values = [id]

  if (req.body.request_date !== undefined) {
    const requestDate = normalizeRequestDate(req.body.request_date, { required: true })
    values.push(requestDate)
    updates.push(`request_date = $${values.length}`)
  }

  if (req.body.sender_name !== undefined) {
    const senderName = normalizeSenderName(req.body.sender_name, { required: true })
    values.push(senderName)
    updates.push(`sender_name = $${values.length}`)
  }

  if (req.body.sender_address !== undefined) {
    const senderAddress = normalizeSenderAddress(req.body.sender_address, { required: true })
    values.push(senderAddress)
    updates.push(`sender_address = $${values.length}`)
  }

  if (req.body.recipient_name !== undefined) {
    const recipientName = normalizeRecipientName(req.body.recipient_name, { required: true })
    values.push(recipientName)
    updates.push(`recipient_name = $${values.length}`)
  }

  if (req.body.recipient_address !== undefined || req.body.destination !== undefined) {
    const rawRecipientAddress = req.body.recipient_address ?? req.body.destination
    const recipientAddress = normalizeRecipientAddress(rawRecipientAddress, { required: true })
    values.push(recipientAddress)
    updates.push(`recipient_address = $${values.length}`)

    const destination = recipientAddress.length <= MAX_DESTINATION_LENGTH
      ? recipientAddress
      : recipientAddress.substring(0, MAX_DESTINATION_LENGTH)
    values.push(destination)
    updates.push(`destination = $${values.length}`)
  }

  if (req.body.item_detail !== undefined || req.body.item_description !== undefined) {
    const rawItemDetail = req.body.item_detail ?? req.body.item_description
    const itemDetail = normalizeItemDetail(rawItemDetail, { required: true })
    values.push(itemDetail)
    updates.push(`item_detail = $${values.length}`)
    values.push(itemDetail)
    updates.push(`item_description = $${values.length}`)
  }

  // Determine effective status
  let effectiveStatus = existingRow.status
  // Normalize existing status if it was stored as legacy
  const normalizedExisting = STATUS_MAP.get(String(existingRow.status || '').toLowerCase())
  if (normalizedExisting) {
    effectiveStatus = normalizedExisting
  }

  if (req.body.status !== undefined) {
    effectiveStatus = normalizeStatus(req.body.status)
    values.push(effectiveStatus)
    updates.push(`status = $${values.length}`)
  }

  const isAwbRequired = AWB_REQUIRED_STATUSES.has(effectiveStatus)
  const hasIncomingAwb = req.body.awb_number !== undefined || req.body.tracking_number !== undefined

  if (hasIncomingAwb) {
    const rawAwb = req.body.awb_number !== undefined ? req.body.awb_number : req.body.tracking_number
    const awbNumber = normalizeAwbNumber(rawAwb, { required: isAwbRequired, statusName: effectiveStatus })
    values.push(awbNumber)
    updates.push(`awb_number = $${values.length}`)
    values.push(awbNumber)
    updates.push(`tracking_number = $${values.length}`)
  } else if (isAwbRequired && !existingAwb) {
    throw createHttpError(400, `No. AWB / Resi wajib diisi untuk status ${effectiveStatus}.`)
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
