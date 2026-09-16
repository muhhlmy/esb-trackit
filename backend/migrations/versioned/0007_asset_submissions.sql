CREATE TABLE asset_submissions (
    id                SERIAL PRIMARY KEY,
    submission_number VARCHAR(80) NOT NULL UNIQUE,
    payload           JSONB NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by        INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_asset_submissions_status
      CHECK (status IN ('draft', 'submitted', 'completed', 'cancelled')),
    CONSTRAINT chk_asset_submissions_payload_object
      CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX idx_asset_submissions_status ON asset_submissions(status);
CREATE INDEX idx_asset_submissions_created_by ON asset_submissions(created_by);
CREATE INDEX idx_asset_submissions_created_at ON asset_submissions(created_at DESC);
