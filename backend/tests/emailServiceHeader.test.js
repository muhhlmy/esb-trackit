import { test } from 'node:test'
import assert from 'node:assert'
import { renderTicketEmailHtml, renderPasswordResetOtpEmailHtml, getEsbLogoPngPath } from '../src/services/emailService.js'

test('renderTicketEmailHtml renders ESB Logo Only logo with cid:esbLogoOnly vertically centered in header', () => {
  const pngPath = getEsbLogoPngPath()
  assert.ok(pngPath.endsWith('esb_logo_only.png') || pngPath.endsWith('ESB Logo Only.png'), 'PNG logo path should exist')

  const html = renderTicketEmailHtml({
    recipientName: 'Budi',
    title: 'Test Email Header',
    subtitle: 'This is a test email',
    ticket: { nomor_tiket: 'TKT-001', judul: 'Problem Printer', status_tiket: 'Open', prioritas: 'High' }
  })

  // Check logo src uses cid:esbLogoOnly
  assert.ok(html.includes('cid:esbLogoOnly'), 'HTML should use cid:esbLogoOnly for inline email attachment')
  // Check vertical-align: middle for center vertical positioning
  assert.ok(html.includes('vertical-align: middle'), 'HTML header should use vertical-align: middle')
  // Check left alignment
  assert.ok(html.includes('text-align: left'), 'HTML header should align logo to the left')
})

test('renderPasswordResetOtpEmailHtml renders ESB Logo Only logo vertically centered in header', () => {
  const html = renderPasswordResetOtpEmailHtml({
    recipientName: 'Siti',
    otpCode: '123456',
    expiresMinutes: 5
  })

  assert.ok(html.includes('cid:esbLogoOnly'), 'OTP HTML should contain cid:esbLogoOnly')
  assert.ok(html.includes('vertical-align: middle'), 'OTP HTML header should use vertical-align: middle')
})
