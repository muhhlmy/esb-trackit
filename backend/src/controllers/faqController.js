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
const MAX_ACTION_TEXT_LENGTH = 150
const MAX_ACTION_LINK_LENGTH = 2000
const MAX_EMERGENCY_TITLE_LENGTH = 200
const MAX_EMERGENCY_TEXT_LENGTH = 5000
const MAX_STEPS = 50
const MAX_STEP_LENGTH = 1000
const MAX_CODE_SNIPPET_LENGTH = 5000
const FAQ_STATUSES = new Set(['DRAFT', 'PUBLISHED'])
const FAQ_RICH_FIELDS = [
  'steps',
  'code_snippet',
  'action_text',
  'action_link',
  'is_emergency',
  'emergency_title',
  'emergency_text',
]
const FAQ_CREATE_FIELDS = new Set(['question', 'answer', 'category', 'status', 'sort_order', ...FAQ_RICH_FIELDS])
const FAQ_UPDATE_FIELDS = new Set(['question', 'answer', 'category', 'status', 'sort_order', ...FAQ_RICH_FIELDS])

function mapFaqRow(row) {
  return {
    id: Number(row.id),
    question: row.question,
    answer: row.answer,
    category: row.category,
    status: row.status,
    sort_order: Number(row.sort_order),
    steps: Array.isArray(row.steps) ? row.steps : [],
    code_snippet: row.code_snippet ?? null,
    action_text: row.action_text ?? null,
    action_link: row.action_link ?? null,
    is_emergency: Boolean(row.is_emergency),
    emergency_title: row.emergency_title ?? null,
    emergency_text: row.emergency_text ?? null,
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

function normalizeSteps(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw createHttpError(400, 'Steps wajib berupa array teks.')
  if (value.length > MAX_STEPS) {
    throw createHttpError(400, `Steps maksimal ${MAX_STEPS} item.`)
  }
  return value.map((step, index) => {
    if (typeof step !== 'string') {
      throw createHttpError(400, `Step ke-${index + 1} wajib berupa teks.`)
    }
    const text = step.trim()
    if (!text) throw createHttpError(400, `Step ke-${index + 1} tidak boleh kosong.`)
    if (text.length > MAX_STEP_LENGTH) {
      throw createHttpError(400, `Step ke-${index + 1} maksimal ${MAX_STEP_LENGTH} karakter.`)
    }
    return text
  })
}

function normalizeIsEmergency(value) {
  if (value === undefined || value === null) return false
  if (typeof value !== 'boolean') throw createHttpError(400, 'is_emergency wajib berupa boolean.')
  return value
}

function normalizeRichFields(body, normalized, { forUpdate = false } = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

  if (!forUpdate || has('steps')) normalized.steps = normalizeSteps(body.steps)
  if (!forUpdate || has('code_snippet')) {
    normalized.code_snippet = normalizeOptionalText(body.code_snippet, 'Code snippet', MAX_CODE_SNIPPET_LENGTH)
  }
  if (!forUpdate || has('action_text')) {
    normalized.action_text = normalizeOptionalText(body.action_text, 'Action text', MAX_ACTION_TEXT_LENGTH)
  }
  if (!forUpdate || has('action_link')) {
    normalized.action_link = normalizeOptionalText(body.action_link, 'Action link', MAX_ACTION_LINK_LENGTH)
  }
  if (!forUpdate || has('is_emergency')) {
    normalized.is_emergency = forUpdate && typeof body.is_emergency !== 'boolean'
      ? (() => { throw createHttpError(400, 'is_emergency wajib berupa boolean.') })()
      : normalizeIsEmergency(body.is_emergency)
  }
  if (!forUpdate || has('emergency_title')) {
    normalized.emergency_title = normalizeOptionalText(body.emergency_title, 'Emergency title', MAX_EMERGENCY_TITLE_LENGTH)
  }
  if (!forUpdate || has('emergency_text')) {
    normalized.emergency_text = normalizeOptionalText(body.emergency_text, 'Emergency text', MAX_EMERGENCY_TEXT_LENGTH)
  }
  return normalized
}

function validateCreateBody(body) {
  assertPlainObject(body, 'Payload pembuatan FAQ tidak valid.')
  assertAllowedFields(body, FAQ_CREATE_FIELDS, 'Payload pembuatan FAQ')
  return normalizeRichFields(body, {
    question: normalizeQuestion(body.question),
    answer: normalizeAnswer(body.answer),
    category: normalizeCategory(body.category),
    status: normalizeStatus(body.status),
    sort_order: normalizeSortOrder(body.sort_order),
  })
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
  return normalizeRichFields(body, normalized, { forUpdate: true })
}

const FAQ_SELECT_COLUMNS =
  'id, question, answer, category, status, sort_order, steps, code_snippet, action_text, action_link, is_emergency, emergency_title, emergency_text, created_at, updated_at'

// GET /api/faqs/public — Help Center publik: hanya PUBLISHED
export async function listPublicFaqs(req, res) {
  const result = await pool.query(
    `SELECT ${FAQ_SELECT_COLUMNS}
       FROM faq
      WHERE status = 'PUBLISHED'
      ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapFaqRow))
}

// GET /api/faqs — CMS admin: semua FAQ
export async function listFaqs(req, res) {
  const result = await pool.query(
    `SELECT ${FAQ_SELECT_COLUMNS}
       FROM faq
      ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapFaqRow))
}

// GET /api/faqs/:id
export async function getFaq(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'FAQ ID')
  const result = await pool.query(
    `SELECT ${FAQ_SELECT_COLUMNS}
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
    `INSERT INTO faq (question, answer, category, status, sort_order, steps, code_snippet, action_text, action_link, is_emergency, emergency_title, emergency_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${FAQ_SELECT_COLUMNS}`,
    [
      payload.question,
      payload.answer,
      payload.category,
      payload.status,
      payload.sort_order,
      JSON.stringify(payload.steps),
      payload.code_snippet,
      payload.action_text,
      payload.action_link,
      payload.is_emergency,
      payload.emergency_title,
      payload.emergency_text,
    ],
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
        SET question        = COALESCE($2, question),
            answer          = COALESCE($3, answer),
            category        = COALESCE($4, category),
            status          = COALESCE($5, status),
            sort_order      = COALESCE($6, sort_order),
            steps           = COALESCE($7, steps),
            code_snippet    = COALESCE($8, code_snippet),
            action_text     = COALESCE($9, action_text),
            action_link     = COALESCE($10, action_link),
            is_emergency    = COALESCE($11, is_emergency),
            emergency_title = COALESCE($12, emergency_title),
            emergency_text  = COALESCE($13, emergency_text),
            updated_at      = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${FAQ_SELECT_COLUMNS}`,
    [
      id,
      payload.question ?? null,
      payload.answer ?? null,
      payload.category ?? null,
      payload.status ?? null,
      payload.sort_order ?? null,
      payload.steps === undefined ? null : JSON.stringify(payload.steps),
      payload.code_snippet ?? null,
      payload.action_text ?? null,
      payload.action_link ?? null,
      payload.is_emergency ?? null,
      payload.emergency_title ?? null,
      payload.emergency_text ?? null,
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
