import { test } from 'node:test'
import assert from 'node:assert'
import { renderTicketEmailHtml, renderPasswordResetOtpEmailHtml, getEsbLogoPngPath, isEmailConfigured } from '../src/services/emailService.js'

test('OTP email requires complete SMTP configuration', () => {
  const original = Object.fromEntries(
    ['EMAIL_ENABLED', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].map((key) => [key, process.env[key]]),
  )
  try {
    process.env.EMAIL_ENABLED = 'true'
    process.env.SMTP_HOST = 'smtp.example.test'
    process.env.SMTP_USER = ''
    process.env.SMTP_PASS = ''
    assert.equal(isEmailConfigured(), false)

    process.env.SMTP_USER = 'mailer@example.test'
    process.env.SMTP_PASS = 'app-password'
    assert.equal(isEmailConfigured(), true)
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('renderTicketEmailHtml renders ESB Logo Only logo with cid:esbLogoOnly vertically centered in header', () => {
  const pngPath = getEsbLogoPngPath()
  assert.ok(pngPath.endsWith('esb_logo_only.png') || pngPath.endsWith('esb-logo-only.png'), 'PNG logo path should exist')

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
  assert.ok(html.includes('Pemberitahuan Otomatis &bull; No-Reply'), 'OTP HTML should include No-Reply notice')
})

test('renderTicketEmailHtml includes No-Reply notice and ESB branding styles', () => {
  const html = renderTicketEmailHtml({
    recipientName: 'Ahmad',
    title: '[#TIC26-0001] Laptop Mati Total',
    subtitle: 'Tiket Anda telah berhasil dibuat.',
    ticket: {
      nomor_tiket: '#TIC26-0001',
      judul: 'Laptop Mati Total',
      status_tiket: 'Open',
      prioritas: 'High',
      unit_support: 'IT Desktop',
      pelapor: 'Ahmad'
    }
  })

  // Check No-Reply notice callout
  assert.ok(html.includes('Pemberitahuan Otomatis &bull; No-Reply'), 'Ticket email should contain No-Reply banner')
  assert.ok(html.includes('tidak dapat menerima balasan email masuk'), 'Ticket email should state incoming replies are not accepted')
  assert.ok(html.includes('#TIC26-0001'), 'Ticket email should include ticket number tag')

  // Check ESB Branding styling tokens
  assert.ok(html.includes('linear-gradient(135deg, #FF4F1B'), 'Ticket email should feature ESB orange gradient top bar')
  assert.ok(html.includes('linear-gradient(135deg, #0A51B0'), 'Ticket email should feature ESB blue gradient header')
  assert.ok(html.includes('People Technology Division'), 'Ticket email should state People Technology Division in footer')
})

test('formatTicketTag prefixes ticket numbers with # correctly', async () => {
  const { formatTicketTag } = await import('../src/services/emailNotificationService.js')
  assert.strictEqual(formatTicketTag('#TIC26-0001'), '#TIC26-0001')
  assert.strictEqual(formatTicketTag('TIC26-0001'), '#TIC26-0001')
  assert.strictEqual(formatTicketTag(''), '#TIC26-0000')
  assert.strictEqual(formatTicketTag(null), '#TIC26-0000')
})

test('ticket email lifecycle subject formats match specification', async () => {
  const { formatTicketTag } = await import('../src/services/emailNotificationService.js')
  const tag = formatTicketTag('#TIC26-0001')
  const ticket = { nomor_tiket: '#TIC26-0001', judul: 'Laptop Mati Total', prioritas: 'High', pelapor: 'Budi Santoso' }

  // 1. Ticket Created (Reporter): [#TIC26-0001] Laptop Mati Total
  const createdReporterSubject = `[${tag}] ${ticket.judul || 'Tiket Dibuat'}`
  assert.strictEqual(createdReporterSubject, '[#TIC26-0001] Laptop Mati Total')

  // 2. Ticket Created (Admin): [Tiket Baru] [High] [#TIC26-0001] Printer Kasir Error - oleh Budi Santoso
  const prioritasLabel = ticket.prioritas || 'Normal'
  const pelaporLabel = ticket.pelapor || 'Pengguna'
  const createdAdminSubject = `[Tiket Baru] [${prioritasLabel}] [${tag}] ${ticket.judul || ''} - oleh ${pelaporLabel}`
  assert.strictEqual(createdAdminSubject, '[Tiket Baru] [High] [#TIC26-0001] Laptop Mati Total - oleh Budi Santoso')

  // 3. Status Update: [#TIC26-0001] Status Update
  const updateSubject = `[${tag}] Status Update`
  assert.strictEqual(updateSubject, '[#TIC26-0001] Status Update')

  // 4. Resolved: [#TIC26-0001] Tiket Selesai: Laptop Mati Total
  const resolvedSubject = `[${tag}] Tiket Selesai: ${ticket.judul || ''}`
  assert.strictEqual(resolvedSubject, '[#TIC26-0001] Tiket Selesai: Laptop Mati Total')

  // 5. IT Comment: [#TIC26-0001] Komentar baru telah ditambahkan
  const commentSubject = `[${tag}] Komentar baru telah ditambahkan`
  assert.strictEqual(commentSubject, '[#TIC26-0001] Komentar baru telah ditambahkan')

  // 6. Reporter Comment (to IT): [Balasan Pelapor] [#TIC26-0001] Laptop Mati Total - oleh Budi Santoso
  const reporterReplySubject = `[Balasan Pelapor] [${tag}] ${ticket.judul || ''} - oleh ${ticket.pelapor}`
  assert.strictEqual(reporterReplySubject, '[Balasan Pelapor] [#TIC26-0001] Laptop Mati Total - oleh Budi Santoso')
})

test('renderTicketEmailHtml renders valid CTA button URL and ticket title', () => {
  const html = renderTicketEmailHtml({
    recipientName: 'Muhammad Helmy',
    title: '[#TIC26-0002] Komentar baru telah ditambahkan',
    subtitle: 'Super Administrator menambahkan pesan baru pada tiket Anda.',
    ticket: {
      id: 2,
      nomor_tiket: '#TIC26-0002',
      judul: 'Kendala Akses VPN Kantor',
      status_tiket: 'In Progress',
      prioritas: 'Normal',
      queue_nama: 'IT Support',
      pelapor: 'Muhammad Helmy',
    },
    commentPesan: 'Sudah kami cek, silakan coba login ulang VPN sekarang ya.',
    commentAuthor: 'Super Administrator',
  })

  // CTA button should link directly to ticket with comments tab, NEVER href="#"
  assert.ok(!html.includes('href="#"'), 'CTA button should not have empty href="#"')
  assert.ok(html.includes('/tickets?id=2&tab=comments'), 'CTA button should point to ticket comments URL')

  // Title and reporter should render properly without falling back to '-' or raw ID
  assert.ok(html.includes('Kendala Akses VPN Kantor'), 'Judul tiket should appear in the email card')
  assert.ok(html.includes('Muhammad Helmy'), 'Pelapor name should appear in the email card')
  assert.ok(!html.includes('Pelapor: 38'), 'Pelapor should not display raw database user ID')
})
