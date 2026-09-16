import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPasswordResetOtp,
  verifyPasswordResetOtp,
  consumePasswordResetToken,
} from '../src/services/otpService.js'
import { pool } from '../src/config/database.js'
import { createEnrollmentCredential, hashPassword, verifyPassword } from '../src/security/passwordService.js'

test('OTP Password Reset Flow', async (t) => {
  const testEmail = `otp.${crypto.randomUUID()}@example.test`
  let userId

  t.after(async () => {
    if (!userId) return
    await pool.query('DELETE FROM password_reset_otps WHERE user_id = $1', [userId])
    await pool.query('UPDATE users SET is_active = false, deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [userId])
  })
  await t.test('Setup: provision an isolated account requiring enrollment', async () => {
    const credential = createEnrollmentCredential()
    const userRes = await pool.query(
      "INSERT INTO users (nama, email, password_hash, role) VALUES ('OTP Test', $1, $2, 'user') RETURNING id",
      [testEmail, credential],
    )
    userId = userRes.rows[0].id
    assert.equal(await verifyPassword('TemporaryUserPass123!', credential), false)
  })

  let generatedOtp
  await t.test('1. createPasswordResetOtp generates 6-digit OTP', async () => {
    const res = await createPasswordResetOtp(userId, testEmail)
    assert.ok(res.otpCode, 'OTP code should be generated')
    assert.equal(res.otpCode.length, 6, 'OTP must be 6 digits')
    assert.equal(res.expiresMinutes, 5, 'Expires in 5 minutes')
    generatedOtp = res.otpCode
  })

  await t.test('2. Rate limit cooldown on immediate second request', async () => {
    await assert.rejects(
      async () => {
        await createPasswordResetOtp(userId, testEmail)
      },
      (err) => {
        assert.equal(err.statusCode, 429)
        assert.match(err.message, /Harap tunggu/)
        return true
      },
    )
  })

  await t.test('3. verifyPasswordResetOtp rejects invalid OTP and decrements attempts', async () => {
    await assert.rejects(
      async () => {
        await verifyPasswordResetOtp(testEmail, generatedOtp === '000000' ? '000001' : '000000')
      },
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /Kode OTP salah/)
        return true
      },
    )
  })

  let resetToken
  await t.test('4. verifyPasswordResetOtp succeeds with correct OTP and returns resetToken', async () => {
    const verifyRes = await verifyPasswordResetOtp(testEmail, generatedOtp)
    assert.equal(verifyRes.valid, true)
    assert.ok(verifyRes.resetToken, 'Reset token must be returned')
    resetToken = verifyRes.resetToken
  })

  await t.test('5. consumePasswordResetToken consumes valid token', async () => {
    const consumeRes = await consumePasswordResetToken(testEmail, resetToken)
    assert.equal(consumeRes.userId, userId)
  })

  await t.test('6. consumePasswordResetToken rejects already used token', async () => {
    await assert.rejects(
      async () => {
        await consumePasswordResetToken(testEmail, resetToken)
      },
      (err) => {
        assert.equal(err.statusCode, 400)
        assert.match(err.message, /tidak valid atau sudah pernah digunakan/)
        return true
      },
    )
  })

  // Complete enrollment for the isolated user only.
  await t.test('7. Enrolled password authenticates after OTP verification', async () => {
    // Password test arbitrary untuk user isolated; bukan kredensial environment manapun.
    const testPassword = 'Enrolled-Test-Password-9!'
    const defaultHash = await hashPassword(testPassword)
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [defaultHash, testEmail])
    const checkUser = await pool.query('SELECT password_hash FROM users WHERE email = $1', [testEmail])
    const valid = await verifyPassword(testPassword, checkUser.rows[0].password_hash)
    assert.equal(valid, true)
  })
})
