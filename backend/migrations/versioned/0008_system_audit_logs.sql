CREATE TABLE system_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    module VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    entity_label VARCHAR(300),
    summary TEXT NOT NULL,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(150) NOT NULL DEFAULT 'Sistem',
    actor_email VARCHAR(150),
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_audit_logs_created_at ON system_audit_logs(created_at DESC);
CREATE INDEX idx_system_audit_logs_module_action ON system_audit_logs(module, action);
CREATE INDEX idx_system_audit_logs_entity ON system_audit_logs(entity_type, entity_id);
