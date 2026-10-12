import { query } from '../config/database.js';

export const PLATFORM_CAPABILITIES = [
  'assets:read',
  'assets:write',
  'tickets:read',
  'tickets:write',
  'reports:read',
  'webhooks:manage',
  'api_clients:manage',
  'metrics:read',
  'system:status',
];

export const SUPPORTED_WEBHOOK_EVENTS = [
  'ticket.created',
  'ticket.status_changed',
  'ticket.assigned',
  'asset.created',
  'asset.assigned',
  'asset.returned',
  'submission.created',
  'submission.approved',
  'shipment.status_changed',
];

export async function getSystemStatus(req, res) {
  let dbStatus = 'connected';
  try {
    await query('SELECT 1');
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: dbStatus === 'connected' ? 'operational' : 'degraded',
    version: '1.0.0',
    platform: 'TrackIT Enterprise API Platform',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    capabilities: PLATFORM_CAPABILITIES,
  });
}

export function getSystemCapabilities(req, res) {
  res.json({
    version: '1.0.0',
    scopes: PLATFORM_CAPABILITIES,
    webhook_events: SUPPORTED_WEBHOOK_EVENTS,
    rate_limits: {
      default_per_minute: 120,
      reporting_per_minute: 60,
    },
    auth_schemes: ['Bearer (API Key)', 'X-API-Key', 'Session Cookie (Browser)'],
  });
}
