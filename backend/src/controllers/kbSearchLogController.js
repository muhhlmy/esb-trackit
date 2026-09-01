import { pool } from '../config/database.js'
import {
  assertAllowedFields,
  assertPlainObject,
  createHttpError,
} from '../security/requestValidation.js'

const MAX_QUERY_LENGTH = 300
const SEARCH_LOG_FIELDS = new Set(['query', 'results_count'])

function mapSearchLogRow(row) {
  return {
    id: Number(row.id),
    query: row.query,
    results_count: Number(row.results_count),
    user_id: row.user_id === null ? null : Number(row.user_id),
    created_at: row.created_at,
  }
}

function normalizeQuery(value) {
  if (typeof value !== 'string') throw createHttpError(400, 'Query wajib berupa teks.')
  const query = value.trim()
  if (!query) throw createHttpError(400, 'Query wajib diisi.')
  if (query.length > MAX_QUERY_LENGTH) {
    throw createHttpError(400, `Query maksimal ${MAX_QUERY_LENGTH} karakter.`)
  }
  return query
}

function normalizeResultsCount(value) {
  if (value === undefined || value === null) return 0
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw createHttpError(400, 'results_count wajib berupa integer >= 0.')
  }
  return value
}

// POST /api/kb-search-logs — publik (dipanggil saat user mencari di Help Center).
// user_id diisi bila request membawa sesi login; null untuk pengunjung anonim.
export async function logKbSearch(req, res) {
  assertPlainObject(req.body, 'Payload pencatatan pencarian tidak valid.')
  assertAllowedFields(req.body, SEARCH_LOG_FIELDS, 'Payload pencatatan pencarian')

  const query = normalizeQuery(req.body.query)
  const resultsCount = normalizeResultsCount(req.body.results_count)
  const userId = req.user?.id ?? null

  const result = await pool.query(
    `INSERT INTO kb_search_logs (query, results_count, user_id)
     VALUES ($1, $2, $3)
     RETURNING id, query, results_count, user_id, created_at`,
    [query, resultsCount, userId],
  )
  res.status(201).json(mapSearchLogRow(result.rows[0]))
}

// GET /api/kb-search-logs/popular — publik: top query untuk "Popular searches".
export async function listPopularKbSearches(req, res) {
  const result = await pool.query(
    `SELECT query, COUNT(*)::int AS total
       FROM kb_search_logs
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY query
      ORDER BY total DESC, MAX(created_at) DESC
      LIMIT 5`,
  )
  res.json(result.rows)
}

// GET /api/kb-search-logs/stats — admin: analitik untuk KB Analytics.
export async function getKbSearchStats(req, res) {
  const [summary, topQueries, zeroResultQueries, dailyTrend] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int                                       AS total_searches,
              COUNT(DISTINCT query)::int                          AS unique_queries,
              COUNT(*) FILTER (WHERE results_count = 0)::int      AS zero_result_searches,
              COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days')::int
                                                                    AS searches_last_7_days
         FROM kb_search_logs`,
    ),
    pool.query(
      `SELECT query,
              COUNT(*)::int              AS total,
              AVG(results_count)::float  AS avg_results
         FROM kb_search_logs
        GROUP BY query
        ORDER BY total DESC
        LIMIT 10`,
    ),
    pool.query(
      `SELECT query, COUNT(*)::int AS total
         FROM kb_search_logs
        WHERE results_count = 0
        GROUP BY query
        ORDER BY total DESC
        LIMIT 10`,
    ),
    pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*)::int AS total
         FROM kb_search_logs
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC`,
    ),
  ])

  res.json({
    summary: summary.rows[0],
    top_queries: topQueries.rows,
    zero_result_queries: zeroResultQueries.rows,
    daily_trend: dailyTrend.rows,
  })
}
