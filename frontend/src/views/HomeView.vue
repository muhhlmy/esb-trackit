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
  PlusCircle,
  FolderOpen,
  ExternalLink,
  X,
  Lock,
  FileCode,
  HelpCircle,
  ArrowRight
} from 'lucide-vue-next';

const router = useRouter();
const { cases, setSearch, setCategory, openCreateDrawer } = useCases();
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

const topicCards = [
  {
    id: 'hardware',
    title: 'Hardware',
    description: 'Request new equipment, report physical damage, or troubleshoot laptop & accessories.',
    icon: Laptop,
    badge: 'Hardware'
  },
  {
    id: 'software',
    title: 'Software',
    description: 'Install applications, request licenses, PR standardization, or resolve runtime errors.',
    icon: AppWindow,
    badge: 'Software'
  },
  {
    id: 'workplace',
    title: 'Access & Security',
    description: 'Password resets, 2FA/2SV setup, Google Workspace accounts, and system permissions.',
    icon: ShieldCheck,
    badge: 'Security'
  },
  {
    id: 'environment',
    title: 'Network & Wi-Fi',
    description: 'VPN configuration, OOBE network bypass, office connectivity, and proxy setup.',
    icon: Wifi,
    badge: 'Network'
  },
  {
    id: 'workplace',
    title: 'HR Systems',
    description: 'Payroll portal access, PBX communication, employee onboarding, and asset tracking.',
    icon: Building2,
    badge: 'HR / Workplace'
  },
  {
    id: 'backend',
    title: 'Workplace & IT',
    description: 'Meeting room tech, printer setup, desk equipment relocation, and database maintenance.',
    icon: Server,
    badge: 'Infrastructure'
  }
];

const faqs = [
  {
    id: 'faq-1',
    question: 'How do I reset my password?',
    type: 'steps',
    summary: 'You can reset your employee Google Workspace password using the Admin Console self-service SOP:',
    steps: [
      'Navigate to the Google Admin Console (admin.google.com).',
      'Search for the employee ID or email address under Directory > Users.',
      'Click "Reset Password" and choose "Create Password" manually.',
      'Set the standard default password: Essensians@2026.',
      'Ensure "Ask user to change their password when they sign in" is checked before clicking Reset.'
    ],
    actionText: 'Go to Admin Portal',
    actionLink: 'https://admin.google.com/'
  },
  {
    id: 'faq-2',
    question: 'How to bypass Microsoft account during Windows Laptop OOBE?',
    type: 'command',
    summary: 'To set up a local user account without an online Microsoft account during "Let\'s connect you to a network":',
    steps: [
      'Press Shift + F10 (or Fn + Shift + F10) on the keyboard to open Command Prompt (CMD).',
      'Type the command oobe\\bypassnro and press Enter.',
      'The laptop will restart automatically and allow offline Local Account setup.'
    ],
    code: 'oobe\\bypassnro'
  },
  {
    id: 'faq-3',
    question: 'How to request 2-Step Verification (2SV) backup codes?',
    type: 'steps',
    summary: 'Upon official request from PBX / People & Culture for team authentication support:',
    steps: [
      'Open Google Admin Console and find the user profile.',
      'Navigate to Security > 2-Step Verification > Get Backup Verification Codes.',
      'Copy at least 2 (two) backup verification codes.',
      'Send the codes securely via Direct Message to authorized PBX personnel.'
    ]
  },
  {
    id: 'faq-4',
    question: 'What to do if my laptop or HP is stolen or lost?',
    type: 'emergency',
    isEmergency: true,
    emergencyTitle: 'Immediate action required.',
    emergencyText: 'If your company device is lost or stolen, report it to the IT Support & Security Operations Center (SOC) immediately.',
    details: 'IT will issue an immediate remote wipe command via Endpoint Management to safeguard confidential company data.'
  }
];
</script>

<template>
  <main class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col gap-16 md:gap-24 transition-colors">
    
    <!-- Hero Section -->
    <section class="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto w-full">
      <h1 class="text-3xl sm:text-5xl font-bold text-[#1a1c1d] dark:text-slate-100 tracking-tight leading-tight">
        How can we help you today?
      </h1>

      <!-- Big Search Box -->
      <div class="w-full relative group max-w-2xl mt-2">
        <form @submit.prevent="handleSearchSubmit" class="relative">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#575d7a] dark:text-slate-400 pointer-events-none" />
          <input
            v-model="localSearch"
            @focus="isInputFocused = true"
            type="text"
            class="w-full h-14 pl-12 pr-12 bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-lg text-sm text-[#1a1c1d] dark:text-slate-100 placeholder:text-[#64748b] dark:placeholder:text-slate-500 focus:border-[#0040e5] focus:ring-1 focus:ring-[#0040e5] focus:outline-none transition-shadow shadow-xs focus:shadow-md"
            placeholder="Search knowledge base, articles, and solutions..."
            autocomplete="off"
          />
          <button
            v-if="localSearch"
            type="button"
            @click="localSearch = ''"
            class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-[#575d7a] hover:text-[#1a1c1d] dark:text-slate-400 dark:hover:text-white rounded-lg"
          >
            <X class="w-4 h-4" />
          </button>
        </form>

        <!-- Live Suggestions Dropdown -->
        <div
          v-if="liveSuggestions.length > 0 && isInputFocused"
          class="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-lg shadow-xl overflow-hidden z-30 text-left divide-y divide-[#e2e2e4] dark:divide-slate-800"
        >
          <button
            v-for="sug in liveSuggestions"
            :key="sug.id"
            @mousedown="setSearch(sug.title); router.push('/cases')"
            class="w-full p-3.5 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 flex items-center justify-between text-xs text-[#1a1c1d] dark:text-slate-200 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-2.5 truncate mr-3">
              <Search class="w-3.5 h-3.5 text-[#0040e5] shrink-0" />
              <span class="font-medium truncate">{{ sug.title }}</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] bg-[#edeef0] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 uppercase font-semibold shrink-0">
              {{ sug.category }}
            </span>
          </button>
        </div>
      </div>

      <!-- Popular Tags Links -->
      <div class="flex flex-wrap justify-center items-center gap-3 text-xs">
        <span class="text-[#575d7a] dark:text-slate-400">Popular:</span>
        <button
          @click="handlePopularClick('Password Reset')"
          class="text-[#0040e5] dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          Password Reset
        </button>
        <button
          @click="handlePopularClick('VPN Setup')"
          class="text-[#0040e5] dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          VPN Setup
        </button>
        <button
          @click="handlePopularClick('Setup Laptop')"
          class="text-[#0040e5] dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          Hardware Request
        </button>
      </div>
    </section>

    <!-- Topic Grid (6 Cards) -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="card in topicCards"
        :key="card.title"
        @click="handleCategoryNavigate(card.id)"
        class="bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-lg p-6 flex flex-col gap-4 hover:shadow-[0_4px_12px_rgba(12,19,44,0.06)] hover:border-[#0040e5] dark:hover:border-indigo-500 transition-all group cursor-pointer"
      >
        <div class="w-12 h-12 rounded-lg bg-[#f3f3f5] dark:bg-slate-800 flex items-center justify-center text-[#0040e5] dark:text-indigo-400 group-hover:bg-[#335dff] group-hover:text-white transition-colors">
          <component :is="card.icon" class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-[#1a1c1d] dark:text-slate-100 group-hover:text-[#0040e5] dark:group-hover:text-indigo-400 transition-colors">
            {{ card.title }}
          </h3>
          <p class="text-sm text-[#434656] dark:text-slate-400 mt-1 leading-relaxed">
            {{ card.description }}
          </p>
        </div>
      </div>
    </section>

    <!-- FAQ Accordions Section -->
    <section class="max-w-3xl mx-auto w-full flex flex-col gap-6">
      <h2 class="text-2xl sm:text-3xl font-bold text-[#1a1c1d] dark:text-slate-100 mb-2">
        Frequently Asked Questions
      </h2>

      <div class="flex flex-col gap-4">
        <div
          v-for="faq in faqs"
          :key="faq.id"
          class="bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-lg overflow-hidden transition-all"
        >
          <!-- Accordion Header Button -->
          <button
            @click="toggleFaq(faq.id)"
            class="w-full flex justify-between items-center p-6 bg-white dark:bg-slate-900 hover:bg-[#f3f3f5] dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
          >
            <span class="text-base font-bold text-[#1a1c1d] dark:text-slate-100 pr-4">
              {{ faq.question }}
            </span>
            <ChevronDown
              class="w-5 h-5 text-[#1a1c1d] dark:text-slate-400 shrink-0 transition-transform duration-300"
              :class="{ 'rotate-180 text-[#0040e5] dark:text-indigo-400': openFaqId === faq.id }"
            />
          </button>

          <!-- Accordion Content -->
          <div
            v-if="openFaqId === faq.id"
            class="px-6 pb-6 bg-white dark:bg-slate-900 text-sm text-[#434656] dark:text-slate-300 border-t border-[#e2e2e4] dark:border-slate-800 pt-4 space-y-4"
          >
            <p v-if="faq.summary" class="leading-relaxed">
              {{ faq.summary }}
            </p>

            <!-- Steps List -->
            <ol v-if="faq.steps" class="list-decimal pl-6 space-y-2 leading-relaxed">
              <li v-for="(step, idx) in faq.steps" :key="idx">
                {{ step }}
              </li>
            </ol>

            <!-- Code Snippet -->
            <div v-if="faq.code" class="p-3 bg-[#edeef0] dark:bg-slate-950 border border-[#c4c5d9] dark:border-slate-800 rounded font-mono text-xs text-[#0040e5] dark:text-indigo-300">
              <code>{{ faq.code }}</code>
            </div>

            <!-- Emergency Box -->
            <div
              v-if="faq.isEmergency"
              class="bg-[#ffdad6] dark:bg-rose-950/40 text-[#93000a] dark:text-rose-200 p-4 rounded-lg flex flex-col gap-2"
            >
              <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle class="w-4 h-4 text-[#ba1a1a] dark:text-rose-400" />
                <span>{{ faq.emergencyTitle }}</span>
              </div>
              <p class="leading-relaxed font-semibold">{{ faq.emergencyText }}</p>
              <p class="text-xs pt-1">{{ faq.details }}</p>
            </div>

            <!-- Action Button inside Accordion -->
            <div v-if="faq.actionLink" class="mt-4 flex gap-4">
              <a
                :href="faq.actionLink"
                target="_blank"
                rel="noopener noreferrer"
                class="bg-[#0040e5] text-white px-4 py-2 rounded text-xs font-medium hover:bg-[#0034bf] transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>{{ faq.actionText }}</span>
                <ExternalLink class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Helpdesk CTA -->
      <div class="text-center mt-8 space-y-4">
        <p class="text-base text-[#434656] dark:text-slate-400">
          Still can't find what you're looking for?
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button
            @click="router.push('/cases')"
            class="bg-[#0040e5] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0034bf] transition-colors shadow-sm hover:shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen class="w-4 h-4" />
            <span>Browse All Cases</span>
          </button>

          <button
            v-if="isCrudUnlocked"
            @click="openCreateDrawer"
            class="bg-white dark:bg-slate-800 text-[#1a1c1d] dark:text-white border border-[#c4c5d9] dark:border-slate-700 px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#f3f3f5] dark:hover:bg-slate-700 transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Submit a Ticket / New Case</span>
          </button>
        </div>
      </div>
    </section>

  </main>
</template>
