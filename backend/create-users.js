import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '/tmp/esb-trackit/backend/.env' });

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const { Pool } = pg;
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: false,
});

const users = [
  { email: 'superadmin@admin.com', nama: 'Super Admin', password: 'admin123', role: 'superadmin' },
  { email: 'admin@admin.com', nama: 'Admin IT', password: 'admin123', role: 'admin' },
  { email: 'user@user.com', nama: 'User Karyawan', password: 'user12345', role: 'user' },
];

try {
  const pool2 = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false,
  });

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    // Upsert: delete then insert
    await pool2.query('DELETE FROM users WHERE email = $1', [u.email]);
    await pool2.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
      [u.nama, u.email, hash, u.role, JSON.stringify({})],
    );
    console.log(`Created user: ${u.email} (${u.role})`);
  }
  await pool2.end();
  console.log('All users created successfully.');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}
