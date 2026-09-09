import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVersionedMigrations, buildMigrationPlan, assertMigrationAuthorization } from '../src/config/migrationRunner.js'

test('canonical migrations load PLpgSQL safely and detect applied checksum drift', async () => {
  const migrations = await loadVersionedMigrations()
  assert.deepEqual(migrations.map(({ version }) => version), [1, 2])
  assert.equal(buildMigrationPlan(migrations, []).length, 2)
  assert.equal(buildMigrationPlan(migrations, migrations).length, 0)
  assert.throws(() => buildMigrationPlan(migrations, [{ ...migrations[0], checksum: 'modified' }]), /Checksum/)
  assert.ok(migrations.every(({ sql }) => !/DROP TABLE|INSERT INTO users|admin123/.test(sql)))
})

test('production migration apply requires a change ID and exact target confirmation', () => {
  const databaseConfig = { host: 'database.internal', database: 'trackit', production: true }
  const environment = {
    MIGRATION_MODE: 'fresh',
    MIGRATION_EXPECTED_HOST: 'database.internal',
    MIGRATION_EXPECTED_DATABASE: 'trackit',
    ALLOW_DB_MIGRATIONS: 'true',
    MIGRATION_RECOVERY_PROOF_ID: 'verified-restore-record',
  }
  assert.throws(() => assertMigrationAuthorization({ databaseConfig, environment, apply: true }), /MIGRATION_CHANGE_ID/)
  environment.MIGRATION_CHANGE_ID = 'change-123'
  assert.equal(assertMigrationAuthorization({ databaseConfig, environment, apply: true }).changeId, 'change-123')
  environment.MIGRATION_EXPECTED_HOST = 'other.internal'
  assert.throws(() => assertMigrationAuthorization({ databaseConfig, environment, apply: true }), /MIGRATION_EXPECTED_HOST/)
})
