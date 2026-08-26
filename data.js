// Data Seed untuk Website ESB Case Playbook & FAQ Hub

const INITIAL_CASES = [
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
    ]
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
    ]
  }
];

const COMMUNICATION_TEMPLATES = [
  {
    id: 'tpl-standup',
    title: 'Daily Standup Report',
    category: 'Standup & Reporting',
    content: `📌 **Daily Update - [Nama Kamu]** (Intern Software Engineer)
Tanggal: [DD/MM/YYYY]

✅ **Yesterday / Completed:**
- Selesai slicing UI halaman Dashboard Analytics (TASK-101)
- Integrasi API Get User Profile & test case status code 200

🎯 **Today / Planned:**
- Mengerjakan fitur Filter Date Range di Dashboard Analytics (TASK-102)
- Unit testing pada komponen chart

🚧 **Blockers / Impediments:**
- None`
  },
  {
    id: 'tpl-stuck',
    title: 'Bertanya Saat Stuck (15-Min Rule)',
    category: 'Question & Support',
    content: `Selamat pagi/siang Mas/Mbak [Nama Mentor], izin bertanya terkait task [Nama Task/Tiket]:
Saya sedang mencoba [tujuan fitur], namun saat ini mengalami kendala [ringkasan error/behavior yang salah].

Beberapa hal yang sudah saya coba perbaiki:
1. [Langkah 1 yang sudah dicoba]
2. [Langkah 2 yang sudah dicoba]

Berikut saya lampirkan screenshot log error-nya. Jika Mas/Mbak ada waktu luang nanti, boleh minta arahan sebentar? Terima kasih banyak!`
  },
  {
    id: 'tpl-pr',
    title: 'Pull Request (PR) Description',
    category: 'Code Review',
    content: `## 📝 Summary of Changes
- Implemented [Nama Fitur / Tiket ID]
- Added responsive layout for mobile viewport
- Integrated API endpoint POST /api/v1/resource

## 🧪 How Has This Been Tested?
- [x] Tested locally on Chrome & Firefox
- [x] Verified unit tests passing (\`npm run test\`)
- [x] Checked console for zero warnings/errors

## 📸 Screenshots / GIFs
(Attach screenshots here)

## 📌 Checklist
- [x] Followed team code style guidelines
- [x] Self-reviewed code before requesting review`
  },
  {
    id: 'tpl-bug-report',
    title: 'Laporan Bug ke Tim Backend / QA',
    category: 'Bug Report',
    content: `🚨 **Bug Report / Staging Issue**
- **Feature / Area:** [Nama Halaman / Module]
- **Environment:** Staging / Local Dev
- **Endpoint / Action:** [POST /api/v1/example]
- **Expected Behavior:** [Hasil yang seharusnya]
- **Actual Behavior:** [Hasil error / 500 status]
- **Payload & Response:** 
  \`\`\`json
  { "error": "Internal Server Error", "code": 500 }
  \`\`\`
- **Note:** Mohon konfirmasi apakah endpoint ini sedang ada perbaikan DB. Terima kasih!`
  }
];
