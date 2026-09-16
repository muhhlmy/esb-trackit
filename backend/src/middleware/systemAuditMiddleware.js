import { recordSystemAudit } from '../services/systemAuditService.js'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const EXCLUDED_PATHS = new Set(['/api/auth/login', '/api/auth/logout'])

function routeDetails(req) {
  const path = (req.originalUrl || req.path || '').split('?')[0]
  const parts = path.split('/').filter(Boolean)
  const module = parts[1] || 'system'
  const entityId = [...parts].reverse().find((part) => /^\d+$/.test(part)) || null
  const tail = parts.at(-1)
  const action = tail === 'claim'
    ? 'CLAIM'
    : tail === 'reassign'
      ? 'REASSIGN'
      : tail === 'comments'
        ? 'COMMENT'
        : tail === 'casp'
          ? 'RATE'
          : tail === 'import'
            ? 'IMPORT'
            : req.method === 'POST'
              ? 'CREATE'
              : req.method === 'DELETE'
                ? 'DELETE'
                : 'UPDATE'
  return { path, module, entityId, action }
}

// Fallback for successful authenticated mutations which do not yet have a
// domain-specific audit entry. Domain handlers retain richer before/after data.
export function systemAuditFallback(req, res, next) {
  if (!MUTATION_METHODS.has(req.method) || EXCLUDED_PATHS.has(req.path)) return next()

  res.once('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || res.locals.systemAuditRecorded) return
    if (!req.user?.id) return
    const { path, module, entityId, action } = routeDetails(req)
    recordSystemAudit(req, {
      module,
      action,
      entityType: module,
      entityId,
      entityLabel: path,
      summary: `${req.method} ${path} oleh ${req.user.nama || req.user.email || 'pengguna'}.`,
      // Route generik tidak selalu mengetahui kondisi database sebelumnya,
      // tetapi payload yang diterima tetap berguna untuk pemeriksaan detail.
      after: req.method === 'DELETE' ? undefined : req.body,
    }).catch((error) => console.error('[System Audit] Gagal mencatat fallback:', error.message))
  })
  next()
}
