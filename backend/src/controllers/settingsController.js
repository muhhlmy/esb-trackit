import nodemailer from 'nodemailer'
import { pool } from '../config/database.js'
import { recordSystemAudit } from '../services/systemAuditService.js'
import { DEFAULT_EMAIL_TEMPLATES } from '../services/emailService.js'

export async function getEmailSettings(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1')
    const settings = rows[0] || {}

    res.json({
      success: true,
      data: {
        smtp_host: settings.smtp_host || process.env.SMTP_HOST || '',
        smtp_port: settings.smtp_port || Number(process.env.SMTP_PORT) || 587,
        smtp_secure: settings.smtp_secure ?? (process.env.SMTP_SECURE === 'true'),
        smtp_user: settings.smtp_user || process.env.SMTP_USER || '',
        has_password: Boolean(settings.smtp_pass || process.env.SMTP_PASS),
        email_from_name: settings.email_from_name || 'TrackIT Helpdesk',
        email_from_address: settings.email_from_address || process.env.EMAIL_FROM || 'no-reply@trackit.local',
        email_enabled: settings.email_enabled ?? (process.env.EMAIL_ENABLED === 'true'),
        notify_ticket_create: settings.notify_ticket_create ?? true,
        notify_ticket_status: settings.notify_ticket_status ?? true,
        notify_ticket_assign: settings.notify_ticket_assign ?? true,
        notify_ticket_comment: settings.notify_ticket_comment ?? true,
        notify_asset_assign: settings.notify_asset_assign ?? true,
        notify_shipment: settings.notify_shipment ?? true,
        notify_user_create: settings.notify_user_create ?? true,
        updated_at: settings.updated_at,
        updated_by: settings.updated_by,
      },
    })
  } catch (err) {
    console.error('[settingsController] getEmailSettings error:', err)
    res.status(500).json({ success: false, message: 'Gagal mengambil konfigurasi email.' })
  }
}

export async function updateEmailSettings(req, res) {
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      email_from_name,
      email_from_address,
      email_enabled,
      notify_ticket_create,
      notify_ticket_status,
      notify_ticket_assign,
      notify_ticket_comment,
      notify_asset_assign,
      notify_shipment,
      notify_user_create,
    } = req.body

    // Cek password lama jika user tidak mengisi password baru
    let finalPass = smtp_pass
    if (!finalPass || finalPass === '••••••••' || finalPass === '********') {
      const { rows } = await pool.query('SELECT smtp_pass FROM system_settings WHERE id = 1')
      finalPass = rows[0]?.smtp_pass || ''
    }

    const actor = req.user?.nama || req.user?.email || 'Superadmin'

    await pool.query(
      `INSERT INTO system_settings (
        id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass,
        email_from_name, email_from_address, email_enabled,
        notify_ticket_create, notify_ticket_status, notify_ticket_assign,
        notify_ticket_comment, notify_asset_assign, notify_shipment, notify_user_create,
        updated_at, updated_by
      ) VALUES (
        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16
      )
      ON CONFLICT (id) DO UPDATE SET
        smtp_host = EXCLUDED.smtp_host,
        smtp_port = EXCLUDED.smtp_port,
        smtp_secure = EXCLUDED.smtp_secure,
        smtp_user = EXCLUDED.smtp_user,
        smtp_pass = EXCLUDED.smtp_pass,
        email_from_name = EXCLUDED.email_from_name,
        email_from_address = EXCLUDED.email_from_address,
        email_enabled = EXCLUDED.email_enabled,
        notify_ticket_create = EXCLUDED.notify_ticket_create,
        notify_ticket_status = EXCLUDED.notify_ticket_status,
        notify_ticket_assign = EXCLUDED.notify_ticket_assign,
        notify_ticket_comment = EXCLUDED.notify_ticket_comment,
        notify_asset_assign = EXCLUDED.notify_asset_assign,
        notify_shipment = EXCLUDED.notify_shipment,
        notify_user_create = EXCLUDED.notify_user_create,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by`,
      [
        smtp_host || '',
        Number(smtp_port) || 587,
        Boolean(smtp_secure),
        smtp_user || '',
        finalPass || '',
        email_from_name || 'TrackIT',
        email_from_address || 'no-reply@trackit.local',
        Boolean(email_enabled),
        notify_ticket_create ?? true,
        notify_ticket_status ?? true,
        notify_ticket_assign ?? true,
        notify_ticket_comment ?? true,
        notify_asset_assign ?? true,
        notify_shipment ?? true,
        notify_user_create ?? true,
        actor,
      ],
    )

    await recordSystemAudit({
      module: 'PENGATURAN',
      action: 'UPDATE_EMAIL_SETTINGS',
      entityType: 'system_settings',
      entityId: '1',
      entityLabel: 'Konfigurasi SMTP Email',
      summary: `${actor} memperbarui pengaturan SMTP & notifikasi email sistem`,
      actorUserId: req.user?.id,
      actorName: actor,
      actorEmail: req.user?.email,
      req,
    }).catch(() => {})

    res.json({ success: true, message: 'Pengaturan email berhasil diperbarui.' })
  } catch (err) {
    console.error('[settingsController] updateEmailSettings error:', err)
    res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan email.' })
  }
}

export async function sendTestEmail(req, res) {
  try {
    const targetEmail = req.body.target_email || req.user?.email
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Alamat email tujuan wajib diisi.' })
    }

    // Ambil setting aktif
    const { rows } = await pool.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1')
    const s = rows[0] || {}

    const host = s.smtp_host || process.env.SMTP_HOST
    const port = s.smtp_port || Number(process.env.SMTP_PORT) || 587
    const secure = s.smtp_secure ?? (process.env.SMTP_SECURE === 'true')
    const user = s.smtp_user || process.env.SMTP_USER
    const pass = s.smtp_pass || process.env.SMTP_PASS
    const from = s.email_from_address || process.env.EMAIL_FROM || 'no-reply@trackit.local'
    const fromName = s.email_from_name || 'TrackIT'

    if (!host || !user || !pass) {
      return res.status(400).json({
        success: false,
        message: 'Konfigurasi SMTP belum lengkap (Host, Username, dan Password wajib ada).',
      })
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })

    const testHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0A51B0; margin-top: 0;">Pengujian Pengiriman Email TrackIT</h2>
        <p>Halo <strong>${req.user?.nama || 'Superadmin'}</strong>,</p>
        <p>Ini adalah email pengujian untuk memverifikasi koneksi server SMTP TrackIT.</p>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px; color: #475569;">
          <strong>Server SMTP:</strong> ${host}:${port} (${secure ? 'SSL/TLS' : 'STARTTLS'})<br>
          <strong>Akun Pengirim:</strong> ${user}<br>
          <strong>Waktu Uji:</strong> ${new Date().toLocaleString('id-ID')}
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: #64748B;">Konfigurasi email Anda telah terhubung dan siap digunakan oleh sistem TrackIT.</p>
      </div>
    `

    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: targetEmail,
      subject: '✅ Uji Coba Koneksi Email TrackIT',
      html: testHtml,
    })

    res.json({
      success: true,
      message: `Email pengujian berhasil dikirim ke <${targetEmail}>.`,
    })
  } catch (err) {
    console.error('[settingsController] sendTestEmail error:', err)
    res.status(500).json({
      success: false,
      message: `Gagal mengirim email pengujian: ${err.message}`,
    })
  }
}

export async function getEmailTemplates(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM email_templates ORDER BY id ASC')
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[settingsController] getEmailTemplates error:', err)
    res.status(500).json({ success: false, message: 'Gagal mengambil template email.' })
  }
}

export async function getEmailTemplate(req, res) {
  try {
    const { key } = req.params
    const { rows } = await pool.query('SELECT * FROM email_templates WHERE template_key = $1 LIMIT 1', [key])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template tidak ditemukan.' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[settingsController] getEmailTemplate error:', err)
    res.status(500).json({ success: false, message: 'Gagal mengambil detail template.' })
  }
}

export async function updateEmailTemplate(req, res) {
  try {
    const { key } = req.params
    const { subject, body_html, body_text, is_active } = req.body

    if (!subject || !body_html) {
      return res.status(400).json({ success: false, message: 'Subjek dan isi email (HTML) wajib diisi.' })
    }

    const { rows } = await pool.query(
      `UPDATE email_templates
       SET subject = $1, body_html = $2, body_text = $3, is_active = $4, updated_at = NOW()
       WHERE template_key = $5
       RETURNING *`,
      [subject, body_html, body_text || '', is_active ?? true, key],
    )

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template tidak ditemukan.' })
    }

    const actor = req.user?.nama || req.user?.email || 'Superadmin'
    await recordSystemAudit({
      module: 'PENGATURAN',
      action: 'UPDATE_EMAIL_TEMPLATE',
      entityType: 'email_templates',
      entityId: key,
      entityLabel: rows[0].name,
      summary: `${actor} memperbarui template email: ${rows[0].name}`,
      actorUserId: req.user?.id,
      actorName: actor,
      actorEmail: req.user?.email,
      req,
    }).catch(() => {})

    res.json({ success: true, message: 'Template email berhasil disimpan.', data: rows[0] })
  } catch (err) {
    console.error('[settingsController] updateEmailTemplate error:', err)
    res.status(500).json({ success: false, message: 'Gagal memperbarui template email.' })
  }
}

export async function resetEmailTemplate(req, res) {
  try {
    const { key } = req.params

    const tpl = DEFAULT_EMAIL_TEMPLATES[key]
    if (!tpl) {
      return res.status(404).json({ success: false, message: 'Template default tidak ditemukan.' })
    }

    const { rows } = await pool.query(
      `UPDATE email_templates
       SET subject = $1, body_html = $2, body_text = $3, is_active = true, updated_at = NOW()
       WHERE template_key = $4
       RETURNING *`,
      [tpl.subject, tpl.body_html, tpl.body_text, key],
    )

    res.json({ success: true, message: 'Template berhasil direset ke default sistem.', data: rows[0] })
  } catch (err) {
    console.error('[settingsController] resetEmailTemplate error:', err)
    res.status(500).json({ success: false, message: 'Gagal mereset template email.' })
  }
}
