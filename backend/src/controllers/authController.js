import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { createHash } from 'node:crypto';
import {
  DEFAULT_USER_PERMISSIONS,
  SUPERADMIN_PERMISSIONS,
  normalizePermissions,
} from '../services/permissionService.js';
import { verifyPassword, hashPassword } from '../security/passwordService.js';
import { parseRequiredEmail } from '../security/requestValidation.js';
import {
  createSession,
  revokeSession,
  revokeAllUserSessions,
} from '../services/sessionService.js';
import {
  issueSessionCookie,
  clearSessionCookie,
} from '../security/sessionToken.js';
import {
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogin,
  DUMMY_BCRYPT_HASH,
} from '../services/accountSecurityService.js';
import {
  createPasswordResetOtp,
  verifyPasswordResetOtp,
  consumePasswordResetToken,
} from '../services/otpService.js';
import {
  sendEmail,
  renderPasswordResetOtpEmailHtml,
} from '../services/emailService.js';

const MAX_LOGIN_EMAIL_LENGTH = 150
const MAX_LOGIN_PASSWORD_LENGTH = 255

function hashIdentifier(value) {
  return 'sha256:' + createHash('sha256').update(String(value)).digest('hex').slice(0, 16)
}

export function normalizeLoginCredentials(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  if (typeof body.email !== 'string' || typeof body.password !== 'string') return null

  let email
  try {
    email = parseRequiredEmail(body.email)
  } catch {
    return null
  }
  if (
    !email ||
    email.length > MAX_LOGIN_EMAIL_LENGTH ||
    body.password.length === 0 ||
    body.password.length > MAX_LOGIN_PASSWORD_LENGTH
  ) {
    return null
  }

  return { email, password: body.password }
}

export async function login(req, res) {
  try {
    const credentials = normalizeLoginCredentials(req.body)

    if (!credentials) {
      return res.status(400).json({ message: 'Format email atau password tidak valid.' })
    }

    const { email, password } = credentials

    // 1. Check persistent account lockout state
    const lockoutState = await checkAccountLockout(email)
    if (lockoutState.isLocked) {
      res.setHeader('Retry-After', String(lockoutState.retryAfterSeconds))
      return res.status(429).json({ message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.' })
    }

    // 2. Cari user berdasarkan email
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.nama,
        u.email,
        u.password_hash,
        u.role,
        u.permissions,
        u.is_active,
        k.id AS employee_id,
        k.nik AS nik,
        k.nama_karyawan AS employee_nama,
        k.title AS title,
        k.departemen AS departemen,
        k.directorate AS directorate,
        k.status AS employee_status,
        k.lokasi_kerja AS lokasi_kerja,
        k.tanggal_mulai_bekerja AS tanggal_mulai_bekerja,
        k.employeement_status AS employeement_status,
        k.email_kantor AS email_kantor
      FROM users u
      LEFT JOIN karyawan k ON LOWER(TRIM(u.email)) = LOWER(TRIM(k.email_kantor))
      WHERE u.email = $1
        AND u.deleted_at IS NULL
    `,
      [email],
    )

    const userRow = result.rowCount > 0 ? result.rows[0] : null
    const hashToVerify = userRow ? userRow.password_hash : DUMMY_BCRYPT_HASH

    // 3. Verify password (runs against dummy hash for non-existent users to preserve timing)
    const isPasswordValid = await verifyPassword(password, hashToVerify)

    if (!userRow || !isPasswordValid) {
      const failedState = await recordFailedLogin(email)
      await pool.query(
        'INSERT INTO log_audit_login (user_id, email, login_time, ip_address, user_agent, status_login) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)',
        [userRow ? userRow.id : null, email, req.ip, req.headers['user-agent'], 'LOGIN_FAILED'],
      ).catch(() => {})

      if (failedState.lockedUntil && failedState.retryAfterSeconds > 0) {
        res.setHeader('Retry-After', String(failedState.retryAfterSeconds))
        return res.status(429).json({ message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.' })
      }

      return res.status(401).json({ message: 'Kredensial tidak valid.' })
    }

    // Cek apakah akun aktif
    if (!userRow.is_active) {
      return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan.' })
    }

    // Reset failed login state on successful authentication
    await resetFailedLogin(email)

    const userRole = (userRow.role || '').trim().toLowerCase()
    const isSuper = userRole === 'superadmin' || userRole === 'super admin'
    const permissions = isSuper
      ? { ...SUPERADMIN_PERMISSIONS }
      : normalizePermissions(userRow.permissions, { defaults: DEFAULT_USER_PERMISSIONS })

    const hasEmployee = Boolean(userRow.nik)
    const employee = hasEmployee
      ? {
          id: userRow.employee_id,
          nik: userRow.nik,
          nama_karyawan: userRow.employee_nama || userRow.nama,
          title: userRow.title || userRow.role,
          jabatan: userRow.title || userRow.role,
          departemen: userRow.departemen || '',
          directorate: userRow.directorate || '',
          status: userRow.employee_status || 'Active',
          lokasi_kerja: userRow.lokasi_kerja || '',
          tanggal_mulai_bekerja: userRow.tanggal_mulai_bekerja || null,
          employeement_status: userRow.employeement_status || '',
          email_kantor: userRow.email_kantor || userRow.email,
        }
      : null

    const payload = {
      id: userRow.id,
      nama: userRow.employee_nama || userRow.nama,
      email: userRow.email,
      role: userRow.role,
      is_active: userRow.is_active,
      permissions,
      nik: userRow.nik || '',
      title: userRow.title || userRow.role,
      jabatan: userRow.title || userRow.role,
      departemen: userRow.departemen || '',
      directorate: userRow.directorate || '',
      lokasi_kerja: userRow.lokasi_kerja || '',
      employee,
    }

    // Server-side session creation (UUID v4) — sumber kebenaran autentikasi.
    const session = await createSession(userRow.id, { ttlHours: 12 })

    // Token pendek (15 menit, claims minimal: sub+sid+exp) dikirim sebagai
    // cookie HttpOnly. Token tidak lagi dikirim di body respons login.
    const { expMs } = issueSessionCookie(res, {
      userId: userRow.id,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    })

    // Catat log sukses
    await pool.query(
      'INSERT INTO log_audit_login (user_id, email, login_time, ip_address, user_agent, status_login) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)',
      [userRow.id, userRow.email, req.ip, req.headers['user-agent'], 'LOGIN_SUCCESS'],
    )

    res.json({
      message: 'Login berhasil.',
      user: payload,
      session: {
        expiresAt: new Date(expMs).toISOString(),
      },
    })
  } catch (error) {
    console.error('Error login:', error)
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' })
  }
}

export async function logout(req, res) {
  try {
    const sessionId = req.user?.sid
    const userId = req.user?.id

    if (sessionId) {
      await revokeSession(sessionId)
    }

    if (userId) {
      await pool.query(
        'INSERT INTO log_audit_login (user_id, email, login_time, ip_address, user_agent, status_login) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)',
        [userId, req.user?.email || '', req.ip, req.headers['user-agent'], 'LOGOUT'],
      ).catch(() => {})
    }

    // Hapus cookie sesi HttpOnly (session revocation di sisi browser).
    clearSessionCookie(res)

    res.json({ message: 'Logout berhasil.' })
  } catch (error) {
    console.error('Error logout:', error)
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' })
  }
}

export async function getMe(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.nama,
        u.email,
        u.role,
        u.permissions,
        u.is_active,
        u.created_at,
        k.id AS employee_id,
        k.nik AS nik,
        k.nama_karyawan AS employee_nama,
        k.title AS title,
        k.departemen AS departemen,
        k.directorate AS directorate,
        k.status AS employee_status,
        k.lokasi_kerja AS lokasi_kerja,
        k.tanggal_mulai_bekerja AS tanggal_mulai_bekerja,
        k.employeement_status AS employeement_status,
        k.email_kantor AS email_kantor
      FROM users u
      LEFT JOIN karyawan k ON LOWER(TRIM(u.email)) = LOWER(TRIM(k.email_kantor))
      WHERE u.id = $1
        AND u.deleted_at IS NULL
    `,
      [req.user.id],
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' })
    }

    const userRow = result.rows[0]
    const userRole = (userRow.role || '').trim().toLowerCase()
    const isSuper = userRole === 'superadmin' || userRole === 'super admin'
    const permissions = isSuper
      ? { ...SUPERADMIN_PERMISSIONS }
      : normalizePermissions(userRow.permissions, { defaults: DEFAULT_USER_PERMISSIONS })

    const hasEmployee = Boolean(userRow.nik)
    const employee = hasEmployee
      ? {
          id: userRow.employee_id,
          nik: userRow.nik,
          nama_karyawan: userRow.employee_nama || userRow.nama,
          title: userRow.title || userRow.role,
          jabatan: userRow.title || userRow.role,
          departemen: userRow.departemen || '',
          directorate: userRow.directorate || '',
          status: userRow.employee_status || 'Active',
          lokasi_kerja: userRow.lokasi_kerja || '',
          tanggal_mulai_bekerja: userRow.tanggal_mulai_bekerja || null,
          employeement_status: userRow.employeement_status || '',
          email_kantor: userRow.email_kantor || userRow.email,
        }
      : null

    const userData = {
      id: userRow.id,
      nama: userRow.employee_nama || userRow.nama,
      email: userRow.email,
      role: userRow.role,
      is_active: userRow.is_active,
      created_at: userRow.created_at,
      permissions,
      nik: userRow.nik || '',
      title: userRow.title || userRow.role,
      jabatan: userRow.title || userRow.role,
      departemen: userRow.departemen || '',
      directorate: userRow.directorate || '',
      lokasi_kerja: userRow.lokasi_kerja || '',
      employee,
    }

    res.json(userData)
  } catch (error) {
    console.error('Error getMe:', error)
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' })
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ message: 'Password saat ini wajib diisi.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || Array.from(newPassword).length < 8) {
      return res.status(400).json({ message: 'Password baru minimal harus 8 karakter.' });
    }

    const userResult = await pool.query(
      `SELECT id, nama, email, password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    const user = userResult.rows[0];
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Password saat ini salah.' });
    }

    const newHashedPassword = await hashPassword(newPassword);
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHashedPassword, userId],
    );

    // Revoke all active sessions on password change for security
    await revokeAllUserSessions(userId);

    await pool.query(
      `INSERT INTO log_audit_login (user_id, email, login_time, ip_address, user_agent, status_login) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
      [user.id, user.email, req.ip, req.headers['user-agent'], 'PASSWORD_CHANGE'],
    );

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    console.error('Error changePassword:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
}

/**
 * Permintaan OTP untuk Lupa Password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {}
    let parsedEmail
    try {
      parsedEmail = parseRequiredEmail(email)
    } catch {
      return res.status(400).json({ message: 'Format alamat email tidak valid.' })
    }

    // 1. Cari data user berdasarkan email
    const userResult = await pool.query(
      `
      SELECT id, nama, email, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
    `,
      [parsedEmail],
    )

    // Anti user-enumeration: status & pesan selalu identik untuk email terdaftar
    // maupun tidak. Untuk email tidak dikenal / akun nonaktif, jalankan timing
    // equalization (dummy hash verification) agar respons tidak dapat dibedakan.
    const genericMessage =
      'Jika alamat email terdaftar, kode verifikasi OTP telah dikirim. Periksa kotak masuk Anda.'

    if (userResult.rowCount === 0) {
      await verifyPassword('x', DUMMY_BCRYPT_HASH)
      return res.json({ message: genericMessage })
    }

    const user = userResult.rows[0]

    if (!user.is_active) {
      await verifyPassword('x', DUMMY_BCRYPT_HASH)
      return res.json({ message: genericMessage })
    }

    // 2. Buat OTP 6 digit dan simpan ke database (berlaku 5 menit)
    const { otpCode, expiresMinutes } = await createPasswordResetOtp(user.id, user.email)

    // 3. Kirim email berisi OTP
    const htmlEmail = renderPasswordResetOtpEmailHtml({
      recipientName: user.nama,
      otpCode,
      expiresMinutes,
    })

    const isSent = await sendEmail({
      to: user.email,
      subject: `[ESB TrackIT] Verifikasi Reset Kata Sandi`,
      html: htmlEmail,
      text: `Halo ${user.nama}, kode verifikasi OTP Anda untuk reset kata sandi adalah: ${otpCode}. Kode ini berlaku selama ${expiresMinutes} menit.`,
    })

    console.log(`[forgotPassword] OTP issued for ${hashIdentifier(user.email)} (email sent: ${isSent})`)

    res.json({ message: genericMessage })
  } catch (error) {
    if (error.statusCode) {
      if (error.retryAfter) {
        res.setHeader('Retry-After', String(error.retryAfter))
      }
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error('Error forgotPassword:', error)
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengirim OTP.' })
  }
}

/**
 * Verifikasi Kode OTP yang dimasukkan user
 */
export async function verifyResetOtp(req, res) {
  try {
    const { email, otp } = req.body || {}
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email wajib diisi.' })
    }
    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({ message: 'Kode OTP wajib diisi.' })
    }

    const result = await verifyPasswordResetOtp(email, otp)

    res.json({
      message: 'Kode OTP valid. Silakan atur kata sandi baru Anda.',
      resetToken: result.resetToken,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error('Error verifyResetOtp:', error)
    res.status(500).json({ message: 'Terjadi kesalahan saat memverifikasi kode OTP.' })
  }
}

/**
 * Eksekusi Perubahan Password menggunakan Token Reset
 */
export async function resetPassword(req, res) {
  try {
    const { email, resetToken, newPassword } = req.body || {}

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email wajib diisi.' })
    }
    if (!resetToken || typeof resetToken !== 'string') {
      return res.status(400).json({ message: 'Token reset wajib disertakan.' })
    }
    if (!newPassword || typeof newPassword !== 'string' || Array.from(newPassword).length < 8) {
      return res.status(400).json({ message: 'Kata sandi baru minimal harus 8 karakter.' })
    }

    // 1. Validasi token dan ambil userId
    const { userId } = await consumePasswordResetToken(email, resetToken)

    // 2. Hash kata sandi baru
    const newHashedPassword = await hashPassword(newPassword)

    // 3. Update database
    await pool.query(
      `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `,
      [newHashedPassword, userId],
    )

    // 4. Revoke semua sesi lama pengguna demi keamanan
    await revokeAllUserSessions(userId)

    // 5. Catat ke audit log
    await pool.query(
      `
      INSERT INTO log_audit_login (user_id, email, login_time, ip_address, user_agent, status_login)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)
    `,
      [userId, email, req.ip, req.headers['user-agent'] || '', 'PASSWORD_RESET_OTP'],
    ).catch(() => {})

    res.json({
      message: 'Kata sandi Anda berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru.',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }
    console.error('Error resetPassword:', error)
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat memperbarui kata sandi.' })
  }
}

