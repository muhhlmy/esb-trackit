import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'assets_monitoring',
  ssl: false,
});

const users = [
  {
    email: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@admin.com',
    nama: process.env.SEED_SUPERADMIN_NAME || 'Super Admin',
    password: process.env.SEED_SUPERADMIN_PASSWORD || 'admin123',
    role: 'superadmin',
  },
  {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@admin.com',
    nama: process.env.SEED_ADMIN_NAME || 'Admin IT',
    password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
    role: 'admin',
  },
  {
    email: process.env.SEED_USER_EMAIL || 'user@user.com',
    nama: process.env.SEED_USER_NAME || 'User Karyawan',
    password: process.env.SEED_USER_PASSWORD || 'user12345',
    role: 'user',
  },
];

try {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    // Upsert safely using ON CONFLICT (email) to respect soft-delete integrity
    await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         nama = EXCLUDED.nama,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         is_active = true,
         deleted_at = NULL,
         updated_at = NOW()`,
      [u.nama, u.email, hash, u.role, JSON.stringify({})],
    );
    console.log(`Synced user: ${u.email} (${u.role})`);
  }
  console.log('All users created/updated successfully.');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}

