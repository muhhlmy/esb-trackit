CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT false,
    smtp_user VARCHAR(255),
    smtp_pass VARCHAR(255),
    email_from_name VARCHAR(100) DEFAULT 'TrackIT',
    email_from_address VARCHAR(255) DEFAULT 'no-reply@trackit.local',
    email_enabled BOOLEAN DEFAULT true,
    notify_ticket_create BOOLEAN DEFAULT true,
    notify_ticket_status BOOLEAN DEFAULT true,
    notify_ticket_assign BOOLEAN DEFAULT true,
    notify_ticket_comment BOOLEAN DEFAULT true,
    notify_asset_assign BOOLEAN DEFAULT true,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150)
);

INSERT INTO system_settings (
    id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass,
    email_from_name, email_from_address, email_enabled,
    notify_ticket_create, notify_ticket_status, notify_ticket_assign,
    notify_ticket_comment, notify_asset_assign
) VALUES (
    1, '', 587, false, '', '',
    'TrackIT Helpdesk', 'no-reply@trackit.local', true,
    true, true, true, true, true
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO email_templates (template_key, name, description, subject, body_html, body_text)
VALUES
(
    'ticket_created',
    'Tiket Baru',
    'Dikirim saat pengguna atau helpdesk membuat tiket baru',
    'Tiket Baru {{nomor_tiket}}: {{judul_tiket}}',
    '<p>Halo <strong>{{recipient_name}}</strong>,</p><p>Tiket baru <strong>{{nomor_tiket}}</strong> telah berhasil dibuat.</p><p><strong>Judul:</strong> {{judul_tiket}}<br><strong>Prioritas:</strong> {{prioritas_tiket}}<br><strong>Unit:</strong> {{unit_support}}</p><p><a href="{{ticket_url}}">Buka Tiket di TrackIT &rarr;</a></p>',
    'Tiket baru {{nomor_tiket}} telah dibuat: {{judul_tiket}}. Buka tiket di: {{ticket_url}}'
),
(
    'ticket_status_changed',
    'Status Tiket Diperbarui',
    'Dikirim saat status tiket berubah (Open, In Progress, Resolved, Closed)',
    'Update Tiket {{nomor_tiket}} (Status: {{status_tiket}})',
    '<p>Halo <strong>{{recipient_name}}</strong>,</p><p>Status tiket <strong>{{nomor_tiket}}</strong> telah diperbarui menjadi <strong>{{status_tiket}}</strong>.</p><p><strong>Judul:</strong> {{judul_tiket}}<br><strong>Prioritas:</strong> {{prioritas_tiket}}</p><p><a href="{{ticket_url}}">Lihat Perkembangan Tiket &rarr;</a></p>',
    'Status tiket {{nomor_tiket}} telah diperbarui menjadi {{status_tiket}}. Buka tiket di: {{ticket_url}}'
),
(
    'ticket_comment',
    'Pesan / Komentar Tiket',
    'Dikirim saat ada tanggapan atau komentar baru pada tiket',
    'Pesan Baru pada Tiket {{nomor_tiket}}',
    '<p>Halo <strong>{{recipient_name}}</strong>,</p><p>Ada komentar baru dari <strong>{{comment_author}}</strong> pada tiket <strong>{{nomor_tiket}}</strong>:</p><blockquote>"{{comment_pesan}}"</blockquote><p><a href="{{ticket_url}}">Balas di TrackIT &rarr;</a></p>',
    'Komentar baru dari {{comment_author}} pada tiket {{nomor_tiket}}: {{comment_pesan}}. Link: {{ticket_url}}'
),
(
    'ticket_assigned',
    'Penugasan Teknisi',
    'Dikirim saat tiket ditugaskan ke teknisi / PIC',
    'Penugasan Tiket {{nomor_tiket}}',
    '<p>Halo <strong>{{recipient_name}}</strong>,</p><p>Anda telah ditugaskan untuk menangani tiket <strong>{{nomor_tiket}}</strong>: <em>{{judul_tiket}}</em>.</p><p><a href="{{ticket_url}}">Lihat Detail Tiket &rarr;</a></p>',
    'Anda telah ditugaskan menangani tiket {{nomor_tiket}}. Buka tiket di: {{ticket_url}}'
),
(
    'asset_assigned',
    'Serah Terima Aset (BAST)',
    'Dikirim saat ada dokumen pengajuan atau serah terima aset baru',
    'Pemberitahuan Serah Terima Aset {{nomor_bast}}',
    '<p>Halo <strong>{{recipient_name}}</strong>,</p><p>Dokumen serah terima aset <strong>{{nomor_bast}}</strong> telah diterbitkan.</p><p>Silakan periksa detail perangkat Anda di portal TrackIT.</p>',
    'Dokumen serah terima aset {{nomor_bast}} telah diterbitkan. Periksa di portal TrackIT.'
)
ON CONFLICT (template_key) DO NOTHING;
