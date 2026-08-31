<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
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
  PlusCircle,
  FolderOpen,
  ExternalLink,
  X,
  Lock,
  FileCode,
  HelpCircle,
  ArrowRight,
  Flame,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  BookOpen,
  Terminal,
  Copy,
  Check
} from 'lucide-vue-next';

const router = useRouter();
const { cases, setSearch, setCategory, selectCase, fetchCases } = useCases();
const { isCrudUnlocked } = useAuth();
const { showToast } = useToast();

const localSearch = ref('');
const isInputFocused = ref(false);
const openFaqId = ref(null);
const viewedFaqs = ref(new Set());
const copiedSnippetIdx = ref(null);

// Category Filter for Homepage FAQ Section
const faqSelectedCategory = ref('all');

const faqCategories = [
  { value: 'all', label: 'Semua Kategori' },
  { value: 'hardware', label: 'Hardware & Devices' },
  { value: 'security', label: 'Security & Access' },
  { value: 'network', label: 'Network & Wi-Fi' },
  { value: 'software', label: 'Software & Apps' },
  { value: 'operations', label: 'Operations & Policies' }
];

// Dynamic Data
const popularFaqs = ref([]);
const featuredFaqs = ref([]);

// Track feedback per user via localStorage
const userFeedbacks = ref({});

function loadFeedbacksFromStorage() {
  try {
    const raw = localStorage.getItem('esb_faq_feedbacks');
    if (raw) userFeedbacks.value = JSON.parse(raw);
  } catch (e) {
    userFeedbacks.value = {};
  }
}

async function loadFaqsData() {
  try {
    const [popularRes, featuredRes] = await Promise.all([
      api.getPopularCases(5),
      api.getCases({ featured: true })
    ]);

    if (popularRes?.data && Array.isArray(popularRes.data)) {
      popularFaqs.value = popularRes.data;
    }
    if (featuredRes?.data && Array.isArray(featuredRes.data)) {
      featuredFaqs.value = featuredRes.data;
      if (featuredFaqs.value.length > 0 && !openFaqId.value) {
        openFaqId.value = featuredFaqs.value[0].id;
      }
    }
  } catch (err) {
    console.warn('Failed to load dynamic FAQs, using fallback:', err.message);
  }
}

onMounted(() => {
  fetchCases();
  loadFeedbacksFromStorage();
  loadFaqsData();
});

const liveSuggestions = computed(() => {
  if (!localSearch.value.trim()) return [];
  const q = localSearch.value.toLowerCase().trim();
  return cases.value
    .filter((c) => (c.title || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q))
    .slice(0, 5);
});

// Filtered FAQs based on chosen category
const filteredFeaturedFaqs = computed(() => {
  if (faqSelectedCategory.value === 'all') {
    return featuredFaqs.value;
  }
  return featuredFaqs.value.filter((f) => f.category === faqSelectedCategory.value);
});

function handleSearchSubmit() {
  if (localSearch.value.trim()) {
    setSearch(localSearch.value.trim());
  }
  router.push('/cases');
}

// Click Quick Action Popular Pill
async function handlePopularChipClick(faq) {
  // 1. Record Click event to backend
  try {
    await api.recordCaseInteraction(faq.id, 'click');
  } catch (e) {
    console.warn('Click track error:', e.message);
  }

  // 2. Open accordion if featured or route to cases view
  openFaqId.value = faq.id;

  // 3. Smooth scroll to FAQ section
  const section = document.getElementById('faqs-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

function handleCategoryNavigate(categoryKey) {
  setCategory(categoryKey);
  router.push('/cases');
}

async function toggleFaq(id) {
  if (openFaqId.value === id) {
    openFaqId.value = null;
  } else {
    openFaqId.value = id;
    
    // Auto record view interaction once per session
    if (!viewedFaqs.value.has(id)) {
      viewedFaqs.value.add(id);
      try {
        await api.recordCaseInteraction(id, 'view');
      } catch (e) {
        console.warn('View track error:', e.message);
      }
    }
  }
}

// User Feedback: "Was this resource helpful?"
async function handleHelpfulFeedback(faq, isHelpful) {
  const currentVote = userFeedbacks.value[faq.id];
  if (currentVote) {
    showToast('Anda sudah memberikan feedback untuk FAQ ini.', 'info');
    return;
  }

  const type = isHelpful ? 'helpful' : 'unhelpful';
  userFeedbacks.value[faq.id] = type;
  localStorage.setItem('esb_faq_feedbacks', JSON.stringify(userFeedbacks.value));

  // Update local stats
  if (!faq.stats) {
    faq.stats = { views: 0, clicks: 0, helpful: 0, unhelpful: 0, score: 0 };
  }
  if (isHelpful) {
    faq.stats.helpful = (faq.stats.helpful || 0) + 1;
  } else {
    faq.stats.unhelpful = (faq.stats.unhelpful || 0) + 1;
  }

  try {
    await api.recordCaseInteraction(faq.id, type);
    showToast(isHelpful ? 'Terima kasih! Feedback Anda sangat membantu kami.' : 'Terima kasih atas feedback Anda, kami akan memperbarui informasi ini.', 'success');
  } catch (e) {
    console.warn('Feedback API error:', e.message);
  }
}

function copySnippet(code, index) {
  navigator.clipboard.writeText(code);
  copiedSnippetIdx.value = index;
  showToast('Snippet / Perintah disalin ke clipboard!', 'success');
  setTimeout(() => {
    copiedSnippetIdx.value = null;
  }, 2000);
}

function goToFaqDetail(id) {
  selectCase(id);
  router.push('/cases');
}
</script>

<template>
  <main class="min-h-screen bg-[#f9f9fb] dark:bg-slate-950 text-[#1a1c1d] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
    
    <!-- Hero Section -->
    <section class="relative pt-16 pb-14 sm:pt-24 sm:pb-20 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
      
      <!-- Brand & Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f2f1ff] dark:bg-indigo-950/50 border border-[#c4c5d9] dark:border-indigo-800/40 text-xs font-semibold text-[#002eac] dark:text-indigo-300 mb-6 shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-[#0040e5] dark:bg-indigo-400 animate-pulse"></span>
        <span>ESB IT Support &amp; Knowledge Base</span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1a1c1d] dark:text-white max-w-3xl mx-auto leading-tight sm:leading-tight">
        Bagaimana kami dapat membantu operasional kerja Anda?
      </h1>
      
      <p class="mt-4 text-sm sm:text-base text-[#575d7a] dark:text-slate-400 max-w-2xl mx-auto">
        Cari solusi cepat kendala teknis, SOP perangkat, akses akun, konfigurasi jaringan, hingga prosedur eskalasi helpdesk.
      </p>

      <!-- Global Search Bar with Live Suggestions Dropdown -->
      <div class="mt-8 max-w-2xl mx-auto relative z-30">
        <form @submit.prevent="handleSearchSubmit" class="relative flex items-center">
          <Search class="absolute left-4.5 w-5 h-5 text-[#575d7a] dark:text-slate-400 pointer-events-none" />
          <input
            v-model="localSearch"
            type="text"
            placeholder="Ketik pertanyaan, masalah laptop, password, wifi... (Tekan Enter)"
            @focus="isInputFocused = true"
            @blur="setTimeout(() => isInputFocused = false, 200)"
            class="w-full bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-2xl pl-12 pr-28 py-4 text-sm text-[#1a1c1d] dark:text-slate-100 placeholder-[#64748b] dark:placeholder-slate-500 shadow-md shadow-slate-200/50 dark:shadow-none focus:outline-none focus:border-[#0040e5] focus:ring-2 focus:ring-[#0040e5]/20 transition-all"
          />
          <button
            type="submit"
            class="absolute right-2 px-4 py-2 bg-[#0040e5] hover:bg-[#0034bf] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Cari Solusi
          </button>
        </form>

        <!-- Live Instant Suggestions Dropdown -->
        <div
          v-if="isInputFocused && liveSuggestions.length > 0"
          class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-2xl p-2 shadow-xl z-50 text-left"
        >
          <div class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400">
            Saran Jawaban Terkait
          </div>
          <button
            v-for="sug in liveSuggestions"
            :key="sug.id"
            @mousedown="goToFaqDetail(sug.id)"
            class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#f3f3f5] dark:hover:bg-slate-800 flex items-start justify-between gap-3 transition-colors cursor-pointer"
          >
            <div>
              <p class="text-xs font-semibold text-[#1a1c1d] dark:text-slate-200">{{ sug.title }}</p>
              <p class="text-[11px] text-[#575d7a] dark:text-slate-400 line-clamp-1 mt-0.5">{{ sug.summary }}</p>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded bg-[#edeef0] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 capitalize shrink-0 font-medium">
              {{ sug.category }}
            </span>
          </button>
        </div>
      </div>

      <!-- Quick Action Popular Pills -->
      <div v-if="popularFaqs.length > 0" class="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
        <span class="text-xs font-medium text-[#575d7a] dark:text-slate-400 flex items-center gap-1.5 mr-1">
          <Flame class="w-3.5 h-3.5 text-amber-500" />
          <span>Popular:</span>
        </span>
        <button
          v-for="p in popularFaqs"
          :key="p.id"
          @click="handlePopularChipClick(p)"
          class="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 text-[#1a1c1d] dark:text-slate-300 hover:border-[#0040e5] hover:text-[#0040e5] dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 group"
        >
          <span>{{ p.title }}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-60 group-hover:opacity-100"></span>
        </button>
      </div>

    </section>

    <!-- Category Explore Grid -->
    <section class="py-10 px-4 sm:px-6 max-w-5xl mx-auto w-full">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-[#1a1c1d] dark:text-white">
            Kategori Panduan &amp; Bantuan
          </h2>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-0.5">
            Pilih domain layanan untuk menjelajahi solusi yang terstruktur.
          </p>
        </div>
        <button
          @click="router.push('/cases')"
          class="text-xs font-semibold text-[#0040e5] dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Lihat Semua</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <!-- 1. Hardware -->
        <div
          @click="handleCategoryNavigate('hardware')"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md group"
        >
          <div class="w-10 h-10 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/60 text-[#0040e5] dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Laptop class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm text-[#1a1c1d] dark:text-white group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
            Hardware &amp; Equipment
          </h3>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1 line-clamp-2">
            SOP setup laptop baru, bypass OOBE Windows 11, hardware test unit re-use, form serah terima.
          </p>
        </div>

        <!-- 2. Security & Access -->
        <div
          @click="handleCategoryNavigate('security')"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md group"
        >
          <div class="w-10 h-10 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/60 text-[#0040e5] dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm text-[#1a1c1d] dark:text-white group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
            Access &amp; Security
          </h3>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1 line-clamp-2">
            Reset password Google Workspace, 2-Factor Authentication, akun lokal Windows, dan permission.
          </p>
        </div>

        <!-- 3. Network & Wi-Fi -->
        <div
          @click="handleCategoryNavigate('network')"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md group"
        >
          <div class="w-10 h-10 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/60 text-[#0040e5] dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Wifi class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm text-[#1a1c1d] dark:text-white group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
            Network &amp; Connectivity
          </h3>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1 line-clamp-2">
            Koneksi SSID kantor, konfigurasi VPN remote worker, DNS resolver, dan penanganan no internet.
          </p>
        </div>

        <!-- 4. Software & Apps -->
        <div
          @click="handleCategoryNavigate('software')"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md group"
        >
          <div class="w-10 h-10 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/60 text-[#0040e5] dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <AppWindow class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm text-[#1a1c1d] dark:text-white group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
            Software &amp; Apps
          </h3>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1 line-clamp-2">
            Instalasi Ninite, Google Chrome, AnyDesk remote support, Microsoft Office, dan troubleshooting lisensi.
          </p>
        </div>

        <!-- 5. Operations & Policies -->
        <div
          @click="handleCategoryNavigate('operations')"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md group"
        >
          <div class="w-10 h-10 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/60 text-[#0040e5] dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Building2 class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm text-[#1a1c1d] dark:text-white group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
            Operations &amp; Policies
          </h3>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1 line-clamp-2">
            Form serah terima perangkat, kebijakan keamanan sandi, dan panduan eskalasi tiket helpdesk.
          </p>
        </div>

        <!-- 6. Developer & DevOps -->
        <div
          @click="handleCategoryNavigate('devops')"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md group"
        >
          <div class="w-10 h-10 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/60 text-[#0040e5] dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Server class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-sm text-[#1a1c1d] dark:text-white group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
            Developer &amp; Infrastructure
          </h3>
          <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1 line-clamp-2">
            Git repository access, Docker staging environment, database proxy, dan incident recovery playbook.
          </p>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- FREQUENTLY ASKED QUESTIONS (FEATURED ON HOMEPAGE)        -->
    <!-- ======================================================== -->
    <section id="faqs-section" class="py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <div class="text-center mb-8 space-y-2">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
          <HelpCircle class="w-3.5 h-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1a1c1d] dark:text-white tracking-tight">
          Solusi Cepat Kendala yang Sering Terjadi
        </h2>
        <p class="text-xs sm:text-sm text-[#575d7a] dark:text-slate-400 max-w-xl mx-auto">
          Daftar pertanyaan dan langkah perbaikan teknis yang telah dikurasi oleh tim IT Support.
        </p>
      </div>

      <!-- FAQ Category Filter Tabs -->
      <div class="flex flex-wrap items-center justify-center gap-2 mb-8">
        <button
          v-for="cat in faqCategories"
          :key="cat.value"
          @click="faqSelectedCategory = cat.value"
          class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border"
          :class="faqSelectedCategory === cat.value
            ? 'bg-[#0040e5] text-white border-[#0040e5] shadow-xs'
            : 'bg-white dark:bg-slate-900 text-[#575d7a] dark:text-slate-400 border-[#c4c5d9] dark:border-slate-800 hover:border-slate-400'"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- FAQ Accordion List -->
      <div class="flex flex-col gap-4">
        <div
          v-for="faq in filteredFeaturedFaqs"
          :key="faq.id"
          class="bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-xl overflow-hidden transition-all shadow-2xs hover:shadow-xs"
        >
          <!-- Accordion Header Button -->
          <button
            @click="toggleFaq(faq.id)"
            class="w-full flex justify-between items-center p-5 sm:p-6 bg-white dark:bg-slate-900 hover:bg-[#f3f3f5] dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
          >
            <div class="flex items-center gap-3 pr-4">
              <span class="text-base font-bold text-[#1a1c1d] dark:text-slate-100">
                {{ faq.title }}
              </span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f2f1ff] dark:bg-indigo-950/40 text-[#0040e5] dark:text-indigo-400 capitalize border border-[#c4c5d9] dark:border-indigo-500/20">
                {{ faq.category }}
              </span>
              <ChevronDown
                class="w-5 h-5 text-[#1a1c1d] dark:text-slate-400 transition-transform duration-300"
                :class="{ 'rotate-180 text-[#0040e5] dark:text-indigo-400': openFaqId === faq.id }"
              />
            </div>
          </button>

          <!-- Accordion Content -->
          <div
            v-if="openFaqId === faq.id"
            class="px-5 sm:px-6 pb-6 bg-white dark:bg-slate-900 text-sm text-[#434656] dark:text-slate-300 border-t border-[#e2e2e4] dark:border-slate-800 pt-4 space-y-4"
          >
            <!-- Summary -->
            <p v-if="faq.summary" class="leading-relaxed text-slate-700 dark:text-slate-300">
              {{ faq.summary }}
            </p>

            <!-- Steps List (actionSteps) -->
            <div v-if="faq.actionSteps && faq.actionSteps.length" class="space-y-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Langkah-Langkah Penanganan:
              </span>
              <ol class="list-decimal pl-6 space-y-2 leading-relaxed text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                <li v-for="(step, idx) in faq.actionSteps" :key="idx">
                  {{ step }}
                </li>
              </ol>
            </div>

            <!-- Snippets / Code blocks -->
            <div v-if="faq.snippets && faq.snippets.length" class="space-y-2 pt-2">
              <div
                v-for="(snip, sIdx) in faq.snippets"
                :key="sIdx"
                class="rounded-xl border border-[#c4c5d9] dark:border-slate-800 bg-[#edeef0] dark:bg-slate-950 overflow-hidden text-xs"
              >
                <div class="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-[#e2e2e4] dark:border-slate-800 font-mono font-semibold text-[11px]">
                  <span>{{ snip.label || 'Snippet' }}</span>
                  <button
                    @click="copySnippet(snip.code, sIdx)"
                    class="flex items-center gap-1 px-2 py-0.5 rounded bg-[#f3f3f5] hover:bg-[#e2e2e4] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1a1c1d] dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Check v-if="copiedSnippetIdx === sIdx" class="w-3 h-3 text-emerald-600" />
                    <Copy v-else class="w-3 h-3" />
                    <span>{{ copiedSnippetIdx === sIdx ? 'Tersalin' : 'Copy' }}</span>
                  </button>
                </div>
                <pre class="p-3 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ snip.code }}</pre>
              </div>
            </div>

            <!-- Link to full Case/SOP Document -->
            <div class="pt-2 flex items-center justify-between flex-wrap gap-3">
              <button
                @click="goToFaqDetail(faq.id)"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0040e5] dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <BookOpen class="w-3.5 h-3.5" />
                <span>Buka Halaman Pembaca Detail &amp; Panduan Lengkap &rarr;</span>
              </button>
            </div>

            <!-- "Was this resource helpful?" Interactive Feedback Component -->
            <div class="mt-4 pt-4 border-t border-[#f0f0f2] dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#fafafc] dark:bg-slate-950/40 p-3.5 rounded-lg">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Apakah informasi ini membantu Anda?
                </span>
                <span v-if="faq.stats?.helpful > 0" class="text-[11px] text-slate-600 dark:text-slate-400">
                  ({{ faq.stats.helpful }} orang terbantu)
                </span>
              </div>

              <!-- Feedback Buttons -->
              <div class="flex items-center gap-2">
                <!-- If already voted -->
                <div v-if="userFeedbacks[faq.id]" class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 rounded-md">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>Feedback tercatat ({{ userFeedbacks[faq.id] === 'helpful' ? '👍 Membantu' : '👎 Kurang Membantu' }})</span>
                </div>

                <!-- Active buttons -->
                <template v-else>
                  <button
                    @click="handleHelpfulFeedback(faq, true)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ThumbsUp class="w-3.5 h-3.5" />
                    <span>Ya</span>
                  </button>

                  <button
                    @click="handleHelpfulFeedback(faq, false)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ThumbsDown class="w-3.5 h-3.5" />
                    <span>Tidak</span>
                  </button>
                </template>
              </div>
            </div>

          </div>
        </div>

        <div v-if="filteredFeaturedFaqs.length === 0" class="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6">
          <HelpCircle class="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Tidak ada pertanyaan FAQ pada kategori ini.
          </p>
        </div>
      </div>

      <!-- Bottom Helpdesk CTA -->
      <div class="text-center mt-8 space-y-4">
        <p class="text-base text-[#434656] dark:text-slate-400">
          Masih membutuhkan bantuan terkait kendala teknis?
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button
            @click="router.push('/cases')"
            class="bg-[#0040e5] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0034bf] transition-colors shadow-sm hover:shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen class="w-4 h-4" />
            <span>Jelajahi Semua Artikel FAQ</span>
          </button>

          <button
            v-if="isCrudUnlocked"
            @click="router.push('/admin')"
            class="bg-white dark:bg-slate-800 text-[#1a1c1d] dark:text-white border border-[#c4c5d9] dark:border-slate-700 px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#f3f3f5] dark:hover:bg-slate-700 transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <FileCode class="w-4 h-4 text-[#0040e5] dark:text-indigo-400" />
            <span>FAQ Knowledge Base CMS Admin</span>
          </button>
        </div>
      </div>
    </section>

  </main>
</template>
