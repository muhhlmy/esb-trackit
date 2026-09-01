<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import gsap from 'gsap';
import { useGsapContext, isReducedMotion } from '@/composables/useGsap';
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
  ExternalLink,
  X,
  ArrowRight,
  LogIn,
  Ticket,
  Plus,
  Minus,
  HelpCircle,
  Send,
  Clock
} from 'lucide-vue-next';

const router = useRouter();
const { cases, setSearch, setCategory, hasNoSearchResult } = useCases();
const { isAuthenticated, currentUser } = useAuth();

const localSearch = ref('');
const isInputFocused = ref(false);
const openFaqId = ref(null);

const liveSuggestions = computed(() => {
  if (!localSearch.value.trim()) return [];
  const q = localSearch.value.toLowerCase().trim();
  return cases.value
    .filter((c) => (c.title || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q))
    .slice(0, 5);
});

// Featured SOP list dari DB (4 pertama, published, diurutkan sesuai sort_order)
const featuredSopList = computed(() =>
  cases.value.slice(0, 4).map((c, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    id: c.id,
    title: c.title,
    summary: c.summary || '',
    category: c.category || 'general'
  }))
);

function handleSearchSubmit() {
  if (localSearch.value.trim()) {
    setSearch(localSearch.value.trim());
    // Tidak ada case yang cocok → arahkan ke login (atau buat tiket bila sudah login)
    if (hasNoSearchResult.value) {
      router.push(isAuthenticated.value ? '/tickets' : '/login');
      return;
    }
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

function handleSupportTicketAction() {
  if (!isAuthenticated.value) {
    router.push({ path: '/login', query: { redirect: '/tickets' } });
  } else {
    router.push('/tickets');
  }
}

// 6 Cards for Browse Topics matching mockup grid
const topicCards = [
  {
    id: 'hardware',
    title: 'Getting Started',
    description: 'Learn the basics of setting up your IT profile, laptop requests, and connecting tools.',
    icon: Laptop,
    isFeatured: false
  },
  {
    id: 'workplace',
    title: 'Account & Access',
    description: 'Customize your experience with account settings, Google Workspace, 2SV, and permissions.',
    icon: ShieldCheck,
    isFeatured: true
  },
  {
    id: 'backend',
    title: 'Troubleshooting',
    description: 'Resolve common issues, network errors, printer fixes, and runtime system bugs.',
    icon: HelpCircle,
    isFeatured: false
  },
  {
    id: 'environment',
    title: 'Network & VPN',
    description: 'Explore features for VPN configuration, Microsoft OOBE bypass, branch Wi-Fi, and proxy.',
    icon: Wifi,
    isFeatured: false
  },
  {
    id: 'software',
    title: 'Software & Apps',
    description: 'Standard software installation, licenses, PR setup, and application troubleshooting.',
    icon: AppWindow,
    isFeatured: false
  },
  {
    id: 'workplace',
    title: 'Security & Compliance',
    description: 'SOC procedures, endpoint security, remote wipe, and device protection compliance.',
    icon: Building2,
    isFeatured: false
  }
];

const faqs = [
  {
    num: '01',
    id: 'faq-1',
    question: 'How do I reset my Google Workspace password?',
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
    num: '02',
    id: 'faq-2',
    question: 'How do I bypass Microsoft OOBE on new laptops?',
    summary: 'Untuk membuat akun lokal tanpa login akun Microsoft online saat layar koneksi jaringan:',
    steps: [
      'Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) di keyboard untuk membuka Command Prompt (CMD).',
      'Ketikkan perintah oobe\\bypassnro lalu tekan Enter.',
      'Laptop akan restart otomatis dan menampilkan opsi setup Local Account offline.'
    ],
    code: 'oobe\bypassnro'
  },
  {
    num: '03',
    id: 'faq-3',
    question: 'How do I request a 2SV backup code?',
    summary: 'Untuk mendukung verifikasi tim setelah konfirmasi resmi dari pihak People & Culture (PBX):',
    steps: [
      'Buka Google Admin Console dan cari profil pengguna yang bersangkutan.',
      'Masuk ke menu Security > 2-Step Verification > Get Backup Verification Codes.',
      'Salin minimal 2 (dua) kode verifikasi cadangan.',
      'Kirimkan kode tersebut secara aman via Direct Message kepada pihak PBX berwenang.'
    ]
  },
  {
    num: '04',
    id: 'faq-4',
    question: 'What should I do if my company laptop is lost?',
    isEmergency: true,
    emergencyTitle: 'Tindakan Darurat Diperlukan',
    emergencyText: 'Jika perangkat kerja hilang atau dicuri, segera laporkan ke Tim IT Support & Security Operations Center (SOC).',
  }
];

const mainScope = ref(null);

onMounted(async () => {
  fetchCases();
  if (isReducedMotion()) return;
  await nextTick();

  if (!mainScope.value) return;

  gsap.context(() => {
    gsap.fromTo(
      '.gsap-hero-el',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', clearProps: 'all' }
    );

    gsap.fromTo(
      '.gsap-topic-card',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.15, clearProps: 'all' }
    );

    gsap.fromTo(
      '.gsap-sop-item',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', delay: 0.25, clearProps: 'all' }
    );

    gsap.fromTo(
      '.gsap-assistance',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.35, clearProps: 'all' }
    );
  }, mainScope.value);
});
</script>

<template>
  <div ref="mainScope" class="page-home-unified-container min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
    
    <!-- SHARED UNIFIED CONTAINER SYSTEM (max-w-[1200px] mx-auto w-full) -->
    <main class="max-w-[1200px] mx-auto w-full flex flex-col gap-14">
      
      <!-- 1. HERO SECTION: FOCAL SEARCH -->
      <section class="flex flex-col items-center text-center w-full pt-2 pb-2">
        <div class="text-xs font-black uppercase tracking-widest text-[#5D87FF] dark:text-indigo-400 mb-2 gsap-hero-el">
          Help Center
        </div>

        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight max-w-2xl gsap-hero-el">
          What can we help you find?
        </h1>
        
        <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium leading-relaxed mt-2.5 max-w-md gsap-hero-el">
          Search our SOPs, troubleshooting guides, and IT knowledge base.
        </p>

        <!-- Focal Search Input Bar -->
        <div class="w-full relative mt-6 max-w-2xl gsap-hero-el">
          <form @submit.prevent="handleSearchSubmit" class="relative flex items-center">
            <Search class="absolute left-4 w-5 h-5 text-[#5D87FF] pointer-events-none" />
            <input
              v-model="localSearch"
              @focus="isInputFocused = true"
              type="text"
              class="w-full h-14 pl-12 pr-28 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl text-sm font-bold text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:border-[#5D87FF] focus:ring-2 focus:ring-[#5D87FF]/15 focus:outline-none transition-all shadow-sm"
              placeholder="Search the knowledge base..."
              autocomplete="off"
            />
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                v-if="localSearch"
                type="button"
                @click="localSearch = ''"
                class="p-1 text-[#7C8BAC] hover:text-[#0F172A] dark:hover:text-white rounded"
              >
                <X class="w-4 h-4" />
              </button>
              <button
                type="submit"
                class="h-9 px-5 bg-[#5D87FF] hover:bg-[#4570EA] text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Search
              </button>
            </div>
          </form>

          <!-- Live Command Autocomplete Dropdown -->
          <div
            v-if="liveSuggestions.length > 0 && isInputFocused"
            class="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white rounded-xl shadow-xl overflow-hidden z-30 text-left divide-y divide-[#F1F5F9] dark:divide-slate-800 border border-[#E5EAEF] dark:border-slate-800"
          >
            <button
              v-for="sug in liveSuggestions"
              :key="sug.id"
              @mousedown="setSearch(sug.title); router.push('/cases')"
              class="w-full p-3.5 hover:bg-[#ECF2FF] dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2.5 truncate mr-3">
                <Search class="w-4 h-4 text-[#5D87FF] shrink-0" />
                <span class="font-extrabold truncate">{{ sug.title }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[9.5px] bg-[#ECF2FF] text-[#5D87FF] dark:bg-slate-800 dark:text-indigo-300 font-extrabold uppercase shrink-0">
                {{ sug.category }}
              </span>
            </button>
          </div>
        </div>

        <!-- Popular Searches Clean Chips (No Bullets) -->
        <div class="flex flex-wrap justify-center items-center gap-2 text-xs mt-4">
          <span class="text-[#7C8BAC] dark:text-slate-400 font-bold text-xs">Popular searches</span>
          <button
            @click="handlePopularClick('Password Reset')"
            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 text-[#475569] dark:text-slate-300 font-extrabold text-[11px] hover:border-[#5D87FF] hover:text-[#5D87FF] transition-all cursor-pointer shadow-2xs"
          >
            Password Reset
          </button>
          <button
            @click="handlePopularClick('VPN Setup')"
            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 text-[#475569] dark:text-slate-300 font-extrabold text-[11px] hover:border-[#5D87FF] hover:text-[#5D87FF] transition-all cursor-pointer shadow-2xs"
          >
            VPN Setup
          </button>
          <button
            @click="handlePopularClick('Setup Laptop')"
            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 text-[#475569] dark:text-slate-300 font-extrabold text-[11px] hover:border-[#5D87FF] hover:text-[#5D87FF] transition-all cursor-pointer shadow-2xs"
          >
            Hardware Request
          </button>
        </div>
      </section>

      <!-- 2. BROWSE TOPICS: 3-COLUMN CARD GRID -->
      <section class="space-y-4 w-full">
        <div class="flex items-center justify-between border-b border-[#E5EAEF] dark:border-slate-800 pb-3">
          <h2 class="text-xs font-black uppercase tracking-wider text-[#7C8BAC] dark:text-slate-400">
            Browse topics
          </h2>
          <button
            @click="router.push('/cases')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800 dark:text-indigo-300 hover:bg-[#5D87FF] hover:text-white dark:hover:bg-[#5D87FF] dark:hover:text-white transition-all duration-200 cursor-pointer shadow-2xs group"
          >
            <span>Lihat Semua SOP</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <div
            v-for="card in topicCards"
            :key="card.title"
            @click="handleCategoryNavigate(card.id)"
            :class="[
              card.isFeatured
                ? 'bg-[#5D87FF] text-white shadow-lg shadow-[#5D87FF]/25 border border-[#5D87FF]'
                : 'bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 text-[#0F172A] dark:text-white shadow-2xs hover:shadow-md hover:border-[#5D87FF]',
              'rounded-2xl p-7 text-center flex flex-col items-center justify-between gap-5 transition-all duration-200 cursor-pointer group hover:scale-[1.01] gsap-topic-card'
            ]"
          >
            <!-- Icon Box -->
            <div
              :class="[
                card.isFeatured
                  ? 'bg-white/20 text-white'
                  : 'bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] dark:text-indigo-400 group-hover:bg-[#5D87FF] group-hover:text-white',
                'w-12 h-12 rounded-full flex items-center justify-center transition-colors'
              ]"
            >
              <component :is="card.icon" class="w-6 h-6" />
            </div>

            <!-- Title & Description -->
            <div class="space-y-1.5 max-w-xs">
              <h3
                :class="[
                  card.isFeatured ? 'text-white' : 'text-[#0F172A] dark:text-white group-hover:text-[#5D87FF]',
                  'text-base font-extrabold transition-colors'
                ]"
              >
                {{ card.title }}
              </h3>
              <p
                :class="[
                  card.isFeatured ? 'text-white/90' : 'text-[#64748B] dark:text-slate-400',
                  'text-xs font-medium leading-relaxed'
                ]"
              >
                {{ card.description }}
              </p>
            </div>

            <!-- Learn More Link -->
            <div
              :class="[
                card.isFeatured ? 'text-white' : 'text-[#5D87FF]',
                'text-xs font-black inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform'
              ]"
            >
              <span>Learn More</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      <!-- 3. FEATURED CONTENT: NUMBERED EDITORIAL SOP LIST (CLEAN METADATA, NO BULLETS) -->
      <section class="space-y-3 w-full">
        <div class="flex items-center justify-between border-b border-[#E5EAEF] dark:border-slate-800 pb-3">
          <h2 class="text-xs font-black uppercase tracking-wider text-[#7C8BAC] dark:text-slate-400">
            Featured SOPs
          </h2>
          <button
            @click="router.push('/cases')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800 dark:text-indigo-300 hover:bg-[#5D87FF] hover:text-white dark:hover:bg-[#5D87FF] dark:hover:text-white transition-all duration-200 cursor-pointer shadow-2xs group"
          >
            <span>View all SOPs</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl divide-y divide-[#F1F5F9] dark:divide-slate-800 shadow-2xs overflow-hidden w-full">
          <div
            v-for="sop in featuredSopList"
            :key="sop.id"
            @click="setSearch(sop.title); router.push('/cases')"
            class="p-4 sm:p-5 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-4 cursor-pointer group gsap-sop-item"
          >
            <div class="flex items-center gap-3.5">
              <span class="text-xs font-mono font-bold text-[#94A3B8] dark:text-slate-500 shrink-0">{{ sop.num }}</span>
              <div>
                <h3 class="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors">
                  {{ sop.title }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 font-medium mt-1">
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-[#ECF2FF] text-[#5D87FF] dark:bg-indigo-950/60 dark:text-indigo-300">
                    {{ sop.category }}
                  </span>
                </div>
              </div>
            </div>

            <ArrowRight class="w-4 h-4 text-[#7C8BAC] group-hover:text-[#5D87FF] group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </div>
      </section>

      <!-- 4. FAQ: MODERN MINIMALIST SAAS-STYLE ACCORDION -->
      <section class="space-y-4 w-full">
        <div class="flex items-center justify-between border-b border-[#E5EAEF] dark:border-slate-800 pb-3">
          <div>
            <div class="text-[11px] font-black uppercase tracking-widest text-[#5D87FF] dark:text-indigo-400">
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight mt-0.5">
              Pertanyaan Umum &amp; Troubleshooting
            </h2>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl p-2 sm:p-6 shadow-2xs divide-y divide-[#F1F5F9] dark:divide-slate-800 w-full">
          <div
            v-for="faq in faqs"
            :key="faq.id"
            class="py-4 sm:py-5 px-3 sm:px-4 transition-colors"
          >
            <button
              @click="toggleFaq(faq.id)"
              class="w-full flex justify-between items-center text-left group cursor-pointer focus:outline-none"
            >
              <div class="flex items-center gap-3.5 pr-4">
                <span class="w-6 h-6 rounded-lg bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] dark:text-indigo-300 font-mono font-extrabold text-xs flex items-center justify-center shrink-0 group-hover:bg-[#5D87FF] group-hover:text-white transition-colors">
                  {{ faq.num }}
                </span>
                <span class="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors leading-snug">
                  {{ faq.question }}
                </span>
              </div>

              <div
                :class="[
                  openFaqId === faq.id ? 'bg-[#5D87FF] text-white rotate-180' : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#7C8BAC] group-hover:bg-[#ECF2FF] group-hover:text-[#5D87FF]',
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200'
                ]"
              >
                <ChevronDown class="w-4 h-4 transition-transform duration-200" />
              </div>
            </button>

            <div
              v-if="openFaqId === faq.id"
              class="mt-3.5 pl-10 pr-2 text-xs sm:text-sm text-[#475569] dark:text-slate-300 space-y-3 font-medium border-l-2 border-[#5D87FF]/30 ml-3.5 pt-1"
            >
              <p v-if="faq.summary" class="leading-relaxed font-bold text-[#0F172A] dark:text-slate-200 text-xs sm:text-sm">
                {{ faq.summary }}
              </p>

              <ol v-if="faq.steps" class="space-y-2 leading-relaxed text-xs">
                <li v-for="(step, idx) in faq.steps" :key="idx" class="flex items-start gap-2.5">
                  <span class="w-4 h-4 rounded-full bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {{ idx + 1 }}
                  </span>
                  <span class="flex-1 text-[#334155] dark:text-slate-300 font-medium">{{ step }}</span>
                </li>
              </ol>

              <div v-if="faq.code" class="p-3 bg-[#0F172A] text-emerald-400 rounded-xl font-mono text-xs shadow-inner flex items-center justify-between">
                <code>{{ faq.code }}</code>
                <span class="text-[10px] text-slate-500 font-bold uppercase">Command</span>
              </div>

              <div
                v-if="faq.isEmergency"
                class="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 p-4 rounded-xl border-l-4 border-rose-500 shadow-2xs space-y-1 text-xs"
              >
                <div class="flex items-center gap-2 font-black uppercase text-rose-600 dark:text-rose-400 text-[11px] tracking-wider">
                  <AlertTriangle class="w-4 h-4" />
                  <span>{{ faq.emergencyTitle }}</span>
                </div>
                <p class="leading-relaxed font-bold text-xs">{{ faq.emergencyText }}</p>
                <p class="text-[11px] text-rose-700 dark:text-rose-300 font-medium opacity-90">{{ faq.details }}</p>
              </div>

              <div v-if="faq.actionLink" class="pt-1">
                <a
                  :href="faq.actionLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="bg-[#5D87FF] hover:bg-[#4570EA] text-white px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <span>{{ faq.actionText }}</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. NEED PERSONAL ASSISTANCE SECTION (MINIMALIST SAAS STYLE) -->
      <section class="relative overflow-hidden bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-8 w-full group hover:border-[#5D87FF]/30 transition-all duration-300 gsap-assistance">
        
        <!-- Subtle Ambient Radial Light -->
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-[#5D87FF]/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Left Text & Action -->
        <div class="flex-1 space-y-4 max-w-xl text-left z-10">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
            Need Personal Assistance?
          </h2>
          <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
            If you couldn't find the information you need, our IT support team is ready to assist you. Submit a ticket to contact support right away.
          </p>

          <div class="flex items-center pt-1">
            <button
              @click="handleSupportTicketAction"
              class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#5D87FF] hover:bg-[#4570EA] text-white text-xs font-extrabold shadow-md shadow-[#5D87FF]/20 hover:shadow-lg hover:shadow-[#5D87FF]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group/btn"
            >
              <Ticket class="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-200" />
              <span>{{ isAuthenticated ? 'Submit a Ticket' : 'Sign In to Submit a Ticket' }}</span>
              <ArrowRight class="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>

        <!-- Right Support Info Box (Sleek Minimalist SaaS Card, No Badges) -->
        <div class="w-full lg:w-72 shrink-0 z-10">
          <div class="relative w-full bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-5 group-hover:border-[#5D87FF]/30 transition-all duration-200">
            
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-[#ECF2FF] dark:bg-slate-700/60 text-[#5D87FF] dark:text-indigo-300 flex items-center justify-center shadow-2xs shrink-0">
                <Send class="w-5 h-5" />
              </div>
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-[#5D87FF] dark:text-indigo-300">
                <span class="w-2 h-2 rounded-full bg-[#5D87FF] animate-pulse"></span>
                <span>Active Support</span>
              </div>
            </div>

            <div class="space-y-1 text-left">
              <div class="text-xs font-extrabold text-[#0F172A] dark:text-white">
                24/7 IT Helpdesk Support
              </div>
              <div class="text-[11px] font-medium text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-[#5D87FF] shrink-0" />
                <span>Response time &lt; 15 Mins</span>
              </div>
            </div>

          </div>
        </div>

      </section>

    </main>

  </div>
</template>
