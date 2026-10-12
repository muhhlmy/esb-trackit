CREATE TABLE IF NOT EXISTS api_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL UNIQUE,
    client_secret_hash VARCHAR(255) NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    organization VARCHAR(150),
    scopes TEXT[] NOT NULL DEFAULT '{assets:read}',
    rate_limit INTEGER NOT NULL DEFAULT 120,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_is_active ON api_clients(is_active);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(64) REFERENCES api_clients(client_id) ON DELETE CASCADE,
    target_url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{ticket.created,asset.created}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(is_active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id BIGSERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    attempt INTEGER NOT NULL DEFAULT 1,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_sub ON webhook_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);
