import crypto from 'node:crypto'
import { pool } from '../config/database.js'

const OTP_EXPIRY_MINUTES = 5
const OTP_RESEND_COOLDOWN_SECONDS = 60
const MAX_OTP_ATTEMPTS = 5

function hashOtp(otpCode) {
  return crypto.createHash('sha256').update(String(otpCode).trim()).digest('hex')
}

/**
 * Generate 6-digit numeric OTP and save to database.
 */
export async function createPasswordResetOtp(userId, email) {
  const normalizedEmail = String(email).trim().toLowerCase()

  // 1. Cek apakah ada OTP yang baru saja dikirim dalam cooldown window (60 detik)
  const recentOtpResult = await pool.query(
    `
    SELECT created_at 
    FROM password_reset_otps 
    WHERE email = $1 AND used_at IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  `,
    [normalizedEmail],
  )

  if (recentOtpResult.rowCount > 0) {
    const lastCreatedAt = new Date(recentOtpResult.rows[0].created_at).getTime()
    const elapsedSeconds = Math.floor((Date.now() - lastCreatedAt) / 1000)
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitTime = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
      const error = new Error(
        `Harap tunggu ${waitTime} detik sebelum meminta kode OTP baru.`,
      )
      error.statusCode = 429
      error.retryAfter = waitTime
      throw error
    }
  }

  // 2. Nonaktifkan/tandai OTP lama yang belum terpakai sebagai expired
  await pool.query(
    `
    UPDATE password_reset_otps 
    SET used_at = CURRENT_TIMESTAMP 
    WHERE email = $1 AND used_at IS NULL
  `,
    [normalizedEmail],
  )

  // 3. Buat 6-digit OTP acak
  const otpCode = String(crypto.randomInt(100000, 1000000))
  const otpHash = hashOtp(otpCode)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await pool.query(
    `
    INSERT INTO password_reset_otps (user_id, email, otp_hash, max_attempts, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,
    [userId, normalizedEmail, otpHash, MAX_OTP_ATTEMPTS, expiresAt],
  )

  return {
    otpCode,
    expiresMinutes: OTP_EXPIRY_MINUTES,
    expiresAt,
  }
}

/**
 * Verify submitted OTP and return a temporary reset token.
 */
export async function verifyPasswordResetOtp(email, submittedOtp) {
  const normalizedEmail = String(email).trim().toLowerCase()
  const cleanOtp = String(submittedOtp || '').trim()

  if (!cleanOtp || cleanOtp.length !== 6) {
    const error = new Error('Kode OTP harus terdiri dari 6 digit angka.')
    error.statusCode = 400
    throw error
  }

  const otpRecordResult = await pool.query(
    `
    SELECT id, user_id, email, otp_hash, attempts, max_attempts, expires_at, reset_token
    FROM password_reset_otps
    WHERE email = $1 AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [normalizedEmail],
  )

  if (otpRecordResult.rowCount === 0) {
    const error = new Error('Kode OTP tidak ditemukan atau telah kadaluarsa. Silakan minta kode baru.')
    error.statusCode = 400
    throw error
  }

  const record = otpRecordResult.rows[0]

  // Cek apakah sudah expired
  if (new Date() > new Date(record.expires_at)) {
    const error = new Error('Kode OTP telah kadaluarsa (melebihi 5 menit). Silakan minta kode baru.')
    error.statusCode = 400
    throw error
  }

  // Cek batas percobaan
  if (record.attempts >= record.max_attempts) {
    await pool.query('UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [record.id])
    const error = new Error('Batas percobaan verifikasi telah tercapai. Silakan minta kode OTP baru.')
    error.statusCode = 429
    throw error
  }

  // Verifikasi hash
  const submittedHash = hashOtp(cleanOtp)
  if (submittedHash !== record.otp_hash) {
    // Tambah counter attempts
    await pool.query('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1', [record.id])
    const remainingAttempts = record.max_attempts - (record.attempts + 1)
    const error = new Error(
      remainingAttempts > 0
        ? `Kode OTP salah. Sisa kesempatan: ${remainingAttempts} kali.`
        : 'Kode OTP salah. Batas percobaan habis, silakan minta kode baru.',
    )
    error.statusCode = 400
    throw error
  }

  // OTP Valid -> buat reset token sekali pakai (valid 15 menit)
  const resetToken = crypto.randomBytes(32).toString('hex')
  await pool.query(
    `
    UPDATE password_reset_otps 
    SET reset_token = $1 
    WHERE id = $2
  `,
    [resetToken, record.id],
  )

  return {
    valid: true,
    resetToken,
    userId: record.user_id,
  }
}

/**
 * Validate and consume the reset token when user submits a new password.
 */
export async function consumePasswordResetToken(email, resetToken) {
  const normalizedEmail = String(email).trim().toLowerCase()
  const cleanToken = String(resetToken || '').trim()

  if (!cleanToken) {
    const error = new Error('Token reset password tidak valid atau tidak disertakan.')
    error.statusCode = 400
    throw error
  }

  const result = await pool.query(
    `
    SELECT id, user_id, email, expires_at
    FROM password_reset_otps
    WHERE email = $1 AND reset_token = $2 AND used_at IS NULL
    LIMIT 1
  `,
    [normalizedEmail, cleanToken],
  )

  if (result.rowCount === 0) {
    const error = new Error('Sesi reset password tidak valid atau sudah pernah digunakan. Silakan ulangi proses.')
    error.statusCode = 400
    throw error
  }

  const record = result.rows[0]

  // Cek expiry token (misal batas 15 menit dari pembuatan OTP)
  if (new Date() > new Date(record.expires_at).getTime() + 10 * 60 * 1000) {
    const error = new Error('Sesi reset password telah kadaluarsa. Silakan ulangi proses.')
    error.statusCode = 400
    throw error
  }

  // Tandai token sudah dipakai
  await pool.query(
    `
    UPDATE password_reset_otps
    SET used_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `,
    [record.id],
  )

  return {
    userId: record.user_id,
  }
}
