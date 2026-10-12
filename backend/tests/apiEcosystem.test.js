import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { createSession } from '../src/services/sessionService.js';
import { signWebhookPayload } from '../src/services/webhookService.js';

test('Enterprise API Ecosystem & Integration Hub Test Suite', async (t) => {
  let server;
  let baseUrl;
  let superadminToken;
  let superadminId;
  let normalUserToken;
  let normalUserId;
  let createdClientId;
  let createdApiKey;
  let subscriptionId;

  t.before(async () => {
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const ts = Date.now();

    // 1. Superadmin User
    const resSA = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Ecosystem Admin Test', $1, '$2b$10$e8w8X9nZgLp5oN4n44444eR8oOSkDpOPxE/Cu0000000000000000', 'superadmin', '{}'::jsonb, true)
       RETURNING id`,
      [`eco_sa_${ts}@company.com`],
    );
    superadminId = resSA.rows[0].id;
    const sessionSA = await createSession(superadminId);
    const saToken = jwt.sign(
      {
        sub: String(superadminId),
        id: superadminId,
        sid: sessionSA.sessionId,
        email: `eco_sa_${ts}@company.com`,
        role: 'superadmin',
        permissions: {},
      },
      env.jwt.secret,
      { expiresIn: '1h' },
    );
    superadminToken = `Bearer ${saToken}`;

    // 2. Normal User
    const resUser = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Ecosystem Normal User', $1, '$2b$10$e8w8X9nZgLp5oN4n44444eR8oOSkDpOPxE/Cu0000000000000000', 'user', '{}'::jsonb, true)
       RETURNING id`,
      [`eco_user_${ts}@company.com`],
    );
    normalUserId = resUser.rows[0].id;
    const sessionUser = await createSession(normalUserId);
    const uToken = jwt.sign(
      {
        sub: String(normalUserId),
        id: normalUserId,
        sid: sessionUser.sessionId,
        email: `eco_user_${ts}@company.com`,
        role: 'user',
        permissions: {},
      },
      env.jwt.secret,
      { expiresIn: '1h' },
    );
    normalUserToken = `Bearer ${uToken}`;
  });

  t.after(async () => {
    try {
      if (subscriptionId) {
        await pool.query('DELETE FROM webhook_subscriptions WHERE id = $1', [subscriptionId]);
      }
      if (createdClientId) {
        await pool.query('DELETE FROM api_clients WHERE id = $1', [createdClientId]);
      }
      if (superadminId) {
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [superadminId]);
        await pool.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [superadminId]);
      }
      if (normalUserId) {
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [normalUserId]);
        await pool.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [normalUserId]);
      }
    } catch {
      // ignore
    } finally {
      if (server) {
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        await new Promise((resolve) => server.close(resolve));
      }
    }
  });

  await t.test('1. Liveness endpoint GET /health/live returns 200 with status live', async () => {
    const res = await fetch(`${baseUrl}/health/live`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'live');
    assert.ok(typeof body.uptime === 'number');
  });

  await t.test('2. Readiness endpoint GET /health/ready returns 200 with database connected', async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ready');
    assert.equal(body.database, 'connected');
  });

  await t.test('3. Prometheus metrics endpoint GET /metrics returns valid text format', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/plain'));
    const text = await res.text();
    assert.ok(text.includes('process_uptime_seconds'));
    assert.ok(text.includes('trackit_database_healthy 1'));
  });

  await t.test('4. OpenAPI specification GET /openapi.json returns valid contract', async () => {
    const res = await fetch(`${baseUrl}/openapi.json`);
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.1.0');
    assert.equal(spec.info.title, 'TrackIT Enterprise API Platform');
  });

  await t.test('5. System discovery GET /api/v1/system/status returns capabilities', async () => {
    const res = await fetch(`${baseUrl}/api/v1/system/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'operational');
    assert.ok(Array.isArray(body.capabilities));
    assert.ok(body.capabilities.includes('assets:read'));
  });

  await t.test('6. Unauthenticated request to /api/v1/api-clients is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients`);
    assert.equal(res.status, 401);
  });

  await t.test('7. Regular user is denied from creating API clients with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: normalUserToken,
      },
      body: JSON.stringify({ name: 'Unauthorized App' }),
    });
    assert.equal(res.status, 403);
  });

  await t.test('8. Superadmin can register API Client (POST /api/v1/api-clients)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: superadminToken,
      },
      body: JSON.stringify({
        name: 'Grafana BI Integration',
        organization: 'Enterprise Ops',
        scopes: ['assets:read', 'reports:read', 'api_clients:manage', 'webhooks:manage'],
        rateLimit: 300,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.ok(body.data.apiKey.startsWith('trkit_'));
    createdClientId = body.data.id;
    createdApiKey = body.data.apiKey;
  });

  await t.test('9. API client can authenticate using X-API-Key to list clients', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients`, {
      headers: {
        'X-API-Key': createdApiKey,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some((c) => c.id === createdClientId));
  });

  await t.test('10. API client secret rotation (POST /api/v1/api-clients/:id/rotate-secret)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients/${createdClientId}/rotate-secret`, {
      method: 'POST',
      headers: {
        Authorization: superadminToken,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.apiKey);
    const newApiKey = body.data.apiKey;
    assert.notEqual(newApiKey, createdApiKey);

    // Old API key must now be rejected
    const oldKeyRes = await fetch(`${baseUrl}/api/v1/api-clients`, {
      headers: { 'X-API-Key': createdApiKey },
    });
    assert.equal(oldKeyRes.status, 401);

    // New API key must succeed
    const newKeyRes = await fetch(`${baseUrl}/api/v1/api-clients`, {
      headers: { 'X-API-Key': newApiKey },
    });
    assert.equal(newKeyRes.status, 200);

    createdApiKey = newApiKey;
  });

  await t.test('11. Create webhook subscription (POST /api/v1/webhook-subscriptions)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/webhook-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: superadminToken,
      },
      body: JSON.stringify({
        targetUrl: 'https://example.com/webhooks/trackit',
        events: ['ticket.created', 'asset.assigned'],
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.ok(body.data.secret.startsWith('whsec_'));
    subscriptionId = body.data.id;
  });

  await t.test('12. Webhook payload HMAC-SHA256 signature calculation is verified', () => {
    const secret = 'whsec_test_secret_123';
    const payload = { event: 'ticket.created', id: 'TKT-1001' };
    const sig = signWebhookPayload(payload, secret);
    assert.equal(typeof sig, 'string');
    assert.equal(sig.length, 64); // SHA256 hex string length
  });

  await t.test('13. Revoke API Client (POST /api/v1/api-clients/:id/revoke)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients/${createdClientId}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: superadminToken,
      },
    });
    assert.equal(res.status, 200);

    // Revoked client key must now be rejected
    const testRes = await fetch(`${baseUrl}/api/v1/api-clients`, {
      headers: { 'X-API-Key': createdApiKey },
    });
    assert.equal(testRes.status, 401);
  });

  await t.test('14. Enterprise Idempotency-Key deduplication prevents duplicate processing', async () => {
    const idempotencyKey = `idemp_${Date.now()}_abc`;

    // First request: regular creation
    const res1 = await fetch(`${baseUrl}/api/v1/webhook-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: superadminToken,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        targetUrl: 'https://example.com/idempotent-test',
        events: ['ticket.created'],
      }),
    });
    assert.equal(res1.status, 201);
    assert.equal(res1.headers.get('idempotency-key'), idempotencyKey);
    assert.equal(res1.headers.get('x-idempotent-replay'), null);
    const body1 = await res1.json();
    assert.ok(body1.data.id);

    // Second request with SAME Idempotency-Key: replayed cached response
    const res2 = await fetch(`${baseUrl}/api/v1/webhook-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: superadminToken,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        targetUrl: 'https://example.com/idempotent-test',
        events: ['ticket.created'],
      }),
    });
    assert.equal(res2.status, 201);
    assert.equal(res2.headers.get('idempotency-key'), idempotencyKey);
    assert.equal(res2.headers.get('x-idempotent-replay'), 'true');
    const body2 = await res2.json();
    assert.equal(body2.data.id, body1.data.id);
  });

  await t.test('15. RFC 9457 Problem Details standard fields returned on API error', async () => {
    const res = await fetch(`${baseUrl}/api/v1/api-clients/99999999-9999-9999-9999-999999999999/rotate-secret`, {
      method: 'POST',
      headers: {
        Authorization: superadminToken,
      },
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    // RFC 9457 top-level properties
    assert.ok(body.type);
    assert.ok(body.title);
    assert.equal(body.status, 404);
    assert.ok(body.detail);
    assert.ok(body.instance);
    // Backward compatible TrackIT error structure
    assert.ok(body.error);
    assert.equal(body.error.code, 'RESOURCE_NOT_FOUND');
  });
});
