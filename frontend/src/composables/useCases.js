import { ref, computed } from 'vue';
import { api } from '../services/api.js';
import { useToast } from './useToast.js';

// Fallback seed data in case backend is loading or initial launch
const DEFAULT_CASES = [
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
      'Ketik perintah oobe\\bypassnro lalu tekan Enter. Laptop akan melakukan restart otomatis dan mengizinkan proses setup tanpa koneksi internet (Local Account mode).',
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
    isCustom: false
  },
  {
    id: 'laptop-02',
    title: 'SOP Setup Laptop Re-use / Bekas untuk New Joiner / Pergantian Perangkat',
    category: 'hardware',
    severity: 'high',
    tags: ['laptop-reuse', 'hardware-check', 'setup-device', 'new-joiner', 'it-support'],
    summary: 'Panduan Operasional Standar (SOP) penyiapan laptop pengembalian (re-use) untuk dialokasikan kembali kepada karyawan baru atau pergantian unit.',
    problemContext: 'Perangkat laptop pengembalian eks-karyawan perlu melalui tahapan verifikasi kondisi perangkat keras (hardware check), pembersihan profil user lama, penyesuaian nama akun pengguna baru, serta konfigurasinya sebelum diserahterimakan.',
    actionSteps: [
      'Siapkan unit laptop pengembalian yang akan dialokasikan untuk penyerahan atau penggantian perangkat.',
      'Login menggunakan akun Administrator, lalu lakukan pengujian fungsi hardware mencakup: Keyboard, Microphone, Kamera/Webcam, dan Speaker.',
      'Hapus akun/profil user lama jika ada, kemudian tambahkan akun lokal baru sesuai dengan nama pengguna (User Name) yang akan menerima laptop.',
      'Gunakan kata sandi standar default perusahaan yaitu Essensians@2026 untuk akun user baru tersebut.',
      'Buka Command Prompt sebagai Administrator, lalu jalankan perintah berikut agar password tidak pernah kadaluarsa: powershell -Command "Set-LocalUser -Name \'ESB-User\' -PasswordNeverExpires $true".',
      'Ubah nama perangkat (Rename This PC) sesuai label registrasi inventaris yang diperuntukkan bagi laptop tersebut.',
      'Buka menu Settings > Windows Update, periksa ketersediaan pembaruan sistem, dan nyalakan opsi "Get the latest updates as soon as they\'re available".',
      'Matikan enkripsi perangkat pada menu Settings > Privacy & Security > Device Encryption (setel status menjadi Off).',
      'Periksa dan lakukan instalasi aplikasi Google Chrome, AnyDesk, dan Microsoft Office jika belum terpasang pada sistem.',
      'Setelah seluruh proses penyiapan selesai, buat dan lengkapi dokumen pada Form Serah Terima Laptop.',
      'Proses penyiapan selesai dan unit laptop siap diserahkan kepada User.'
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
    summary: 'Panduan Operasional Standar (SOP) penyiapan unit handphone (HP) baru bagi karyawan baru (new joiner) atau fasilitas penggantian unit kerja.',
    problemContext: 'Saat menyiapkan unit HP baru dari distributor/vendor, diperlukan proses konfigurasi awal hingga halaman utama, pengecekan fungsi perangkat keras (layar, kamera, microphone, speaker), serta pencatatan penyerahan perangkat dan pembaruan data aset perusahaan.',
    actionSteps: [
      'Buka kemasan HP baru, keluarkan unit perangkat, lalu nyalakan HP dengan menekan tombol power hingga menyala.',
      'Lakukan konfigurasi awal (bahasa, koneksi Wi-Fi, akun, dsb.) hingga masuk ke halaman awal (home screen).',
      'Cek fungsi perangkat keras: Layar, Kamera, Microphone, dan Speaker untuk memastikan seluruhnya berfungsi normal.',
      'Setelah seluruh proses setup selesai, buat dan lengkapi Form Serah Terima HP.',
      'Berikan Label pada Box HP dan belakang HP sesuai standar penamaan inventaris perusahaan.',
      'Update Master Data Aset Management dengan informasi unit HP yang telah disiapkan.',
      'Proses setup selesai dan unit HP siap diserahkan kepada User.'
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
    summary: 'Panduan Operasional Standar (SOP) penyiapan unit handphone (HP) stok untuk dialokasikan kepada karyawan baru (new joiner) atau penggantian unit kerja.',
    problemContext: 'Perangkat HP stok perlu melalui tahapan pengecekan kondisi perangkat keras (layar, kamera, microphone, speaker), proses factory reset untuk membersihkan data lama, serta konfigurasi ulang hingga halaman utama sebelum diserahterimakan dan dicatat pada data aset perusahaan.',
    actionSteps: [
      'Nyalakan HP dengan menekan tombol power hingga menyala.',
      'Cek fungsi perangkat keras: Layar, Kamera, Microphone, dan Speaker untuk memastikan seluruhnya berfungsi normal.',
      'Lakukan Factory Reset pada HP tersebut untuk membersihkan seluruh data dan pengaturan lama.',
      'Lakukan konfigurasi awal (bahasa, koneksi Wi-Fi, akun, dsb.) hingga masuk ke halaman awal (home screen).',
      'Setelah seluruh proses setup selesai, buat dan lengkapi Form Serah Terima HP.',
      'Berikan Label pada Box HP dan belakang HP sesuai standar penamaan inventaris perusahaan.',
      'Update Master Data Aset Management dengan informasi unit HP yang telah disiapkan.',
      'Proses setup selesai dan unit HP siap diserahkan kepada User.'
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
    summary: 'Panduan Operasional Standar (SOP) penanganan permintaan kode cadangan verifikasi 2 langkah (2-Step Verification) akun Google Workspace atas permintaan PBX / People & Culture.',
    problemContext: 'Tim People & Culture (PBX) atau atasan memohon kode verifikasi cadangan (Backup Verification Codes) untuk membantu akses masuk (login) akun Google Workspace milik anggota tim/subordinat yang mengalami kendala otentikasi.',
    actionSteps: [
      'Buka dan login ke portal Google Admin Console menggunakan akun Administrator berwenang.',
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
    isCustom: false
  },
  {
    id: 'google-workspace-02',
    title: 'SOP Permintaan Reset Password Akun Google Workspace Karyawan',
    category: 'workplace',
    severity: 'medium',
    tags: ['google-workspace', 'reset-password', 'security', 'admin-console', 'pbx', 'default-password'],
    summary: 'Panduan Operasional Standar (SOP) penanganan permintaan reset kata sandi (reset password) akun Google Workspace karyawan yang mengalami lupa password atau atas permintaan PBX.',
    problemContext: 'Perwakilan People & Culture (PBX) atau atasan mengajukan permohonan reset kata sandi (password reset) untuk anggota tim/subordinat yang lupa password atau tidak bisa mengakses akun Google Workspace perusahaan.',
    actionSteps: [
      'Buka dan login ke portal Google Admin Console menggunakan akun Administrator berwenang.',
      'Cari nama atau alamat email pengguna (User) yang akan di-reset pada kolom pencarian utama atau navigasi Directory > Users.',
      'Klik tombol Reset Password pada panel profil akun pengguna tersebut.',
      'Pilih metode Create Password (buat kata sandi secara manual).',
      'Masukkan kata sandi default resmi perusahaan yaitu Essensians@2026 pada kolom password baru.',
      'Pastikan untuk mencentang opsi "Ask user to change their password when they sign in" agar pengguna wajib memperbarui kata sandi saat pertama kali login kembali.',
      'Klik tombol Reset untuk mengeksekusi perbaikan, kemudian kabarkan password sementara tersebut secara aman kepada pihak PBX / pemohon berwenang.'
    ],
    dosAndDonts: {
      dos: [
        'Wajib mencentang opsi Ask user to change their password when they sign in agar kata sandi baru segera diubah oleh pemilik akun.',
        'Gunakan password default resmi perusahaan (Essensians@2026) untuk konsistensi prosedur IT Support.'
      ],
      donts: [
        'Jangan membagikan kata sandi baru pada grup obrolan publik; selalu kirimkan secara privat (Direct Message) kepada pihak PBX.',
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

const cases = ref([...DEFAULT_CASES]);
const activeCaseId = ref(DEFAULT_CASES[0]?.id || '');
const selectedCategory = ref('all');
const selectedSeverity = ref('all');
const searchQuery = ref('');
const recentSearches = ref(JSON.parse(localStorage.getItem('esb_recent_searches') || '[]'));
const isLoading = ref(false);

// Drawer state
const isDrawerOpen = ref(false);
const drawerMode = ref('create'); // 'create' | 'edit'
const editingCase = ref(null);

export function useCases() {
  const { showToast } = useToast();

  async function fetchCases() {
    isLoading.value = true;
    try {
      const res = await api.getCases();
      if (res && Array.isArray(res.data)) {
        cases.value = res.data;
      }
    } catch (err) {
      console.warn('Using local fallback case data:', err.message);
    } finally {
      isLoading.value = false;
    }
  }

  const filteredCases = computed(() => {
    return cases.value.filter((c) => {
      const matchCategory = selectedCategory.value === 'all' || c.category === selectedCategory.value;
      if (!matchCategory) return false;

      if (!searchQuery.value.trim()) return true;

      const q = searchQuery.value.toLowerCase().trim();
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchSummary = (c.summary || '').toLowerCase().includes(q);
      const matchContext = (c.problemContext || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(c.tags) && c.tags.some((t) => (t || '').toLowerCase().includes(q));

      return matchTitle || matchSummary || matchContext || matchTags;
    });
  });

  const activeCase = computed(() => {
    return cases.value.find((c) => c.id === activeCaseId.value) || filteredCases.value[0] || cases.value[0] || null;
  });

  function selectCase(id) {
    activeCaseId.value = id;
  }

  function setCategory(cat) {
    selectedCategory.value = cat;
  }

  function setSeverity(sev) {
    selectedSeverity.value = sev;
  }

  function setSearch(query) {
    searchQuery.value = query;
    if (query.trim() && !recentSearches.value.includes(query.trim())) {
      recentSearches.value = [query.trim(), ...recentSearches.value.slice(0, 4)];
      localStorage.setItem('esb_recent_searches', JSON.stringify(recentSearches.value));
    }
  }

  function clearSearch() {
    searchQuery.value = '';
  }

  function clearRecentSearches() {
    recentSearches.value = [];
    localStorage.removeItem('esb_recent_searches');
  }

  function openCreateDrawer() {
    drawerMode.value = 'create';
    editingCase.value = {
      title: '',
      category: 'hardware',
      severity: 'medium',
      tags: [],
      summary: '',
      problemContext: '',
      actionSteps: [],
      dosAndDonts: { dos: [], donts: [] },
      snippets: []
    };
    isDrawerOpen.value = true;
  }

  function openEditDrawer(caseItem) {
    drawerMode.value = 'edit';
    editingCase.value = JSON.parse(JSON.stringify(caseItem));
    isDrawerOpen.value = true;
  }

  function closeDrawer() {
    isDrawerOpen.value = false;
    editingCase.value = null;
  }

  async function saveCase(formData) {
    try {
      const exists = Boolean(formData.id && cases.value.some((c) => c.id === formData.id));
      const isCreate = !formData.id || (!exists && drawerMode.value !== 'edit');

      if (isCreate) {
        const id = formData.id || `faq-${Date.now().toString(36)}`;
        const payload = { ...formData, id, isCustom: formData.isCustom !== undefined ? formData.isCustom : true };
        
        const res = await api.createCase(payload);
        const savedData = res?.data || payload;

        const existingIdx = cases.value.findIndex((c) => c.id === id);
        if (existingIdx !== -1) {
          cases.value[existingIdx] = savedData;
        } else {
          cases.value.unshift(savedData);
        }

        activeCaseId.value = id;
        showToast('Artikel FAQ baru berhasil disimpan ke database!', 'success');
        closeDrawer();
        return savedData;
      } else {
        const id = formData.id;
        const res = await api.updateCase(id, formData);
        const savedData = res?.data || { ...formData };

        const idx = cases.value.findIndex((c) => c.id === id);
        if (idx !== -1) {
          cases.value[idx] = savedData;
        }
        showToast('Perubahan artikel berhasil disimpan ke database!', 'success');
        closeDrawer();
        return savedData;
      }
    } catch (err) {
      console.error('API save error:', err);
      showToast('Gagal menyimpan ke database: ' + (err.message || 'Error'), 'error');
      throw err;
    }
  }

  async function deleteCase(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus case ini?')) return false;

    try {
      try {
        await api.deleteCase(id);
      } catch (e) {
        console.warn('API delete error fallback to local state:', e.message);
      }

      cases.value = cases.value.filter((c) => c.id !== id);
      if (activeCaseId.value === id) {
        activeCaseId.value = cases.value[0]?.id || '';
      }
      showToast('Case berhasil dihapus.', 'info');
      closeDrawer();
      return true;
    } catch (err) {
      showToast(err.message || 'Gagal menghapus case.', 'error');
      return false;
    }
  }

  return {
    cases,
    activeCaseId,
    activeCase,
    selectedCategory,
    selectedSeverity,
    searchQuery,
    recentSearches,
    filteredCases,
    isLoading,
    isDrawerOpen,
    drawerMode,
    editingCase,
    fetchCases,
    selectCase,
    setCategory,
    setSeverity,
    setSearch,
    clearSearch,
    clearRecentSearches,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    saveCase,
    deleteCase
  };
}
