import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const e2eEnvFile = new URL("../.env.e2e", import.meta.url);
if (existsSync(e2eEnvFile)) loadEnvFile(e2eEnvFile);

// Only disposable, explicitly configured local test databases are accepted.
// This script never drops a database and never uses backend/.env.
if (
  process.env.NODE_ENV !== "test" ||
  !["localhost", "127.0.0.1", "::1"].includes(process.env.DB_HOST) ||
  !/^[a-zA-Z_][a-zA-Z0-9_]*_test$/.test(process.env.DB_NAME || "")
) {
  throw new Error(
    "Explicit NODE_ENV=test, loopback DB_HOST and DB_NAME ending in _test required.",
  );
}
for (const name of ["DB_USER", "DB_PASSWORD", "JWT_SECRET"]) {
  if (!process.env[name]) throw new Error(`${name} must be set explicitly.`);
}

const { pool } = await import("../backend/src/config/database.js");
const { applyVersionedMigrations, loadVersionedMigrations } =
  await import("../backend/src/config/migrationRunner.js");
const { verifyRuntimeSchema } =
  await import("../backend/src/config/runtimeSchema.js");

try {
  const client = await pool.connect();
  try {
    const migrations = await loadVersionedMigrations();
    await applyVersionedMigrations(client, migrations, {
      mode: "fresh",
      expectedDatabase: process.env.DB_NAME,
      recoveryProofId: "disposable-test-database",
      changeId: "audit-remediation-tests",
    });
    await verifyRuntimeSchema(client);
    if (process.argv.includes("--seed-e2e")) {
      const { TEST_USERS } = await import("../e2e/fixtures/users.js");
      const { hashPassword } =
        await import("../backend/src/security/passwordService.js");
      for (const user of Object.values(TEST_USERS)) {
        const modules = [
          "dashboard",
          "assets",
          "assets_ga",
          "assets_ops",
          "my_assets",
          "tickets",
          "submissions",
          "shipments",
          "users",
          "logs",
          "karyawan",
          "export",
          "knowledge_base",
        ];
        const permissions = Object.fromEntries(
          modules.map((key) => [
            key,
            user.role === "user"
              ? ["dashboard", "my_assets", "tickets"].includes(key)
                ? "read_only"
                : "none"
              : "full",
          ]),
        );
        const result = await client.query(
          `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
           VALUES ($1, $2, $3, $4, $5::jsonb, true)
           ON CONFLICT (email) DO UPDATE SET
             nama = EXCLUDED.nama,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             permissions = EXCLUDED.permissions,
             is_active = true,
             deleted_at = NULL,
             deleted_by_id = NULL,
             deletion_reason = NULL,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [
            user.name,
            user.email,
            await hashPassword(user.password),
            user.role,
            JSON.stringify(permissions),
          ],
        );
        if (user.role !== "user") {
          await client.query(
            `INSERT INTO user_ticket_queues (user_id, queue_id, is_primary)
             SELECT $1, id, kode = 'IT' FROM ticket_queues
             ON CONFLICT (user_id, queue_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
            [result.rows[0].id],
          );
        }
      }

      // ── Seed data demo (idempoten) ─────────────────────────────
      // Diperlukan agar dashboard KPI, list aset, search tiket, Help Center
      // publik, dan CMS punya data untuk dites. Semua baris dibersihkan
      // setiap run karena DB test di-migrate fresh (mode: "fresh").
      await seedDemoData(client);
    }
    console.log("Disposable test database migrated and validated.");
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

/**
 * Seed data demo: aset IT/GA/Ops, kategori KB, FAQ, cases.
 * Idempoten (ON CONFLICT DO NOTHING) — aman dijalankan berulang.
 * Tanpa ini, dashboard KPI, list aset, search tiket, dan Help Center
 * publik tidak punya data untuk diuji.
 */
async function seedDemoData(client) {
  // Karyawan (pemegang aset) — wajib sebelum aset (FK nik_pemegang_asset)
  await client.query(`
    INSERT INTO karyawan (nik, nama_karyawan, email_kantor, status, title, job_level, departemen, directorate, tanggal_mulai_bekerja, employeement_status, lokasi_kerja)
    VALUES
      ('E2ENIK001', 'E2E Karyawan Satu', 'e2e.karyawan.satu@example.test', 'Active', 'Staff IT', 'S1', 'Engineering', 'Technology Directorate', '2023-01-15', 'Permanent', 'Jakarta'),
      ('E2ENIK002', 'E2E Karyawan Dua', 'e2e.karyawan.dua@example.test', 'Active', 'Staff GA', 'S1', 'General Affairs', 'Operations Directorate', '2023-03-01', 'Permanent', 'Bandung')
    ON CONFLICT (nik) DO NOTHING
  `)

  const statuses = ['In Use', 'Stock', 'In Service', 'Damaged']
  const kondisi = ['Baru', 'Normal', 'Rusak Ringan', 'Rusak Sedang']
  const brands = ['Lenovo', 'Dell', 'HP', 'Asus']

  // Aset IT (12 baris — cukup untuk dashboard KPI + list + search)
  for (let i = 1; i <= 12; i++) {
    await client.query(
      `INSERT INTO aset_ti (hostname, serial_number, spesifikasi, nik_pemegang_asset, nama_karyawan_pemegang_asset, departemen_pemegang_asset, lokasi_asset, tipe_perangkat, brand_merek, model, status, kondisi, note_asset)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT DO NOTHING`,
      [
        `E2E-LAPTOP-IT-${String(i).padStart(2, '0')}`,
        `E2E-SN-IT-${String(i).padStart(4, '0')}`,
        `CPU i5, RAM 16GB, SSD 512GB (E2E seed ${i})`,
        i <= 8 ? 'E2ENIK001' : null,
        i <= 8 ? 'E2E Karyawan Satu' : null,
        i <= 8 ? 'Engineering' : null,
        'Jakarta',
        'Laptop',
        brands[i % brands.length],
        `ThinkPad E2E ${i}`,
        statuses[i % statuses.length],
        kondisi[i % kondisi.length],
        'E2E seeded demo asset',
      ],
    )
  }

  // Aset GA + Ops (masing-masing 3 — cukup untuk list render)
  for (let i = 1; i <= 3; i++) {
    await client.query(
      `INSERT INTO aset_ga (hostname, quantity, tipe_fasilitas, nama_asset, lokasi, lokasi_detail, kondisi)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [`E2E-MEJA-GA-${String(i).padStart(2, '0')}`, 1, 'Meja Kerja', `E2E Meja Kerja ${i}`, 'Jakarta', 'Lantai 2', 'Baik'],
    )
    await client.query(
      `INSERT INTO aset_ops (hostname, nama_asset, kategori, lokasi, pic, kondisi, status, total_asset_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [`E2E-RTR-OPS-${String(i).padStart(2, '0')}`, `E2E Router Ops ${i}`, 'Network', 'Jakarta', 'E2E PIC', 'Baik', 'Aktif', 1],
    )
  }

  // KB categories (Help Center topic cards)
  await client.query(`
    INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
    VALUES
      ('it-support', 'IT Support', 'Panduan setup IT, request perangkat, dan tools jaringan', 'Laptop', true, 1, 'PUBLISHED'),
      ('hr-support', 'Human Resources (HR)', 'Kebijakan cuti, payroll, dan administrasi SDM', 'Users', true, 2, 'PUBLISHED'),
      ('ga-support', 'General Affairs (GA)', 'Fasilitas kantor, aset GA, dan layanan umum', 'Building2', false, 3, 'PUBLISHED')
    ON CONFLICT (key) DO NOTHING
  `)

  // FAQ
  await client.query(`
    INSERT INTO faq (question, answer, category, status, sort_order)
    VALUES
      ('E2E: Bagaimana cara request perangkat baru?', 'Hubungi tim IT via tombol ajukan tiket di dashboard.', 'IT Support', 'PUBLISHED', 1),
      ('E2E: Bagaimana cara mengajukan cuti?', 'Buka aplikasi HR dan isi formulir pengajuan cuti.', 'Human Resources (HR)', 'PUBLISHED', 2)
    ON CONFLICT DO NOTHING
  `)

  // Cases (artikel knowledge base — untuk Help Center publik & CMS)
  await client.query(`
    INSERT INTO cases (title, category, severity, summary, content_html, status, is_custom, sort_order)
    VALUES
      ('E2E: Setup VPN kantor', 'IT Support', 'medium', 'Panduan koneksi VPN', '<p>Klik ikon VPN, lalu pilih profil <strong>kantor</strong>. Hubungi IT bila gagal.</p>', 'PUBLISHED', false, 1),
      ('E2E: Reset kata sandi email', 'IT Support', 'high', 'Langkah reset password', '<p>Buka <em>portal self-service</em> dan ikuti petunjuknya.</p>', 'PUBLISHED', false, 2)
    ON CONFLICT DO NOTHING
  `)

  console.log('[seed] demo data seeded (aset IT/GA/Ops, kb_categories, faq, cases).')
}
