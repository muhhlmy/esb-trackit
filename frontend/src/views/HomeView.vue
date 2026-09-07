<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useKbCategories } from '@/composables/useKbCategories';
import { useAuth } from '@/composables/useAuth';
import { useLanguage } from '@/composables/useLanguage';
import { api } from '@/services/api';
import gsap from 'gsap';
import { isReducedMotion } from '@/composables/useGsap';
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
  Ticket,
  HelpCircle,
  Send,
  Clock,
  TrendingUp,
} from 'lucide-vue-next';

const router = useRouter();
const { cases, setSearch, setCategory, hasNoSearchResult, fetchCases } = useCases();
const { publishedCategories, fetchPublicCategories } = useKbCategories();
const { isAuthenticated, isAdmin } = useAuth();
const { currentLang, t } = useLanguage();

const localSearch = ref('');
const isInputFocused = ref(false);
const openFaqId = ref(null);
const dbFaqs = ref([]);
const popularSearches = ref([]);

const defaultPopularSearches = ['Password Reset', 'VPN Setup', 'Hardware Request'];
const displayPopularSearches = computed(() => {
  if (Array.isArray(popularSearches.value) && popularSearches.value.length > 0) {
    return popularSearches.value;
  }
  return defaultPopularSearches;
});

const liveSuggestions = computed(() => {
  if (!localSearch.value.trim()) return [];
  const q = localSearch.value.toLowerCase().trim();
  return cases.value
    .filter((c) => (c.title || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q))
    .slice(0, 5);
});

// Featured Article list dari DB (4 pertama, published, diurutkan sesuai sort_order)
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
      router.push(isAuthenticated.value ? (isAdmin.value ? '/dashboard' : '/tickets') : '/login');
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
  } else if (isAdmin.value) {
    router.push('/dashboard');
  } else {
    router.push('/tickets');
  }
}

// 3 Cards for Browse Topics — dari tabel kb_categories (fallback ke default statis)
const DEFAULT_TOPIC_CARDS = [
  {
    key: 'it-support',
    title: 'IT Support',
    description: 'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.',
    icon: 'Laptop',
    is_featured: false
  },
  {
    key: 'hr-people',
    title: 'Human Resources (HR)',
    description: 'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.',
    icon: 'ShieldCheck',
    is_featured: true
  },
  {
    key: 'general-affairs',
    title: 'General Affairs (GA)',
    description: 'Office facility management, physical asset requests, building maintenance, and operational tools.',
    icon: 'Building2',
    is_featured: false
  }
];

// Map nama icon (string dari DB) ke komponen Lucide
const ICON_COMPONENTS = {
  Laptop,
  AppWindow,
  ShieldCheck,
  Wifi,
  Building2,
  Server,
  HelpCircle,
  Ticket
};

const topicCards = computed(() => {
  const source = publishedCategories.value.length ? publishedCategories.value : DEFAULT_TOPIC_CARDS;
  return source.map((c) => {
    let title = c.title;
    let description = c.description || '';

    if (c.key === 'it-support') {
      title = t('topic_it_title', 'IT Support');
      description = t('topic_it_desc', 'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.');
    } else if (c.key === 'hr-people') {
      title = t('topic_hr_title', 'Human Resources (HR)');
      description = t('topic_hr_desc', 'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.');
    } else if (c.key === 'general-affairs') {
      title = t('topic_ga_title', 'General Affairs (GA)');
      description = t('topic_ga_desc', 'Office facility management, physical asset requests, building maintenance, and operational tools.');
    }

    return {
      id: c.key,
      title,
      description,
      icon: ICON_COMPONENTS[c.icon] || HelpCircle,
      isFeatured: Boolean(c.is_featured)
    };
  });
});

const DEFAULT_FAQS = [
  {
    num: '01',
    id: 'faq-1',
    question: 'How do I reset my Google Workspace password?',
    summary: 'Anda dapat mereset kata sandi akun karyawan melalui Google Admin Console sesuai panduan resmi:',
    steps: [
      'Buka Google Admin Console di browser (admin.google.com).',
      'Cari nama atau email karyawan pada menu Directory > Users.',
      'Klik tombol "Reset Password" dan pilih opsi buat kata sandi secara manual.',
      'Gunakan format kata sandi sementara sesuai panduan resmi IT perusahaan (hubungi IT Administrator jika membutuhkan bantuan).',
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
    code: 'oobe\\bypassnro'
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

// FAQ dari tabel faq (rich content) — fallback ke default statis bila DB kosong
const faqs = computed(() => {
  if (!dbFaqs.value.length) return DEFAULT_FAQS;
  return dbFaqs.value.map((f, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    id: `faq-${f.id}`,
    question: f.question,
    summary: f.answer,
    steps: Array.isArray(f.steps) && f.steps.length ? f.steps : null,
    code: f.code_snippet || null,
    actionText: f.action_text || null,
    actionLink: f.action_link || null,
    isEmergency: Boolean(f.is_emergency),
    emergencyTitle: f.emergency_title || null,
    emergencyText: f.emergency_text || null,
  }));
});

const mainScope = ref(null);

// Muat konten dinamis Help Center: kategori (topic cards), FAQ, popular searches
async function fetchHelpCenterContent() {
  try {
    await fetchPublicCategories();
  } catch { /* fallback ke default statis */ }

  try {
    const data = await api.getPublicFaqs();
    dbFaqs.value = Array.isArray(data) ? data : data?.data || [];
  } catch { /* fallback ke default statis */ }

  try {
    const popular = await api.getPopularKbSearches();
    popularSearches.value = Array.isArray(popular) ? popular.map((p) => p.query) : [];
  } catch { /* popular searches opsional */ }
}

onMounted(async () => {
  fetchCases();
  fetchHelpCenterContent();
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

    if (document.querySelector('.gsap-sop-item')) {
      gsap.fromTo(
        '.gsap-sop-item',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', delay: 0.25, clearProps: 'all' }
      );
    }

    gsap.fromTo(
      '.gsap-assistance',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.35, clearProps: 'all' }
    );
  }, mainScope.value);
});
</script>

<template>
  <div ref="mainScope" class="page-home-unified-container min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 py-6 sm:py-8 lg:py-10 px-3.5 sm:px-6 lg:px-8 transition-colors duration-200">
    
    <!-- SHARED UNIFIED CONTAINER SYSTEM (max-w-[1200px] mx-auto w-full) -->
    <main class="max-w-[1200px] mx-auto w-full flex flex-col gap-8 sm:gap-10 lg:gap-14">
      
      <!-- 1. HERO SECTION: FOCAL SEARCH -->
      <section class="flex flex-col items-center text-center w-full pt-1 pb-1 sm:pt-2 sm:pb-2">
        <div class="text-[10.5px] sm:text-xs font-black uppercase tracking-widest text-[#5D87FF] dark:text-indigo-400 mb-1.5 sm:mb-2 gsap-hero-el">
          {{ t('hero_tag', 'Help Center') }}
        </div>

        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white tracking-tight leading-tight max-w-2xl px-1 gsap-hero-el">
          {{ t('hero_title', 'What can we help you find?') }}
        </h1>
        
        <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium leading-relaxed mt-2 max-w-md px-2 gsap-hero-el">
          {{ t('hero_subtitle', 'Search our articles, troubleshooting guides, and IT knowledge base.') }}
        </p>

        <!-- Focal Search Input Bar -->
        <div class="w-full relative mt-5 sm:mt-6 max-w-2xl gsap-hero-el">
          <form @submit.prevent="handleSearchSubmit" class="relative flex items-center">
            <Search class="absolute left-3.5 sm:left-4 w-4 h-4 sm:w-5 sm:h-5 text-[#5D87FF] pointer-events-none" />
            <input
              v-model="localSearch"
              @focus="isInputFocused = true"
              type="text"
              class="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-20 sm:pr-28 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:border-[#5D87FF] focus:ring-2 focus:ring-[#5D87FF]/15 focus:outline-none transition-all shadow-sm"
              :placeholder="t('search_placeholder', 'Search the knowledge base...')"
              autocomplete="off"
            />
            <div class="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                v-if="localSearch"
                type="button"
                @click="localSearch = ''"
                class="p-1 text-[#7C8BAC] hover:text-[#0F172A] dark:hover:text-white rounded cursor-pointer"
              >
                <X class="w-4 h-4" />
              </button>
              <button
                type="submit"
                class="h-8 sm:h-9 px-3.5 sm:px-5 bg-[#5D87FF] hover:bg-[#4570EA] text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95 touch-manipulation"
              >
                {{ t('search_btn', 'Search') }}
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
              class="w-full p-3 sm:p-3.5 hover:bg-[#ECF2FF] dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2.5 truncate mr-2 min-w-0">
                <Search class="w-4 h-4 text-[#5D87FF] shrink-0" />
                <span class="font-extrabold truncate">{{ sug.title }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[9.5px] bg-[#ECF2FF] text-[#5D87FF] dark:bg-slate-800 dark:text-indigo-300 font-extrabold uppercase shrink-0">
                {{ sug.category }}
              </span>
            </button>
          </div>
        </div>

        <!-- Popular Searches: Clean, Balanced Mobile & Desktop Layout -->
        <div class="w-full mt-2.5 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-2">
          <!-- Label with Trending Icon -->
          <div class="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#7C8BAC] dark:text-slate-400 shrink-0">
            <TrendingUp class="w-3.5 h-3.5 text-[#5D87FF] shrink-0" />
            <span>{{ t('popular_searches', 'Popular searches') }}:</span>
          </div>

          <!-- Chips Pill Group -->
          <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full">
            <button
              v-for="term in displayPopularSearches"
              :key="term"
              @click="handlePopularClick(term)"
              class="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-[#ECF2FF] dark:hover:bg-[#5D87FF]/20 border border-slate-200/80 dark:border-slate-700/60 text-[#475569] dark:text-slate-300 hover:text-[#5D87FF] dark:hover:text-[#5D87FF] hover:border-[#5D87FF]/40 text-[11px] sm:text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer touch-manipulation"
            >
              <span>{{ term }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 2. BROWSE TOPICS: 3-COLUMN CARD GRID -->
      <section class="space-y-3.5 sm:space-y-4 w-full">
        <div class="flex items-center justify-between gap-2 border-b border-[#E5EAEF] dark:border-slate-800 pb-2.5 sm:pb-3">
          <h2 class="text-xs font-black uppercase tracking-wider text-[#7C8BAC] dark:text-slate-400 truncate">
            {{ t('browse_topics', 'Browse topics') }}
          </h2>
          <button
            @click="router.push('/cases')"
            class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800 dark:text-indigo-300 hover:bg-[#5D87FF] hover:text-white dark:hover:bg-[#5D87FF] dark:hover:text-white transition-all duration-200 cursor-pointer shadow-2xs group shrink-0 active:scale-95 touch-manipulation"
          >
            <span>{{ t('view_all_articles', 'Lihat Semua Artikel') }}</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 w-full">
          <div
            v-for="card in topicCards"
            :key="card.title"
            @click="handleCategoryNavigate(card.id)"
            :class="[
              card.isFeatured
                ? 'bg-[#5D87FF] text-white shadow-lg shadow-[#5D87FF]/25 border border-[#5D87FF]'
                : 'bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 text-[#0F172A] dark:text-white shadow-2xs hover:shadow-md hover:border-[#5D87FF]',
              'rounded-2xl p-4.5 sm:p-7 text-center flex flex-col items-center justify-between gap-3.5 sm:gap-5 transition-all duration-200 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] touch-manipulation gsap-topic-card'
            ]"
          >
            <!-- Icon Box -->
            <div
              :class="[
                card.isFeatured
                  ? 'bg-white/20 text-white'
                  : 'bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] dark:text-indigo-400 group-hover:bg-[#5D87FF] group-hover:text-white',
                'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0'
              ]"
            >
              <component :is="card.icon" class="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <!-- Title & Description -->
            <div class="space-y-1 sm:space-y-1.5 max-w-xs">
              <h3
                :class="[
                  card.isFeatured ? 'text-white' : 'text-[#0F172A] dark:text-white group-hover:text-[#5D87FF]',
                  'text-sm sm:text-base font-extrabold transition-colors'
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
                'text-xs font-black inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform min-h-[32px]'
              ]"
            >
              <span>{{ t('learn_more', 'Learn More') }}</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      <!-- 3. FEATURED CONTENT: NUMBERED EDITORIAL ARTICLE LIST -->
      <section v-if="featuredSopList.length > 0" class="space-y-3 w-full">
        <div class="flex items-center justify-between gap-2 border-b border-[#E5EAEF] dark:border-slate-800 pb-2.5 sm:pb-3">
          <h2 class="text-xs font-black uppercase tracking-wider text-[#7C8BAC] dark:text-slate-400 truncate">
            {{ t('featured_articles', 'Featured Articles') }}
          </h2>
          <button
            @click="router.push('/cases')"
            class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800 dark:text-indigo-300 hover:bg-[#5D87FF] hover:text-white dark:hover:bg-[#5D87FF] dark:hover:text-white transition-all duration-200 cursor-pointer shadow-2xs group shrink-0 active:scale-95 touch-manipulation"
          >
            <span>{{ t('view_all_articles', 'View all Articles') }}</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl divide-y divide-[#F1F5F9] dark:divide-slate-800 shadow-2xs overflow-hidden w-full">
          <div
            v-for="sop in featuredSopList"
            :key="sop.id"
            @click="setSearch(sop.title); router.push('/cases')"
            class="p-3.5 sm:p-5 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 sm:gap-4 cursor-pointer group gsap-sop-item active:bg-slate-50 dark:active:bg-slate-800/80 touch-manipulation"
          >
            <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <span class="text-xs font-mono font-bold text-[#94A3B8] dark:text-slate-500 shrink-0 w-5">{{ sop.num }}</span>
              <div class="min-w-0 flex-1">
                <h3 class="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors leading-snug break-words">
                  {{ sop.title }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 font-medium mt-1">
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-[#ECF2FF] text-[#5D87FF] dark:bg-indigo-950/60 dark:text-indigo-300 truncate max-w-[140px]">
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
      <section class="space-y-3.5 sm:space-y-4 w-full">
        <div class="flex items-center justify-between border-b border-[#E5EAEF] dark:border-slate-800 pb-2.5 sm:pb-3">
          <div>
            <div class="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#5D87FF] dark:text-indigo-400">
              {{ t('faq_tag', 'FREQUENTLY ASKED QUESTIONS') }}
            </div>
            <h2 class="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight mt-0.5">
              {{ t('faq_title', 'Pertanyaan Umum & Troubleshooting') }}
            </h2>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl p-1.5 sm:p-6 shadow-2xs divide-y divide-[#F1F5F9] dark:divide-slate-800 w-full">
          <div
            v-for="faq in faqs"
            :key="faq.id"
            class="py-3.5 sm:py-5 px-2.5 sm:px-4 transition-colors"
          >
            <button
              @click="toggleFaq(faq.id)"
              class="w-full flex justify-between items-start sm:items-center text-left group cursor-pointer focus:outline-none min-h-[44px] gap-2 touch-manipulation"
            >
              <div class="flex items-start sm:items-center gap-2.5 sm:gap-3.5 pr-2 sm:pr-4 min-w-0 flex-1">
                <span class="w-6 h-6 rounded-lg bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] dark:text-indigo-300 font-mono font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 group-hover:bg-[#5D87FF] group-hover:text-white transition-colors">
                  {{ faq.num }}
                </span>
                <span class="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white group-hover:text-[#5D87FF] transition-colors leading-snug break-words">
                  {{ faq.question }}
                </span>
              </div>

              <div
                :class="[
                  openFaqId === faq.id ? 'bg-[#5D87FF] text-white rotate-180' : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#7C8BAC] group-hover:bg-[#ECF2FF] group-hover:text-[#5D87FF]',
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5 sm:mt-0'
                ]"
              >
                <ChevronDown class="w-4 h-4 transition-transform duration-200" />
              </div>
            </button>

            <div
              v-if="openFaqId === faq.id"
              class="mt-3 pl-3 sm:pl-9 pr-1 sm:pr-2 text-xs sm:text-sm text-[#475569] dark:text-slate-300 space-y-2.5 sm:space-y-3 font-medium border-l-2 border-[#5D87FF]/30 ml-2.5 sm:ml-3 pt-1"
            >
              <p v-if="faq.summary" class="leading-relaxed font-bold text-[#0F172A] dark:text-slate-200 text-xs sm:text-sm">
                {{ faq.summary }}
              </p>

              <ol v-if="faq.steps" class="space-y-2 leading-relaxed text-xs">
                <li v-for="(step, idx) in faq.steps" :key="idx" class="flex items-start gap-2 sm:gap-2.5">
                  <span class="w-4 h-4 rounded-full bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {{ idx + 1 }}
                  </span>
                  <span class="flex-1 text-[#334155] dark:text-slate-300 font-medium break-words">{{ step }}</span>
                </li>
              </ol>

              <div v-if="faq.code" class="p-2.5 sm:p-3 bg-[#0F172A] text-emerald-400 rounded-xl font-mono text-[11px] sm:text-xs shadow-inner flex items-center justify-between gap-2 overflow-x-auto">
                <code class="break-all sm:break-normal">{{ faq.code }}</code>
                <span class="text-[9.5px] text-slate-500 font-bold uppercase shrink-0">Command</span>
              </div>

              <div
                v-if="faq.isEmergency"
                class="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 p-3 sm:p-4 rounded-xl border-l-4 border-rose-500 shadow-2xs space-y-1 text-xs"
              >
                <div class="flex items-center gap-1.5 font-black uppercase text-rose-600 dark:text-rose-400 text-[10.5px] sm:text-[11px] tracking-wider">
                  <AlertTriangle class="w-4 h-4 shrink-0" />
                  <span>{{ faq.emergencyTitle }}</span>
                </div>
                <p class="leading-relaxed font-bold text-xs">{{ faq.emergencyText }}</p>
                <p v-if="faq.details" class="text-[11px] text-rose-700 dark:text-rose-300 font-medium opacity-90">{{ faq.details }}</p>
              </div>

              <div v-if="faq.actionLink" class="pt-1">
                <a
                  :href="faq.actionLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="bg-[#5D87FF] hover:bg-[#4570EA] text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition-colors min-h-[40px] touch-manipulation active:scale-95"
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
      <section class="relative overflow-hidden bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 sm:gap-8 w-full group hover:border-[#5D87FF]/30 transition-all duration-300 gsap-assistance">
        
        <!-- Subtle Ambient Radial Light -->
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-[#5D87FF]/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Left Text & Action -->
        <div class="flex-1 space-y-3.5 sm:space-y-4 max-w-xl text-left z-10">
          <h2 class="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight">
            {{ t('need_assistance_title', 'Need Personal Assistance?') }}
          </h2>
          <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
            {{ t('need_assistance_desc', "If you couldn't find the information you need, our IT support team is ready to assist you. Submit a ticket to contact support right away.") }}
          </p>

          <div class="flex items-center pt-0.5 sm:pt-1">
            <button
              @click="handleSupportTicketAction"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#5D87FF] hover:bg-[#4570EA] text-white text-xs font-extrabold shadow-md shadow-[#5D87FF]/20 hover:shadow-lg hover:shadow-[#5D87FF]/30 active:scale-[0.98] transition-all duration-200 cursor-pointer group/btn min-h-[44px] touch-manipulation"
            >
              <Ticket class="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-200" />
              <span>{{ !isAuthenticated ? t('sign_in_to_submit', 'Sign In to Submit a Ticket') : (isAdmin ? t('go_to_dashboard', 'Go to Dashboard') : t('submit_ticket', 'Submit a Ticket')) }}</span>
              <ArrowRight class="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>

        <!-- Right Support Info Box (Sleek Minimalist SaaS Card, No Badges) -->
        <div class="w-full lg:w-72 shrink-0 z-10">
          <div class="relative w-full bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 sm:gap-5 group-hover:border-[#5D87FF]/30 transition-all duration-200">
            
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-[#ECF2FF] dark:bg-slate-700/60 text-[#5D87FF] dark:text-indigo-300 flex items-center justify-center shadow-2xs shrink-0">
                <Send class="w-5 h-5" />
              </div>
              <div class="flex items-center gap-1.5 text-xs font-extrabold text-[#5D87FF] dark:text-indigo-300">
                <span class="w-2 h-2 rounded-full bg-[#5D87FF] animate-pulse"></span>
                <span>{{ t('active_support', 'Active Support') }}</span>
              </div>
            </div>

            <div class="space-y-1 text-left">
              <div class="text-xs font-extrabold text-[#0F172A] dark:text-white">
                {{ t('it_helpdesk', 'IT Helpdesk Support') }}
              </div>
              <div class="text-[11px] font-medium text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-[#5D87FF] shrink-0" />
                <span>{{ t('work_days', 'Mon - Fri') }}</span>
              </div>
              <div class="text-[11px] font-medium text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-[#5D87FF] shrink-0" />
                <span>{{ t('work_hours', '08:30 - 17:30') }}</span>
              </div>
            </div>

          </div>
        </div>

      </section>

    </main>

  </div>
</template>
