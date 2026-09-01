import { pool } from '../config/database.js'
import {
  createHttpError,
  parsePositiveIntegerParam,
} from '../security/requestValidation.js'

function mapBookmarkRow(row) {
  return {
    id: Number(row.id),
    case_id: Number(row.case_id),
    created_at: row.created_at,
  }
}

// GET /api/case-bookmarks — daftar bookmark milik user yang sedang login.
export async function listMyCaseBookmarks(req, res) {
  const userId = req.user.id
  const result = await pool.query(
    `SELECT id, case_id, created_at
       FROM case_bookmarks
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId],
  )
  res.json(result.rows.map(mapBookmarkRow))
}

// POST /api/case-bookmarks/:caseId — tambah bookmark (idempotent).
export async function addCaseBookmark(req, res) {
  const userId = req.user.id
  const caseId = parsePositiveIntegerParam(req.params.caseId, 'Case ID')

  const caseExists = await pool.query('SELECT id FROM cases WHERE id = $1', [caseId])
  if (caseExists.rowCount === 0) throw createHttpError(404, 'Case tidak ditemukan.')

  const result = await pool.query(
    `INSERT INTO case_bookmarks (user_id, case_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, case_id) DO NOTHING
     RETURNING id, case_id, created_at`,
    [userId, caseId],
  )

  if (result.rowCount === 0) {
    const existing = await pool.query(
      `SELECT id, case_id, created_at
         FROM case_bookmarks
        WHERE user_id = $1 AND case_id = $2`,
      [userId, caseId],
    )
    return res.json(mapBookmarkRow(existing.rows[0]))
  }

  res.status(201).json(mapBookmarkRow(result.rows[0]))
}

// DELETE /api/case-bookmarks/:caseId — hapus bookmark (idempotent).
export async function removeCaseBookmark(req, res) {
  const userId = req.user.id
  const caseId = parsePositiveIntegerParam(req.params.caseId, 'Case ID')

  await pool.query(
    'DELETE FROM case_bookmarks WHERE user_id = $1 AND case_id = $2',
    [userId, caseId],
  )
  res.json({ message: 'Bookmark berhasil dihapus.' })
}
