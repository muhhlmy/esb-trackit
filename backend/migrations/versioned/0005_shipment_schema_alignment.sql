-- CREATE TABLE IF NOT EXISTS does not upgrade existing shipment tables.
-- Refuse incomplete legacy data rather than inventing a destination.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM asset_shipments WHERE destination IS NULL) THEN
    RAISE EXCEPTION 'Lengkapi destination pengiriman yang NULL sebelum menjalankan migrasi 0005.';
  END IF;
END;
$$;

ALTER TABLE asset_shipments ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;
ALTER TABLE asset_shipments ALTER COLUMN destination SET NOT NULL;
