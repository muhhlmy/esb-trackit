-- Migration 0003: Update asset_shipments structure, add awb_number & item_detail, update status values & constraints

ALTER TABLE asset_shipments ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150);
ALTER TABLE asset_shipments ADD COLUMN IF NOT EXISTS sender_address TEXT;
ALTER TABLE asset_shipments ADD COLUMN IF NOT EXISTS recipient_address TEXT;
ALTER TABLE asset_shipments ADD COLUMN IF NOT EXISTS item_detail TEXT;
ALTER TABLE asset_shipments ADD COLUMN IF NOT EXISTS awb_number VARCHAR(100);

-- Sync legacy and new column values for existing records
UPDATE asset_shipments SET awb_number = tracking_number WHERE awb_number IS NULL AND tracking_number IS NOT NULL;
UPDATE asset_shipments SET tracking_number = awb_number WHERE tracking_number IS NULL AND awb_number IS NOT NULL;
UPDATE asset_shipments SET item_detail = item_description WHERE item_detail IS NULL AND item_description IS NOT NULL;
UPDATE asset_shipments SET item_description = item_detail WHERE item_description IS NULL AND item_detail IS NOT NULL;
UPDATE asset_shipments SET recipient_address = destination WHERE recipient_address IS NULL AND destination IS NOT NULL;
UPDATE asset_shipments SET destination = recipient_address WHERE destination IS NULL AND recipient_address IS NOT NULL;

-- Drop old status constraint before updating to new status values
ALTER TABLE asset_shipments DROP CONSTRAINT IF EXISTS chk_asset_shipments_status;

-- Migrate existing statuses to new standard Indonesian statuses
UPDATE asset_shipments SET status = 'Menunggu Pickup' WHERE status = 'belum_dikirim';
UPDATE asset_shipments SET status = 'Di Pickup' WHERE status = 'pending';
UPDATE asset_shipments SET status = 'Dalam Pengiriman' WHERE status = 'sedang_dikirim';
UPDATE asset_shipments SET status = 'Terkirim' WHERE status = 'diterima';
UPDATE asset_shipments SET status = 'Dibatalkan' WHERE status = 'cancel';

-- Re-add check constraint and update default
ALTER TABLE asset_shipments ADD CONSTRAINT chk_asset_shipments_status
  CHECK (status IN (
    'Menunggu Pickup',
    'Di Pickup',
    'Dalam Pengiriman',
    'Terkirim',
    'Dibatalkan',
    'belum_dikirim',
    'pending',
    'sedang_dikirim',
    'diterima',
    'cancel'
  ));
ALTER TABLE asset_shipments ALTER COLUMN status SET DEFAULT 'Menunggu Pickup';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asset_shipments_awb_number ON asset_shipments(awb_number);
