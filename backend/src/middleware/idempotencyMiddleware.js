// In-memory idempotency cache with 24-hour TTL (SaaS grade retry protection)
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

// Cleanup expired idempotency entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000).unref();

export function idempotencyMiddleware(req, res, next) {
  // Hanya proses pada mutasi HTTP (POST, PATCH)
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next();
  }

  const clientScope = req.apiClient?.clientId || req.user?.id || 'anon';
  const cacheKey = `${clientScope}:${req.method}:${req.path}:${idempotencyKey.trim()}`;

  const cached = idempotencyStore.get(cacheKey);
  if (cached) {
    res.setHeader('Idempotency-Key', idempotencyKey);
    res.setHeader('X-Idempotent-Replay', 'true');
    return res.status(cached.status).json(cached.body);
  }

  // Intercept res.json to capture response payload
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(cacheKey, {
        status: res.statusCode,
        body,
        timestamp: Date.now(),
      });
    }
    res.setHeader('Idempotency-Key', idempotencyKey);
    return originalJson(body);
  };

  next();
}

export function clearIdempotencyStore() {
  idempotencyStore.clear();
}
