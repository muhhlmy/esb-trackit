import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function getLogoPngPath() {
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../assets/logo.png'),
      path.resolve(__dirname, '../../../../frontend/public/logo.png'),
      path.resolve(process.cwd(), '../frontend/public/logo.png'),
      path.resolve(process.cwd(), 'frontend/public/logo.png'),
      path.resolve(process.cwd(), 'src/assets/logo.png'),
    ]
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p.replace(/\\/g, '/')
      }
    }
  } catch (err) {
    // fallback
  }
  return path.resolve(__dirname, '../assets/logo.png').replace(/\\/g, '/')
}

export function getLogoSrc() {
  return 'cid:trackitLogo'
}

let transporter = null

export async function getActiveEmailConfig() {
  try {
    const { pool } = await import('../config/database.js')
    const { rows } = await pool.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1')
    if (rows.length > 0 && rows[0].smtp_host) {
      const s = rows[0]
      return {
        enabled: s.email_enabled,
        host: s.smtp_host,
        port: s.smtp_port || 587,
        secure: Boolean(s.smtp_secure),
        user: s.smtp_user,
        pass: s.smtp_pass,
        from: `"${s.email_from_name || 'TrackIT'}" <${s.email_from_address || 'no-reply@trackit.local'}>`,
        notify_ticket_create: s.notify_ticket_create ?? true,
        notify_ticket_status: s.notify_ticket_status ?? true,
        notify_ticket_assign: s.notify_ticket_assign ?? true,
        notify_ticket_comment: s.notify_ticket_comment ?? true,
        notify_asset_assign: s.notify_asset_assign ?? true,
        notify_shipment: s.notify_shipment ?? true,
        notify_user_create: s.notify_user_create ?? true,
      }
    }
  } catch (err) {
    // fallback ke env
  }
  return {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || '"TrackIT" <no-reply@trackit.local>',
    notify_ticket_create: true,
    notify_ticket_status: true,
    notify_ticket_assign: true,
    notify_ticket_comment: true,
    notify_asset_assign: true,
    notify_shipment: true,
    notify_user_create: true,
  }
}

export function isEmailConfigured() {
  return (
    process.env.EMAIL_ENABLED === 'true' &&
    Boolean(process.env.SMTP_HOST?.trim()) &&
    Boolean(process.env.SMTP_USER?.trim()) &&
    Boolean(process.env.SMTP_PASS?.trim())
  )
}

/**
 * Send an email asynchronously. Fails gracefully if SMTP is disabled or unconfigured.
 */
export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  if (!to) return false

  const cfg = await getActiveEmailConfig()
  if (!cfg.enabled || !cfg.host || !cfg.user || !cfg.pass) {
    console.log(`[emailService] Skip: EMAIL_ENABLED=false atau SMTP belum dikonfigurasi. Subject: "${subject}"`)
    return false
  }

  const activeTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  })

  const from = cfg.from

  const logoPngPath = getLogoPngPath()
  const mailAttachments = [...attachments]

  let processedHtml = html
  if (logoPngPath && fs.existsSync(logoPngPath)) {
    const hasCid = mailAttachments.some((a) => a.cid === 'trackitLogo')
    if (!hasCid) {
      mailAttachments.push({
        filename: 'logo.png',
        path: logoPngPath,
        cid: 'trackitLogo',
      })
    }

    if (processedHtml) {
      processedHtml = processedHtml.replace(/src="[^"]*frontend\/public\/[^"]*"/gi, 'src="cid:trackitLogo"')
      processedHtml = processedHtml.replace(/src="\.\.\/\.\.\/frontend\/public\/[^"]*"/gi, 'src="cid:trackitLogo"')
    }
  }

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '***'
  const [user, domain] = email.split('@')
  const maskedUser = user.length > 2 ? `${user[0]}***${user.slice(-1)}` : `${user[0] || '*'}***`
  return `${maskedUser}@${domain}`
}

  try {
    const info = await activeTransporter.sendMail({ from, to, subject, text, html: processedHtml, attachments: mailAttachments })
    console.log(`[emailService] ✅ Email terkirim ke <${maskEmail(to)}>: ${info.messageId}`)
    return true
  } catch (error) {
    console.error(`[emailService] ❌ Gagal kirim ke <${maskEmail(to)}>:`, error.message)
    return false
  }
}

/**
 * Helper to render HTML email for ticket events
 * Designed according to shared design tokens (brand gradients, semantic status tokens, No-Reply notice).
 */
export function renderTicketEmailHtml({
  recipientName,
  title,
  subtitle,
  ticket,
  actionText,
  changes = [],
  commentPesan = null,
  commentAuthor = null,
  ticketUrl: customTicketUrl = null,
}) {
  const rawNomorTiket = ticket?.nomor_tiket || (ticket?.id ? `#TIC26-${String(ticket.id).padStart(4, '0')}` : '#TIC26-0000')
  const nomorTiket = rawNomorTiket.startsWith('#') ? rawNomorTiket : `#${rawNomorTiket}`
  const judulTiket = ticket?.judul || '-'
  const statusTiket = ticket?.status_tiket || 'Open'
  const prioritasTiket = ticket?.prioritas || 'Normal'
  const unitSupport = ticket?.queue_nama || ticket?.queue_kode || ticket?.kategori || 'IT Support'
  const pelaporNama =
    (typeof ticket?.pelapor === 'string' && !/^\d+$/.test(ticket.pelapor.trim()))
      ? ticket.pelapor
      : (ticket?.pelapor_nama || '-')

  const frontendBaseUrl = (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    'http://localhost:5173'
  ).replace(/\/+$/, '')

  const ticketUrl = customTicketUrl || (
    ticket?.id
      ? `${frontendBaseUrl}/tickets?id=${ticket.id}${commentPesan ? '&tab=comments' : ''}`
      : `${frontendBaseUrl}/tickets`
  )

  // Semantic Status Tokens according to DESIGN.md
  const statusConfigMap = {
    Open: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    'In Progress': { bg: '#EDF5FF', text: '#0A51B0', border: '#BFDBFE' },
    Pending: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    Resolved: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    Closed: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    Cancelled: { bg: '#F8FAFC', text: '#94A3B8', border: '#E2E8F0' },
  }
  const statusStyle = statusConfigMap[statusTiket] || { bg: '#EDF5FF', text: '#0A51B0', border: '#BFDBFE' }

  // Priority Badge Tokens
  const priorityConfigMap = {
    High: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    Urgent: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    Medium: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    Low: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  }
  const priorityStyle = priorityConfigMap[prioritasTiket] || { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' }

  let changesListHtml = ''
  if (Array.isArray(changes) && changes.length > 0) {
    changesListHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 18px; background-color: #EDF5FF; border: 1px solid #BFDBFE; border-left: 4px solid #0A51B0; border-radius: 8px; padding: 14px 18px;">
        <tr>
          <td>
            <div style="font-size: 12.5px; font-weight: 700; color: #0A51B0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              📋 Rincian Pembaruan Tiket
            </div>
            <ul style="margin: 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.6;">
              ${changes.map((c) => `<li style="margin-bottom: 4px;">${c}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>
    `
  }

  let commentBoxHtml = ''
  if (commentPesan) {
    commentBoxHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 18px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #0A5DBD; border-radius: 8px; padding: 14px 18px;">
        <tr>
          <td>
            <div style="font-size: 12px; font-weight: 700; color: #0A5DBD; margin-bottom: 6px;">
              💬 Pesan dari ${commentAuthor || 'Tim IT Support'}:
            </div>
            <div style="font-size: 13.5px; color: #334155; line-height: 1.6; font-style: italic; white-space: pre-wrap;">
              "${commentPesan}"
            </div>
          </td>
        </tr>
      </table>
    `
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F6F9; margin: 0; padding: 24px 12px; color: #334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 8px 24px rgba(10, 81, 176, 0.08);">
    
    <!-- Top Accent Bar: Brand Orange Gradient -->
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>

    <!-- Header: Brand Blue Gradient -->
    <tr>
      <td style="background: linear-gradient(135deg, #0A51B0 0%, #0A5DBD 26%, #097CDE 72%, #0892F5 100%); padding: 26px 36px; color: #FFFFFF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle; text-align: left; width: 44px; padding-right: 14px;">
              <img src="cid:trackitLogo" alt="TrackIT Logo" style="width: 36px; height: 36px; display: block; object-fit: contain;">
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; color: #FFFFFF;">TrackIT</h1>
              <div style="margin-top: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; color: rgba(255, 255, 255, 0.85); text-transform: uppercase;">IT Asset &amp; Helpdesk Management</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content Area -->
    <tr>
      <td style="padding: 32px 36px;">
        <p style="font-size: 15px; margin: 0 0 8px 0; color: #1E293B;">Halo <strong>${recipientName || 'Rekan'}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 22px 0;">
          ${subtitle}
        </p>

        <!-- Ticket Card Panel -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <tr>
            <td>
              <!-- Tag Row: Nomor Tiket & Badges -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; font-weight: 700; color: #0A51B0; background-color: #EDF5FF; border: 1px solid #BFDBFE; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                      ${nomorTiket}
                    </span>
                    <span style="background-color: ${statusStyle.bg}; color: ${statusStyle.text}; border: 1px solid ${statusStyle.border}; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 700; margin-left: 6px; display: inline-block;">
                      ${statusTiket}
                    </span>
                    <span style="background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border}; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 600; margin-left: 6px; display: inline-block;">
                      Prioritas: ${prioritasTiket}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Judul Tiket -->
              <div style="font-size: 17px; font-weight: 700; color: #1E293B; margin-top: 14px; line-height: 1.4;">
                ${judulTiket}
              </div>

              <!-- Metadata Divider -->
              <div style="height: 1px; background-color: #E2E8F0; margin: 14px 0;"></div>

              <!-- Metadata Details Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px; color: #64748B;">
                <tr>
                  <td style="width: 50%; padding-bottom: 6px;">
                    <span style="color: #94A3B8;">Unit Antrean:</span> <strong style="color: #334155;">${unitSupport}</strong>
                  </td>
                  <td style="width: 50%; padding-bottom: 6px;">
                    <span style="color: #94A3B8;">Pelapor:</span> <strong style="color: #334155;">${pelaporNama}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${changesListHtml}
        ${commentBoxHtml}

        <!-- Primary Call to Action Button -->
        <div style="margin-top: 26px; text-align: center;">
          <p style="font-size: 13px; color: #64748B; margin: 0 0 14px 0;">
            ${actionText || 'Silakan buka aplikasi untuk memantau status atau merespons tiket ini.'}
          </p>
          <a href="${ticketUrl}" style="background: linear-gradient(135deg, #0A51B0 0%, #0A5DBD 50%, #0892F5 100%); color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13.5px; font-weight: 700; display: inline-block; box-shadow: 0 2px 8px rgba(10, 81, 176, 0.25);">
            Buka Tiket di TrackIT &rarr;
          </a>
        </div>

        <!-- No-Reply & Automated System Notice (DESIGN.md Styled) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px; background-color: #FFF2E7; border: 1px solid #FED7AA; border-radius: 10px; padding: 14px 18px;">
          <tr>
            <td style="vertical-align: top; width: 22px; padding-right: 12px; font-size: 16px; line-height: 1;">
              ⚠️
            </td>
            <td style="vertical-align: top; font-size: 12px; color: #B83A10; line-height: 1.55;">
              <strong style="color: #9A3412;">Pemberitahuan Otomatis &bull; No-Reply:</strong><br>
              Email ini dikirimkan secara otomatis oleh sistem notifikasi <strong>TrackIT</strong> dan alamat ini tidak dapat menerima balasan email masuk. Mohon untuk <strong>tidak membalas langsung</strong> email ini. Untuk memberikan respon atau melihat perkembangan tiket, silakan login ke portal TrackIT.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 22px 36px; text-align: center; border-top: 1px solid #EDF1F6; font-size: 11.5px; color: #8291A7; line-height: 1.6;">
        <div style="font-weight: 700; color: #475569; margin-bottom: 4px;">
          TrackIT &bull; IT &amp; Asset Management
        </div>
        <div>
          &copy; 2026 TrackIT
        </div>
        <div style="margin-top: 8px; font-size: 10.5px; color: #94A3B8;">
          Pesan ini ditujukan khusus untuk pengguna terkait. Harap jaga kerahasiaan data tiket perusahaan Anda.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Helper to render HTML email for OTP Password Reset
 */
export function renderPasswordResetOtpEmailHtml({
  recipientName,
  otpCode,
  expiresMinutes = 5,
}) {
  // Split OTP digits into individual boxes
  const digits = String(otpCode).split('')
  const digitBoxes = digits
    .map(
      (d) =>
        `<td style="padding: 0 5px;"><div style="width:44px;height:54px;line-height:54px;text-align:center;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;font-size:28px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${d}</div></td>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Verifikasi Kata Sandi – TrackIT</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8edf3;" cellpadding="0" cellspacing="0">

          <!-- Top accent bar: Brand Orange Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 16px;">
                <tr>
                  <td style="vertical-align: middle; text-align: left; width: 36px; padding-right: 10px;">
                    <img src="cid:trackitLogo" alt="TrackIT Logo" style="width: 28px; height: 28px; display: block; object-fit: contain;">
                  </td>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#0A51B0;text-transform:uppercase;">TrackIT</div>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Verifikasi Kata Sandi</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
                Halo <strong style="color:#111827;">${recipientName || 'Pengguna'}</strong>, gunakan kode di bawah ini untuk mereset kata sandi Anda.
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td style="padding:28px 40px;">
              <div style="background:#f8fafc;border-radius:12px;padding:24px 20px;text-align:center;border:1px solid #e8edf3;">
                <p style="margin:0 0 16px 0;font-size:12px;font-weight:600;color:#9ca3af;letter-spacing:0.8px;text-transform:uppercase;">Kode Verifikasi</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>${digitBoxes}</tr>
                </table>
                <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">
                  Berlaku selama <strong style="color:#ef4444;">${expiresMinutes} menit</strong> &nbsp;·&nbsp; Satu kali pakai
                </p>
              </div>
            </td>
          </tr>

          <!-- Security note & No-reply notice -->
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <div style="background-color: #FFF2E7; border: 1px solid #FED7AA; border-radius: 8px; padding: 10px 14px; font-size: 11.5px; color: #B83A10; line-height: 1.5; margin-bottom: 16px;">
                <strong style="color: #9A3412;">Pemberitahuan Otomatis &bull; No-Reply:</strong> Email ini dikirimkan secara otomatis oleh sistem. Mohon tidak membalas email ini.
              </div>
              <p style="margin:0;font-size:12.5px;color:#9ca3af;line-height:1.6;border-top:1px solid #f1f5f9;padding-top:16px;">
                Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Universal SaaS Apple-Style Email Templates Collection
 */
export const DEFAULT_EMAIL_TEMPLATES = {
  ticket_created: {
    name: 'Tiket Baru',
    description: 'Dikirim saat pengguna atau helpdesk membuat tiket baru',
    subject: '[TrackIT] Tiket Baru {{nomor_tiket}}: {{judul_tiket}}',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiket Baru {{nomor_tiket}}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1D4ED8;">Helpdesk</span>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 12px; color: #64748B;">
              {{nomor_tiket}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Tiket laporan Anda telah berhasil didaftarkan ke sistem dan saat ini sedang dalam antrean tim IT Support.
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <tr>
            <td style="padding-bottom: 12px;">
              <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 4px;">Judul Laporan</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.4;">{{judul_tiket}}</div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #E2E8F0; padding-top: 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px;">
                <tr>
                  <td style="width: 50%; color: #64748B;">
                    Unit Antrean: <strong style="color: #0F172A;">{{unit_support}}</strong>
                  </td>
                  <td style="width: 50%; color: #64748B;">
                    Prioritas: <strong style="color: #0F172A;">{{prioritas_tiket}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{ticket_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Buka Tiket di TrackIT &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Email otomatis dari sistem notifikasi. Harap tidak membalas email ini secara langsung.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Tiket baru {{nomor_tiket}} telah dibuat: {{judul_tiket}}. Buka tiket di: {{ticket_url}}',
  },

  ticket_status_changed: {
    name: 'Pembaruan Status Tiket',
    description: 'Dikirim saat status tiket berubah (Open, In Progress, Resolved, Closed)',
    subject: '[TrackIT] Status Tiket {{nomor_tiket}}: {{status_tiket}}',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembaruan Status Tiket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1D4ED8;">Pembaruan Tiket</span>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 12px; color: #64748B;">
              {{nomor_tiket}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Status pengerjaan tiket laporan Anda telah diperbarui oleh tim penanggung jawab.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <tr>
            <td style="padding-bottom: 12px;">
              <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 4px;">Judul Tiket</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A;">{{judul_tiket}}</div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #E2E8F0; padding-top: 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px;">
                <tr>
                  <td style="width: 50%; color: #64748B;">
                    Status Saat Ini: <strong style="display: inline-block; padding: 2px 8px; background-color: #DCFCE7; color: #15803D; border-radius: 6px; font-size: 12px;">{{status_tiket}}</strong>
                  </td>
                  <td style="width: 50%; color: #64748B;">
                    Prioritas: <strong style="color: #0F172A;">{{prioritas_tiket}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{ticket_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Pantau Progres Tiket &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Email otomatis dari sistem notifikasi. Harap tidak membalas email ini secara langsung.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Status tiket {{nomor_tiket}} telah diperbarui menjadi {{status_tiket}}. Buka tiket di: {{ticket_url}}',
  },

  ticket_comment: {
    name: 'Pesan / Komentar Tiket',
    description: 'Dikirim saat ada tanggapan atau komentar baru pada tiket',
    subject: '[TrackIT] Komentar Baru pada Tiket {{nomor_tiket}}',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Komentar Tiket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 11px; font-weight: 600; color: #475569;">Pesan Tiket</span>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 12px; color: #64748B;">
              {{nomor_tiket}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 18px 0;">
          <strong>{{comment_author}}</strong> menambahkan tanggapan baru pada tiket <strong>{{judul_tiket}}</strong>:
        </p>

        <div style="background-color: #F8FAFC; border-left: 3px solid #0F172A; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 22px; font-size: 14px; color: #334155; line-height: 1.6; font-style: normal;">
          {{comment_pesan}}
        </div>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{ticket_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Balas Pesan di TrackIT &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Email otomatis dari sistem notifikasi. Harap tidak membalas email ini secara langsung.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Komentar baru dari {{comment_author}} pada tiket {{nomor_tiket}}: {{comment_pesan}}. Link: {{ticket_url}}',
  },

  ticket_assigned: {
    name: 'Penugasan Teknisi',
    description: 'Dikirim saat tiket ditugaskan ke teknisi / PIC',
    subject: '[TrackIT] Penugasan Tiket {{nomor_tiket}}: {{judul_tiket}}',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Penugasan Tiket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; font-size: 11px; font-weight: 600; color: #B45309;">Penugasan Baru</span>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 12px; color: #64748B;">
              {{nomor_tiket}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Anda telah ditugaskan sebagai PIC penanganan untuk tiket berikut:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <tr>
            <td style="padding-bottom: 12px;">
              <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 4px;">Kasus / Keluhan</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A;">{{judul_tiket}}</div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #E2E8F0; padding-top: 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px;">
                <tr>
                  <td style="width: 50%; color: #64748B;">
                    Unit: <strong style="color: #0F172A;">{{unit_support}}</strong>
                  </td>
                  <td style="width: 50%; color: #64748B;">
                    Prioritas: <strong style="color: #0F172A;">{{prioritas_tiket}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{ticket_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Mulai Tangani Tiket &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Email otomatis dari sistem notifikasi. Harap tidak membalas email ini secara langsung.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Anda telah ditugaskan menangani tiket {{nomor_tiket}}: {{judul_tiket}}. Buka tiket di: {{ticket_url}}',
  },

  asset_assigned: {
    name: 'Serah Terima Aset (BAST)',
    description: 'Dikirim saat ada dokumen pengajuan atau serah terima aset baru',
    subject: '[TrackIT] Dokumen Serah Terima Aset: {{nomor_bast}}',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Serah Terima Aset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 11px; font-weight: 600; color: #15803D;">BAST Aset</span>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 12px; color: #64748B;">
              {{nomor_bast}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Dokumen Berita Acara Serah Terima (BAST) untuk perangkat operasional Anda telah diterbitkan. Rincian perangkat tertera di bawah ini:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <tr>
            <td style="padding-bottom: 12px;">
              <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 4px;">Nama Perangkat</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A;">{{nama_aset}}</div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #E2E8F0; padding-top: 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px;">
                <tr>
                  <td style="width: 50%; color: #64748B;">
                    Nomor Seri (S/N): <strong style="color: #0F172A;">{{nomor_seri}}</strong>
                  </td>
                  <td style="width: 50%; color: #64748B;">
                    Kategori: <strong style="color: #0F172A;">{{tipe_aset}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{portal_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Periksa di Aset Saya &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Harap simpan dan jaga fisik perangkat operasional perusahaan dengan baik.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Dokumen serah terima aset {{nomor_bast}} telah diterbitkan. Periksa di portal TrackIT: {{portal_url}}',
  },

  shipment_status_changed: {
    name: 'Pelacakan Pengiriman Barang',
    description: 'Dikirim saat logistik atau paket pengiriman aset diupdate (dikirim / diterima)',
    subject: '[TrackIT] Status Pengiriman: {{status_pengiriman}} (Resi: {{nomor_resi}})',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status Pengiriman Barang</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1D4ED8;">Logistik &amp; Paket</span>
            </td>
            <td style="vertical-align: middle; text-align: right; font-size: 12px; color: #64748B;">
              {{ekspedisi}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Status paket pengiriman perangkat/aset untuk tujuan Anda telah diperbarui:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <tr>
            <td style="padding-bottom: 12px;">
              <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 4px;">Status &amp; Nomor Resi</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A;">
                <span style="display: inline-block; padding: 2px 8px; background-color: #EFF6FF; color: #1D4ED8; border-radius: 6px; font-size: 12px; margin-right: 6px;">{{status_pengiriman}}</span>
                {{nomor_resi}}
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #E2E8F0; padding-top: 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px;">
                <tr>
                  <td style="width: 50%; color: #64748B; vertical-align: top;">
                    Tujuan: <strong style="color: #0F172A;">{{tujuan}}</strong>
                  </td>
                  <td style="width: 50%; color: #64748B; vertical-align: top;">
                    Rincian: <strong style="color: #0F172A;">{{deskripsi_barang}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{portal_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Buka Pelacak Pengiriman &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Pantau penerimaan paket dan laporkan bila ada kendala fisik kiriman.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Status pengiriman aset ke {{tujuan}} telah diperbarui: {{status_pengiriman}} (Resi: {{nomor_resi}}). Buka di: {{portal_url}}',
  },

  user_welcome: {
    name: 'Akun Pengguna Baru',
    description: 'Dikirim saat admin membuat akun pengguna baru di TrackIT',
    subject: '[TrackIT] Selamat Datang di TrackIT, {{recipient_name}}',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Datang di TrackIT</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
        <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 11px; font-weight: 600; color: #475569;">Akses Sistem</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Akun Anda telah didaftarkan pada portal operasional IT &amp; Inventaris <strong>TrackIT</strong>. Anda kini dapat melaporkan keluhan, memantau perangkat kerja, dan mengakses panduan helpdesk.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <tr>
            <td>
              <div style="font-size: 12.5px; color: #64748B; margin-bottom: 8px;">
                Email Akun: <strong style="color: #0F172A;">{{user_email}}</strong>
              </div>
              <div style="font-size: 12.5px; color: #64748B;">
                Hak Akses (Role): <strong style="color: #0F172A;">{{user_role}}</strong>
              </div>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 12px 0;">
          <a href="{{login_url}}" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block;">
            Masuk ke Akun TrackIT &rarr;
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Segera perbarui kata sandi Anda setelah login pertama kali.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Akun TrackIT Anda telah dibuat dengan email {{user_email}} (Role: {{user_role}}). Masuk di: {{login_url}}',
  },

  password_reset_otp: {
    name: 'Kode OTP Reset Sandi',
    description: 'Dikirim saat ada permintaan reset kata sandi',
    subject: '[TrackIT] {{otp_code}} adalah Kode Verifikasi Anda',
    body_html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Reset Sandi</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);">
    <tr>
      <td style="background: linear-gradient(135deg, #FF4F1B 0%, #FE5B1C 21%, #FC7C20 60%, #FAA425 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;">
        <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0F172A;">TrackIT</span>
        <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 11px; font-weight: 600; color: #DC2626;">Keamanan</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px; text-align: center;">
        <p style="font-size: 15px; margin: 0 0 10px 0; color: #0F172A; text-align: left;">Halo <strong>{{recipient_name}}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
          Gunakan kode verifikasi berikut untuk melanjutkan proses reset kata sandi akun TrackIT Anda:
        </p>

        <div style="background-color: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 10px; padding: 18px 24px; margin: 16px 0 20px 0; display: inline-block;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0F172A;">{{otp_code}}</span>
        </div>

        <p style="font-size: 12px; color: #64748B; margin: 0 0 16px 0;">
          Kode berlaku selama <strong>{{expires_minutes}} menit</strong>. Jangan berikan kode ini kepada pihak manapun.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px 24px 32px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #64748B; line-height: 1.6; text-align: center;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 3px;">TrackIT &bull; PT Esteh Indonesia Makmur</div>
        <div>Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini dengan aman.</div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    body_text: 'Kode verifikasi reset sandi TrackIT Anda adalah: {{otp_code}}. Berlaku selama {{expires_minutes}} menit.',
  },
}

export function substituteVariables(text, variables = {}) {
  if (!text) return ''
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : match
  })
}

export async function getTemplateByKey(templateKey) {
  try {
    const { pool } = await import('../config/database.js')
    const { rows } = await pool.query(
      'SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true LIMIT 1',
      [templateKey],
    )
    if (rows.length > 0) return rows[0]
  } catch (err) {
    // fallback ke DEFAULT_EMAIL_TEMPLATES jika koneksi db bermasalah
  }
  return DEFAULT_EMAIL_TEMPLATES[templateKey] || null
}

export async function renderEmailTemplate(templateKey, variables = {}) {
  const tpl = await getTemplateByKey(templateKey)
  if (!tpl) return null

  const subject = substituteVariables(tpl.subject, variables)
  const html = substituteVariables(tpl.body_html, variables)
  const text = substituteVariables(tpl.body_text || '', variables)

  return {
    subject,
    html,
    text,
    name: tpl.name,
    description: tpl.description,
  }
}
