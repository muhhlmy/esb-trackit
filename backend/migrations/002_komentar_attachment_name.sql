-- =====================================================================
-- TABEL: komentar_tiket — simpan nama file lampiran
-- Menambahkan kolom attachment_name agar nama file asli lampiran
-- (yang dilampirkan pembuat tiket) dapat ditampilkan di daftar lampiran.
-- =====================================================================
ALTER TABLE komentar_tiket
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
