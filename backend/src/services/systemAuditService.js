import { pool } from '../config/database.js'

const REDACTED_KEYS = new Set([
  'password', 'password_hash', 'currentpassword', 'newpassword', 'resettoken',
  'token', 'otp', 'otpcode', 'attachment', 'attachment_data',
])
const MAX_TEXT_LENGTH = 2000

function sanitizeAuditValue(value, depth = 0) {
  if (value === undefined) return undefined
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}…` : value
  }
  if (depth >= 4) return '[dipotong]'
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeAuditValue(item, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        if (REDACTED_KEYS.has(key.toLowerCase())) return [[key, '[disamarkan]']]
        const sanitized = sanitizeAuditValue(item, depth + 1)
        return sanitized === undefined ? [] : [[key, sanitized]]
      }),
    )
  }
  return String(value)
}

function actorFromRequest(req) {
  const actorId = Number(req?.user?.id)
  return {
    actorUserId: Number.isSafeInteger(actorId) && actorId > 0 ? actorId : null,
    actorName: req?.user?.nama || req?.user?.email || 'Sistem',
    actorEmail: req?.user?.email || null,
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  }
}

export async function recordSystemAudit(req, entry, queryable = pool) {
  const actor = actorFromRequest(req)
  const beforeData = sanitizeAuditValue(entry.before)
  const afterData = sanitizeAuditValue(entry.after)
  const hasActorUserId = Object.prototype.hasOwnProperty.call(entry, 'actorUserId')
  await queryable.query(
    `INSERT INTO system_audit_logs
       (module, action, entity_type, entity_id, entity_label, summary,
        actor_user_id, actor_name, actor_email, before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13)`,
    [
      entry.module,
      entry.action,
      entry.entityType,
      entry.entityId == null ? null : String(entry.entityId),
      entry.entityLabel || null,
      entry.summary,
      hasActorUserId ? entry.actorUserId : actor.actorUserId,
      entry.actorName ?? actor.actorName,
      entry.actorEmail ?? actor.actorEmail,
      beforeData === undefined ? null : JSON.stringify(beforeData),
      afterData === undefined ? null : JSON.stringify(afterData),
      entry.ipAddress ?? actor.ipAddress,
      entry.userAgent ?? actor.userAgent,
    ],
  )
  if (req?.res?.locals) req.res.locals.systemAuditRecorded = true
}
