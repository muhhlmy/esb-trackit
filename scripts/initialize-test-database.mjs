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
    }
    console.log("Disposable test database migrated and validated.");
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
