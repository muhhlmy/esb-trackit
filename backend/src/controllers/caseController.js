import { pool } from '../config/database.js'
import {
  assertAllowedFields,
  assertPlainObject,
  createHttpError,
  parsePositiveIntegerParam,
} from '../security/requestValidation.js'
import { sanitizeRichTextHtml } from '../security/htmlSanitizer.js'

const MAX_TITLE_LENGTH = 300
const MAX_CATEGORY_LENGTH = 100
const MAX_TEXT_LENGTH = 20000
const MAX_LIST_ITEMS = 100
const MAX_LIST_ITEM_LENGTH = 2000
const MAX_SNIPPET_ITEMS = 50
const CASE_STATUSES = new Set(['DRAFT', 'PUBLISHED'])
const CASE_SEVERITIES = new Set(['low', 'medium', 'high'])
const CASE_FIELDS = new Set([
  'title',
  'category',
  'severity',
  'tags',
  'summary',
  'problemContext',
  'contentHtml',
  'actionSteps',
  'dosAndDonts',
  'snippets',
  'status',
  'isCustom',
  'sort_order',
])

function mapCaseRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    severity: row.severity,
    tags: Array.isArray(row.tags) ? row.tags : [],
    summary: row.summary || '',
    problemContext: row.problem_context || '',
    contentHtml: row.content_html || '',
    actionSteps: Array.isArray(row.action_steps) ? row.action_steps : [],
    dosAndDonts: {
      dos: Array.isArray(row.dos) ? row.dos : [],
      donts: Array.isArray(row.donts) ? row.donts : [],
    },
    snippets: Array.isArray(row.snippets) ? row.snippets : [],
    status: row.status,
    isCustom: row.is_custom === true,
    sort_order: Number(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
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

function normalizeCategory(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Category wajib berupa teks.')
  const category = value.trim()
  if (!category) throw createHttpError(400, 'Category wajib diisi.')
  if (category.length > MAX_CATEGORY_LENGTH) {
    throw createHttpError(400, `Category maksimal ${MAX_CATEGORY_LENGTH} karakter.`)
  }
  return category
}

function normalizeSeverity(value) {
  if (typeof value !== 'string' || !CASE_SEVERITIES.has(value)) {
    throw createHttpError(400, 'Severity wajib low, medium, atau high.')
  }
  return value
}

function normalizeStatus(value) {
  if (typeof value !== 'string' || !CASE_STATUSES.has(value)) {
    throw createHttpError(400, 'Status wajib DRAFT atau PUBLISHED.')
  }
  return value
}

function normalizeOptionalText(value, label) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw createHttpError(400, `${label} wajib berupa teks.`)
  const text = value.trim()
  if (text.length > MAX_TEXT_LENGTH) {
    throw createHttpError(400, `${label} maksimal ${MAX_TEXT_LENGTH} karakter.`)
  }
  return text
}

function normalizeStringList(value, label) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw createHttpError(400, `${label} wajib berupa array maksimal ${MAX_LIST_ITEMS} item.`)
  }
  return value.map((item) => {
    if (typeof item !== 'string') throw createHttpError(400, `${label} hanya boleh berisi teks.`)
    const text = item.trim()
    if (text.length > MAX_LIST_ITEM_LENGTH) {
      throw createHttpError(400, `Item ${label} maksimal ${MAX_LIST_ITEM_LENGTH} karakter.`)
    }
    return text
  })
}

function normalizeDosDonts(value, key, label) {
  if (value === undefined || value === null) return []
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, 'dosAndDonts wajib berupa object { dos, donts }.')
  }
  const list = value[key]
  if (list === undefined || list === null) return []
  return normalizeStringList(list, label)
}

function normalizeSnippets(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > MAX_SNIPPET_ITEMS) {
    throw createHttpError(400, `Snippets wajib berupa array maksimal ${MAX_SNIPPET_ITEMS} item.`)
  }
  return value.map((snip) => {
    if (!snip || typeof snip !== 'object' || Array.isArray(snip)) {
      throw createHttpError(400, 'Setiap snippet wajib berupa object { label, code }.')
    }
    const label = typeof snip.label === 'string' ? snip.label.trim().slice(0, 200) : ''
    const code = typeof snip.code === 'string' ? snip.code.trim() : ''
    if (code.length > MAX_TEXT_LENGTH) {
      throw createHttpError(400, `Snippet code maksimal ${MAX_TEXT_LENGTH} karakter.`)
    }
    return { label, code }
  })
}

function normalizeSortOrder(value) {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw createHttpError(400, 'Sort order wajib berupa integer >= 0.')
  }
  return value
}

function validateCreateBody(body) {
  assertPlainObject(body, 'Payload case tidak valid.')
  assertAllowedFields(body, CASE_FIELDS, 'Payload case')
  return {
    title: normalizeTitle(body.title),
    category: normalizeCategory(body.category),
    severity: body.severity === undefined ? 'medium' : normalizeSeverity(body.severity),
    tags: normalizeStringList(body.tags, 'Tags'),
    summary: normalizeOptionalText(body.summary, 'Summary'),
    problem_context: normalizeOptionalText(body.problemContext, 'Problem context'),
    content_html: sanitizeRichTextHtml(normalizeOptionalText(body.contentHtml, 'Content HTML')),
    action_steps: normalizeStringList(body.actionSteps, 'Action steps'),
    dos: normalizeDosDonts(body.dosAndDonts, 'dos', 'Dos'),
    donts: normalizeDosDonts(body.dosAndDonts, 'donts', 'Donts'),
    snippets: normalizeSnippets(body.snippets),
    status: body.status === undefined ? 'DRAFT' : normalizeStatus(body.status),
    is_custom: body.isCustom === true,
    sort_order: normalizeSortOrder(body.sort_order),
  }
}

function validateUpdateBody(body) {
  assertPlainObject(body, 'Payload case tidak valid.')
  const fields = Object.keys(body)
  if (fields.length === 0) throw createHttpError(400, 'Payload pembaruan case tidak boleh kosong.')
  assertAllowedFields(body, CASE_FIELDS, 'Payload case')

  const out = {}
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k)
  if (has('title')) out.title = normalizeTitle(body.title)
  if (has('category')) out.category = normalizeCategory(body.category)
  if (has('severity')) out.severity = normalizeSeverity(body.severity)
  if (has('tags')) out.tags = normalizeStringList(body.tags, 'Tags')
  if (has('summary')) out.summary = normalizeOptionalText(body.summary, 'Summary')
  if (has('problemContext')) out.problem_context = normalizeOptionalText(body.problemContext, 'Problem context')
  if (has('contentHtml')) out.content_html = sanitizeRichTextHtml(normalizeOptionalText(body.contentHtml, 'Content HTML'))
  if (has('actionSteps')) out.action_steps = normalizeStringList(body.actionSteps, 'Action steps')
  if (has('dosAndDonts')) {
    out.dos = normalizeDosDonts(body.dosAndDonts, 'dos', 'Dos')
    out.donts = normalizeDosDonts(body.dosAndDonts, 'donts', 'Donts')
  }
  if (has('snippets')) out.snippets = normalizeSnippets(body.snippets)
  if (has('status')) out.status = normalizeStatus(body.status)
  if (has('isCustom')) out.is_custom = body.isCustom === true
  if (has('sort_order')) out.sort_order = normalizeSortOrder(body.sort_order)
  return out
}

const SELECT_COLUMNS = `
  id, title, category, severity, tags, summary, problem_context, content_html,
  action_steps, dos, donts, snippets, status, is_custom, sort_order,
  created_at, updated_at`

// GET /api/cases/public — Help Center publik: hanya PUBLISHED
export async function listPublicCases(req, res) {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM cases WHERE status = 'PUBLISHED' ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapCaseRow))
}

// GET /api/cases — CMS admin: semua case
export async function listCases(req, res) {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM cases ORDER BY sort_order ASC, id ASC`,
  )
  res.json(result.rows.map(mapCaseRow))
}

// GET /api/cases/:id
export async function getCase(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Case ID')
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM cases WHERE id = $1`,
    [id],
  )
  if (result.rowCount === 0) throw createHttpError(404, 'Case tidak ditemukan.')
  res.json(mapCaseRow(result.rows[0]))
}

// POST /api/cases
export async function createCase(req, res) {
  const p = validateCreateBody(req.body)
  const result = await pool.query(
    `INSERT INTO cases
       (title, category, severity, tags, summary, problem_context, content_html,
        action_steps, dos, donts, snippets, status, is_custom, sort_order)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14)
     RETURNING ${SELECT_COLUMNS}`,
    [
      p.title,
      p.category,
      p.severity,
      JSON.stringify(p.tags),
      p.summary,
      p.problem_context,
      p.content_html,
      JSON.stringify(p.action_steps),
      JSON.stringify(p.dos),
      JSON.stringify(p.donts),
      JSON.stringify(p.snippets),
      p.status,
      p.is_custom,
      p.sort_order,
    ],
  )
  res.status(201).json(mapCaseRow(result.rows[0]))
}

// PUT /api/cases/:id
export async function updateCase(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Case ID')
  const p = validateUpdateBody(req.body)

  const existing = await pool.query('SELECT id FROM cases WHERE id = $1', [id])
  if (existing.rowCount === 0) throw createHttpError(404, 'Case tidak ditemukan.')

  const result = await pool.query(
    `UPDATE cases
        SET title           = COALESCE($2, title),
            category        = COALESCE($3, category),
            severity        = COALESCE($4, severity),
            tags            = COALESCE($5::jsonb, tags),
            summary         = COALESCE($6, summary),
            problem_context = COALESCE($7, problem_context),
            content_html    = COALESCE($8, content_html),
            action_steps    = COALESCE($9::jsonb, action_steps),
            dos             = COALESCE($10::jsonb, dos),
            donts           = COALESCE($11::jsonb, donts),
            snippets        = COALESCE($12::jsonb, snippets),
            status          = COALESCE($13, status),
            is_custom       = COALESCE($14, is_custom),
            sort_order      = COALESCE($15, sort_order),
            updated_at      = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      p.title ?? null,
      p.category ?? null,
      p.severity ?? null,
      p.tags ? JSON.stringify(p.tags) : null,
      p.summary ?? null,
      p.problem_context ?? null,
      p.content_html ?? null,
      p.action_steps ? JSON.stringify(p.action_steps) : null,
      p.dos ? JSON.stringify(p.dos) : null,
      p.donts ? JSON.stringify(p.donts) : null,
      p.snippets ? JSON.stringify(p.snippets) : null,
      p.status ?? null,
      p.is_custom ?? null,
      p.sort_order ?? null,
    ],
  )
  res.json(mapCaseRow(result.rows[0]))
}

// DELETE /api/cases/:id
export async function deleteCase(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, 'Case ID')
  const result = await pool.query('DELETE FROM cases WHERE id = $1 RETURNING id', [id])
  if (result.rowCount === 0) throw createHttpError(404, 'Case tidak ditemukan.')
  res.json({ message: 'Case berhasil dihapus.' })
}
