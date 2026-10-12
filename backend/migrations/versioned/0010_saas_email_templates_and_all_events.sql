-- Migration 0010: SaaS Apple-Grade Email Templates & Universal Event Notifications
-- Upgrades email_templates to responsive, human-crafted, Apple-inspired SaaS templates
-- Adds shipment, welcome user, and password reset OTP templates

ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS notify_shipment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_user_create BOOLEAN DEFAULT true;

-- Update / Insert 8 comprehensive SaaS email templates
INSERT INTO email_templates (template_key, name, description, subject, body_html, body_text, is_active)
VALUES
(
    'ticket_created',
    'Tiket Baru',
    'Dikirim saat pengguna atau helpdesk membuat tiket baru',
    '[TrackIT] Tiket Baru {{nomor_tiket}}: {{judul_tiket}}',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiket Baru {{nomor_tiket}}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Tiket baru {{nomor_tiket}} telah dibuat: {{judul_tiket}}. Buka tiket di: {{ticket_url}}',
    true
),
(
    'ticket_status_changed',
    'Pembaruan Status Tiket',
    'Dikirim saat status tiket berubah (Open, In Progress, Resolved, Closed)',
    '[TrackIT] Status Tiket {{nomor_tiket}}: {{status_tiket}}',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembaruan Status Tiket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Status tiket {{nomor_tiket}} telah diperbarui menjadi {{status_tiket}}. Buka tiket di: {{ticket_url}}',
    true
),
(
    'ticket_comment',
    'Pesan / Komentar Tiket',
    'Dikirim saat ada tanggapan atau komentar baru pada tiket',
    '[TrackIT] Komentar Baru pada Tiket {{nomor_tiket}}',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Komentar Tiket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Komentar baru dari {{comment_author}} pada tiket {{nomor_tiket}}: {{comment_pesan}}. Link: {{ticket_url}}',
    true
),
(
    'ticket_assigned',
    'Penugasan Teknisi',
    'Dikirim saat tiket ditugaskan ke teknisi / PIC',
    '[TrackIT] Penugasan Tiket {{nomor_tiket}}: {{judul_tiket}}',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Penugasan Tiket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Anda telah ditugaskan menangani tiket {{nomor_tiket}}: {{judul_tiket}}. Buka tiket di: {{ticket_url}}',
    true
),
(
    'asset_assigned',
    'Serah Terima Aset (BAST)',
    'Dikirim saat ada dokumen pengajuan atau serah terima aset baru',
    '[TrackIT] Dokumen Serah Terima Aset: {{nomor_bast}}',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Serah Terima Aset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Dokumen serah terima aset {{nomor_bast}} telah diterbitkan. Periksa di portal TrackIT: {{portal_url}}',
    true
),
(
    'shipment_status_changed',
    'Pelacakan Pengiriman Barang',
    'Dikirim saat logistik atau paket pengiriman aset diupdate (dikirim / diterima)',
    '[TrackIT] Status Pengiriman: {{status_pengiriman}} (Resi: {{nomor_resi}})',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status Pengiriman Barang</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Status pengiriman aset ke {{tujuan}} telah diperbarui: {{status_pengiriman}} (Resi: {{nomor_resi}}). Buka di: {{portal_url}}',
    true
),
(
    'user_welcome',
    'Akun Pengguna Baru',
    'Dikirim saat admin membuat akun pengguna baru di TrackIT',
    '[TrackIT] Selamat Datang di TrackIT, {{recipient_name}}',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Datang di TrackIT</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Akun TrackIT Anda telah dibuat dengan email {{user_email}} (Role: {{user_role}}). Masuk di: {{login_url}}',
    true
),
(
    'password_reset_otp',
    'Kode OTP Reset Sandi',
    'Dikirim saat ada permintaan reset kata sandi',
    '[TrackIT] {{otp_code}} adalah Kode Verifikasi Anda',
    '<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Reset Sandi</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''SF Pro Text'', ''SF Pro Display'', ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 28px 14px; color: #1E293B; -webkit-font-smoothing: antialiased;">
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
</html>',
    'Kode verifikasi reset sandi TrackIT Anda adalah: {{otp_code}}. Berlaku selama {{expires_minutes}} menit.',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    updated_at = CURRENT_TIMESTAMP;
