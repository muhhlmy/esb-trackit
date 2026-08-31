import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_CASES = [
  {
    id: 'laptop-01',
    title: 'SOP Setup Laptop Baru untuk New Joiner / Pergantian Perangkat',
    category: 'hardware',
    severity: 'high',
    tags: ['laptop-baru', 'oobe', 'setup-device', 'new-joiner', 'it-support', 'windows'],
    summary: 'Panduan Operasional Standar (SOP) penyiapan unit laptop Windows baru bagi karyawan baru (*new joiner*) atau fasilitas penggantian unit kerja.',
    problemContext: 'Saat menyiapkan unit laptop baru dari distributor/vendor, diperlukan proses bypass pembuatan akun online Microsoft saat OOBE, penyiapan akun lokal standar perusahaan, penyesuaian opsi keamanan, serta instalasi paket aplikasi kerja wajib.',
    actionSteps: [
      'Nyalakan unit laptop baru hingga masuk ke tampilan Out-of-Box Experience (OOBE) pada tahap **"Let\'s connect you to a network"**.',
      'Tekan kombinasi tombol `Shift + F10` (atau `Fn + Shift + F10`) pada keyboard untuk membuka jendela **Command Prompt (CMD)**.',
      'Ketik perintah `oobe\\bypassnro` lalu tekan **Enter**. Laptop akan melakukan restart otomatis dan mengizinkan proses setup tanpa koneksi internet (*Local Account mode*).',
      'Setelah berhasil masuk ke desktop Windows, buka aplikasi **Notepad**, lalu salin dan simpan script otomatisasi user sebagai file `.bat` (contoh: `setup_user.bat`).',
      'Klik kanan pada file `.bat` tersebut lalu pilih **Run as Administrator** untuk membuat user `ESB-User` dengan password `Essensians@2026` dan mengonfigurasi batas waktu password menjadi *Never Expire*.',
      'Lakukan pengubahan nama perangkat (**Rename This PC**) sesuai standar penamaan label inventaris laptop perusahaan (contoh: `LAPTOP-IT-01` atau `ESB-DEPT-NAME`).',
      'Buka menu **Settings > Windows Update**, jalankan pembaruan sistem hingga selesai, dan aktifkan opsi **"Get the latest updates as soon as they\'re available"**.',
      'Matikan enkripsi perangkat melalui menu **Settings > Privacy & Security > Device Encryption** (setel status menjadi *Off*).',
      'Hubungkan flashdisk instalasi IT, kemudian jalankan installer **Ninite**.',
      'Verifikasi bahwa perangkat telah terpasang aplikasi wajib perusahaan: **Google Chrome**, **AnyDesk**, dan **Microsoft Office suite**.',
      'Setelah seluruh proses setup selesai, buat dan lengkapi [Form Serah Terima Laptop](https://docs.google.com/document/d/1uDDbC77cmnm1J4yBDSQLW23pDkv4Y2R7h0myL_lkdbM/edit?usp=drive_link).',
      'Proses setup selesai dan unit laptop siap diserahkan kepada *User*.'
    ],
    dosAndDonts: {
      dos: [
        'Pastikan script installer `.bat` dieksekusi dengan hak akses Administrator (*Run as Administrator*).',
        'Verifikasi seluruh aplikasi wajib (Chrome, AnyDesk, MS Office) dapat terbuka dengan normal sebelum diserahkan.',
        'Catat Serial Number dan label perangkat pada Formulir Serah Terima Perangkat.'
      ],
      donts: [
        'Jangan menghubungkan laptop ke koneksi Wi-Fi/Internet pada tahap awal OOBE sebelum menjalankan perintah `oobe\\bypassnro`.',
        'Jangan melewatkan penonaktifan *Device Encryption* untuk menghindari terkuncinya drive di kemudian hari.'
      ]
    },
    snippets: [
      {
        label: 'Script Auto Setup User & Password Never Expire (.bat)',
        code: `@echo off
REM Jalankan sebagai Administrator
REM Membuat user baru
net user "ESB-User" Essensians@2026 /add

REM Set agar password tidak pernah expired via PowerShell
powershell -Command "Set-LocalUser -Name 'ESB-User' -PasswordNeverExpires $true"

echo User ESB-User berhasil dibuat dengan password tidak pernah expired.
pause`
      }
    ],
    isCustom: false
  },
  {
    id: 'laptop-02',
    title: 'SOP Setup Laptop Re-use / Bekas untuk New Joiner / Pergantian Perangkat',
    category: 'hardware',
    severity: 'high',
    tags: ['laptop-reuse', 'hardware-check', 'setup-device', 'new-joiner', 'it-support'],
    summary: 'Panduan Operasional Standar (SOP) penyiapan laptop pengembalian (*re-use*) untuk dialokasikan kembali kepada karyawan baru atau pergantian unit.',
    problemContext: 'Perangkat laptop pengembalian eks-karyawan perlu melalui tahapan verifikasi kondisi perangkat keras (hardware check), pembersihan profil user lama, penyesuaian nama akun pengguna baru, serta konfigurasinya sebelum diserahterimakan.',
    actionSteps: [
      'Siapkan unit laptop pengembalian yang akan dialokasikan untuk penyerahan atau penggantian perangkat.',
      'Login menggunakan akun **Administrator**, lalu lakukan pengujian fungsi hardware mencakup: **Keyboard**, **Microphone**, **Kamera/Webcam**, dan **Speaker**.',
      'Hapus akun/profil user lama jika ada, kemudian tambahkan akun lokal baru sesuai dengan nama pengguna (*User Name*) yang akan menerima laptop.',
      'Gunakan kata sandi standar default perusahaan yaitu `Essensians@2026` untuk akun user baru tersebut.',
      'Buka Command Prompt sebagai Administrator, lalu jalankan perintah berikut agar password tidak pernah kadaluarsa: `powershell -Command "Set-LocalUser -Name \'ESB-User\' -PasswordNeverExpires $true"`.',
      'Ubah nama perangkat (**Rename This PC**) sesuai label registrasi inventaris yang diperuntukkan bagi laptop tersebut.',
      'Buka menu **Settings > Windows Update**, periksa ketersediaan pembaruan sistem, dan nyalakan opsi **"Get the latest updates as soon as they\'re available"**.',
      'Matikan enkripsi perangkat pada menu **Settings > Privacy & Security > Device Encryption** (setel status menjadi *Off*).',
      'Periksa dan lakukan instalasi aplikasi **Google Chrome**, **AnyDesk**, dan **Microsoft Office** jika belum terpasang pada sistem.',
      'Setelah seluruh proses penyiapan selesai, buat dan lengkapi dokumen pada [Form Serah Terima Laptop](https://docs.google.com/document/d/1uDDbC77cmnm1J4yBDSQLW23pDkv4Y2R7h0myL_lkdbM/edit?usp=drive_link).',
      'Proses penyiapan selesai dan unit laptop siap diserahkan kepada *User*.'
    ],
    dosAndDonts: {
      dos: [
        'Wajib melakukan pengujian fungsionalitas hardware (keyboard, webcam, mic, speaker) sebelum melangkah ke proses software.',
        'Pastikan seluruh berkas pribadi dan data dari pengguna sebelumnya telah dihapus bersih dari sistem.'
      ],
      donts: [
        'Jangan mempertahankan profil user atau nama PC lama pada unit laptop yang diserahterimakan ke karyawan baru.',
        'Jangan menyerahkan laptop yang memiliki kendala fisik/hardware tanpa pemberitahuan atau perbaikan terlebih dahulu.'
      ]
    },
    snippets: [
      {
        label: 'PowerShell Command - Set Password Never Expire',
        code: `powershell -Command "Set-LocalUser -Name 'ESB-User' -PasswordNeverExpires $true"`
      }
    ],
    isCustom: false
  },
  {
    id: 'hp-01',
    title: 'SOP Setup HP Baru untuk New Joiner / Replacement',
    category: 'hardware',
    severity: 'high',
    tags: ['hp-baru', 'handphone', 'smartphone', 'setup-device', 'new-joiner', 'it-support'],
    summary: 'Panduan Operasional Standar (SOP) penyiapan unit handphone (HP) baru bagi karyawan baru (*new joiner*) atau fasilitas penggantian unit kerja.',
    problemContext: 'Saat menyiapkan unit HP baru dari distributor/vendor, diperlukan proses konfigurasi awal hingga halaman utama, pengecekan fungsi perangkat keras (layar, kamera, microphone, speaker), serta pencatatan penyerahan perangkat dan pembaruan data aset perusahaan.',
    actionSteps: [
      'Buka kemasan HP baru, keluarkan unit perangkat, lalu **nyalakan** HP dengan menekan tombol power hingga menyala.',
      'Lakukan **konfigurasi awal** (bahasa, koneksi Wi-Fi, akun, dsb.) hingga masuk ke **halaman awal** (*home screen*).',
      'Cek fungsi perangkat keras: **Layar**, **Kamera**, **Microphone**, dan **Speaker** untuk memastikan seluruhnya berfungsi normal.',
      'Setelah seluruh proses setup selesai, buat dan lengkapi [Form Serah Terima HP](https://docs.google.com/document/d/1uDDbC77cmnm1J4yBDSQLW23pDkv4Y2R7h0myL_lkdbM/).',
      'Berikan **Label** pada **Box HP** dan **belakang HP** sesuai standar penamaan inventaris perusahaan.',
      'Update **Master Data Aset Management** dengan informasi unit HP yang telah disiapkan.',
      'Proses setup selesai dan unit HP siap diserahkan kepada *User*.'
    ],
    dosAndDonts: {
      dos: [
        'Pastikan seluruh fungsi perangkat keras (layar, kamera, mic, speaker) telah diuji sebelum diserahkan.',
        'Catat Serial Number, IMEI, dan label perangkat pada Form Serah Terima dan Master Data Aset Management.'
      ],
      donts: [
        'Jangan menyerahkan HP yang masih memiliki kendala pada layar, kamera, microphone, atau speaker tanpa perbaikan terlebih dahulu.',
        'Jangan melewatkan pelabelan pada box dan belakang HP serta pembaruan Master Data Aset Management.'
      ]
    },
    snippets: [
      {
        label: 'Link Form Serah Terima HP',
        code: 'https://docs.google.com/document/d/1uDDbC77cmnm1J4yBDSQLW23pDkv4Y2R7h0myL_lkdbM/'
      }
    ],
    isCustom: false
  },
  {
    id: 'hp-02',
    title: 'SOP Setup HP Stock untuk New Joiner / Replacement',
    category: 'hardware',
    severity: 'high',
    tags: ['hp-stock', 'handphone', 'smartphone', 'factory-reset', 'setup-device', 'new-joiner', 'it-support'],
    summary: 'Panduan Operasional Standar (SOP) penyiapan unit handphone (HP) stok untuk dialokasikan kepada karyawan baru (*new joiner*) atau penggantian unit kerja.',
    problemContext: 'Perangkat HP stok perlu melalui tahapan pengecekan kondisi perangkat keras (layar, kamera, microphone, speaker), proses factory reset untuk membersihkan data lama, serta konfigurasi ulang hingga halaman utama sebelum diserahterimakan dan dicatat pada data aset perusahaan.',
    actionSteps: [
      'Nyalakan HP dengan menekan tombol power hingga menyala.',
      'Cek fungsi perangkat keras: **Layar**, **Kamera**, **Microphone**, dan **Speaker** untuk memastikan seluruhnya berfungsi normal.',
      'Lakukan **Factory Reset** pada HP tersebut untuk membersihkan seluruh data dan pengaturan lama.',
      'Lakukan **konfigurasi** awal (bahasa, koneksi Wi-Fi, akun, dsb.) hingga masuk ke **halaman awal** (*home screen*).',
      'Setelah seluruh proses setup selesai, buat dan lengkapi [Form Serah Terima HP](https://docs.google.com/document/d/1uDDbC77cmnm1J4yBDSQLW23pDkv4Y2R7h0myL_lkdbM/).',
      'Berikan **Label** pada **Box HP** dan **belakang HP** sesuai standar penamaan inventaris perusahaan.',
      'Update **Master Data Aset Management** dengan informasi unit HP yang telah disiapkan.',
      'Proses setup selesai dan unit HP siap diserahkan kepada *User*.'
    ],
    dosAndDonts: {
      dos: [
        'Wajib melakukan pengujian fungsionalitas hardware (layar, kamera, mic, speaker) sebelum melangkah ke proses reset dan konfigurasi.',
        'Pastikan seluruh data dari pengguna/pemakaian sebelumnya telah terhapus bersih melalui Factory Reset.'
      ],
      donts: [
        'Jangan melewatkan proses Factory Reset sebelum melakukan konfigurasi ulang pada HP stok.',
        'Jangan menyerahkan HP yang memiliki kendala fisik/hardware tanpa pemberitahuan atau perbaikan terlebih dahulu.'
      ]
    },
    snippets: [
      {
        label: 'Link Form Serah Terima HP',
        code: 'https://docs.google.com/document/d/1uDDbC77cmnm1J4yBDSQLW23pDkv4Y2R7h0myL_lkdbM/'
      }
    ],
    isCustom: false
  },
  {
    id: 'google-workspace-01',
    title: 'SOP Permintaan Kode Backup 2-Step Verification (2SV) Google Workspace',
    category: 'workplace',
    severity: 'medium',
    tags: ['google-workspace', '2sv', 'backup-codes', 'security', 'admin-console', 'pbx'],
    summary: 'Panduan Operasional Standar (SOP) penanganan permintaan kode cadangan verifikasi 2 langkah (*2-Step Verification*) akun Google Workspace atas permintaan PBX / People & Culture.',
    problemContext: 'Tim People & Culture (PBX) atau atasan memohon kode verifikasi cadangan (*Backup Verification Codes*) untuk membantu akses masuk (*login*) akun Google Workspace milik anggota tim/subordinat yang mengalami kendala otentikasi.',
    actionSteps: [
      'Buka dan login ke portal [Google Admin Console](https://admin.google.com/) menggunakan akun Administrator berwenang.',
      'Cari nama atau alamat email pengguna (*User*) yang bersangkutan melalui kolom pencarian utama atau navigasi **Directory > Users**.',
      'Klik profil akun pengguna tersebut, lalu pilih tab **Security** pada panel detail.',
      'Pilih dan buka bagian **2-Step Verification**.',
      'Klik opsi **"Get Backup Verification Codes"** untuk menampilkan daftar kode cadangan otentikasi.',
      'Salin minimal **2 (dua) kode verifikasi cadangan** dari daftar yang tersedia.',
      'Kirimkan kedua kode verifikasi cadangan tersebut secara aman kepada pihak PBX / pemohon berwenang.'
    ],
    dosAndDonts: {
      dos: [
        'Pastikan untuk selalu memverifikasi keabsahan permintaan dari pihak PBX / atasan sebelum menyerahkan kode cadangan.',
        'Sertakan minimal 2 kode verifikasi cadangan agar user memiliki opsi cadangan jika satu kode gagal digunakan.'
      ],
      donts: [
        'Jangan membagikan seluruh daftar kode backup sekaligus demi menjaga standar keamanan akun Google Workspace perusahaan.',
        'Jangan memberikan kode backup ke pihak yang tidak dikenal tanpa konfirmasi resmi dari People & Culture (PBX).'
      ]
    },
    snippets: [
      {
        label: 'Link Direct Google Admin Console',
        code: 'https://admin.google.com/'
      }
    ],
    isCustom: false
  },
  {
    id: 'google-workspace-02',
    title: 'SOP Permintaan Reset Password Akun Google Workspace Karyawan',
    category: 'workplace',
    severity: 'medium',
    tags: ['google-workspace', 'reset-password', 'security', 'admin-console', 'pbx', 'default-password'],
    summary: 'Panduan Operasional Standar (SOP) penanganan permintaan reset kata sandi (*reset password*) akun Google Workspace karyawan yang mengalami lupa password atau atas permintaan PBX.',
    problemContext: 'Perwakilan People & Culture (PBX) atau atasan mengajukan permohonan reset kata sandi (*password reset*) untuk anggota tim/subordinat yang lupa password atau tidak bisa mengakses akun Google Workspace perusahaan.',
    actionSteps: [
      'Buka dan login ke portal [Google Admin Console](https://admin.google.com/) menggunakan akun Administrator berwenang.',
      'Cari nama atau alamat email pengguna (*User*) yang akan di-reset pada kolom pencarian utama atau navigasi **Directory > Users**.',
      'Klik tombol **Reset Password** pada panel profil akun pengguna tersebut.',
      'Pilih metode **Create Password** (buat kata sandi secara manual).',
      'Masukkan kata sandi default resmi perusahaan yaitu `Essensians@2026` pada kolom password baru.',
      'Pastikan untuk mencentang opsi **"Ask user to change their password when they sign in"** agar pengguna wajib memperbarui kata sandi saat pertama kali login kembali.',
      'Klik tombol **Reset** untuk mengeksekusi perbaikan, kemudian kabarkan password sementara tersebut secara aman kepada pihak PBX / pemohon berwenang.'
    ],
    dosAndDonts: {
      dos: [
        'Wajib mencentang opsi *Ask user to change their password when they sign in* agar kata sandi baru segera diubah oleh pemilik akun.',
        'Gunakan password default resmi perusahaan (`Essensians@2026`) untuk konsistensi prosedur IT Support.'
      ],
      donts: [
        'Jangan membagikan kata sandi baru pada grup obrolan publik; selalu kirimkan secara privat (*Direct Message*) kepada pihak PBX.',
        'Jangan mengabaikan verifikasi pemohon; pastikan permintaan reset berasal dari saluran resmi PBX / People & Culture.'
      ]
    },
    snippets: [
      {
        label: 'Default Password Reset & Console Link',
        code: `Portal: https://admin.google.com/\nDefault Temp Password: Essensians@2026`
      }
    ],
    isCustom: false
  }
];

const SEED_TEMPLATES = [
  {
    id: 'tpl-standup',
    title: 'Daily Standup Report',
    category: 'Standup & Reporting',
    content: `📌 **Daily Update - [Nama Kamu]** (Intern Software Engineer)\nTanggal: [DD/MM/YYYY]\n\n✅ **Yesterday / Completed:**\n- Selesai slicing UI halaman Dashboard Analytics (TASK-101)\n- Integrasi API Get User Profile & test case status code 200\n\n🎯 **Today / Planned:**\n- Mengerjakan fitur Filter Date Range di Dashboard Analytics (TASK-102)\n- Unit testing pada komponen chart\n\n🚧 **Blockers / Impediments:**\n- None`
  },
  {
    id: 'tpl-stuck',
    title: 'Bertanya Saat Stuck (15-Min Rule)',
    category: 'Question & Support',
    content: `Selamat pagi/siang Mas/Mbak [Nama Mentor], izin bertanya terkait task [Nama Task/Tiket]:\nSaya sedang mencoba [tujuan fitur], namun saat ini mengalami kendala [ringkasan error/behavior yang salah].\n\nBeberapa hal yang sudah saya coba perbaiki:\n1. [Langkah 1 yang sudah dicoba]\n2. [Langkah 2 yang sudah dicoba]\n\nBerikut saya lampirkan screenshot log error-nya. Jika Mas/Mbak ada waktu luang nanti, boleh minta arahan sebentar? Terima kasih banyak!`
  },
  {
    id: 'tpl-pr',
    title: 'Pull Request (PR) Description',
    category: 'Code Review',
    content: `## 📝 Summary of Changes\n- Implemented [Nama Fitur / Tiket ID]\n- Added responsive layout for mobile viewport\n- Integrated API endpoint POST /api/v1/resource\n\n## 🧪 How Has This Been Tested?\n- [x] Tested locally on Chrome & Firefox\n- [x] Verified unit tests passing (\`npm run test\`)\n- [x] Checked console for zero warnings/errors\n\n## 📸 Screenshots / GIFs\n(Attach screenshots here)\n\n## 📌 Checklist\n- [x] Followed team code style guidelines\n- [x] Self-reviewed code before requesting review`
  },
  {
    id: 'tpl-bug-report',
    title: 'Laporan Bug ke Tim Backend / QA',
    category: 'Bug Report',
    content: `🚨 **Bug Report / Staging Issue**\n- **Feature / Area:** [Nama Halaman / Module]\n- **Environment:** Staging / Local Dev\n- **Endpoint / Action:** [POST /api/v1/example]\n- **Expected Behavior:** [Hasil yang seharusnya]\n- **Actual Behavior:** [Hasil error / 500 status]\n- **Payload & Response:** \n  \`\`\`json\n  { "error": "Internal Server Error", "code": 500 }\n  \`\`\`\n- **Note:** Mohon konfirmasi apakah endpoint ini sedang ada perbaikan DB. Terima kasih!`
  }
];

async function main() {
  console.log('🌱 Starting Database Seeding with Prisma...');

  // 1. Seed Cases
  for (const caseData of SEED_CASES) {
    await prisma.case.upsert({
      where: { id: caseData.id },
      update: {
        title: caseData.title,
        category: caseData.category,
        severity: caseData.severity,
        tags: caseData.tags,
        summary: caseData.summary,
        problemContext: caseData.problemContext,
        actionSteps: caseData.actionSteps,
        dosAndDonts: caseData.dosAndDonts,
        snippets: caseData.snippets,
        isCustom: caseData.isCustom
      },
      create: {
        id: caseData.id,
        title: caseData.title,
        category: caseData.category,
        severity: caseData.severity,
        tags: caseData.tags,
        summary: caseData.summary,
        problemContext: caseData.problemContext,
        actionSteps: caseData.actionSteps,
        dosAndDonts: caseData.dosAndDonts,
        snippets: caseData.snippets,
        isCustom: caseData.isCustom
      }
    });
  }
  console.log(`✅ Seeded ${SEED_CASES.length} Cases`);

  // 2. Seed Templates
  for (const tpl of SEED_TEMPLATES) {
    await prisma.template.upsert({
      where: { id: tpl.id },
      update: {
        title: tpl.title,
        category: tpl.category,
        content: tpl.content
      },
      create: {
        id: tpl.id,
        title: tpl.title,
        category: tpl.category,
        content: tpl.content
      }
    });
  }
  console.log(`✅ Seeded ${SEED_TEMPLATES.length} Templates`);

  // 3. Seed Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPassword
    },
    create: {
      username: 'admin',
      name: 'ESB Administrator',
      password: adminPassword,
      role: 'admin'
    }
  });
  console.log('✅ Seeded default Admin user (username: admin, password: admin123)');

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
