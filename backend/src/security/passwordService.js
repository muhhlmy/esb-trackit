import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

export function isBcryptPasswordHash(value) {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, env.password.bcryptRounds)
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
