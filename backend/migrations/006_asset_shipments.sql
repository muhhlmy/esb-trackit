-- =====================================================================
-- MIGRATION 006: asset_shipments (Tracker Pengiriman Barang / Aset)
-- =====================================================================

CREATE TABLE IF NOT EXISTS asset_shipments (
    id                  SERIAL PRIMARY KEY,
    request_date        DATE NOT NULL,
    recipient_name      VARCHAR(150) NOT NULL,
    item_description    TEXT NOT NULL,
    destination         VARCHAR(255) NOT NULL,
    tracking_number     VARCHAR(100) NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'belum_dikirim',
    delivery_proof_url  TEXT NULL,
    created_by          INTEGER NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_asset_shipments_status
        CHECK (status IN ('belum_dikirim', 'pending', 'sedang_dikirim', 'diterima', 'cancel')),

    CONSTRAINT fk_asset_shipments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_shipments_request_date ON asset_shipments(request_date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_shipments_status ON asset_shipments(status);
CREATE INDEX IF NOT EXISTS idx_asset_shipments_tracking_number ON asset_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_asset_shipments_created_at ON asset_shipments(created_at DESC);
