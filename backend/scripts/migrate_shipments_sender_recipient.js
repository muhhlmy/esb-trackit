import { pool } from '../src/config/database.js'

async function runMigration() {
  console.log('Running migration: Add sender_name, sender_address, recipient_address to asset_shipments...')
  try {
    await pool.query(`
      ALTER TABLE asset_shipments
      ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150) DEFAULT '',
      ADD COLUMN IF NOT EXISTS sender_address TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS recipient_address TEXT DEFAULT '';

      -- Populate recipient_address from existing destination if present
      UPDATE asset_shipments
      SET recipient_address = destination
      WHERE (recipient_address IS NULL OR recipient_address = '') AND destination IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_asset_shipments_sender_name ON asset_shipments(sender_name);
      CREATE INDEX IF NOT EXISTS idx_asset_shipments_recipient_name ON asset_shipments(recipient_name);
    `)
    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
