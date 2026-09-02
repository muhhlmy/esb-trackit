import { pool } from '../config/database.js'
import {
  assertAllowedFields,
  assertPlainObject,
  createHttpError,
  parsePositiveIntegerParam,
} from '../security/requestValidation.js'

const MAX_KEY_LENGTH = 50
const MAX_TITLE_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_ICON_LENGTH = 50
const KB_CATEGORY_STATUSES = new Set(['DRAFT', 'PUBLISHED'])

const KB_CATEGORY_CREATE_FIELDS = new Set([
  'key',
  'title',
  'description',
  'icon',
  'is_featured',
  'sort_order',
  'status',
])
const KB_CATEGORY_UPDATE_FIELDS = new Set([
  'key',
  'title',
  'description',
  'icon',
  'is_featured',
  'sort_order',
  'status',
])

function mapCategoryRow(row) {
  return {
    id: Number(row.id),
    key: row.key,
    title: row.title,
    description: row.description ?? '',
    icon: row.icon ?? null,
    is_featured: Boolean(row.is_featured),
    sort_order: Number(row.sort_order),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeKey(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Key wajib berupa teks.')
  const key = value.trim().toLowerCase()
  if (!key) throw createHttpError(400, 'Key wajib diisi.')
  if (key.length > MAX_KEY_LENGTH) {
    throw createHttpError(400, `Key maksimal ${MAX_KEY_LENGTH} karakter.`)
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    throw createHttpError(400, 'Key hanya boleh huruf kecil, angka, dan tanda hubung (slug).')
  }
  return key
}

function normalizeTitle(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Title wajib berupa teks.')
  const title = value.trim()
  if (!title) throw createHttpError(400, 'Title wajib diisi.')
  if (title.length > MAX_TITLE_LENGTH) {
    throw createHttpError(400, `Title maksimal ${MAX_TITLE_LENGTH} karakter.`)
  }
  return title
}

function normalizeOptionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw createHttpError(400, `${label} wajib berupa teks.`)
  const text = value.trim()
  if (!text) return null
  if (text.length > maxLength) {
    throw createHttpError(400, `${label} maksimal ${maxLength} karakter.`)
  }
  return text
}

function normalizeIcon(value) {
  const icon = normalizeOptionalText(value, 'Icon', MAX_ICON_LENGTH)
  if (icon !== null && !/^[A-Za-z][A-Za-z0-9]*$/.test(icon)) {
    throw createHttpError(400, 'Icon wajib berupa nama icon Lucide yang valid (mis. Laptop, Wifi).')
  }
  return icon
}

function normalizeIsFeatured(value) {
  if (value === undefined || value === null) return false
  if (typeof value !== 'boolean') throw createHttpError(400, 'is_featured wajib berupa boolean.')
  return value
}

function normalizeStatus(value) {
  if (value === undefined || value === null) return 'PUBLISHED'
  if (typeof value !== 'string' || !KB_CATEGORY_STATUSES.has(value)) {
    throw createHttpError(400, 'Status wajib DRAFT atau PUBLISHED.')
  }
  return value
}

function normalizeSortOrder(value) {
  if (value === undefined || value === null || value === '') return 0
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 0) {
    throw createHttpError(400, 'Sort order wajib berupa integer >= 0.')
  }
  return parsed
}

function sanitizeCategoryBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const cleaned = { ...body }
    delete cleaned.id
    delete cleaned.created_at
    delete cleaned.updated_at
    return cleaned
  }
  return body
}

function validateCreateBody(rawBody) {
  assertPlainObject(rawBody, 'Payload pembuatan kategori tidak valid.')
  const body = sanitizeCategoryBody(rawBody)
  assertAllowedFields(body, KB_CATEGORY_CREATE_FIELDS, 'Payload pembuatan kategori')
  return {
    key: normalizeKey(body.key),
    title: normalizeTitle(body.title),
    description: normalizeOptionalText(body.description, 'Description', MAX_DESCRIPTION_LENGTH),
    icon: normalizeIcon(body.icon),
    is_featured: normalizeIsFeatured(body.is_featured),
    sort_order: normalizeSortOrder(body.sort_order),
    status: normalizeStatus(body.status),
  }
}

function validateUpdateBody(rawBody) {
  assertPlainObject(rawBody, 'Payload pembaruan kategori tidak valid.')
  const body = sanitizeCategoryBody(rawBody)
  const fields = Object.keys(body)
  if (fields.length === 0) {
    throw createHttpError(400, 'Payload pembaruan kategori tidak boleh kosong.')
  }
  assertAllowedFields(body, KB_CATEGORY_UPDATE_FIELDS, 'Payload pembaruan kategori')

  const normalized = {}
  if (Object.prototype.hasOwnProperty.call(body, 'key')) normalized.key = normalizeKey(body.key)
  if (Object.prototype.hasOwnProperty.call(body, 'title')) normalized.title = normalizeTitle(body.title)
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    normalized.description = normalizeOptionalText(body.description, 'Description', MAX_DESCRIPTION_LENGTH)
  }
  if (Object.prototype.hasOwnProperty.call(body, 'icon')) normalized.icon = normalizeIcon(body.icon)
  if (Object.prototype.hasOwnProperty.call(body, 'is_featured')) {
    if (typeof body.is_featured !== 'boolean') {
      throw createHttpError(400, 'is_featured wajib berupa boolean.')
    }
    normalized.is_featured = body.is_featured
  }
  if (Object.prototype.hasOwnProperty.call(body, 'sort_order')) {
    normalized.sort_order = normalizeSortOrder(body.sort_order)
  }
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (typeof body.status !== 'string' || !KB_CATEGORY_STATUSES.has(body.status)) {
      throw createHttpError(400, 'Status wajib DRAFT atau PUBLISHED.')
    }
    normalized.status = body.status
  }
  return normalized
}

const SELECT_COLUMNS =
  'id, key, title, description, icon, is_featured, sort_order, status, created_at, updated_at'

// GET /api/kb-categories/public — Help Center publik: hanya PUBLISHED
export async function listPublicKbCategories(req, res) {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
       FROM kb_categories
      WHERE status = 'PUBLISHED'
      ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapCategoryRow))
}

// GET /api/kb-categories — CMS admin: semua kategori
export async function listKbCategories(req, res) {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
       FROM kb_categories
      ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapCategoryRow))
}

// GET /api/kb-categories/:id
export async function getKbCategory(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Kategori ID')
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
       FROM kb_categories
      WHERE id = $1`,
    [id],
  )
  if (result.rowCount === 0) throw createHttpError(404, 'Kategori tidak ditemukan.')
  res.json(mapCategoryRow(result.rows[0]))
}

// POST /api/kb-categories
export async function createKbCategory(req, res) {
  const payload = validateCreateBody(req.body)
  const result = await pool.query(
    `INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SELECT_COLUMNS}`,
    [
      payload.key,
      payload.title,
      payload.description,
      payload.icon,
      payload.is_featured,
      payload.sort_order,
      payload.status,
    ],
  )
  res.status(201).json(mapCategoryRow(result.rows[0]))
}

// PUT /api/kb-categories/:id
export async function updateKbCategory(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Kategori ID')
  const payload = validateUpdateBody(req.body)

  const existing = await pool.query('SELECT id FROM kb_categories WHERE id = $1', [id])
  if (existing.rowCount === 0) throw createHttpError(404, 'Kategori tidak ditemukan.')

  const result = await pool.query(
    `UPDATE kb_categories
        SET key         = COALESCE($2, key),
            title       = COALESCE($3, title),
            description = COALESCE($4, description),
            icon        = COALESCE($5, icon),
            is_featured = COALESCE($6, is_featured),
            sort_order  = COALESCE($7, sort_order),
            status      = COALESCE($8, status),
            updated_at  = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      payload.key ?? null,
      payload.title ?? null,
      payload.description ?? null,
      payload.icon ?? null,
      payload.is_featured ?? null,
      payload.sort_order ?? null,
      payload.status ?? null,
    ],
  )
  res.json(mapCategoryRow(result.rows[0]))
}

// DELETE /api/kb-categories/:id
export async function deleteKbCategory(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Kategori ID')
  const result = await pool.query('DELETE FROM kb_categories WHERE id = $1 RETURNING id', [id])
  if (result.rowCount === 0) throw createHttpError(404, 'Kategori tidak ditemukan.')
  res.json({ message: 'Kategori berhasil dihapus.' })
}
