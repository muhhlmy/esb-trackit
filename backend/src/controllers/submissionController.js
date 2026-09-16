import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";
import { recordSystemAudit } from "../services/systemAuditService.js";
import {
  assertAllowedFields,
  assertPlainObject,
  createHttpError,
  parsePaginationQuery,
  parsePositiveIntegerParam,
  parseSearchQuery,
  setPaginationHeaders,
} from "../security/requestValidation.js";

const SUBMISSION_FIELDS = new Set(["payload", "status"]);
const VALID_STATUSES = new Set([
  "draft",
  "submitted",
  "completed",
  "cancelled",
]);
const MAX_PAYLOAD_BYTES = 100_000;

function isAdminRole(role) {
  return ["admin", "superadmin", "super admin"].includes(
    String(role || "")
      .trim()
      .toLowerCase(),
  );
}

export function normalizeSubmissionStatus(value, fallback = "draft") {
  if (value === undefined || value === null || value === "") return fallback;
  if (
    typeof value !== "string" ||
    !VALID_STATUSES.has(value.trim().toLowerCase())
  ) {
    throw createHttpError(400, "Status pengajuan tidak valid.");
  }
  return value.trim().toLowerCase();
}

export function normalizeSubmissionPayload(value) {
  assertPlainObject(value, "Payload formulir harus berupa object JSON.");
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
    throw createHttpError(400, "Payload formulir terlalu besar.");
  }
  return value;
}

function mapRow(row) {
  return {
    id: Number(row.id),
    submission_number: row.submission_number,
    payload: row.payload,
    status: row.status,
    created_by: Number(row.created_by),
    created_by_name: row.created_by_name || null,
    updated_by: row.updated_by === null ? null : Number(row.updated_by),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT_FIELDS = `
  s.id, s.submission_number, s.payload, s.status, s.created_by, s.updated_by,
  s.created_at, s.updated_at, u.nama AS created_by_name
`;

function accessClause(req, params) {
  if (isAdminRole(req.user?.role)) return "";
  params.push(Number(req.user.id));
  return `s.created_by = $${params.length}`;
}

export async function listSubmissions(req, res) {
  const { page, limit, offset } = parsePaginationQuery(req.query);
  const search = parseSearchQuery(req.query.search, 100);
  const params = [];
  const conditions = [];
  const restricted = accessClause(req, params);
  if (restricted) conditions.push(restricted);
  if (search) {
    params.push(`%${search}%`);
    const index = params.length;
    conditions.push(`(
      s.submission_number ILIKE $${index}
      OR COALESCE(s.payload->>'pemberiNama', '') ILIKE $${index}
      OR COALESCE(s.payload->>'penerimaNama', '') ILIKE $${index}
    )`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const count = await pool.query(
    `SELECT COUNT(*)::int AS total FROM asset_submissions s ${where}`,
    params,
  );
  const total = Number(count.rows[0]?.total) || 0;
  const values = [...params, limit, offset];
  const result = await pool.query(
    `SELECT ${SELECT_FIELDS}
       FROM asset_submissions s
       LEFT JOIN users u ON u.id = s.created_by
       ${where}
      ORDER BY s.updated_at DESC, s.id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  const pagination = setPaginationHeaders(res, total, page, limit);
  res.json({
    data: result.rows.map(mapRow),
    total,
    page,
    pageSize: limit,
    totalPages: pagination.totalPages,
  });
}

async function findAccessibleSubmission(req, id) {
  const params = [id];
  const restricted = accessClause(req, params);
  const result = await pool.query(
    `SELECT ${SELECT_FIELDS}
       FROM asset_submissions s
       LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1 ${restricted ? `AND ${restricted}` : ""}`,
    params,
  );
  if (!result.rowCount)
    throw createHttpError(404, "Pengajuan tidak ditemukan.");
  return result.rows[0];
}

export async function getSubmissionById(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, "ID pengajuan");
  res.json(mapRow(await findAccessibleSubmission(req, id)));
}

export async function createSubmission(req, res) {
  assertPlainObject(req.body, "Payload pengajuan harus berupa object JSON.");
  assertAllowedFields(req.body, SUBMISSION_FIELDS, "Payload pengajuan");
  const payload = normalizeSubmissionPayload(req.body.payload);
  const status = normalizeSubmissionStatus(req.body.status);
  const number = `BAST-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const result = await pool.query(
    `INSERT INTO asset_submissions (submission_number, payload, status, created_by, updated_by)
     VALUES ($1, $2::jsonb, $3, $4, $4)
     RETURNING id`,
    [number, JSON.stringify(payload), status, Number(req.user.id)],
  );
  const submission = mapRow(await findAccessibleSubmission(req, result.rows[0].id));
  await recordSystemAudit(req, { module: "submissions", action: "CREATE", entityType: "submission", entityId: submission.id, entityLabel: submission.submission_number, summary: `Pengajuan dibuat: ${submission.submission_number}`, after: submission });
  res.status(201).json(submission);
}

export async function updateSubmission(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, "ID pengajuan");
  assertPlainObject(req.body, "Payload pengajuan harus berupa object JSON.");
  assertAllowedFields(req.body, SUBMISSION_FIELDS, "Payload pengajuan");
  const existing = mapRow(await findAccessibleSubmission(req, id));

  const updates = [];
  const values = [id];
  if (req.body.payload !== undefined) {
    values.push(JSON.stringify(normalizeSubmissionPayload(req.body.payload)));
    updates.push(`payload = $${values.length}::jsonb`);
  }
  if (req.body.status !== undefined) {
    values.push(normalizeSubmissionStatus(req.body.status));
    updates.push(`status = $${values.length}`);
  }
  if (!updates.length)
    throw createHttpError(400, "Tidak ada field pengajuan yang diubah.");
  values.push(Number(req.user.id));
  updates.push(
    `updated_by = $${values.length}`,
    "updated_at = CURRENT_TIMESTAMP",
  );
  await pool.query(
    `UPDATE asset_submissions SET ${updates.join(", ")} WHERE id = $1`,
    values,
  );
  const submission = mapRow(await findAccessibleSubmission(req, id));
  await recordSystemAudit(req, { module: "submissions", action: "UPDATE", entityType: "submission", entityId: id, entityLabel: submission.submission_number, summary: `Pengajuan diperbarui: ${submission.submission_number}`, before: existing, after: submission });
  res.json(submission);
}

export async function deleteSubmission(req, res) {
  const id = parsePositiveIntegerParam(req.params.id, "ID pengajuan");
  const submission = mapRow(await findAccessibleSubmission(req, id));
  await pool.query("DELETE FROM asset_submissions WHERE id = $1", [id]);
  await recordSystemAudit(req, { module: "submissions", action: "DELETE", entityType: "submission", entityId: id, entityLabel: submission.submission_number, summary: `Pengajuan dihapus: ${submission.submission_number}`, before: submission });
  res.json({ message: "Pengajuan berhasil dihapus." });
}
