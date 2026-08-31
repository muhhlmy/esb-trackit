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
  for (const c of cases) {
    const result = await queryable.query(
      `INSERT INTO cases
         (title, category, severity, tags, summary, problem_context,
          action_steps, dos, donts, snippets, status, is_custom, sort_order)
       SELECT $1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
              'PUBLISHED', $11, 1
       WHERE NOT EXISTS (SELECT 1 FROM cases WHERE title = $12)`,
      [
        c.title,
        c.category,
        c.severity,
        JSON.stringify(c.tags),
        c.summary,
        c.problemContext,
        JSON.stringify(c.actionSteps),
        JSON.stringify(c.dos),
        JSON.stringify(c.donts),
        JSON.stringify(c.snippets),
        c.isCustom === true,
        c.title,
      ],
    )
    if (result.rowCount > 0) inserted += 1
  }

  return { total: cases.length, inserted }
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
