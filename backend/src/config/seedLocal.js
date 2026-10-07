import bcrypt from 'bcryptjs'
import pg from 'pg'
import { env } from './env.js'

async function seed() {
  const pool = new pg.Pool({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.database,
  })

  const client = await pool.connect()
  try {
    const pw = 'Password123!'
    const hash = await bcrypt.hash(pw, 12)
    const permissions = JSON.stringify({
      dashboard: 'full',
      assets: 'full',
      tickets: 'full',
      karyawan: 'full',
      users: 'full',
      knowledge_base: 'full',
      export: 'full',
      backup: 'full',
    })

    await client.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ($1, $2, $3, 'superadmin', $4::jsonb, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3;`,
      ['Super Administrator', 'superadmin@admin.com', hash, permissions],
    )

    await client.query(
      `INSERT INTO ticket_queues (kode, nama, deskripsi) VALUES
        ('GA', 'GA Support', 'General Affairs support & facilities'),
        ('HR', 'HR Support', 'Human Resources support & services'),
        ('IT', 'IT Support', 'IT support & services')
      ON CONFLICT (kode) DO NOTHING;`,
    )

    console.log(`Berhasil seed superadmin: superadmin@admin.com / ${pw}`)
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
