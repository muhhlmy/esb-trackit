import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { env } from '../config/env.js'

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

export function isBcryptPasswordHash(value) {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, env.password.bcryptRounds)
}
// --- P0 FIX: hardcoded default password removed ---
// Password default hanya boleh dari env var (dev/test only).
// Prod HARUS wajib reset via OTP — tidak ada hardcoded fallback.
const _envDefault = process.env.DEFAULT_USER_PASSWORD;
export const DEFAULT_USER_PASSWORD = _envDefault || null;
if (_envDefault) {
  console.warn('[PASSWORD-SERVICE] DEFAULT_USER_PASSWORD di-set via env var — gunakan hanya untuk dev/test');
}

// Deliberately not a bcrypt hash: no submitted password can authenticate until
// the email owner completes the existing OTP reset flow and enrolls a password.
export function createEnrollmentCredential() {
  return `!enrollment:${randomBytes(32).toString('hex')}`
}

/**
 * Verifikasi password HANYA terhadap hash bcrypt.
 * Mode legacy perbandingan plaintext DILEPAS: password di DB yang bukan
 * hash bcrypt berarti data korup/terkompromi dan TIDAK BISA diverifikasi
 * (fail-closed). Akun semacam itu harus di-reset oleh admin, bukan
 * diverifikasi dengan perbandingan plaintext.
 */
export async function verifyPassword(submittedPassword, storedPassword) {
  if (typeof submittedPassword !== 'string' || typeof storedPassword !== 'string') return false

  if (!isBcryptPasswordHash(storedPassword)) {
    return false
  }

  try {
    return await bcrypt.compare(submittedPassword, storedPassword)
  } catch {
    return false
  }
}
