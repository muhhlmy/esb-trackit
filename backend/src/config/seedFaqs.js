// Seed data FAQ Help Center (idempotent).
// Mengisi daftar pertanyaan umum resmi sesuai kategori FAQ CMS:
// Account & Access, Devices & Hardware, Network & VPN, Software & Applications,
// Security & Compliance, General & Policies.
import { fileURLToPath } from 'node:url'
import { pool } from './database.js'

export const INITIAL_FAQS = [
  {
    question: 'Bagaimana cara melakukan reset password akun Google Workspace?',
    answer:
      'Anda dapat mereset kata sandi akun Google Workspace karyawan melalui Google Admin Console sesuai panduan resmi:\n' +
      '1. Buka Google Admin Console di browser (admin.google.com).\n' +
      '2. Cari nama atau email karyawan pada menu Directory > Users.\n' +
      '3. Klik tombol "Reset Password" dan pilih opsi buat kata sandi secara manual.\n' +
      '4. Gunakan format kata sandi sementara sesuai standar keamanan IT perusahaan.\n' +
      '5. Pastikan mencentang "Ask user to change their password when they sign in" sebelum menyimpan.',
    category: 'Account & Access',
    status: 'PUBLISHED',
    sort_order: 1,
    steps: [
      'Buka Google Admin Console di browser (admin.google.com).',
      'Cari nama atau email karyawan pada menu Directory > Users.',
      'Klik tombol "Reset Password" dan pilih opsi buat kata sandi secara manual.',
      'Gunakan format kata sandi sementara sesuai panduan resmi IT perusahaan (hubungi IT Administrator jika membutuhkan bantuan).',
      'Pastikan mencentang "Ask user to change their password when they sign in" sebelum menyimpan.',
    ],
    action_text: 'Buka Portal Admin',
    action_link: 'https://admin.google.com/',
  },
  {
    question: 'Bagaimana cara meminta kode cadangan 2-Step Verification (2SV)?',
    answer:
      'Untuk mendukung verifikasi tim setelah konfirmasi resmi dari pihak People & Culture (PBX):\n' +
      '1. Buka Google Admin Console dan cari profil pengguna yang bersangkutan.\n' +
      '2. Masuk ke menu Security > 2-Step Verification > Get Backup Verification Codes.\n' +
      '3. Salin minimal 2 (dua) kode verifikasi cadangan.\n' +
      '4. Kirimkan kode tersebut secara aman via Direct Message kepada pihak PBX berwenang.',
    category: 'Account & Access',
    status: 'PUBLISHED',
    sort_order: 2,
    steps: [
      'Buka Google Admin Console dan cari profil pengguna yang bersangkutan.',
      'Masuk ke menu Security > 2-Step Verification > Get Backup Verification Codes.',
      'Salin minimal 2 (dua) kode verifikasi cadangan.',
      'Kirimkan kode tersebut secara aman via Direct Message kepada pihak PBX berwenang.',
    ],
  },
  {
    question: 'Bagaimana cara bypass Microsoft OOBE pada laptop baru?',
    answer:
      'Untuk membuat akun lokal tanpa login akun Microsoft online saat layar koneksi jaringan:\n' +
      '1. Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) di keyboard untuk membuka Command Prompt (CMD).\n' +
      '2. Ketikkan perintah oobe\\bypassnro lalu tekan Enter.\n' +
      '3. Laptop akan restart otomatis dan menampilkan opsi setup Local Account offline.',
    category: 'Devices & Hardware',
    status: 'PUBLISHED',
    sort_order: 3,
    steps: [
      'Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) di keyboard untuk membuka Command Prompt (CMD).',
      'Ketikkan perintah oobe\\bypassnro lalu tekan Enter.',
      'Laptop akan restart otomatis dan menampilkan opsi setup Local Account offline.',
    ],
    code_snippet: 'oobe\\bypassnro',
  },
  {
    question: 'Bagaimana prosedur perbaikan atau penggantian perangkat kerja yang rusak?',
    answer:
      'Untuk mengajukan servis atau penukaran perangkat kerja:\n' +
      '1. Buat tiket permohonan melalui menu Tiket Bantuan dengan memilih kategori Hardware / Perangkat.\n' +
      '2. Lampirkan foto kondisi fisik perangkat serta deskripsi kendala yang dialami secara spesifik.\n' +
      '3. Tim IT Support akan melakukan assessment awal dan menjadwalkan pengecekan unit atau menyiapkan unit laptop cadangan bila perbaikan membutuhkan waktu lama.',
    category: 'Devices & Hardware',
    status: 'PUBLISHED',
    sort_order: 4,
    steps: [
      'Buat tiket permohonan melalui menu Tiket Bantuan dengan memilih kategori Hardware / Perangkat.',
      'Lampirkan foto kondisi fisik perangkat serta deskripsi kendala yang dialami secara spesifik.',
      'Tim IT Support akan melakukan assessment awal dan menjadwalkan pengecekan unit atau penukaran cadangan.',
    ],
  },
  {
    question: 'Bagaimana cara terhubung ke jaringan WiFi kantor dan VPN internal saat WFA?',
    answer:
      'Untuk mengakses jaringan internal kantor:\n' +
      '1. Koneksi di Kantor: Pilih SSID WiFi resmi perusahaan dan masukkan kredensial akun domain/Google Workspace Anda.\n' +
      '2. Koneksi Jarak Jauh (WFA): Pastikan aplikasi VPN resmi perusahaan (WireGuard/OpenVPN) sudah aktif dan status terhubung.\n' +
      '3. Jika sertifikat ditolak atau IP tidak didapat, periksa kembali masa berlaku akun atau hubungi Helpdesk IT.',
    category: 'Network & VPN',
    status: 'PUBLISHED',
    sort_order: 5,
    steps: [
      'Koneksi di Kantor: Pilih SSID WiFi resmi perusahaan dan masukkan kredensial akun domain/Google Workspace Anda.',
      'Koneksi Jarak Jauh (WFA): Pastikan aplikasi VPN resmi perusahaan sudah aktif dan terhubung.',
      'Jika mengalami kendala otentikasi jaringan, lakukan reconnect atau laporkan ke tim Network IT.',
    ],
  },
  {
    question: 'Bagaimana cara mengajukan lisensi software tambahan untuk kebutuhan kerja?',
    answer:
      'Pengajuan lisensi software berbayar (seperti Figma, JetBrains, Adobe Creative Cloud, atau tool produktivitas lainnya) memerlukan persetujuan atasan:\n' +
      '1. Dapatkan persetujuan tertulis dari Head of Department (HOD) terkait alokasi budget.\n' +
      '2. Buat tiket pengajuan pada kategori Software & Application dengan melampirkan bukti persetujuan HOD.\n' +
      '3. Tim IT Procurement akan memproses lisensi dan memberikan akun aktivasi kepada Anda.',
    category: 'Software & Applications',
    status: 'PUBLISHED',
    sort_order: 6,
    steps: [
      'Dapatkan persetujuan tertulis dari Head of Department (HOD) terkait alokasi budget.',
      'Buat tiket pengajuan pada kategori Software & Application dengan melampirkan bukti persetujuan HOD.',
      'Tim IT Procurement akan memproses lisensi dan memberikan akun aktivasi kepada Anda.',
    ],
  },
  {
    question: 'Apa yang harus dilakukan jika laptop perusahaan hilang atau dicuri?',
    answer:
      'Tindakan Darurat Diperlukan: Jika perangkat kerja hilang atau dicuri, segera laporkan ke Tim IT Support & Security Operations Center (SOC) melalui kontak darurat IT atau buat tiket insiden agar akun, sertifikat VPN, dan akses data perusahaan pada perangkat tersebut dapat segera dinonaktifkan (remote wipe) dari jauh.',
    category: 'Security & Compliance',
    status: 'PUBLISHED',
    sort_order: 7,
    is_emergency: true,
    emergency_title: 'Tindakan Darurat Diperlukan',
    emergency_text:
      'Jika perangkat kerja hilang atau dicuri, segera laporkan ke Tim IT Support & Security Operations Center (SOC) agar tim dapat melakukan remote lock dan penghapusan data perusahaan secara instan.',
  },
  {
    question: 'Berapa lama SLA (Service Level Agreement) penanganan tiket IT Support?',
    answer:
      'SLA penanganan tiket diklasifikasikan berdasarkan tingkat keparahan kendala:\n' +
      '• Kritis / Darurat (Sistem operasional down, perangkat hilang): Respon awal < 15-30 menit.\n' +
      '• Prioritas Tinggi (Akun terkunci, koneksi jaringan terputus total): Respon awal < 2 jam.\n' +
      '• Prioritas Normal (Permintaan lisensi software, setup periferal tambahan): Respon awal < 1x24 jam kerja.',
    category: 'General & Policies',
    status: 'PUBLISHED',
    sort_order: 8,
  },
]

export async function seedFaqs(queryable = pool) {
  let inserted = 0
  let updated = 0

  for (const f of INITIAL_FAQS) {
    const existing = await queryable.query(
      'SELECT id FROM faq WHERE question = $1',
      [f.question],
    )

    if (existing.rowCount === 0) {
      await queryable.query(
        `INSERT INTO faq
           (question, answer, category, status, sort_order, steps, code_snippet,
            action_text, action_link, is_emergency, emergency_title, emergency_text)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)`,
        [
          f.question,
          f.answer,
          f.category,
          f.status,
          f.sort_order,
          JSON.stringify(f.steps || []),
          f.code_snippet || null,
          f.action_text || null,
          f.action_link || null,
          Boolean(f.is_emergency),
          f.emergency_title || null,
          f.emergency_text || null,
        ],
      )
      inserted += 1
    } else {
      await queryable.query(
        `UPDATE faq
            SET answer = $1,
                category = $2,
                status = $3,
                sort_order = $4,
                steps = $5::jsonb,
                code_snippet = $6,
                action_text = $7,
                action_link = $8,
                is_emergency = $9,
                emergency_title = $10,
                emergency_text = $11,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $12`,
        [
          f.answer,
          f.category,
          f.status,
          f.sort_order,
          JSON.stringify(f.steps || []),
          f.code_snippet || null,
          f.action_text || null,
          f.action_link || null,
          Boolean(f.is_emergency),
          f.emergency_title || null,
          f.emergency_text || null,
          existing.rows[0].id,
        ],
      )
      updated += 1
    }
  }

  return { total: INITIAL_FAQS.length, inserted, updated }
}

const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url)

if (isRunDirectly) {
  try {
    const result = await seedFaqs()
    console.log(`Seed FAQ selesai: ${result.inserted} baru, ${result.updated} diperbarui dari ${result.total} total.`)
    const count = await pool.query('SELECT count(*)::int AS n FROM faq')
    console.log('Total FAQ di DB =', count.rows[0].n)
  } catch (error) {
    console.error('Seed FAQ gagal:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
