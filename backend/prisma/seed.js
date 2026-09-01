import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DUMMY_CASES = [
  // 1. HARDWARE
  {
    id: 'laptop-01',
    title: 'SOP Setup Laptop Baru untuk New Joiner / Pergantian Perangkat',
    category: 'hardware',
    severity: 'high',
    tags: ['laptop-baru', 'oobe', 'setup-device', 'new-joiner', 'it-support', 'windows'],
    summary: 'Panduan Operasional Standar (SOP) penyiapan unit laptop Windows baru bagi karyawan baru (new joiner) atau fasilitas penggantian unit kerja.',
    problemContext: 'Saat menyiapkan unit laptop baru dari distributor/vendor, diperlukan proses bypass pembuatan akun online Microsoft saat OOBE, penyiapan akun lokal standar perusahaan, penyesuaian opsi keamanan, serta instalasi paket aplikasi kerja wajib.',
    actionSteps: [
      'Nyalakan unit laptop baru hingga masuk ke tampilan Out-of-Box Experience (OOBE) pada tahap "Let\'s connect you to a network".',
      'Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) pada keyboard untuk membuka jendela Command Prompt (CMD).',
      'Ketik perintah oobe\\bypassnro lalu tekan Enter. Laptop akan restart otomatis dan mengizinkan proses setup tanpa koneksi internet (Local Account mode).',
      'Setelah berhasil masuk ke desktop Windows, buka aplikasi Notepad, lalu salin dan simpan script otomatisasi user sebagai file .bat (contoh: setup_user.bat).',
      'Klik kanan pada file .bat tersebut lalu pilih Run as Administrator untuk membuat user ESB-User dengan password Essensians@2026 dan mengonfigurasi batas waktu password menjadi Never Expire.',
      'Lakukan pengubahan nama perangkat (Rename This PC) sesuai standar penamaan label inventaris laptop perusahaan (contoh: LAPTOP-IT-01 atau ESB-DEPT-NAME).',
      'Buka menu Settings > Windows Update, jalankan pembaruan sistem hingga selesai, dan aktifkan opsi "Get the latest updates as soon as they\'re available".',
      'Matikan enkripsi perangkat melalui menu Settings > Privacy & Security > Device Encryption (setel status menjadi Off).',
      'Hubungkan flashdisk instalasi IT, kemudian jalankan installer Ninite.',
      'Verifikasi bahwa perangkat telah terpasang aplikasi wajib perusahaan: Google Chrome, AnyDesk, dan Microsoft Office suite.',
      'Setelah seluruh proses setup selesai, buat dan lengkapi Form Serah Terima Laptop.',
      'Proses setup selesai dan unit laptop siap diserahkan kepada User.'
    ],
    dosAndDonts: {
      dos: [
        'Pastikan script installer .bat dieksekusi dengan hak akses Administrator (Run as Administrator).',
        'Verifikasi seluruh aplikasi wajib (Chrome, AnyDesk, MS Office) dapat terbuka dengan normal sebelum diserahkan.',
        'Catat Serial Number dan label perangkat pada Formulir Serah Terima Perangkat.'
      ],
      donts: [
        'Jangan menghubungkan laptop ke koneksi Wi-Fi/Internet pada tahap awal OOBE sebelum menjalankan perintah oobe\\bypassnro.',
        'Jangan melewatkan penonaktifan Device Encryption untuk menghindari terkuncinya drive di kemudian hari.'
      ]
    },
    snippets: [
      {
        label: 'Script Auto Setup User & Password Never Expire (.bat)',
        code: `@echo off\nREM Jalankan sebagai Administrator\nREM Membuat user baru\nnet user "ESB-User" Essensians@2026 /add\n\nREM Set agar password tidak pernah expired via PowerShell\npowershell -Command "Set-LocalUser -Name 'ESB-User' -PasswordNeverExpires $true"\n\necho User ESB-User berhasil dibuat dengan password tidak pernah expired.\npause`
      }
    ],
    isCustom: false,
    isFeaturedOnHome: true,
    homeOrder: 0,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Panduan Operasional Standar (SOP) penyiapan unit laptop Windows baru bagi karyawan baru (<em>new joiner</em>) atau fasilitas penggantian unit kerja.</p></div><div data-callout="context" class="callout-card callout-context"><p><strong>Background &amp; Skenario Kendala:</strong><br>Saat menyiapkan unit laptop baru dari distributor/vendor, diperlukan proses bypass pembuatan akun online Microsoft saat OOBE, penyiapan akun lokal standar perusahaan, penyesuaian opsi keamanan, serta instalasi paket aplikasi kerja wajib.</p></div><h3>Langkah Penyelesaian (Action Steps)</h3><ol><li>Nyalakan unit laptop baru hingga masuk ke tampilan Out-of-Box Experience (OOBE) pada tahap <em>"Let's connect you to a network"</em>.</li><li>Tekan kombinasi tombol <code>Shift + F10</code> (atau <code>Fn + Shift + F10</code>) pada keyboard untuk membuka Command Prompt (CMD).</li><li>Ketik perintah <code>oobe\\bypassnro</code> lalu tekan <strong>Enter</strong>.</li><li>Buat user lokal <code>ESB-User</code> dan setel password standar.</li><li>Lakukan pembaruan sistem melalui menu <strong>Windows Update</strong>.</li><li>Matikan enkripsi <em>Device Encryption</em> dan pasang aplikasi kerja standar.</li></ol><div data-callout="dos" class="callout-card callout-dos"><p><strong>Best Practices (DOs):</strong></p><ul><li>Pastikan script installer dijalankan dengan Run as Administrator.</li><li>Verifikasi aplikasi Google Chrome, AnyDesk, dan MS Office terbuka dengan normal.</li></ul></div>`
  },

  // 2. SOFTWARE
  {
    id: 'software-01',
    title: 'Panduan Instalasi & Aktivasi Lisensi Microsoft 365 Enterprise',
    category: 'software',
    severity: 'high',
    tags: ['microsoft-365', 'office', 'lisensi', 'word', 'excel', 'outlook'],
    summary: 'Prosedur instalasi dan aktivasi paket aplikasi Microsoft 365 (Word, Excel, PowerPoint, Outlook) menggunakan akun email korporat.',
    problemContext: 'Karyawan yang baru bergabung atau mengalami lisensi expired memerlukan instalasi resmi dan login SSO Microsoft 365 perusahaan.',
    actionSteps: [
      'Buka browser dan akses portal resmi https://portal.office.com.',
      'Masuk menggunakan alamat email korporat (@esb.co.id) dan password SSO akun Anda.',
      'Klik tombol "Install Apps" di pojok kanan atas, lalu pilih "Microsoft 365 apps".',
      'Jalankan file installer OfficeSetup.exe yang terunduh dan tunggu hingga proses instalasi selesai.',
      'Buka salah satu aplikasi (misal: Microsoft Word), klik tombol "Sign In" di pojok kanan atas.',
      'Masukkan kredensial akun perusahaan dan lakukan verifikasi 2FA jika diminta.',
      'Pastikan status lisensi pada menu File > Account tertera "Subscription Product Microsoft 365 Apps for Enterprise".'
    ],
    dosAndDonts: {
      dos: [
        'Selalu unduh installer langsung dari portal resmi Microsoft 365.',
        'Pastikan koneksi internet stabil dengan bandwidth minimal 10 Mbps saat proses instalasi.'
      ],
      donts: [
        'Jangan menggunakan software activator pihak ketiga atau crack di perangkat kantor.',
        'Jangan login menggunakan akun Microsoft personal pada aplikasi kerja.'
      ]
    },
    snippets: [
      {
        label: 'URL Portal Microsoft 365',
        code: 'https://portal.office.com'
      }
    ],
    isCustom: false,
    isFeaturedOnHome: true,
    homeOrder: 1,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Prosedur instalasi dan aktivasi paket aplikasi Microsoft 365 (Word, Excel, PowerPoint, Outlook) menggunakan akun email korporat.</p></div><h3>Langkah-Langkah Instalasi &amp; Aktivasi:</h3><ol><li>Buka portal resmi <a href="https://portal.office.com" target="_blank" class="text-[#0040e5] underline font-semibold">portal.office.com</a>.</li><li>Masuk menggunakan email korporat Anda.</li><li>Klik tombol <strong>Install Apps</strong> di pojok kanan atas.</li><li>Jalankan file installer dan buka Microsoft Word setelah selesai.</li><li>Login akun kerja untuk mengaktifkan lisensi Enterprise.</li></ol>`
  },

  // 3. GIT
  {
    id: 'git-01',
    title: 'SOP Standard Git Branching & Pull Request (PR) Review Workflow',
    category: 'git',
    severity: 'high',
    tags: ['git', 'github', 'branching', 'pull-request', 'code-review', 'gitflow'],
    summary: 'Standar alur kerja branching Git, penamaan branch, format commit message, dan tata cara pembuatan Pull Request (PR) di repositori perusahaan.',
    problemContext: 'Mencegah terjadinya konflik kode di branch master/main serta memastikan setiap perubahan melalui tahapan code review dan automated testing yang memadai.',
    actionSteps: [
      'Lakukan update branch utama sebelum membuat branch baru: git checkout staging && git pull origin staging.',
      'Buat branch fitur dengan konvensi penamaan standar: git checkout -b feat/ESB-123-nama-fitur atau fix/ESB-456-bug-deskripsi.',
      'Tulis commit message sesuai konvensi Conventional Commits (contoh: feat(auth): add google sso login).',
      'Push branch ke remote repository: git push -u origin feat/ESB-123-nama-fitur.',
      'Buka GitHub, buat Pull Request (PR) dengan target branch staging.',
      'Isi template PR secara lengkap: deskripsi perubahan, checklist pengujian, dan screenshot/video hasil implementasi.',
      'Assign minimal 1 peer reviewer dan pastikan seluruh automated CI checks berstatus PASS sebelum meminta merge.'
    ],
    dosAndDonts: {
      dos: [
        'Gunakan format commit: feat:, fix:, docs:, refactor:, test:, chore:.',
        'Pastikan branch selalu up-to-date dengan staging sebelum submit PR.'
      ],
      donts: [
        'DILARANG KERAS melakukan force push (git push -f) pada branch master, main, atau staging.',
        'Jangan memasukkan credential, API keys, atau file .env ke dalam git commit.'
      ]
    },
    snippets: [
      {
        label: 'Contoh Perintah Pembuatan Branch & Push',
        code: `git checkout staging\ngit pull origin staging\ngit checkout -b feat/AUTH-102-biometric-login\ngit add .\ngit commit -m "feat(auth): implement biometric login handler"\ngit push -u origin feat/AUTH-102-biometric-login`
      }
    ],
    isCustom: false,
    isFeaturedOnHome: true,
    homeOrder: 2,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Standar alur kerja branching Git, penamaan branch, format commit message, dan tata cara pembuatan Pull Request (PR) di repositori perusahaan.</p></div><div data-callout="context" class="callout-card callout-context"><p><strong>Tujuan Standar:</strong><br>Mencegah konflik kode di branch utama dan memastikan standar kualitas kode melalui automated testing &amp; peer code review.</p></div><h3>Format Penamaan Branch Standar:</h3><ul><li><code>feat/TICKET-ID-fitur-name</code> (untuk fitur baru)</li><li><code>fix/TICKET-ID-bug-desc</code> (untuk perbaikan bug)</li><li><code>refactor/TICKET-ID-clean-code</code> (untuk refactoring)</li></ul><div data-callout="donts" class="callout-card callout-donts"><p><strong>Larangan Kritis:</strong></p><ul><li>Dilarang keras push langsung atau force push ke branch <code>main</code> / <code>staging</code>.</li><li>Jangan pernah commit file <code>.env</code> atau token secret ke git.</li></ul></div>`
  },

  // 4. WORKPLACE
  {
    id: 'workplace-01',
    title: 'SOP Permintaan Kode Backup 2-Step Verification (2SV) Google Workspace',
    category: 'workplace',
    severity: 'medium',
    tags: ['google-workspace', '2sv', 'backup-codes', 'security', 'admin-console', 'pbx'],
    summary: 'Panduan Operasional Standar (SOP) penanganan permintaan kode cadangan verifikasi 2 langkah (2-Step Verification) akun Google Workspace atas permintaan PBX / People & Culture.',
    problemContext: 'Tim People & Culture (PBX) atau atasan memohon kode verifikasi cadangan (Backup Verification Codes) untuk membantu akses masuk akun Google Workspace milik karyawan yang mengalami kendala otentikasi (HP hilang/ganti nomor).',
    actionSteps: [
      'Buka dan login ke portal Google Admin Console (https://admin.google.com) menggunakan akun Administrator berwenang.',
      'Cari nama atau alamat email pengguna (User) yang bersangkutan melalui kolom pencarian utama atau navigasi Directory > Users.',
      'Klik profil akun pengguna tersebut, lalu pilih tab Security pada panel detail.',
      'Pilih dan buka bagian 2-Step Verification.',
      'Klik opsi "Get Backup Verification Codes" untuk menampilkan daftar kode cadangan otentikasi.',
      'Salin minimal 2 (dua) kode verifikasi cadangan dari daftar yang tersedia.',
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
    isCustom: false,
    isFeaturedOnHome: true,
    homeOrder: 3,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Panduan Operasional Standar (SOP) penanganan permintaan kode cadangan verifikasi 2 langkah (<em>2-Step Verification</em>) akun Google Workspace atas permohonan resmi PBX / People &amp; Culture.</p></div><h3>Langkah di Google Admin Console:</h3><ol><li>Buka portal <a href="https://admin.google.com" target="_blank" class="text-[#0040e5] underline font-semibold">admin.google.com</a>.</li><li>Cari akun pengguna di menu <strong>Directory &gt; Users</strong>.</li><li>Buka tab <strong>Security</strong> &gt; <strong>2-Step Verification</strong>.</li><li>Klik <strong>Get Backup Verification Codes</strong>.</li><li>Salin 2 kode cadangan dan kirimkan secara privat ke pihak pemohon.</li></ol>`
  },

  // 5. ENVIRONMENT
  {
    id: 'env-01',
    title: 'Panduan Koneksi Jaringan Wi-Fi Kantor (ESB-Secure WPA2-Enterprise)',
    category: 'environment',
    severity: 'high',
    tags: ['wifi', 'network', 'wpa2-enterprise', 'radius', 'office-network'],
    summary: 'Petunjuk menghubungkan laptop Windows / macOS dan smartphone ke jaringan nirkabel internal ESB-Secure menggunakan kredensial domain.',
    problemContext: 'Perangkat kerja karyawan perlu terhubung ke SSID aman ESB-Secure untuk mendapatkan akses internet cepat dan server lokal kantor.',
    actionSteps: [
      'Buka menu Wi-Fi di perangkat laptop atau handphone Anda.',
      'Pilih jaringan SSID: ESB-Secure.',
      'Pada metode otentikasi EAP, pilih "PEAP" dengan Phase 2 Authentication "MSCHAPV2".',
      'Pada kolom CA Certificate, pilih "Do not validate" atau "Use system certificates".',
      'Masukkan Identity: email korporat Anda (contoh: budi@esb.co.id) dan Password email Anda.',
      'Klik Connect / Join dan terima sertifikat jaringan jika muncul konfirmasi keamanan.'
    ],
    dosAndDonts: {
      dos: [
        'Gunakan SSID ESB-Guest khusus untuk tamu/vendor eksternal yang berkunjung.',
        'Lapor ke IT Support jika perangkat gagal melakukan handshake radius authentication.'
      ],
      donts: [
        'Jangan membagikan akun Wi-Fi korporat kepada tamu non-karyawan.'
      ]
    },
    snippets: [
      {
        label: 'Konfigurasi Parameter Wi-Fi ESB-Secure',
        code: `SSID: ESB-Secure\nSecurity: WPA2-Enterprise (802.1X)\nEAP Method: PEAP\nPhase 2: MSCHAPv2`
      }
    ],
    isCustom: false,
    isFeaturedOnHome: true,
    homeOrder: 4,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Petunjuk menghubungkan laptop Windows / macOS dan smartphone ke jaringan nirkabel internal <strong>ESB-Secure</strong> menggunakan kredensial domain.</p></div><h3>Parameter Koneksi:</h3><ul><li><strong>SSID:</strong> ESB-Secure</li><li><strong>Security:</strong> WPA2/WPA3 Enterprise (802.1X)</li><li><strong>EAP Method:</strong> PEAP &gt; MSCHAPv2</li><li><strong>Username:</strong> Email Korporat (@esb.co.id)</li><li><strong>Password:</strong> Password Email Akun Anda</li></ul>`
  },

  // 6. BACKEND
  {
    id: 'backend-01',
    title: 'SOP Database Migration & Zero-Downtime Rollback Procedure',
    category: 'backend',
    severity: 'high',
    tags: ['database', 'postgresql', 'migration', 'prisma', 'rollback', 'zero-downtime'],
    summary: 'Standard Operating Procedure (SOP) eksekusi migrasi skema database production dengan strategi Zero-Downtime dan rencana rollback instan.',
    problemContext: 'Mencegah table lock berkepanjangan dan downtime layanan pada database utama saat rilis fitur baru yang mengubah struktur skema database.',
    actionSteps: [
      'Buat manual snapshot backup database sebelum memulai jendela rilis.',
      'Tinjau script SQL migrasi untuk memastikan tidak ada operasi destruktif (seperti DROP COLUMN tanpa deprecation period).',
      'Jalankan migrasi pada database staging terlebih dahulu dan amati eksekusi query time.',
      'Jalankan migrasi production menggunakan tool resmi: npx prisma migrate deploy.',
      'Verifikasi status database health dan connection pool metrics di dashboard monitoring.',
      'Jika terjadi kegagalan atau lonjakan latency > 500ms, segera jalankan script rollback yang telah disiapkan.'
    ],
    dosAndDonts: {
      dos: [
        'Gunakan pola expand-and-contract untuk perubahan kolom besar.',
        'Jadwalkan migrasi besar di luar jam sibuk operasional (maintenance window 23:00 - 04:00).'
      ],
      donts: [
        'DILARANG mengubah tipe data kolom besar tanpa nullable intermediate column.',
        'Jangan pernah menjalankan prisma db push di environment production.'
      ]
    },
    snippets: [
      {
        label: 'Perintah Eksekusi Migration Production',
        code: `# Cek status migration pending\nnpx prisma migrate status\n\n# Eksekusi migrasi aman\nnpx prisma migrate deploy`
      }
    ],
    isCustom: false,
    isFeaturedOnHome: false,
    homeOrder: 5,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Standard Operating Procedure (SOP) eksekusi migrasi skema database production dengan strategi Zero-Downtime dan rencana rollback instan.</p></div><h3>Aturan Emas Migrasi Database:</h3><ol><li>Wajib membuat database snapshot sebelum migrasi dijalankan.</li><li>Gunakan perintah <code>npx prisma migrate deploy</code> (bukan <code>db push</code>).</li><li>Gunakan pola <em>Expand and Contract</em> untuk perubahan kolom.</li><li>Siapkan skrip SQL rollback sebelum memulai maintenance.</li></ol>`
  },

  // 7. DEVOPS
  {
    id: 'devops-01',
    title: 'Incident Response Playbook: Severity 1 Escalation Matrix & War Room',
    category: 'devops',
    severity: 'high',
    tags: ['incident-response', 'sev1', 'war-room', 'escalation', 'sla', 'pagerduty'],
    summary: 'Protokol penanganan insiden kritis (Severity 1 / P0) ketika sistem utama mengalami downtime atau gangguan fungsionalitas mayor.',
    problemContext: 'Ketika layanan utama mengalami gangguan total dan memerlukan penanganan cepat dalam SLA response time 15 menit.',
    actionSteps: [
      'Incident Commander (IC) membuka Slack Incident Channel #incident-sev1-[nama-insiden] dan Google Meet War Room.',
      'Panggil On-Call Engineers melalui PagerDuty / panggilan darurat.',
      'Kirimkan notifikasi awal status insiden ke grup stakeholder maksimal 15 menit sejak insiden terdeteksi.',
      'Tech Lead mengidentifikasi root cause dan menentukan strategi mitigasi (rollback, failover, atau hotfix).',
      'Setelah sistem kembali normal (resolve), kirimkan konfirmasi pulih ke seluruh saluran komunikasi.',
      'Jadwalkan Post-Mortem Blameless Review dalam 2x24 jam kerja.'
    ],
    dosAndDonts: {
      dos: [
        'Tunjuk 1 orang Incident Commander yang bertanggung jawab penuh atas komunikasi dan koordinasi.',
        'Dokumentasikan linimasa kejadian (timestamped timeline) secara real-time di channel insiden.'
      ],
      donts: [
        'Dilarang melakukan perubahan konfigurasi di server tanpa persetujuan Incident Commander saat war room aktif.',
        'Hindari saling menyalahkan saat sesi Post-Mortem (Blameless Culture).'
      ]
    },
    snippets: [
      {
        label: 'Template Broadcast Status Insiden',
        code: `🚨 [INCIDENT SEV-1 UPDATE]\nLayanan: Payment Gateway & Login\nStatus: Investigasi / Mitigasi\nEstimasi Update: 30 Menit ke depan\nWar Room: https://meet.google.com/esb-war-room`
      }
    ],
    isCustom: false,
    isFeaturedOnHome: false,
    homeOrder: 6,
    isPublished: true,
    contentHtml: `<div class="summary-block-card" data-summary-block=""><p>Protokol penanganan insiden kritis (<strong>Severity 1 / P0</strong>) ketika sistem utama mengalami downtime atau gangguan fungsionalitas mayor.</p></div><h3>Matriks Eskalasi SLA Respon:</h3><ul><li><strong>Sev 1 (Kritis):</strong> Respon &lt; 15 menit | Target Mitigasi &lt; 1 jam</li><li><strong>Sev 2 (Mayor):</strong> Respon &lt; 30 menit | Target Mitigasi &lt; 4 jam</li><li><strong>Sev 3 (Minor):</strong> Respon &lt; 2 jam | Target Mitigasi &lt; 24 jam</li></ul>`
  }
];

async function main() {
  console.log('🗑️ Menghapus seluruh data cases dan interaksi lama...');
  await prisma.caseInteraction.deleteMany({});
  await prisma.case.deleteMany({});
  console.log('✅ Berhasil membersihkan tabel cases dan case_interactions.');

  console.log(`🌱 Memasukkan ${DUMMY_CASES.length} dummy cases (1 case per kategori)...`);

  for (const c of DUMMY_CASES) {
    await prisma.case.create({
      data: {
        id: c.id,
        title: c.title,
        category: c.category,
        tags: c.tags || [],
        summary: c.summary || '',
        problemContext: c.problemContext || '',
        actionSteps: c.actionSteps || [],
        dosAndDonts: c.dosAndDonts || { dos: [], donts: [] },
        snippets: c.snippets || [],
        isCustom: c.isCustom ?? false,
        isFeaturedOnHome: Boolean(c.isFeaturedOnHome),
        homeOrder: c.homeOrder ?? 0,
        isPublished: c.isPublished ?? true,
        contentHtml: c.contentHtml || ''
      }
    });
  }
  console.log(`✅ Sukses generate ${DUMMY_CASES.length} dummy cases!`);

  // Generate interaction data for popular scoring
  const now = new Date();
  const sampleInteractions = [
    ...Array(35).fill({ caseId: 'laptop-01', type: 'view' }),
    ...Array(18).fill({ caseId: 'laptop-01', type: 'click' }),
    ...Array(12).fill({ caseId: 'laptop-01', type: 'helpful' }),

    ...Array(28).fill({ caseId: 'software-01', type: 'view' }),
    ...Array(14).fill({ caseId: 'software-01', type: 'click' }),
    ...Array(9).fill({ caseId: 'software-01', type: 'helpful' }),

    ...Array(24).fill({ caseId: 'git-01', type: 'view' }),
    ...Array(10).fill({ caseId: 'git-01', type: 'click' }),
    ...Array(8).fill({ caseId: 'git-01', type: 'helpful' }),

    ...Array(20).fill({ caseId: 'workplace-01', type: 'view' }),
    ...Array(8).fill({ caseId: 'workplace-01', type: 'click' }),
    ...Array(6).fill({ caseId: 'workplace-01', type: 'helpful' }),

    ...Array(16).fill({ caseId: 'env-01', type: 'view' }),
    ...Array(6).fill({ caseId: 'env-01', type: 'click' }),
    ...Array(5).fill({ caseId: 'env-01', type: 'helpful' }),

    ...Array(15).fill({ caseId: 'backend-01', type: 'view' }),
    ...Array(5).fill({ caseId: 'backend-01', type: 'click' }),
    ...Array(4).fill({ caseId: 'backend-01', type: 'helpful' }),

    ...Array(12).fill({ caseId: 'devops-01', type: 'view' }),
    ...Array(4).fill({ caseId: 'devops-01', type: 'click' }),
    ...Array(3).fill({ caseId: 'devops-01', type: 'helpful' })
  ];

  for (const inter of sampleInteractions) {
    const daysAgo = Math.floor(Math.random() * 20);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.caseInteraction.create({
      data: {
        caseId: inter.caseId,
        type: inter.type,
        createdAt
      }
    });
  }
  console.log(`✅ Sukses generate sample interaction logs.`);

  // Ensure Admin User exists
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
  console.log('✅ Admin user ready (username: admin, password: admin123).');
  console.log('🎉 Selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
