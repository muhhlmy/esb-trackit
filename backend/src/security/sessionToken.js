import { env } from '../config/env.js';
import jwt from 'jsonwebtoken';
import { verifySession } from '../services/sessionService.js';

// Nama cookie sesi HttpOnly. Nilai token tidak pernah dibaca/ditampilkan oleh
// JavaScript browser — hanya server yang menerbit dan membacanya.
export const SESSION_COOKIE_NAME = 'trackit_session';

const JWT_FORMAT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 4096;

function isProductionEnv() {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function cookiePath() {
  return (env.security.cookiePath || '/').replace(/\/+$/, '') || '/';
}

function baseCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProductionEnv(),
    path: cookiePath(),
    maxAge: Math.floor(maxAgeMs),
  };
}

/**
 * Baca token sesi dari cookie. Validasi format di level middleware penuh;
 * di sini cukup cek bentuk JWT agar cookie rusak tidak memicu parse error.
 */
export function readSessionToken(req) {
  const header = req?.headers?.cookie;
  if (typeof header !== 'string') return null;

  let name = null;
  let value = null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === SESSION_COOKIE_NAME) {
      value = part.slice(idx + 1).trim();
      name = key;
    }
  }

  if (!value || value.length > MAX_TOKEN_LENGTH || !JWT_FORMAT_PATTERN.test(value)) {
    return null;
  }
  return value;
}

/**
 * Terbitkan token pendek (15 menit) yang terikat ke session_id server, lalu
 * kirim sebagai cookie HttpOnly. Sesi server tetap sumber kebenaran utama —
 * token hanya pembawa sid+sub untuk memverifikasi terhadap user_sessions.
 */
export function issueSessionCookie(res, { userId, sessionId, expiresAt }) {
  const issuedMs = Date.now();
  const expiresMs = new Date(expiresAt).getTime();
  const lifetimeMs = Math.max(0, expiresMs - issuedMs);

  const iat = Math.floor(issuedMs / 1000);
  const exp = Math.min(
    Math.floor(expiresMs / 1000),
    iat + env.auth.accessTokenTtlSeconds,
  );

  const token = jwt.sign(
    { sub: String(userId), sid: sessionId, iat, exp },
    env.jwt.secret,
    { algorithm: 'HS256' },
  );

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=${cookiePath()}; ` +
      `Max-Age=${Math.floor(lifetimeMs / 1000)}; HttpOnly; SameSite=Lax` +
      (isProductionEnv() ? '; Secure' : ''),
  );

  return { token, expMs: exp * 1000 };
}

/**
 * Hapus cookie sesi (logout). Expired di masa lampau + semua flag yang sama.
 */
export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=${cookiePath()}; Max-Age=0; HttpOnly; SameSite=Lax` +
      (isProductionEnv() ? '; Secure' : ''),
  );
}

/**
 * Perpanjangan sesi gliding: jika sisa masa berlaku token < 50% TTL dan
 * session server masih aktif, terbitkan ulang cookie dengan sisa TTL penuh.
 * Sesi server (expires_at) TIDAK diperpanjang — logout/revocation/lockout
 * tetap berlaku persis seperti sebelumnya.
 */
export async function maybeSlideSessionToken(req, res, verifiedSession = null) {
  try {
    const token = readSessionToken(req);
    if (!token) return;

    const claims = jwt.decode(token);
    if (!claims || typeof claims !== 'object') return;

    const userId = Number(claims.sub ?? claims.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) return;

    const remainingMs = (claims.exp - Date.now() / 1000) * 1000;
    const ttlMs = env.auth.accessTokenTtlSeconds * 1000;
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return;
    // Cukup segar — jangan putar ulang token tiap request.
    if (remainingMs > ttlMs / 2) return;

    const session = verifiedSession || (await verifySession(claims.sid, userId));
    if (!session) return;

    const expiresMs = new Date(session.expires_at).getTime();
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.min(
      Math.floor(expiresMs / 1000),
      iat + env.auth.accessTokenTtlSeconds,
    );

    if (exp <= iat) return; // Sesi hampir habis; biarkan client dapat 401 alami.

    const refreshed = jwt.sign(
      { sub: String(userId), sid: claims.sid, iat, exp },
      env.jwt.secret,
      { algorithm: 'HS256' },
    );

    const lifetimeMs = Math.max(0, expiresMs - Date.now());
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(refreshed)}; Path=${cookiePath()}; ` +
        `Max-Age=${Math.floor(lifetimeMs / 1000)}; HttpOnly; SameSite=Lax` +
        (isProductionEnv() ? '; Secure' : ''),
    );
  } catch {
    // Sliding refresh best-effort — kegagalan hanya berarti client login ulang
    // sesuai umur token.
  }
}
