<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCases } from '@/composables/useCases';

const router = useRouter();
const { cases, setSearch, setCategory } = useCases();

const localSearch = ref('');
const isInputFocused = ref(false);
const openFaqId = ref('faq-1');

const liveSuggestions = computed(() => {
  if (!localSearch.value.trim()) return [];
  const q = localSearch.value.toLowerCase().trim();
  return cases.value
    .filter((c) => (c.title || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q))
    .slice(0, 5);
});

const featuredCases = computed(() => cases.value.slice(0, 4));

const quickStats = computed(() => {
  const total = cases.value.length;
  const hardware = cases.value.filter((c) => c.category === 'hardware').length;
  const workplace = cases.value.filter((c) => c.category === 'workplace').length;
  const highSev = cases.value.filter((c) => (c.severity || '').toLowerCase() === 'high').length;
  return { total, hardware, workplace, highSev };
});

function handleSearchSubmit() {
  if (localSearch.value.trim()) {
    setSearch(localSearch.value.trim());
  }
  router.push('/cases');
}

function handlePopularClick(query) {
  setSearch(query);
  router.push('/cases');
}

function handleCategoryNavigate(categoryKey) {
  setCategory(categoryKey);
  router.push('/cases');
}

function toggleFaq(id) {
  openFaqId.value = openFaqId.value === id ? null : id;
}

// Hide suggestions on blur, delayed so mousedown on a suggestion still fires first.
function blurSuggestions() {
  setTimeout(() => { isInputFocused.value = false; }, 150);
}

function severityClasses(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'high' || s === 'critical')
    return { pill: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', dot: 'bg-[#B91C1C] dark:bg-rose-400' };
  if (s === 'medium')
    return { pill: 'bg-[#FEF9C3] text-[#854D0E] border-[#FDE047] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', dot: 'bg-[#854D0E] dark:bg-amber-400' };
  return { pill: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-[#15803D] dark:bg-emerald-400' };
}

const topicCards = [
  { id: 'hardware', title: 'Hardware & Perangkat', description: 'Permintaan laptop baru, perbaikan PC, laporan fisik printer, dan stok HP.', icon: 'laptop', badge: 'Hardware' },
  { id: 'software', title: 'Software & Lisensi', description: 'Instalasi aplikasi standar, lisensi software, standarisasi PR, dan runtime fix.', icon: 'apps', badge: 'Software' },
  { id: 'workplace', title: 'Akses & Keamanan', description: 'Reset password Google Workspace, verifikasi 2-Step (2SV), dan otorisasi hak akses.', icon: 'shield', badge: 'Security' },
  { id: 'environment', title: 'Jaringan & Wi-Fi', description: 'Konfigurasi VPN kantor, bypass OOBE Windows, koneksi Wi-Fi cabang, dan proxy.', icon: 'wifi', badge: 'Network' },
  { id: 'workplace', title: 'Sistem Karyawan & HR', description: 'Akses portal payroll, komunikasi PBX, onboarding karyawan baru, dan pelacakan aset.', icon: 'apartment', badge: 'HR / Workplace' },
  { id: 'backend', title: 'Infrastruktur & Server', description: 'Perangkat ruang rapat, pemeliharaan server database, dan relokasi meja kerja.', icon: 'dns', badge: 'Infrastructure' },
];

const popularTags = [
  { label: 'Password Reset', q: 'Password Reset' },
  { label: 'VPN Setup', q: 'VPN Setup' },
  { label: 'Setup Laptop', q: 'Setup Laptop' },
];

const stats = computed(() => [
  { label: 'Total SOP', value: quickStats.value.total, icon: 'menu_book', tint: 'text-[#2563EB] dark:text-blue-400', bg: 'bg-[#EFF6FF] dark:bg-slate-800' },
  { label: 'Hardware', value: quickStats.value.hardware, icon: 'devices', tint: 'text-[#059669] dark:text-emerald-400', bg: 'bg-[#ECFDF5] dark:bg-emerald-950/40' },
  { label: 'Workplace', value: quickStats.value.workplace, icon: 'badge', tint: 'text-[#0284C7] dark:text-sky-400', bg: 'bg-[#F0F9FF] dark:bg-sky-950/40' },
  { label: 'Prioritas', value: quickStats.value.highSev, icon: 'priority_high', tint: 'text-[#DC2626] dark:text-rose-400', bg: 'bg-[#FEF2F2] dark:bg-rose-950/40' },
]);

const faqs = [
  {
    id: 'faq-1',
    question: 'Bagaimana cara melakukan reset password akun Google Workspace karyawan?',
    summary: 'Anda dapat mereset kata sandi akun karyawan melalui Google Admin Console sesuai SOP resmi:',
    steps: [
      'Buka Google Admin Console di browser (admin.google.com).',
      'Cari nama atau email karyawan pada menu Directory > Users.',
      'Klik tombol "Reset Password" dan pilih opsi buat kata sandi secara manual.',
      'Gunakan kata sandi default resmi perusahaan: Essensians@2026.',
      'Pastikan mencentang "Ask user to change their password when they sign in" sebelum menyimpan.'
    ],
    actionText: 'Buka Portal Admin',
    actionLink: 'https://admin.google.com/'
  },
  {
    id: 'faq-2',
    question: 'Bagaimana cara bypass akun Microsoft saat setup laptop Windows baru (OOBE)?',
    summary: 'Untuk membuat akun lokal tanpa login akun Microsoft online saat layar koneksi jaringan:',
    steps: [
      'Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) di keyboard untuk membuka Command Prompt (CMD).',
      'Ketikkan perintah oobe\\bypassnro lalu tekan Enter.',
      'Laptop akan restart otomatis dan menampilkan opsi setup Local Account offline.'
    ],
    code: 'oobe\\bypassnro'
  },
  {
    id: 'faq-3',
    question: 'Bagaimana prosedur meminta kode verifikasi cadangan 2-Step Verification (2SV)?',
    summary: 'Untuk mendukung verifikasi tim setelah konfirmasi resmi dari pihak People & Culture (PBX):',
    steps: [
      'Buka Google Admin Console dan cari profil pengguna yang bersangkutan.',
      'Masuk ke menu Security > 2-Step Verification > Get Backup Verification Codes.',
      'Salin minimal 2 (dua) kode verifikasi cadangan.',
      'Kirimkan kode tersebut secara aman via Direct Message kepada pihak PBX berwenang.'
    ]
  },
  {
    id: 'faq-4',
    question: 'Apa langkah darurat jika HP atau Laptop perusahaan hilang / dicuri?',
    isEmergency: true,
    emergencyTitle: 'Tindakan Darurat Diperlukan',
    emergencyText: 'Jika perangkat kerja hilang atau dicuri, segera laporkan ke Tim IT Support & Security Operations Center (SOC).',
    details: 'Tim IT akan segera mengeksekusi perintah Remote Wipe via Endpoint Management untuk melindungi data perusahaan.'
  }
];
</script>

<template>
  <main class="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">

    <!-- ═══════════════════════════════════════════
         HERO — Search-first, calm, enterprise
         ═══════════════════════════════════════════ -->
    <section
      class="relative overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
    >
      <!-- Subtle ambient brand tint (barely visible) -->
      <div aria-hidden="true" class="absolute inset-x-0 -top-24 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.08),_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_70%)] pointer-events-none"></div>

      <div class="relative flex flex-col items-center text-center gap-5 max-w-2xl mx-auto px-5 py-10 sm:px-8 sm:py-14">
        <!-- Brand badge (calm blue, tiny orange dot as ESB signature) -->
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 text-[11px] font-bold border border-[#2563EB]/15 dark:border-slate-700">
          <span class="w-1.5 h-1.5 rounded-full bg-[#FC841B]"></span>
          <span>Pusat Bantuan &amp; Playbook Insiden IT ESB</span>
        </div>

        <div class="space-y-2">
          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-[1.15]">
            Apa yang dapat kami bantu hari ini?
          </h1>
          <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
            Cari prosedur operasional standar (SOP), panduan jaringan, reset password, dan incident playbook secara cepat.
          </p>
        </div>

        <!-- Search input — the hero focal point -->
        <div class="w-full relative mt-1">
          <form @submit.prevent="handleSearchSubmit" class="relative">
            <span class="material-symbols-outlined absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-[20px] sm:text-[22px] text-[#64748B] dark:text-slate-400 pointer-events-none">search</span>
            <input
              v-model="localSearch"
              @focus="isInputFocused = true"
              @blur="blurSuggestions"
              type="text"
              class="w-full h-12 sm:h-13 pl-11 sm:pl-12 pr-20 sm:pr-24 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm sm:text-[15px] font-semibold text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#2563EB] dark:focus:border-blue-500 focus:ring-4 focus:ring-[#2563EB]/10 dark:focus:ring-blue-500/20 focus:outline-none transition-all shadow-sm"
              placeholder="Ketik kata kunci pencarian SOP, artikel, atau kode insiden..."
              autocomplete="off"
              aria-label="Cari SOP dan artikel bantuan"
            />
            <div class="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                v-if="localSearch"
                type="button"
                @click="localSearch = ''"
                class="p-1 text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded transition-colors"
                aria-label="Bersihkan pencarian"
              >
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
              <kbd
                v-else
                class="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-[#475569] dark:text-slate-400 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded shadow-2xs"
              >
                Ctrl K
              </kbd>
            </div>
          </form>

          <!-- Live autocomplete -->
          <div
            v-if="liveSuggestions.length > 0 && isInputFocused"
            class="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30 text-left divide-y divide-[#F1F5F9] dark:divide-slate-800"
          >
            <button
              v-for="sug in liveSuggestions"
              :key="sug.id"
              type="button"
              @mousedown.prevent="setSearch(sug.title); router.push('/cases')"
              class="w-full px-4 py-3 hover:bg-[#EFF6FF] dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-xs text-[#0F172A] dark:text-slate-100 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2.5 truncate min-w-0">
                <span class="material-symbols-outlined text-[18px] text-[#2563EB] dark:text-blue-400 shrink-0">search</span>
                <span class="font-semibold truncate">{{ sug.title }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[9.5px] bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-400 uppercase font-bold shrink-0">
                {{ sug.category }}
              </span>
            </button>
          </div>
        </div>

        <!-- Popular tags -->
        <div class="flex flex-wrap justify-center items-center gap-2 pt-1">
          <span class="font-semibold text-[#64748B] dark:text-slate-400 text-[11px]">Pencarian Populer:</span>
          <button
            v-for="tag in popularTags"
            :key="tag.q"
            type="button"
            @click="handlePopularClick(tag.q)"
            class="px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 font-semibold text-[11px] hover:bg-[#2563EB] hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer border border-[#2563EB]/15 dark:border-slate-700"
          >
            {{ tag.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════
         QUICK STATS — calm data strip
         ═══════════════════════════════════════════ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:border-[#CBD5E1] dark:hover:border-slate-700 transition-all flex items-center gap-3"
      >
        <div
          class="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg"
          :class="[stat.bg, stat.tint]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[18px] sm:text-[20px]">{{ stat.icon }}</span>
        </div>
        <div class="min-w-0">
          <p class="text-[10px] sm:text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">{{ stat.label }}</p>
          <span class="font-num block text-[20px] sm:text-[24px] font-bold leading-none tracking-tight text-[#0F172A] dark:text-white mt-1.5">{{ stat.value }}</span>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         CATEGORIES
         ═══════════════════════════════════════════ -->
    <section class="space-y-4">
      <div class="flex items-end justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">Kategori Layanan &amp; SOP</h2>
          <p class="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Pilih domain panduan untuk membaca artikel operasional lengkap</p>
        </div>
        <RouterLink
          to="/cases"
          class="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#2563EB] dark:text-blue-400 bg-[#EFF6FF] dark:bg-slate-800 px-3.5 py-1.5 rounded-full hover:bg-[#DBEAFE] dark:hover:bg-slate-700 hover:text-[#1D4ED8] dark:hover:text-blue-300 transition-colors"
        >
          <span>Lihat Semua</span>
          <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </RouterLink>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="card in topicCards"
          :key="card.title"
          type="button"
          class="text-left bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 flex flex-col gap-3.5 shadow-sm hover:shadow-md hover:border-[#2563EB]/40 dark:hover:border-blue-500/40 transition-all duration-200 group cursor-pointer"
          @click="handleCategoryNavigate(card.id)"
        >
          <div class="flex items-start justify-between">
            <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 group-hover:bg-[#2563EB] group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white transition-colors">
              <span class="material-symbols-outlined text-[20px]">{{ card.icon }}</span>
            </span>
            <span class="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 rounded border border-[#E2E8F0] dark:border-slate-700">
              {{ card.badge }}
            </span>
          </div>

          <div class="space-y-1">
            <h3 class="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
              {{ card.title }}
            </h3>
            <p class="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed font-medium">
              {{ card.description }}
            </p>
          </div>

          <div class="pt-2.5 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#2563EB] dark:text-blue-400">
            <span>Buka SOP</span>
            <span class="material-symbols-outlined text-[15px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </button>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════
         FEATURED SOP TABLE
         ═══════════════════════════════════════════ -->
    <section
      class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div class="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-[#F1F5F9] dark:border-slate-800">
        <div class="min-w-0">
          <h3 class="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">Dokumen SOP Utama</h3>
          <p class="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Prosedur Operasional Standar yang paling sering dirujuk</p>
        </div>
        <RouterLink
          to="/cases"
          class="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#2563EB] dark:text-blue-400 bg-[#EFF6FF] dark:bg-slate-800 px-3.5 py-1.5 rounded-full hover:bg-[#DBEAFE] dark:hover:bg-slate-700 hover:text-[#1D4ED8] dark:hover:text-blue-300 transition-colors"
        >
          Direktori SOP
          <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Desktop: table (sm and up) -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-[#F1F5F9] dark:border-slate-800">
              <th class="text-left text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide py-3 px-6">Judul Dokumen SOP</th>
              <th class="text-left text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide py-3 px-6 w-28">Kategori</th>
              <th class="text-left text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide py-3 px-6 w-28">Prioritas</th>
              <th class="text-right text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide py-3 px-6 w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in featuredCases"
              :key="c.id"
              class="border-b border-[#F8FAFC] dark:border-slate-800/60 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors duration-150"
            >
              <td class="py-3.5 px-6">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="material-symbols-outlined text-[19px] text-[#2563EB] dark:text-blue-400 flex-shrink-0" style="opacity: 0.75">description</span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-[#0F172A] dark:text-white leading-tight truncate">{{ c.title }}</p>
                    <p class="text-xs text-[#64748B] dark:text-slate-400 truncate max-w-md mt-0.5">{{ c.summary }}</p>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-6">
                <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.01em] bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700">
                  <span class="h-1.5 w-1.5 rounded-full bg-[#1E40AF] dark:bg-blue-400"></span>
                  {{ c.category }}
                </span>
              </td>
              <td class="py-3.5 px-6">
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.01em] capitalize"
                  :class="severityClasses(c.severity).pill"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="severityClasses(c.severity).dot"></span>
                  {{ c.severity }}
                </span>
              </td>
              <td class="py-3.5 px-6 text-right">
                <button
                  type="button"
                  @click="setSearch(c.title); router.push('/cases')"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] dark:text-blue-400 bg-[#EFF6FF] dark:bg-slate-800 px-3 py-1.5 rounded-full hover:bg-[#2563EB] hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  Baca
                  <span class="material-symbols-outlined text-[14px]">menu_book</span>
                </button>
              </td>
            </tr>
            <tr v-if="featuredCases.length === 0">
              <td colspan="4" class="py-10 text-center">
                <span class="material-symbols-outlined text-[28px] text-[#CBD5E1] dark:text-slate-600">folder_off</span>
                <p class="text-sm text-[#64748B] dark:text-slate-400 mt-1">Belum ada data SOP tersedia.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: stacked card list (below sm) -->
      <div class="sm:hidden divide-y divide-[#F1F5F9] dark:divide-slate-800">
        <div
          v-for="c in featuredCases"
          :key="c.id"
          class="p-4 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors"
        >
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-[19px] text-[#2563EB] dark:text-blue-400 flex-shrink-0 mt-0.5" style="opacity: 0.75">description</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-[#0F172A] dark:text-white leading-snug">{{ c.title }}</p>
              <p class="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{{ c.summary }}</p>
              <div class="flex items-center gap-2 mt-2.5">
                <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.01em] bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700">
                  {{ c.category }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.01em] capitalize"
                  :class="severityClasses(c.severity).pill"
                >
                  {{ c.severity }}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            @click="setSearch(c.title); router.push('/cases')"
            class="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2563EB] dark:text-blue-400 bg-[#EFF6FF] dark:bg-slate-800 px-3 py-2 rounded-lg hover:bg-[#2563EB] hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            Baca SOP
            <span class="material-symbols-outlined text-[14px]">menu_book</span>
          </button>
        </div>
        <div v-if="featuredCases.length === 0" class="p-8 text-center">
          <span class="material-symbols-outlined text-[28px] text-[#CBD5E1] dark:text-slate-600">folder_off</span>
          <p class="text-sm text-[#64748B] dark:text-slate-400 mt-1">Belum ada data SOP tersedia.</p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════
         FAQ
         ═══════════════════════════════════════════ -->
    <section class="max-w-3xl mx-auto w-full flex flex-col gap-5">
      <div class="text-center space-y-1">
        <h2 class="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
          Pertanyaan Umum (FAQ)
        </h2>
        <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">Solusi cepat untuk kendala operasional yang paling sering ditanyakan</p>
      </div>

      <div class="flex flex-col gap-3">
        <div
          v-for="faq in faqs"
          :key="faq.id"
          class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <button
            type="button"
            @click="toggleFaq(faq.id)"
            class="w-full flex justify-between items-center gap-3 p-4 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
            :aria-expanded="openFaqId === faq.id"
          >
            <span class="text-xs sm:text-[13px] font-bold text-[#0F172A] dark:text-white">
              {{ faq.question }}
            </span>
            <span
              class="material-symbols-outlined text-[20px] text-[#64748B] dark:text-slate-400 shrink-0 transition-transform duration-300"
              :class="{ 'rotate-180 text-[#2563EB] dark:text-blue-400': openFaqId === faq.id }"
            >
              keyboard_arrow_down
            </span>
          </button>

          <div
            v-if="openFaqId === faq.id"
            class="px-4 pb-4 text-xs sm:text-[13px] text-[#475569] dark:text-slate-300 border-t border-[#F1F5F9] dark:border-slate-800 pt-3 space-y-2.5 font-medium"
          >
            <p v-if="faq.summary" class="leading-relaxed font-semibold">{{ faq.summary }}</p>

            <ol v-if="faq.steps" class="list-decimal pl-5 space-y-1 leading-relaxed">
              <li v-for="(step, stepIdx) in faq.steps" :key="stepIdx">{{ step }}</li>
            </ol>

            <div v-if="faq.code" class="p-3 bg-[#0F172A] dark:bg-black text-emerald-400 rounded-lg font-mono text-xs shadow-inner overflow-x-auto">
              <code>{{ faq.code }}</code>
            </div>

            <div
              v-if="faq.isEmergency"
              class="bg-[#FEF2F2] dark:bg-rose-950/40 text-[#B91C1C] dark:text-rose-200 p-3 rounded-lg border border-[#FECACA] dark:border-rose-800 flex flex-col gap-1.5"
            >
              <div class="flex items-center gap-2 font-bold text-xs uppercase text-[#B91C1C] dark:text-rose-300">
                <span class="material-symbols-outlined text-[16px]">warning</span>
                <span>{{ faq.emergencyTitle }}</span>
              </div>
              <p class="leading-relaxed font-bold text-xs">{{ faq.emergencyText }}</p>
              <p class="text-[11px] opacity-90">{{ faq.details }}</p>
            </div>

            <div v-if="faq.actionLink" class="pt-1">
              <a
                :href="faq.actionLink"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-3.5 py-1.5 rounded-lg transition-colors shadow-xs"
              >
                <span>{{ faq.actionText }}</span>
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════
         BOTTOM CTA
         ═══════════════════════════════════════════ -->
    <section
      class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <div class="text-center sm:text-left min-w-0">
        <h4 class="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white">Perlu bantuan lebih lanjut atau penanganan tiket?</h4>
        <p class="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Buka direktori lengkap SOP atau masuk ke dashboard monitoring tiket</p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2 shrink-0">
        <button
          type="button"
          @click="router.push('/cases')"
          class="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span class="material-symbols-outlined text-[15px]">folder_open</span>
          <span>Jelajahi SOP</span>
        </button>
        <button
          type="button"
          @click="router.push('/dashboard')"
          class="bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#F8FAFC] dark:hover:bg-slate-700 hover:border-[#CBD5E1] dark:hover:border-slate-600 transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[15px] text-[#2563EB] dark:text-blue-400">dns</span>
          <span>Dashboard Monitoring</span>
        </button>
      </div>
    </section>

  </main>
</template>
