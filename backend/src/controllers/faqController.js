import { pool } from '../config/database.js'
import {
  assertAllowedFields,
  assertPlainObject,
  createHttpError,
  parsePositiveIntegerParam,
} from '../security/requestValidation.js'

const MAX_QUESTION_LENGTH = 500
const MAX_ANSWER_LENGTH = 20000
const MAX_CATEGORY_LENGTH = 100
const FAQ_STATUSES = new Set(['DRAFT', 'PUBLISHED'])
const FAQ_CREATE_FIELDS = new Set(['question', 'answer', 'category', 'status', 'sort_order'])
const FAQ_UPDATE_FIELDS = new Set(['question', 'answer', 'category', 'status', 'sort_order'])

function mapFaqRow(row) {
  return {
    id: Number(row.id),
    question: row.question,
    answer: row.answer,
    category: row.category,
    status: row.status,
    sort_order: Number(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeQuestion(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Question wajib berupa teks.')
  const question = value.trim()
  if (!question) throw createHttpError(400, 'Question wajib diisi.')
  if (question.length > MAX_QUESTION_LENGTH) {
    throw createHttpError(400, `Question maksimal ${MAX_QUESTION_LENGTH} karakter.`)
  }
  return question
}

function normalizeAnswer(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Answer wajib berupa teks.')
  const answer = value.trim()
  if (!answer) throw createHttpError(400, 'Answer wajib diisi.')
  if (answer.length > MAX_ANSWER_LENGTH) {
    throw createHttpError(400, `Answer maksimal ${MAX_ANSWER_LENGTH} karakter.`)
  }
  return answer
}

function normalizeCategory(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Category wajib berupa teks.')
  const category = value.trim()
  if (!category) throw createHttpError(400, 'Category wajib diisi.')
  if (category.length > MAX_CATEGORY_LENGTH) {
    throw createHttpError(400, `Category maksimal ${MAX_CATEGORY_LENGTH} karakter.`)
  }
  return category
}

function normalizeStatus(value) {
  if (typeof value !== 'string' || !FAQ_STATUSES.has(value)) {
    throw createHttpError(400, 'Status wajib DRAFT atau PUBLISHED.')
  }
  return value
}

function normalizeSortOrder(value) {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw createHttpError(400, 'Sort order wajib berupa integer >= 0.')
  }
  return value
}

function validateCreateBody(body) {
  assertPlainObject(body, 'Payload pembuatan FAQ tidak valid.')
  assertAllowedFields(body, FAQ_CREATE_FIELDS, 'Payload pembuatan FAQ')
  return {
    question: normalizeQuestion(body.question),
    answer: normalizeAnswer(body.answer),
    category: normalizeCategory(body.category),
    status: normalizeStatus(body.status),
    sort_order: normalizeSortOrder(body.sort_order),
  }
}

function validateUpdateBody(body) {
  assertPlainObject(body, 'Payload pembaruan FAQ tidak valid.')
  const fields = Object.keys(body)
  if (fields.length === 0) throw createHttpError(400, 'Payload pembaruan FAQ tidak boleh kosong.')
  assertAllowedFields(body, FAQ_UPDATE_FIELDS, 'Payload pembaruan FAQ')

  const normalized = {}
  if (Object.prototype.hasOwnProperty.call(body, 'question')) normalized.question = normalizeQuestion(body.question)
  if (Object.prototype.hasOwnProperty.call(body, 'answer')) normalized.answer = normalizeAnswer(body.answer)
  if (Object.prototype.hasOwnProperty.call(body, 'category')) normalized.category = normalizeCategory(body.category)
  if (Object.prototype.hasOwnProperty.call(body, 'status')) normalized.status = normalizeStatus(body.status)
  if (Object.prototype.hasOwnProperty.call(body, 'sort_order')) normalized.sort_order = normalizeSortOrder(body.sort_order)
  return normalized
}

// GET /api/faqs/public — Help Center publik: hanya PUBLISHED
export async function listPublicFaqs(req, res) {
  const result = await pool.query(
    `SELECT id, question, answer, category, status, sort_order, created_at, updated_at
       FROM faq
      WHERE status = 'PUBLISHED'
      ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapFaqRow))
}

// GET /api/faqs — CMS admin: semua FAQ
export async function listFaqs(req, res) {
  const result = await pool.query(
    `SELECT id, question, answer, category, status, sort_order, created_at, updated_at
       FROM faq
      ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapFaqRow))
}

// GET /api/faqs/:id
export async function getFaq(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'FAQ ID')
  const result = await pool.query(
    `SELECT id, question, answer, category, status, sort_order, created_at, updated_at
       FROM faq
      WHERE id = $1`,
    [id],
  )
  if (result.rowCount === 0) throw createHttpError(404, 'FAQ tidak ditemukan.')
  res.json(mapFaqRow(result.rows[0]))
}

// POST /api/faqs
export async function createFaq(req, res) {
  const payload = validateCreateBody(req.body)
  const result = await pool.query(
    `INSERT INTO faq (question, answer, category, status, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, question, answer, category, status, sort_order, created_at, updated_at`,
    [payload.question, payload.answer, payload.category, payload.status, payload.sort_order],
  )
  res.status(201).json(mapFaqRow(result.rows[0]))
}

// PUT /api/faqs/:id
export async function updateFaq(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'FAQ ID')
  const payload = validateUpdateBody(req.body)

  const existing = await pool.query('SELECT id FROM faq WHERE id = $1', [id])
  if (existing.rowCount === 0) throw createHttpError(404, 'FAQ tidak ditemukan.')

  const result = await pool.query(
    `UPDATE faq
        SET question  = COALESCE($2, question),
            answer    = COALESCE($3, answer),
            category  = COALESCE($4, category),
            status    = COALESCE($5, status),
            sort_order = COALESCE($6, sort_order),
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, question, answer, category, status, sort_order, created_at, updated_at`,
    [
      id,
      payload.question ?? null,
      payload.answer ?? null,
      payload.category ?? null,
      payload.status ?? null,
      payload.sort_order ?? null,
    ],
  )
  res.json(mapFaqRow(result.rows[0]))
}

// DELETE /api/faqs/:id
export async function deleteFaq(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'FAQ ID')
  const result = await pool.query('DELETE FROM faq WHERE id = $1 RETURNING id', [id])
  if (result.rowCount === 0) throw createHttpError(404, 'FAQ tidak ditemukan.')
  res.json({ message: 'FAQ berhasil dihapus.' })
}
