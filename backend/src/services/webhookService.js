import crypto from 'node:crypto';
import { pool } from '../config/database.js';

export function generateWebhookSecret() {
  return 'whsec_' + crypto.randomBytes(24).toString('hex');
}

export function signWebhookPayload(payload, secret) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(serialized).digest('hex');
}

export async function createWebhookSubscription({
  clientId = null,
  targetUrl,
  secret = null,
  events = ['ticket.created', 'asset.created'],
}) {
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    throw new Error('targetUrl harus berupa URL HTTP atau HTTPS yang valid.');
  }

  const webhookSecret = secret || generateWebhookSecret();

  const query = `
    INSERT INTO webhook_subscriptions (client_id, target_url, secret, events)
    VALUES ($1, $2, $3, $4)
    RETURNING id, client_id, target_url, secret, events, is_active, failure_count, created_at
  `;

  const result = await pool.query(query, [clientId, targetUrl, webhookSecret, events]);
  return result.rows[0];
}

export async function listWebhookSubscriptions(clientId = null) {
  let query = `
    SELECT id, client_id, target_url, secret, events, is_active, failure_count, created_at, updated_at
    FROM webhook_subscriptions
  `;
  const values = [];

  if (clientId) {
    query += ` WHERE client_id = $1`;
    values.push(clientId);
  }

  query += ` ORDER BY created_at DESC`;
  const result = await pool.query(query, values);
  return result.rows;
}

export async function getWebhookSubscriptionById(id) {
  const query = `
    SELECT id, client_id, target_url, secret, events, is_active, failure_count, created_at, updated_at
    FROM webhook_subscriptions
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function updateWebhookSubscription(id, { targetUrl, events, isActive }) {
  const updates = [];
  const values = [];
  let index = 1;

  if (targetUrl !== undefined) {
    updates.push(`target_url = $${index++}`);
    values.push(targetUrl);
  }
  if (events !== undefined) {
    updates.push(`events = $${index++}`);
    values.push(events);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${index++}`);
    values.push(Boolean(isActive));
  }

  if (updates.length === 0) return getWebhookSubscriptionById(id);

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE webhook_subscriptions
    SET ${updates.join(', ')}
    WHERE id = $${index}
    RETURNING id, client_id, target_url, secret, events, is_active, failure_count, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteWebhookSubscription(id) {
  const query = `DELETE FROM webhook_subscriptions WHERE id = $1 RETURNING id`;
  const result = await pool.query(query, [id]);
  return result.rowCount > 0;
}

export async function dispatchWebhookEvent(event, payload) {
  try {
    // Cari semua subscription aktif yang mendengarkan event ini
    const subQuery = `
      SELECT id, client_id, target_url, secret, failure_count
      FROM webhook_subscriptions
      WHERE is_active = true AND $1 = ANY(events)
    `;
    const subResult = await pool.query(subQuery, [event]);

    if (subResult.rows.length === 0) {
      return { dispatched: 0 };
    }

    // Eksekusi pengiriman asinkron per subscription (fire-and-forget terisolasi)
    const dispatches = subResult.rows.map(async (sub) => {
      const serializedPayload = JSON.stringify({
        id: 'evt_' + crypto.randomBytes(12).toString('hex'),
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const signature = signWebhookPayload(serializedPayload, sub.secret);
      let statusCode = null;
      let errorMessage = null;

      try {
        const response = await fetch(sub.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-TrackIT-Event': event,
            'X-TrackIT-Signature': `sha256=${signature}`,
            'User-Agent': 'TrackIT-Webhook-Worker/1.0',
          },
          body: serializedPayload,
          signal: AbortSignal.timeout(5000), // Timeout isolasi 5 detik
        });

        statusCode = response.status;
        if (!response.ok) {
          errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        }
      } catch (err) {
        errorMessage = err.message || 'Network error / timeout';
      }

      // Catat hasil delivery ke database
      await pool.query(
        `INSERT INTO webhook_deliveries (
          subscription_id, event, payload, status_code, delivered_at, error_message
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
        [sub.id, event, payload, statusCode, errorMessage],
      );

      // Kelola failure count
      if (errorMessage) {
        await pool.query(
          `UPDATE webhook_subscriptions
           SET failure_count = failure_count + 1,
               is_active = CASE WHEN failure_count >= 10 THEN false ELSE is_active END
           WHERE id = $1`,
          [sub.id],
        );
      } else {
        await pool.query(
          `UPDATE webhook_subscriptions SET failure_count = 0 WHERE id = $1`,
          [sub.id],
        );
      }
    });

    // Jalankan seluruh pengiriman secara non-blocking
    Promise.allSettled(dispatches).catch(() => {});

    return { dispatched: subResult.rows.length };
  } catch (error) {
    console.error('[WebhookDispatcher] Error dispatching event:', error.message);
    return { dispatched: 0, error: error.message };
  }
}

export async function listWebhookDeliveries({ limit = 50, subscriptionId = null } = {}) {
  let query = `
    SELECT d.id, d.subscription_id, d.event, d.payload, d.status_code, d.attempt,
           d.delivered_at, d.error_message, d.created_at,
           s.target_url, s.client_id
    FROM webhook_deliveries d
    LEFT JOIN webhook_subscriptions s ON d.subscription_id = s.id
  `;
  const values = [];

  if (subscriptionId) {
    query += ` WHERE d.subscription_id = $1`;
    values.push(subscriptionId);
  }

  query += ` ORDER BY d.created_at DESC LIMIT $${values.length + 1}`;
  values.push(Math.min(limit, 100));

  const result = await pool.query(query, values);
  return result.rows;
}
