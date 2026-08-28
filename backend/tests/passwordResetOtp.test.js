import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPasswordResetOtp,
  verifyPasswordResetOtp,
  consumePasswordResetToken,
} from '../src/services/otpService.js'
import { pool } from '../src/config/database.js'
import { hashPassword, verifyPassword } from '../src/security/passwordService.js'

test('OTP Password Reset Flow', async (t) => {
  const testEmail = 'superadmin@admin.com'
  let userId

  await t.test('Setup: Verify user exists', async () => {
    const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [testEmail])
    assert.ok(userRes.rowCount > 0, 'User test should exist')
    userId = userRes.rows[0].id
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
        await verifyPasswordResetOtp(testEmail, '000000')
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

  // Cleanup: Reset back superadmin password to admin123
  await t.test('Cleanup: ensure superadmin password is admin123', async () => {
    const defaultHash = await hashPassword('admin123')
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [defaultHash, testEmail])
    const checkUser = await pool.query('SELECT password_hash FROM users WHERE email = $1', [testEmail])
    const valid = await verifyPassword('admin123', checkUser.rows[0].password_hash)
    assert.equal(valid, true)
  })
})
