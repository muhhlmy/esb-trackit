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

export function isEmailConfigured() {
  return (
    process.env.EMAIL_ENABLED === 'true' &&
    Boolean(process.env.SMTP_HOST?.trim()) &&
    Boolean(process.env.SMTP_USER?.trim()) &&
    Boolean(process.env.SMTP_PASS?.trim())
  )
}

export function getTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!isEmailConfigured()) {
    return null
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587
    const secure = process.env.SMTP_SECURE === 'true'

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })
  }

  return transporter
}

/**
 * Send an email asynchronously. Fails gracefully if SMTP is disabled or unconfigured.
 */
export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  if (!to) return false

  const activeTransporter = getTransporter()
  if (!activeTransporter) {
    console.log(`[emailService] Skip: EMAIL_ENABLED=false atau SMTP belum dikonfigurasi. Subject: "${subject}"`)
    return false
  }

  const from = process.env.EMAIL_FROM || '"TrackIT" <no-reply@trackit.local>'

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

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
              <div style="font-size:11.5px;font-weight:600;color:#475569;">&copy; 2026 TrackIT</div>
              <div style="font-size:10.5px;color:#94A3B8;margin-top:3px;">TrackIT &bull; IT &amp; Asset Management</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
