// Seed data Cases/SOP Help Center (idempotent).
// Membaca backend/migrations/cases_seed.json lalu upsert per title agar
// aman dijalankan ulang tanpa duplikat.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pool } from './database.js'

const SEED_FILE = new URL('../../migrations/cases_seed.json', import.meta.url)

export async function seedCases(queryable = pool) {
  const raw = await readFile(SEED_FILE, 'utf8')
  const cases = JSON.parse(raw)

  let inserted = 0
  let updated = 0
  for (const c of cases) {
    const existing = await queryable.query('SELECT id FROM cases WHERE title = $1', [c.title])
    if (existing.rowCount === 0) {
      await queryable.query(
        `INSERT INTO cases
           (title, category, severity, tags, summary, content_html,
            problem_context, action_steps, dos, donts, snippets, status, is_custom, sort_order)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'PUBLISHED', $7, 1)`,
        [
          c.title,
          c.category,
          c.severity,
          JSON.stringify(c.tags || []),
          c.summary,
          c.contentHtml || '',
          c.isCustom === true,
        ],
      )
      inserted += 1
    } else {
      await queryable.query(
        `UPDATE cases
         SET category = $1,
             severity = $2,
             tags = $3::jsonb,
             summary = $4,
             content_html = $5,
             problem_context = NULL,
             action_steps = '[]'::jsonb,
             dos = '[]'::jsonb,
             donts = '[]'::jsonb,
             snippets = '[]'::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          c.category,
          c.severity,
          JSON.stringify(c.tags || []),
          c.summary,
          c.contentHtml || '',
          existing.rows[0].id,
        ],
      )
      updated += 1
    }
  }

  return { total: cases.length, inserted, updated }
}

const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url)

if (isRunDirectly) {
  try {
    const result = await seedCases()
    console.log(`Seed cases selesai: ${result.inserted} baru dari ${result.total} total.`)
    const count = await pool.query('SELECT count(*)::int AS n FROM cases')
    console.log('Total cases di DB =', count.rows[0].n)
  } catch (error) {
    console.error('Seed cases gagal:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
