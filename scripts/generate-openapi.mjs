// Enterprise OpenAPI 3.1 contract generator for the TrackIT platform API.
// Emits backend/src/contracts/openapi.json — run: node scripts/generate-openapi.mjs
import { writeFileSync } from 'node:fs'

const ERROR_RESPONSES = {
  400: { description: 'Validation error — request body or parameters are invalid.' },
  401: { description: 'Authentication required. Provide a session cookie, Bearer JWT, or X-API-Key.' },
  403: { description: 'Forbidden — insufficient role, permission, or API-client scope.' },
  404: { description: 'Resource not found (or soft-deleted).' },
  409: { description: 'Conflict — duplicate unique value or state violation.' },
  429: { description: 'Rate limit exceeded. Respect RateLimit-* and Retry-After response headers.' },
  500: { description: 'Internal server error. Correlate via the X-Request-ID response header.' },
}

const problemSchema = {
  type: 'object',
  description: 'RFC 9457 Problem Details error envelope. `error.code` is a stable machine-readable code; `detail`/`message` are human-readable.',
  properties: {
    type: { type: 'string', format: 'uri', example: 'https://trackit.esb.co.id/errors/forbidden' },
    title: { type: 'string', example: 'FORBIDDEN' },
    status: { type: 'integer', example: 403 },
    detail: { type: 'string' },
    instance: { type: 'string', example: '/api/assets/42' },
    requestId: { type: 'string', format: 'uuid' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'FORBIDDEN' },
        message: { type: 'string' },
        details: {},
      },
    },
  },
}

const pageParam = { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number (1-based). Response exposes X-Page / X-Total-Pages headers.' }
const pageSizeParam = { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200, default: 20 }, description: 'Items per page. Response exposes X-Page-Size / X-Total-Count headers.' }
const searchParam = { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Case-insensitive keyword filter across searchable fields.' }
const idempotencyHeader = { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', maxLength: 255 }, description: 'Optional idempotency key for POST/PATCH. Replays return the cached response with X-Idempotent-Replay: true.' }

const session = [{ SessionCookie: [] }]
const user = [{ SessionCookie: [] }, { BearerAuth: [] }]
const admin = [{ SessionCookie: [] }, { BearerAuth: [] }]
const platform = [{ ApiKeyAuth: [] }, { SessionCookie: [] }, { BearerAuth: [] }]

const paths = {}
const op = (summary, tag, security, extra = {}) => ({
  summary,
  tags: [tag],
  security,
  parameters: [],
  responses: { 200: { description: 'Success' }, ...ERROR_RESPONSES },
  ...extra,
})

const crud = (basePath, tag, securityWrite, opts = {}) => {
  const writeSecurity = securityWrite || admin
  paths[basePath] = {
    get: op(opts.listSummary || `List ${tag}`, tag, opts.listSecurity || user, {
      parameters: [pageParam, pageSizeParam, searchParam, ...(opts.listParams || [])],
    }),
    post: op(opts.createSummary || `Create ${tag}`, tag, writeSecurity, {
      parameters: [idempotencyHeader],
      requestBody: opts.createBody,
    }),
  }
  paths[`${basePath}/{id}`] = {
    get: op(`Get ${tag} by ID`, tag, opts.listSecurity || user, {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    }),
    put: op(`Replace ${tag}`, tag, writeSecurity, {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: opts.createBody,
    }),
    delete: op(`Soft-delete ${tag}`, tag, writeSecurity, {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    }),
  }
}

// ───────────────────────────── Platform / Observability ─────────────────────────────
paths['/health'] = { get: op('Full Health Check', 'Platform', [], { responses: { 200: { description: 'Healthy' }, 503: { description: 'Unhealthy — database unreachable' } } }) }
paths['/health/live'] = { get: op('Liveness Probe', 'Platform', [], { description: 'Process-level liveness for LB/orchestrators. Always cheap — never touches the database.', responses: { 200: { description: 'Process is live' } } }) }
paths['/health/ready'] = { get: op('Readiness Probe', 'Platform', [], { description: 'Database connectivity check. Load balancers should route traffic only to ready instances (503 = remove from pool).', responses: { 200: { description: 'Ready' }, 503: { description: 'Not ready' } } }) }
paths['/metrics'] = { get: op('Prometheus Metrics', 'Platform', [], { description: 'Runtime + database metrics in Prometheus text exposition format 0.0.4.', responses: { 200: { description: 'Prometheus text format', content: { 'text/plain': {} } } } }) }
paths['/openapi.json'] = { get: op('OpenAPI Contract', 'Platform', [], { responses: { 200: { description: 'This document' } } }) }

// ───────────────────────────── API Platform (v1, M2M) ─────────────────────────────
paths['/api/v1/system/status'] = { get: op('System Status', 'API Platform', [], { description: 'Public discovery: platform health, version, active capabilities.' }) }
paths['/api/v1/system/capabilities'] = { get: op('System Capabilities', 'API Platform', [], { description: 'Machine-readable capability and feature flags.' }) }
paths['/api/v1/api-clients'] = {
  get: op('List API Clients', 'API Platform', platform),
  post: op('Register API Client', 'API Platform', platform, {
    description: 'Creates an M2M client. The plaintext key is returned ONCE in the response; only a masked key is stored.',
    parameters: [idempotencyHeader],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, organization: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' }, example: ['tickets:read', 'assets:read'] }, rateLimit: { type: 'integer', default: 120 } } } } },
    },
  }),
}
paths['/api/v1/api-clients/{id}'] = {
  get: op('Get API Client', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  patch: op('Update API Client', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
paths['/api/v1/api-clients/{id}/rotate-secret'] = { post: op('Rotate API Client Key', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], description: 'Issues a replacement key; the previous key is invalidated after a grace window.' }) }
paths['/api/v1/api-clients/{id}/revoke'] = { post: op('Revoke API Client', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/v1/webhook-subscriptions'] = {
  get: op('List Webhook Subscriptions', 'API Platform', platform),
  post: op('Create Webhook Subscription', 'API Platform', platform, {
    parameters: [idempotencyHeader],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['targetUrl', 'events'], properties: { targetUrl: { type: 'string', format: 'uri' }, events: { type: 'array', items: { type: 'string' }, example: ['ticket.created', 'ticket.status_changed', 'submission.created'] }, secret: { type: 'string', writeOnly: true, description: 'HMAC-SHA256 signing secret (generated server-side when omitted).' } } } } } },
  }),
}
paths['/api/v1/webhook-subscriptions/{id}'] = {
  get: op('Get Webhook Subscription', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  patch: op('Update Webhook Subscription', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  delete: op('Delete Webhook Subscription', 'API Platform', platform, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
paths['/api/v1/webhook-deliveries'] = { get: op('List Webhook Deliveries', 'API Platform', platform, { description: 'Recent delivery attempts with status codes, latency, and next-retry schedule.', parameters: [pageParam, pageSizeParam] }) }
paths['/api/v1/webhook-test'] = { post: op('Send Test Webhook', 'API Platform', platform, { description: 'Dispatches a signed test event to a subscription target for integration validation.' }) }

// ───────────────────────────── Auth ─────────────────────────────
paths['/api/auth/login'] = { post: op('Login', 'Auth', [], { description: 'Exchanges credentials for an HttpOnly `trackit_session` cookie (sliding expiration). Strict per-IP and per-account rate limits apply; response includes RateLimit-* headers.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } } } } } }) }
paths['/api/auth/logout'] = { post: op('Logout', 'Auth', user, { description: 'Revokes the current session server-side and clears the cookie.' }) }
paths['/api/auth/me'] = { get: op('Current Session Profile', 'Auth', user, { description: 'Returns the authenticated principal: profile, role, effective permissions and feature access.' }) }
paths['/api/auth/change-password'] = { post: op('Change Password', 'Auth', user, { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string', format: 'password' }, newPassword: { type: 'string', format: 'password', minLength: 8 } } } } } } }) }
paths['/api/auth/forgot-password'] = { post: op('Request Password Reset (OTP)', 'Auth', [], { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } } }) }
paths['/api/auth/verify-reset-otp'] = { post: op('Verify Reset OTP', 'Auth', [], { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'otp'], properties: { email: { type: 'string', format: 'email' }, otp: { type: 'string' } } } } } } }) }
paths['/api/auth/reset-password'] = { post: op('Reset Password with OTP', 'Auth', [], { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'otp', 'newPassword'], properties: { email: { type: 'string', format: 'email' }, otp: { type: 'string' }, newPassword: { type: 'string', format: 'password', minLength: 8 } } } } } } }) }

// ───────────────────────────── Assets (IT / GA / Ops) ─────────────────────────────
const assetBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['hostname', 'serial_number'],
        properties: {
          hostname: { type: 'string', example: 'NB-FIN-0142' },
          serial_number: { type: 'string', example: '5CD0218KJ4' },
          spesifikasi: { type: 'string' },
          nik_pemegang_asset: { type: 'string', example: '320401250990001' },
          nama_karyawan_pemegang_asset: { type: 'string' },
          departemen_pemegang_asset: { type: 'string' },
          lokasi_asset: { type: 'string' },
          tipe_perangkat: { type: 'string', example: 'Laptop' },
          brand_merek: { type: 'string' },
          model: { type: 'string' },
          status: { type: 'string', enum: ['In Use', 'Stock', 'Maintenance', 'Damaged', 'Disposed'], default: 'In Use' },
          kondisi: { type: 'string', enum: ['Normal', 'Rusak Ringan', 'Rusak Berat'], default: 'Normal' },
          note_asset: { type: 'string' },
        },
      },
    },
  },
}
crud('/api/assets', 'Assets (IT)', admin, {
  createBody: assetBody,
  listParams: [
    { name: 'status', in: 'query', schema: { type: 'string' } },
    { name: 'kondisi', in: 'query', schema: { type: 'string' } },
    { name: 'lokasi', in: 'query', schema: { type: 'string' } },
    { name: 'tipe', in: 'query', schema: { type: 'string' } },
  ],
})
paths['/api/assets/my'] = { get: op('My Asset Assignments', 'Assets (IT)', user, { description: 'Assets assigned to the authenticated employee.' }) }
paths['/api/assets/my-assets'] = { get: op('My Assets (alias)', 'Assets (IT)', user, { description: 'Alias of /api/assets/my.' }) }
paths['/api/assets/cycle/{nik}'] = { get: op('Asset Lifecycle History by NIK', 'Assets (IT)', user, { parameters: [{ name: 'nik', in: 'path', required: true, schema: { type: 'string' } }], description: 'Assignment + mutation timeline for an employee.' }) }
paths['/api/assets/stats'] = { get: op('Asset Portfolio Stats', 'Assets (IT)', user, { description: 'Aggregates for dashboard KPIs: totals by status, condition, type, location.' }) }
crud('/api/ga-assets', 'Assets (GA)', admin, { createBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, listParams: [{ name: 'status', in: 'query', schema: { type: 'string' } }] })
paths['/api/assets-ga'] = { get: op('List GA Assets (alias)', 'Assets (GA)', user, { description: 'Alias of /api/ga-assets.' }) }
crud('/api/ops-assets', 'Assets (Ops)', admin, { createBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } } })
paths['/api/assets-ops'] = { get: op('List Ops Assets (alias)', 'Assets (Ops)', user, { description: 'Alias of /api/ops-assets.' } }

// ───────────────────────────── Employees & Users ─────────────────────────────
crud('/api/employees', 'Employees', admin, {
  createBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nik', 'nama'], properties: { nik: { type: 'string', example: '320401250990001' }, nama: { type: 'string' }, departemen: { type: 'string' }, lokasi: { type: 'string' }, status_karyawan: { type: 'string', example: 'Active' } } } } } },
})
paths['/api/employees/with-assets'] = { get: op('Employees with Asset Assignments', 'Employees', user) }
paths['/api/employees/locations'] = { get: op('Distinct Employee Locations', 'Employees', user) }
paths['/api/employees/stats'] = { get: op('Employee Stats', 'Employees', user) }
paths['/api/karyawan'] = { get: op('List Employees (legacy alias)', 'Employees', admin, { description: 'Deprecated alias of /api/employees.' } }
crud('/api/users', 'Users', admin, {
  createBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nama', 'email', 'role'], properties: { nama: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['user', 'admin', 'superadmin'] }, permissions: { type: 'object', additionalProperties: { type: 'object', properties: { read: { type: 'boolean' }, write: { type: 'boolean' } } } } } } } } },
})

// ───────────────────────────── Tickets (Helpdesk) ─────────────────────────────
paths['/api/tickets'] = {
  get: op('List Tickets', 'Tickets', user, {
    parameters: [pageParam, pageSizeParam, searchParam, { name: 'status', in: 'query', schema: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] } }, { name: 'prioritas', in: 'query', schema: { type: 'string' } }, { name: 'queue_id', in: 'query', schema: { type: 'integer' } }, { name: 'assigned_to', in: 'query', schema: { type: 'integer' } }],
  }),
  post: op('Create Ticket', 'Tickets', user, {
    parameters: [idempotencyHeader],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['judul', 'deskripsi', 'kategori'], properties: { judul: { type: 'string', example: 'Laptop tidak bisa booting' }, deskripsi: { type: 'string' }, kategori: { type: 'string' }, prioritas: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' }, unit: { type: 'string', enum: ['IT', 'HR', 'GA'] }, queue_id: { type: 'integer' }, attachments: { type: 'array', items: { type: 'object' } } } } } } },
  }),
}
paths['/api/tickets/{id}'] = {
  get: op('Get Ticket', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  put: op('Update Ticket (admin)', 'Tickets', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  delete: op('Soft-delete Ticket (admin)', 'Tickets', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
paths['/api/tickets/events'] = { get: op('Realtime Ticket Events (SSE)', 'Tickets', user, { description: 'Server-Sent Events stream. RBAC-filtered per client. Heartbeat every 25s. Behind the load balancer this endpoint is sticky-routed (ip_hash) so a client stays on the emitting instance.' }) }
paths['/api/tickets/stats'] = { get: op('Ticket Stats', 'Tickets', user, { description: 'KPI aggregates: totals by status, unassigned, resolved, SLA window.' }) }
paths['/api/tickets/reporters'] = { get: op('Distinct Ticket Reporters', 'Tickets', user) }
paths['/api/tickets/{id}/history'] = { get: op('Ticket History Timeline', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/tickets/{id}/comments'] = {
  get: op('List Ticket Comments', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  post: op('Add Ticket Comment', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
paths['/api/tickets/{id}/attachment'] = { get: op('Download Ticket Attachment', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/tickets/{id}/comments/{commentId}/attachment'] = { get: op('Download Comment Attachment', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'commentId', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/tickets/{id}/claim'] = { post: op('Claim Ticket (admin)', 'Tickets', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/tickets/{id}/reassign'] = { post: op('Reassign Ticket (admin)', 'Tickets', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/tickets/{id}/casp'] = {
  get: op('Get Ticket CSAT/CSAP Rating', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  post: op('Submit Ticket CSAT/CSAP Rating', 'Tickets', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rating'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, feedback: { type: 'string' } } } } } } }),
}
paths['/api/tickets/casp/stats'] = { get: op('CSAT Aggregated Stats', 'Tickets', user, { description: 'Average rating + distribution for dashboards.' }) }
paths['/api/tickets/casp/trend'] = { get: op('CSAT Monthly Trend', 'Tickets', user) }
paths['/api/ticket-queues'] = { get: op('List Ticket Queues', 'Tickets', user) }
paths['/api/ticket-queues/my'] = { get: op('My Ticket Queues', 'Tickets', user) }
paths['/api/ticket-queues/{queueId}/admins'] = {
  get: op('List Queue Admins', 'Tickets', user, { parameters: [{ name: 'queueId', in: 'path', required: true, schema: { type: 'integer' } }] }),
  post: op('Add Queue Admin', 'Tickets', admin, { parameters: [{ name: 'queueId', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
paths['/api/ticket-queues/{queueId}/admins/{userId}'] = { delete: op('Remove Queue Admin', 'Tickets', admin, { parameters: [{ name: 'queueId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }] }) }

// ───────────────────────────── Submissions (BAST) & Shipments ─────────────────────────────
paths['/api/submissions'] = {
  get: op('List BAST Submissions', 'Submissions', user, { parameters: [pageParam, pageSizeParam, searchParam, { name: 'status', in: 'query', schema: { type: 'string' } }] }),
  post: op('Create BAST Submission', 'Submissions', user, {
    parameters: [idempotencyHeader],
    description: 'Creates a draft handover document (BAST) with a payload of asset units, giver/receiver identities, and terms.',
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['payload'], properties: { payload: { type: 'object', description: 'BAST payload: units, parties, terms, purpose (Loan/Return/Repair/Replacement/Disposal).' }, status: { type: 'string', enum: ['draft', 'submitted', 'completed', 'cancelled'], default: 'draft' } } } } } },
  }),
}
paths['/api/submissions/{id}'] = {
  get: op('Get BAST Submission', 'Submissions', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  put: op('Update BAST Submission', 'Submissions', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
  delete: op('Soft-delete BAST Submission', 'Submissions', user, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
const shipmentBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['request_date', 'recipient_name', 'item_description', 'destination'],
        properties: {
          request_date: { type: 'string', format: 'date' },
          recipient_name: { type: 'string' },
          item_description: { type: 'string' },
          destination: { type: 'string' },
          tracking_number: { type: 'string' },
          status: { type: 'string', enum: ['belum_dikirim', 'pending', 'sedang_dikirim', 'diterima', 'cancel'] },
          delivery_proof_url: { type: 'string', format: 'uri' },
        },
      },
    },
  },
}
crud('/api/shipments', 'Shipments', admin, {
  createBody: shipmentBody,
  listParams: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'tracking', in: 'query', schema: { type: 'string' } }],
})
paths['/api/shipments/import'] = { post: op('Bulk Import Shipments', 'Shipments', admin, { parameters: [idempotencyHeader], description: 'Accepts a JSON array of parsed shipment rows (from client-side Excel parsing).' }) }
paths['/api/pengiriman'] = { get: op('List Shipments (legacy alias)', 'Shipments', user, { description: 'Deprecated alias of /api/shipments.' } }

// ───────────────────────────── Knowledge Base ─────────────────────────────
paths['/api/cases/public'] = { get: op('List Public Cases', 'Knowledge Base', [], { description: 'Unauthenticated article listing for the Help Center.' }) }
crud('/api/cases', 'Knowledge Base', admin, { createBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['judul'], properties: { judul: { type: 'string' }, kategori: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, summary: { type: 'string' }, content: { type: 'string', description: 'Rich HTML (sanitized server-side).' } } } } } } } })
paths['/api/kb-categories/public'] = { get: op('List Public KB Categories', 'Knowledge Base', [], { description: 'Topic cards for the Help Center landing page.' }) }
crud('/api/kb-categories', 'Knowledge Base', admin, { createBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' }, is_published: { type: 'boolean' }, is_featured: { type: 'boolean' } } } } } } })
paths['/api/faqs/public'] = { get: op('List Public FAQs', 'Knowledge Base', [], { description: 'Published FAQ entries for the Help Center.' }) }
crud('/api/faqs', 'Knowledge Base', admin, { createBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['question', 'answer'], properties: { question: { type: 'string' }, answer: { type: 'string' }, is_published: { type: 'boolean' }, order: { type: 'integer' } } } } } } })
paths['/api/case-bookmarks'] = {
  get: op('List My Case Bookmarks', 'Knowledge Base', user),
  post: op('Bookmark Case', 'Knowledge Base', user, { parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'integer' } }] }),
}
paths['/api/case-bookmarks/{caseId}'] = { delete: op('Remove Case Bookmark', 'Knowledge Base', user, { parameters: [{ name: 'caseId', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/kb-search-logs/popular'] = { get: op('Popular KB Searches', 'Knowledge Base', [], { description: 'Aggregated search keywords for the Help Center trending list.' }) }
paths['/api/kb-search-logs'] = {
  post: op('Log KB Search', 'Knowledge Base', [], { description: 'Records a Help Center search event (public, rate-limited).' }),
  get: op('KB Search Stats', 'Knowledge Base', admin, { parameters: [pageParam, pageSizeParam] }),
}

// ───────────────────────────── Data Ops (admin) ─────────────────────────────
paths['/api/export'] = { get: op('Export Center Index', 'Data Ops', admin, { description: 'Superadmin-only. Export presets and table metadata.' }) }
paths['/api/export/tables'] = { get: op('Export Table Metadata', 'Data Ops', admin, { description: 'Row counts and sizes per exportable table.' }) }
paths['/api/export/assets'] = { get: op('Export Assets', 'Data Ops', admin, { parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'xlsx', 'json', 'pdf'] } }] }) }
paths['/api/export/users'] = { get: op('Export Users', 'Data Ops', admin, { parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'xlsx', 'json', 'pdf'] } }] }) }
paths['/api/export/tickets'] = { get: op('Export Tickets', 'Data Ops', admin, { parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'xlsx', 'json', 'pdf'] } }] }) }
paths['/api/export/data'] = { post: op('Custom Table Export', 'Data Ops', admin, { parameters: [idempotencyHeader], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['table'], properties: { table: { type: 'string' }, format: { type: 'string', enum: ['csv', 'xlsx', 'json'], default: 'csv' }, filters: { type: 'object' } } } } } } }) }
paths['/api/export/reset-database'] = { post: op('Reset Database (DANGER)', 'Data Ops', admin, { description: 'Permanently truncates business data and reprovisions the superadmin. Requires ENABLE_DB_RESET=true; audit-logged.', parameters: [idempotencyHeader] }) }
paths['/api/import/excel'] = { post: op('Bulk Import (Excel payload)', 'Data Ops', admin, { parameters: [idempotencyHeader], description: 'Accepts parsed Excel rows (client-side XLSX parse, 5MB JSON limit on /api/import).' }) }
paths['/api/import/excel-assets'] = { post: op('Category Asset Import', 'Data Ops', admin, { parameters: [idempotencyHeader] }) }
paths['/api/admin/database/status'] = { get: op('Database Status', 'Data Ops', admin, { description: 'Connectivity, pg_dump/pg_restore availability, backup storage state.' }) }
paths['/api/admin/database/backups'] = {
  get: op('List Backups', 'Data Ops', admin),
  post: op('Create Backup', 'Data Ops', admin, { parameters: [idempotencyHeader], description: 'Runs pg_dump into the backup volume; retention policy prunes old files.' }),
}
paths['/api/admin/database/backups/{id}/download'] = { get: op('Download Backup', 'Data Ops', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/admin/database/backups/{id}'] = { delete: op('Delete Backup', 'Data Ops', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/admin/database/restore/validate'] = { post: op('Validate Restore Archive', 'Data Ops', admin, { description: 'Pre-flight check of an uploaded backup file (multipart/form-data, 500MB limit).' }) }
paths['/api/admin/database/restore'] = { post: op('Restore Database (DANGER)', 'Data Ops', admin, { description: 'pg_restore from an uploaded archive. Requires maintenance window; audit-logged.', parameters: [idempotencyHeader] }) }
paths['/api/admin/database/audit-logs'] = { get: op('Backup Audit Logs', 'Data Ops', admin, { parameters: [pageParam, pageSizeParam] }) }
paths['/api/logs'] = { get: op('Log API Index', 'Audit Logs', admin, { description: 'Discovery payload for log endpoints.' }) }
paths['/api/logs/assets'] = { get: op('Asset Change History', 'Audit Logs', admin, { parameters: [pageParam, pageSizeParam, searchParam] }) }
paths['/api/logs/assets/{id}'] = { get: op('Asset Change History by Device', 'Audit Logs', admin, { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }] }) }
paths['/api/logs/audit'] = { get: op('Login Security Audit', 'Audit Logs', admin, { description: 'Superadmin-only. Login successes/failures, OTP resets, password changes with IP + device.', parameters: [pageParam, pageSizeParam] }) }
paths['/api/logs/system'] = { get: op('System Mutation Audit', 'Audit Logs', admin, { description: 'Superadmin-only. System-level mutations (backup/restore/reset, settings changes).', parameters: [pageParam, pageSizeParam] }) }

// ───────────────────────────── Settings (superadmin) ─────────────────────────────
paths['/api/settings/email'] = {
  get: op('Get Email/SMTP Settings', 'Settings', admin),
  put: op('Update Email/SMTP Settings', 'Settings', admin),
}
paths['/api/settings/email/test'] = { post: op('Send Test Email', 'Settings', admin, { parameters: [idempotencyHeader] }) }
paths['/api/settings/email/templates'] = { get: op('List Email Templates', 'Settings', admin) }
paths['/api/settings/email/templates/{key}'] = {
  get: op('Get Email Template', 'Settings', admin, { parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }] }),
  put: op('Update Email Template', 'Settings', admin, { parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }] }),
}
paths['/api/settings/email/templates/{key}/reset'] = { post: op('Reset Email Template to Default', 'Settings', admin, { parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }] }) }

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'TrackIT Enterprise API Platform',
    version: '2.0.0',
    description: [
      'Integration-ready REST API for IT asset tracking, helpdesk ticketing, BAST handover logistics, and knowledge-base operations.',
      '',
      '**Enterprise platform conventions**',
      '- **Auth**: interactive clients use the HttpOnly `trackit_session` cookie (sliding expiration) or a Bearer JWT; machine-to-machine clients use `X-API-Key` (or `Bearer trkit_...`) with scoped permissions.',
      '- **Idempotency**: POST/PATCH accept an optional `Idempotency-Key` header; replays return the original result with `X-Idempotent-Replay: true`.',
      '- **Rate limiting**: every API response carries `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`; 429 responses add `Retry-After`. Login endpoints apply stricter per-IP and per-account limits.',
      '- **Pagination**: list endpoints honor `page` / `pageSize` and expose `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages` headers.',
      '- **Correlation**: every response carries `X-Request-ID` (echoed when supplied). Quote it in support requests.',
      '- **Errors**: RFC 9457 Problem Details with a stable machine-readable `error.code`.',
      '- **Health**: `/health/live` for liveness, `/health/ready` for LB readiness (503 = drain instance), `/metrics` for Prometheus.',
      '- **Versioning**: integration surface is versioned under `/api/v1`; business resources remain on `/api/*` (v1 implicit). Breaking changes ship as new major prefixes.',
      '',
      '**Load-balanced deployment**: all instances are stateless except the in-process SSE registry; `/api/tickets/events` is sticky-routed by the edge proxy. Everything else is safe for least-connections balancing and zero-downtime rolling deploys behind `/health/ready`.',
    ].join('\n'),
    contact: { name: 'TrackIT Platform Team', url: 'https://trackit.esb.co.id', email: 'helpdesk@esb.co.id' },
    license: { name: 'Proprietary', identifier: 'LicenseRef-Proprietary' },
  },
  servers: [{ url: '/', description: 'Current Environment (via edge load balancer)' }],
  tags: [
    { name: 'Platform' },
    { name: 'API Platform' },
    { name: 'Auth' },
    { name: 'Assets (IT)' },
    { name: 'Assets (GA)' },
    { name: 'Assets (Ops)' },
    { name: 'Employees' },
    { name: 'Users' },
    { name: 'Tickets' },
    { name: 'Submissions' },
    { name: 'Shipments' },
    { name: 'Knowledge Base' },
    { name: 'Data Ops' },
    { name: 'Audit Logs' },
    { name: 'Settings' },
  ],
  paths,
  components: {
    securitySchemes: {
      SessionCookie: { type: 'apiKey', in: 'cookie', name: 'trackit_session', description: 'HttpOnly session cookie issued by /api/auth/login. SameSite=Lax; sliding expiration.' },
      BearerAuth: { type: 'http', scheme: 'bearer', description: 'Short-lived access JWT (also accepted in the Authorization header).' },
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'M2M client key with prefix trkit_ (also accepted as Bearer trkit_...). Scopes are enforced per route.' },
    },
    schemas: {
      Problem: problemSchema,
      PaginationHeaders: {
        type: 'object',
        description: 'Pagination contract exposed as response headers on list endpoints.',
        properties: {
          'X-Total-Count': { type: 'string' },
          'X-Page': { type: 'string' },
          'X-Page-Size': { type: 'string' },
          'X-Total-Pages': { type: 'string' },
        },
      },
    },
    'x-rate-limit-headers': {
      description: 'Rate limit contract exposed as response headers.',
      fields: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
    },
  },
}

const out = JSON.stringify(spec, null, 2)
writeFileSync(new URL('../backend/src/contracts/openapi.json', import.meta.url), out + '\n')
console.log(`openapi.json regenerated: ${Object.keys(paths).length} paths, ${out.length} bytes`)
