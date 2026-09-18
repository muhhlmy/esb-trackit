const JSON_BODY_METHODS = new Set(['PATCH', 'POST', 'PUT'])

export function requireJsonRequest(req, res, next) {
  if (!JSON_BODY_METHODS.has(req.method)) {
    next()
    return
  }

  // Bodiless POST to logout does not require Content-Type: application/json
  const path = req.path || req.originalUrl || ''
  if (path === '/api/auth/logout' || path.endsWith('/auth/logout') || path.endsWith('/logout')) {
    next()
    return
  }

  const contentType = req.headers['content-type']
  if (typeof contentType !== 'string') {
    // A request without a Content-Type and without a body has nothing to parse
    // (e.g. POST /claim, POST /reassign take no payload) — do not reject it.
    const contentLength = req.headers['content-length']
    const hasBody = contentLength !== undefined && contentLength !== '0'
    if (!hasBody) {
      next()
      return
    }
    res.status(415).json({ message: 'Request body wajib menggunakan application/json.' })
    return
  }

  // Allow multipart/form-data for file uploads (backup restore, etc.)
  if (contentType.startsWith('multipart/form-data')) {
    next()
    return
  }

  if (!/^application\/json(?:\s*;\s*charset\s*=\s*utf-8\s*)?$/i.test(contentType)) {
    res.status(415).json({ message: 'Request body wajib menggunakan application/json.' })
    return
  }

  next()
}
