import crypto from 'node:crypto';
import { pool } from '../config/database.js';

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function generateClientCredentials() {
  const clientId = 'trcli_' + crypto.randomBytes(8).toString('hex');
  const secret = 'trsec_' + crypto.randomBytes(24).toString('hex');
  const apiKey = `trkit_${clientId}_${secret}`;
  const secretHash = hashSecret(secret);
  return { clientId, secret, apiKey, secretHash };
}

export async function createApiClient({
  name,
  organization = '',
  scopes = ['assets:read'],
  rateLimit = 120,
  expiresAt = null,
}) {
  const { clientId, secret, apiKey, secretHash } = generateClientCredentials();

  const query = `
    INSERT INTO api_clients (
      client_id, client_secret_hash, client_name, organization,
      scopes, rate_limit, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, client_id, client_name, organization, scopes, rate_limit, is_active, expires_at, created_at
  `;

  const result = await pool.query(query, [
    clientId,
    secretHash,
    name,
    organization,
    scopes,
    rateLimit,
    expiresAt,
  ]);

  return {
    ...result.rows[0],
    apiKey, // Ditampilkan hanya satu kali saat pembuatan
  };
}

export async function listApiClients() {
  const query = `
    SELECT
      id, client_id, client_name, organization, scopes,
      rate_limit, is_active, last_used_at, expires_at, created_at, updated_at
    FROM api_clients
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
}

export async function getApiClientById(id) {
  const query = `
    SELECT
      id, client_id, client_name, organization, scopes,
      rate_limit, is_active, last_used_at, expires_at, created_at, updated_at
    FROM api_clients
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function updateApiClient(id, { name, organization, scopes, rateLimit, isActive }) {
  const updates = [];
  const values = [];
  let index = 1;

  if (name !== undefined) {
    updates.push(`client_name = $${index++}`);
    values.push(name);
  }
  if (organization !== undefined) {
    updates.push(`organization = $${index++}`);
    values.push(organization);
  }
  if (scopes !== undefined) {
    updates.push(`scopes = $${index++}`);
    values.push(scopes);
  }
  if (rateLimit !== undefined) {
    updates.push(`rate_limit = $${index++}`);
    values.push(rateLimit);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${index++}`);
    values.push(Boolean(isActive));
  }

  if (updates.length === 0) return getApiClientById(id);

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE api_clients
    SET ${updates.join(', ')}
    WHERE id = $${index}
    RETURNING id, client_id, client_name, organization, scopes, rate_limit, is_active, last_used_at, expires_at, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function rotateApiClientSecret(id) {
  const client = await getApiClientById(id);
  if (!client) return null;

  const newSecret = 'trsec_' + crypto.randomBytes(24).toString('hex');
  const newApiKey = `trkit_${client.client_id}_${newSecret}`;
  const newSecretHash = hashSecret(newSecret);

  const query = `
    UPDATE api_clients
    SET client_secret_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, client_id, client_name, organization, scopes, rate_limit, is_active, last_used_at, expires_at, created_at, updated_at
  `;

  const result = await pool.query(query, [newSecretHash, id]);
  return {
    ...result.rows[0],
    apiKey: newApiKey,
  };
}

export async function revokeApiClient(id) {
  const query = `
    UPDATE api_clients
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, client_id, client_name, is_active
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function verifyApiKey(apiKey) {
  if (typeof apiKey !== 'string' || !apiKey.startsWith('trkit_')) {
    return null;
  }

  const parts = apiKey.split('_');
  if (parts.length < 4) {
    // Format: trkit_trcli_<id>_trsec_<secret>
    return null;
  }

  const clientId = `${parts[1]}_${parts[2]}`;
  const secret = `${parts[3]}_${parts[4]}`;

  if (!clientId || !secret) return null;

  const query = `
    SELECT id, client_id, client_secret_hash, client_name, organization,
           scopes, rate_limit, is_active, expires_at
    FROM api_clients
    WHERE client_id = $1 AND is_active = true
  `;
  const result = await pool.query(query, [clientId]);
  if (result.rowCount !== 1) return null;

  const client = result.rows[0];

  // Periksa kedaluwarsa jika ada
  if (client.expires_at && new Date(client.expires_at) < new Date()) {
    return null;
  }

  // Verifikasi hash dengan timing-safe equal
  const computedHash = hashSecret(secret);
  const storedHash = client.client_secret_hash;

  if (
    computedHash.length !== storedHash.length ||
    !crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash))
  ) {
    return null;
  }

  // Update last_used_at secara asinkron tanpa memblokir request
  pool.query('UPDATE api_clients SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [client.id]).catch(() => {});

  return {
    id: client.id,
    clientId: client.client_id,
    name: client.client_name,
    organization: client.organization,
    scopes: client.scopes || [],
    rateLimit: client.rate_limit,
  };
}
