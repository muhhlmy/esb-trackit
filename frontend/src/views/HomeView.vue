<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import {
  Search,
  Laptop,
  AppWindow,
  ShieldCheck,
  Wifi,
  Building2,
  Server,
  ChevronDown,
  AlertTriangle,
  FolderOpen,
  ExternalLink,
  X,
  ArrowRight,
  BookOpen,
  Lock,
  Mail,
  Monitor,
  Headphones,
  Zap,
  Boxes,
  Ticket,
  ChevronRight,
  ArrowUpRight
} from 'lucide-vue-next';

const router = useRouter();
const { cases, setSearch, setCategory } = useCases();
const { isCrudUnlocked } = useAuth();

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

const featuredCases = computed(() => {
  return cases.value.slice(0, 5);
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

function handleQuickLinkClick(ql) {
  if (ql.isTicketLink) {
    router.push('/dashboard');
  } else {
    setSearch(ql.query);
    router.push('/cases');
  }
}

function getSeverityBadge(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'high' || s === 'critical') return { text: 'Tinggi', bg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' };
  if (s === 'medium') return { text: 'Sedang', bg: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' };
  return { text: 'Rendah', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' };
}

// Quick Access Items
const quickLinks = [
  { label: 'Reset password akun Google Workspace', icon: Lock, query: 'Password Reset' },
  { label: 'Update email & kredensial perusahaan', icon: Mail, query: 'Google Workspace' },
  { label: 'Bypass OOBE akun Microsoft laptop baru', icon: Monitor, query: 'Bypass OOBE' },
  { label: 'Permintaan unit laptop & HP stock baru', icon: Laptop, query: 'Hardware Request' },
  { label: 'Buka tiket / hubungi tim helpdesk IT', icon: Headphones, isTicketLink: true }
];

// Enterprise Categories
const topicCards = [
  {
    id: 'workplace',
    title: 'Account & Access',
    description: 'Reset password, Google Workspace, verifikasi 2SV, dan otorisasi hak akses.',
    icon: ShieldCheck,
    badge: 'Akun & Security',
    count: 4
  },
  {
    id: 'hardware',
    title: 'Devices & Hardware',
    description: 'Permintaan laptop baru, perbaikan PC, printer kantor, dan stok HP.',
    icon: Laptop,
    badge: 'Perangkat',
    count: 3
  },
  {
    id: 'environment',
    title: 'Network & Security',
    description: 'Konfigurasi VPN kantor, bypass OOBE Windows, Wi-Fi cabang, dan proxy.',
    icon: Wifi,
    badge: 'Jaringan',
    count: 5
  },
  {
    id: 'software',
    title: 'Software & Tools',
    description: 'Instalasi aplikasi standar, lisensi software, standarisasi PR, dan runtime fix.',
    icon: AppWindow,
    badge: 'Software',
    count: 3
  },
  {
    id: 'workplace',
    title: 'HR Systems & PBX',
    description: 'Akses portal payroll, komunikasi PBX, onboarding karyawan baru, dan aset.',
    icon: Building2,
    badge: 'HR & Work',
    count: 2
  },
  {
    id: 'backend',
    title: 'IT Infrastructure',
    description: 'Perangkat ruang rapat, pemeliharaan server database, dan relokasi desk.',
    icon: Server,
    badge: 'Server & Infra',
    count: 2
  }
];

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
    code: 'oobe\bypassnro'
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
  <div class="page-home-command-center min-h-screen bg-[#F5F7FA] dark:bg-slate-950 text-[#2A3547] dark:text-slate-100 transition-colors duration-200">
    
    <main class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      
      <!-- 1. COMPACT ENTERPRISE HERO / SEARCH AREA (100% LIGHT MODE WHITE CARD, 250-320px) -->
      <section class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#ECF2FF] text-[#5D87FF] dark:bg-indigo-950/60 dark:text-indigo-300 rounded border border-[#5D87FF]/20">
              ESB TrackIT Help Center
            </span>
            <span class="text-xs text-[#7C8BAC] dark:text-slate-400 font-medium hidden sm:inline">&bull; Command Center &amp; Incident Playbook</span>
          </div>

          <div class="flex items-center gap-2 text-xs font-bold text-[#5D87FF]">
            <RouterLink to="/cases" class="hover:underline flex items-center gap-1">
              <span>Direktori SOP Kompleks</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </RouterLink>
          </div>
        </div>

        <div class="space-y-1">
          <h1 class="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            How can we help?
          </h1>
          <p class="text-xs text-[#64748B] dark:text-slate-400 font-medium">
            Cari panduan operasional standar (SOP), verifikasi akun, konfigurasi jaringan, dan penanganan insiden IT.
          </p>
        </div>

        <!-- Prominent Search Bar (Compact h-11 Enterprise Input) -->
        <div class="w-full relative">
          <form @submit.prevent="handleSearchSubmit" class="flex items-center gap-2">
            <div class="relative flex-1 flex items-center">
              <Search class="absolute left-3.5 w-4 h-4 text-[#5D87FF] pointer-events-none" />
              <input
                v-model="localSearch"
                @focus="isInputFocused = true"
                type="text"
                class="w-full h-11 pl-10 pr-10 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5EAEF] dark:border-slate-800 rounded-lg text-xs font-bold text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#5D87FF] focus:outline-none transition-all shadow-2xs"
                placeholder="Cari panduan, SOP, atau solusi untuk masalah IT Anda..."
                autocomplete="off"
              />
              <button
                v-if="localSearch"
                type="button"
                @click="localSearch = ''"
                class="absolute right-3 p-1 text-[#7C8BAC] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="submit"
              class="h-11 px-5 bg-[#5D87FF] hover:bg-[#4570EA] text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
            >
              <span>Search</span>
            </button>
          </form>

          <!-- Live Autocomplete Suggestions -->
          <div
            v-if="liveSuggestions.length > 0 && isInputFocused"
            class="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white rounded-xl shadow-lg overflow-hidden z-30 text-left divide-y divide-[#F1F5F9] dark:divide-slate-800 border border-[#E5EAEF] dark:border-slate-800"
          >
            <button
              v-for="sug in liveSuggestions"
              :key="sug.id"
              @mousedown="setSearch(sug.title); router.push('/cases')"
              class="w-full p-3 hover:bg-[#ECF2FF] dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2.5 truncate mr-3">
                <Search class="w-3.5 h-3.5 text-[#5D87FF] shrink-0" />
                <span class="font-bold truncate">{{ sug.title }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[9.5px] bg-[#ECF2FF] text-[#5D87FF] dark:bg-slate-800 dark:text-indigo-300 font-extrabold uppercase shrink-0">
                {{ sug.category }}
              </span>
            </button>
          </div>
        </div>

        <!-- Popular Tag Chips -->
        <div class="flex flex-wrap items-center gap-2 text-xs pt-0.5">
          <span class="text-[#7C8BAC] dark:text-slate-400 font-bold text-[11px]">Pencarian Populer:</span>
          <button
            @click="handlePopularClick('Password Reset')"
            class="px-2.5 py-0.5 rounded bg-[#ECF2FF] text-[#5D87FF] dark:bg-slate-800 dark:text-indigo-300 font-bold text-[11px] hover:bg-[#5D87FF] hover:text-white transition-all cursor-pointer border border-[#5D87FF]/20"
          >
            Password Reset
          </button>
          <button
            @click="handlePopularClick('VPN Setup')"
            class="px-2.5 py-0.5 rounded bg-[#ECF2FF] text-[#5D87FF] dark:bg-slate-800 dark:text-indigo-300 font-bold text-[11px] hover:bg-[#5D87FF] hover:text-white transition-all cursor-pointer border border-[#5D87FF]/20"
          >
            VPN Setup
          </button>
          <button
            @click="handlePopularClick('Setup Laptop')"
            class="px-2.5 py-0.5 rounded bg-[#ECF2FF] text-[#5D87FF] dark:bg-slate-800 dark:text-indigo-300 font-bold text-[11px] hover:bg-[#5D87FF] hover:text-white transition-all cursor-pointer border border-[#5D87FF]/20"
          >
            Hardware Request
          </button>
        </div>

      </section>

      <!-- 2. QUICK LINKS / POPULAR ACCESS BAR -->
      <section class="space-y-2">
        <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#7C8BAC] dark:text-slate-400 flex items-center gap-1.5 px-1">
          <Zap class="w-3.5 h-3.5 text-[#5D87FF]" />
          <span>Quick Links &amp; Solusi Cepat</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div
            v-for="ql in quickLinks"
            :key="ql.label"
            @click="handleQuickLinkClick(ql)"
            class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl p-3 shadow-2xs hover:border-[#5D87FF] hover:bg-[#ECF2FF]/40 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-2.5 group"
          >
            <div class="w-7 h-7 rounded-lg bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] flex items-center justify-center shrink-0 group-hover:bg-[#5D87FF] group-hover:text-white transition-colors">
              <component :is="ql.icon" class="w-3.5 h-3.5" />
            </div>
            <span class="text-xs font-bold text-[#2A3547] dark:text-slate-200 group-hover:text-[#5D87FF] transition-colors truncate">
              {{ ql.label }}
            </span>
          </div>
        </div>
      </section>

      <!-- 3. PLATFORM DESTINATIONS (ASSET MANAGEMENT & TICKETING CARDS IN WHITE & ESB BLUE) -->
      <section class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <div>
            <h2 class="text-sm font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider">
              ESB TrackIT Platform Destinations
            </h2>
            <p class="text-xs text-[#64748B] dark:text-slate-400 font-medium">Pilih sistem utama yang ingin Anda akses di platform ESB TrackIT</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Destination Card 1: Asset Management -->
          <div
            @click="router.push('/assets')"
            class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-[#5D87FF] transition-all group cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center shadow-2xs group-hover:bg-[#5D87FF] group-hover:text-white transition-colors">
                  <Boxes class="w-6 h-6" />
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <h3 class="text-base font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors">
                      Asset Management System
                    </h3>
                  </div>
                  <span class="text-[10px] font-bold text-[#7C8BAC] dark:text-slate-400">Modul Inventaris &amp; Perangkat</span>
                </div>
              </div>

              <span class="px-2 py-0.5 text-[9.5px] font-extrabold uppercase bg-[#ECF2FF] text-[#5D87FF] dark:bg-indigo-950/40 dark:text-indigo-300 rounded border border-[#5D87FF]/20">
                Active Module
              </span>
            </div>

            <p class="text-xs text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
              Kelola inventaris aset IT, alokasi laptop/PC, perangkat kantor, distribusi unit karyawan, dan pantau kondisi fisik perangkat.
            </p>

            <div class="pt-3 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#5D87FF]">
              <span class="flex items-center gap-1">
                <span>Masuk ke Asset Management</span>
                <ArrowUpRight class="w-3.5 h-3.5" />
              </span>
              <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <!-- Destination Card 2: Ticketing System -->
          <div
            @click="router.push('/tickets')"
            class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-[#5D87FF] transition-all group cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center shadow-2xs group-hover:bg-[#5D87FF] group-hover:text-white transition-colors">
                  <Ticket class="w-6 h-6" />
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <h3 class="text-base font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors">
                      Ticketing / Helpdesk System
                    </h3>
                  </div>
                  <span class="text-[10px] font-bold text-[#7C8BAC] dark:text-slate-400">Modul Pelaporan &amp; Support IT</span>
                </div>
              </div>

              <span class="px-2 py-0.5 text-[9.5px] font-extrabold uppercase bg-[#ECF2FF] text-[#5D87FF] dark:bg-indigo-950/40 dark:text-indigo-300 rounded border border-[#5D87FF]/20">
                Active Module
              </span>
            </div>

            <p class="text-xs text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
              Buat tiket keluhan baru, pantau status pengerjaan tim IT, laporkan masalah teknis insiden, dan dapatkan respon cepat.
            </p>

            <div class="pt-3 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#5D87FF]">
              <span class="flex items-center gap-1">
                <span>Masuk ke Ticketing System</span>
                <ArrowUpRight class="w-3.5 h-3.5" />
              </span>
              <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </section>

      <!-- 4. BROWSE KNOWLEDGE BASE CATEGORIES -->
      <section class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <div>
            <h2 class="text-sm font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Browse Knowledge Base Categories
            </h2>
            <p class="text-xs text-[#64748B] dark:text-slate-400 font-medium">Pilih kategori panduan untuk membaca prosedur operasional standar</p>
          </div>
          <button
            @click="router.push('/cases')"
            class="text-xs font-bold text-[#5D87FF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Semua SOP</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="card in topicCards"
            :key="card.title"
            @click="handleCategoryNavigate(card.id)"
            class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md hover:border-[#5D87FF] transition-all group cursor-pointer"
          >
            <div class="flex items-start justify-between">
              <div class="w-10 h-10 rounded-xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center group-hover:bg-[#5D87FF] group-hover:text-white transition-colors">
                <component :is="card.icon" class="w-5 h-5" />
              </div>
              <span class="px-2 py-0.5 text-[9.5px] font-extrabold uppercase bg-[#F8FAFC] dark:bg-slate-800 text-[#7C8BAC] dark:text-slate-400 rounded border border-[#E5EAEF] dark:border-slate-700">
                {{ card.count }} SOPs
              </span>
            </div>

            <div>
              <h3 class="text-sm font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors">
                {{ card.title }}
              </h3>
              <p class="text-xs text-[#64748B] dark:text-slate-400 mt-1 font-medium leading-relaxed">
                {{ card.description }}
              </p>
            </div>

            <div class="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#5D87FF]">
              <span>Buka Dokumen</span>
              <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      <!-- 5. FEATURED SOPS LIST TABLE -->
      <section class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3 transition-colors">
        <div class="flex items-center justify-between border-b border-[#F1F5F9] dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <BookOpen class="w-4 h-4 text-[#5D87FF]" />
            <h2 class="text-sm font-extrabold text-[#0F172A] dark:text-white tracking-tight">Dokumen SOP Utama (Featured SOPs)</h2>
          </div>
          <button
            @click="router.push('/cases')"
            class="text-xs font-bold text-[#5D87FF] hover:underline"
          >
            Lihat Semua SOP
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-[#E5EAEF] dark:border-slate-800 text-[#7C8BAC] dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider bg-[#F8FAFC] dark:bg-slate-800/80">
                <th class="py-2.5 px-3">Judul SOP</th>
                <th class="py-2.5 px-3">Kategori</th>
                <th class="py-2.5 px-3">Prioritas</th>
                <th class="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9] dark:divide-slate-800">
              <tr v-for="c in featuredCases" :key="c.id" class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 transition-colors">
                <td class="py-3 px-3">
                  <div class="font-extrabold text-[#0F172A] dark:text-white text-xs sm:text-sm">{{ c.title }}</div>
                  <div class="text-[11px] text-[#64748B] dark:text-slate-400 truncate max-w-md mt-0.5 font-medium">{{ c.summary }}</div>
                </td>
                <td class="py-3 px-3">
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-[#ECF2FF] text-[#5D87FF] dark:bg-indigo-950/60 dark:text-indigo-300">
                    {{ c.category }}
                  </span>
                </td>
                <td class="py-3 px-3">
                  <span :class="[getSeverityBadge(c.severity).bg, 'px-2 py-0.5 rounded text-[9.5px] font-extrabold border']">
                    {{ getSeverityBadge(c.severity).text }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right">
                  <button
                    @click="setSearch(c.title); router.push('/cases')"
                    class="px-3 py-1 rounded-lg bg-[#5D87FF] hover:bg-[#4570EA] text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    Baca SOP
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 6. FAQ ACCORDIONS -->
      <section class="max-w-4xl mx-auto w-full flex flex-col gap-3 pt-2">
        <div class="text-center space-y-0.5">
          <h2 class="text-lg font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p class="text-xs text-[#64748B] dark:text-slate-400 font-medium">Panduan dan troubleshooting terpopuler di Help Center</p>
        </div>

        <div class="flex flex-col gap-2.5 mt-1">
          <div
            v-for="faq in faqs"
            :key="faq.id"
            class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs transition-colors"
          >
            <button
              @click="toggleFaq(faq.id)"
              class="w-full flex justify-between items-center p-4 bg-white dark:bg-slate-900 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
            >
              <span class="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white pr-4">
                {{ faq.question }}
              </span>
              <ChevronDown
                class="w-4 h-4 text-[#7C8BAC] dark:text-slate-400 shrink-0 transition-transform duration-300"
                :class="{ 'rotate-180 text-[#5D87FF]': openFaqId === faq.id }"
              />
            </button>

            <div
              v-if="openFaqId === faq.id"
              class="px-4 pb-4 bg-white dark:bg-slate-900 text-xs text-[#475569] dark:text-slate-300 border-t border-[#F1F5F9] dark:border-slate-800 pt-3 space-y-2.5 font-medium"
            >
              <p v-if="faq.summary" class="leading-relaxed">
                {{ faq.summary }}
              </p>

              <ol v-if="faq.steps" class="list-decimal pl-5 space-y-1 leading-relaxed">
                <li v-for="(step, idx) in faq.steps" :key="idx">
                  {{ step }}
                </li>
              </ol>

              <div v-if="faq.code" class="p-2.5 bg-[#0F172A] text-emerald-400 rounded-lg font-mono text-xs shadow-inner">
                <code>{{ faq.code }}</code>
              </div>

              <div
                v-if="faq.isEmergency"
                class="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 p-3 rounded-lg border border-rose-200 dark:border-rose-900 flex flex-col gap-1"
              >
                <div class="flex items-center gap-2 font-extrabold text-xs uppercase text-rose-600 dark:text-rose-400">
                  <AlertTriangle class="w-4 h-4" />
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
                  class="bg-[#5D87FF] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#4570EA] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{{ faq.actionText }}</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>

  </div>
</template>
