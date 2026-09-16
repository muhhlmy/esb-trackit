import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import test from "node:test";
import { app } from "../src/app.js";
import { pool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import {
  normalizeSubmissionPayload,
  normalizeSubmissionStatus,
} from "../src/controllers/submissionController.js";
import { createSession, ensureUserSessionsTable } from "../src/services/sessionService.js";

function request(server, path, { method = "GET", token, body } = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method,
        headers: {
          Connection: "close",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }),
        );
      },
    );
    req.on("error", reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

test("submission payload and status validation reject invalid input", () => {
  assert.deepEqual(normalizeSubmissionPayload({ pemberiNama: "A", asetBaruList: [] }), {
    pemberiNama: "A",
    asetBaruList: [],
  });
  assert.throws(() => normalizeSubmissionPayload([]), /object JSON/);
  assert.throws(
    () => normalizeSubmissionPayload({ content: "x".repeat(100_001) }),
    /terlalu besar/,
  );
  assert.equal(normalizeSubmissionStatus(undefined), "draft");
  assert.equal(normalizeSubmissionStatus("SUBMITTED"), "submitted");
  assert.throws(() => normalizeSubmissionStatus("approved"), /tidak valid/);
});

test("submission API requires authentication before accessing storage", async (t) => {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  assert.equal((await request(server, "/api/submissions")).status, 401);
});

test("submission API performs create, read, update, and delete with server-bound identity", async (t) => {
  await ensureUserSessionsTable(pool);
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const userResult = await pool.query(
    `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
     VALUES ('Submission API Test', $1, 'not-used', 'superadmin', '{}'::jsonb, true)
     RETURNING id`,
    [`submission-${unique}@example.test`],
  );
  const userId = Number(userResult.rows[0].id);
  const session = await createSession(userId);
  const token = jwt.sign({ sub: String(userId), id: userId, sid: session.sessionId }, env.jwt.secret, {
    expiresIn: "1h",
  });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  let submissionId;

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    try {
      await pool.query("DELETE FROM asset_submissions WHERE created_by = $1", [userId]);
      await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
      await pool.query(
        `UPDATE users
            SET is_active = false,
                deleted_at = CURRENT_TIMESTAMP,
                email = $2,
                deletion_reason = 'submission-api-test-cleanup'
          WHERE id = $1`,
        [userId, `deleted-${unique}@example.test`],
      );
    } finally {
      await pool.end();
    }
  });

  const created = await request(server, "/api/submissions", {
    method: "POST",
    token,
    body: { payload: { pemberiNama: "Pemberi", penerimaNama: "Penerima" }, status: "draft" },
  });
  assert.equal(created.status, 201);
  submissionId = created.body.id;
  assert.match(created.body.submission_number, /^BAST-\d{8}-[A-F0-9]{8}$/);
  assert.equal(created.body.created_by, userId);

  const listed = await request(server, "/api/submissions?page=1&limit=10", { token });
  assert.equal(listed.status, 200);
  assert.ok(listed.body.data.some((item) => item.id === submissionId));

  const updated = await request(server, `/api/submissions/${submissionId}`, {
    method: "PUT",
    token,
    body: { payload: created.body.payload, status: "submitted" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.status, "submitted");

  const deleted = await request(server, `/api/submissions/${submissionId}`, {
    method: "DELETE",
    token,
  });
  assert.equal(deleted.status, 200);
  submissionId = null;
});
