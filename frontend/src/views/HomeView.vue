<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useKbCategories } from '@/composables/useKbCategories'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { api } from '@/services/api'
import gsap from 'gsap'
import { isReducedMotion } from '@/composables/useGsap'
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
  Clock,
  TrendingUp,
} from 'lucide-vue-next'

const router = useRouter()
const { cases, isLoading, setSearch, setCategory, hasNoSearchResult, fetchCases } = useCases()
const { publishedCategories, fetchPublicCategories } = useKbCategories()
const { isAuthenticated, isAdmin } = useAuth()
const { t } = useLanguage()

const localSearch = ref('')
const isInputFocused = ref(false)
const openFaqId = ref(null)
const dbFaqs = ref([])
const popularSearches = ref([])

function handleSearchFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) isInputFocused.value = false
}

const defaultPopularSearches = ['Password Reset', 'VPN Setup', 'Hardware Request']
const displayPopularSearches = computed(() => {
  if (Array.isArray(popularSearches.value) && popularSearches.value.length > 0) {
    return popularSearches.value
  }
  return defaultPopularSearches
})

const liveSuggestions = computed(() => {
  if (!localSearch.value.trim()) return []
  const q = localSearch.value.toLowerCase().trim()
  return cases.value
    .filter(
      (c) =>
        (c.title || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q),
    )
    .slice(0, 5)
})

// Featured Article list dari DB (4 pertama, published, diurutkan sesuai sort_order)
const featuredSopList = computed(() =>
  cases.value.slice(0, 4).map((c, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    id: c.id,
    title: c.title,
    summary: c.summary || '',
    category: c.category || 'general',
  })),
)

function handleSearchSubmit() {
  if (localSearch.value.trim()) {
    setSearch(localSearch.value.trim())
    // Tidak ada case yang cocok → arahkan ke login (atau buat tiket bila sudah login)
    if (hasNoSearchResult.value) {
      router.push(isAuthenticated.value ? (isAdmin.value ? '/dashboard' : '/tickets') : '/login')
      return
    }
  }
  router.push('/cases')
}

function handlePopularClick(query) {
  setSearch(query)
  router.push('/cases')
}

function handleCategoryNavigate(categoryKey) {
  setCategory(categoryKey)
  router.push('/cases')
}

function toggleFaq(id) {
  openFaqId.value = openFaqId.value === id ? null : id
}

function handleSupportTicketAction() {
  if (!isAuthenticated.value) {
    router.push({ path: '/login', query: { redirect: '/tickets' } })
  } else if (isAdmin.value) {
    router.push('/dashboard')
  } else {
    router.push('/tickets')
  }
}

// 3 Cards for Browse Topics — dari tabel kb_categories (fallback ke default statis)
const DEFAULT_TOPIC_CARDS = [
  {
    key: 'it-support',
    title: 'IT Support',
    description:
      'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.',
    icon: 'Laptop',
    is_featured: false,
  },
  {
    key: 'hr-people',
    title: 'Human Resources (HR)',
    description:
      'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.',
    icon: 'ShieldCheck',
    is_featured: true,
  },
  {
    key: 'general-affairs',
    title: 'General Affairs (GA)',
    description:
      'Office facility management, physical asset requests, building maintenance, and operational tools.',
    icon: 'Building2',
    is_featured: false,
  },
]

// Map nama icon (string dari DB) ke komponen Lucide
const ICON_COMPONENTS = {
  Laptop,
  AppWindow,
  ShieldCheck,
  Wifi,
  Building2,
  Server,
  HelpCircle,
  Ticket,
}

const topicCards = computed(() => {
  const source = publishedCategories.value.length ? publishedCategories.value : DEFAULT_TOPIC_CARDS
  return source.map((c) => {
    let title = c.title
    let description = c.description || ''

    if (c.key === 'it-support') {
      title = t('topic_it_title', 'IT Support')
      description = t(
        'topic_it_desc',
        'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.',
      )
    } else if (c.key === 'hr-people') {
      title = t('topic_hr_title', 'Human Resources (HR)')
      description = t(
        'topic_hr_desc',
        'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.',
      )
    } else if (c.key === 'general-affairs') {
      title = t('topic_ga_title', 'General Affairs (GA)')
      description = t(
        'topic_ga_desc',
        'Office facility management, physical asset requests, building maintenance, and operational tools.',
      )
    }

    return {
      id: c.key,
      title,
      description,
      icon: ICON_COMPONENTS[c.icon] || HelpCircle,
      isFeatured: Boolean(c.is_featured),
    }
  })
})

const DEFAULT_FAQS = [
  {
    num: '01',
    id: 'faq-1',
    question: 'How do I reset my Google Workspace password?',
    summary:
      'Anda dapat mereset kata sandi akun karyawan melalui Google Admin Console sesuai panduan resmi:',
    steps: [
      'Buka Google Admin Console di browser (admin.google.com).',
      'Cari nama atau email karyawan pada menu Directory > Users.',
      'Klik tombol "Reset Password" dan pilih opsi buat kata sandi secara manual.',
      'Gunakan format kata sandi sementara sesuai panduan resmi IT perusahaan (hubungi IT Administrator jika membutuhkan bantuan).',
      'Pastikan mencentang "Ask user to change their password when they sign in" sebelum menyimpan.',
    ],
    actionText: 'Buka Portal Admin',
    actionLink: 'https://admin.google.com/',
  },
  {
    num: '02',
    id: 'faq-2',
    question: 'How do I bypass Microsoft OOBE on new laptops?',
    summary:
      'Untuk membuat akun lokal tanpa login akun Microsoft online saat layar koneksi jaringan:',
    steps: [
      'Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) di keyboard untuk membuka Command Prompt (CMD).',
      'Ketikkan perintah oobe\\bypassnro lalu tekan Enter.',
      'Laptop akan restart otomatis dan menampilkan opsi setup Local Account offline.',
    ],
    code: 'oobe\\bypassnro',
  },
  {
    num: '03',
    id: 'faq-3',
    question: 'How do I request a 2SV backup code?',
    summary:
      'Untuk mendukung verifikasi tim setelah konfirmasi resmi dari pihak People & Culture (PBX):',
    steps: [
      'Buka Google Admin Console dan cari profil pengguna yang bersangkutan.',
      'Masuk ke menu Security > 2-Step Verification > Get Backup Verification Codes.',
      'Salin minimal 2 (dua) kode verifikasi cadangan.',
      'Kirimkan kode tersebut secara aman via Direct Message kepada pihak PBX berwenang.',
    ],
  },
  {
    num: '04',
    id: 'faq-4',
    question: 'What should I do if my company laptop is lost?',
    isEmergency: true,
    emergencyTitle: 'Tindakan Darurat Diperlukan',
    emergencyText:
      'Jika perangkat kerja hilang atau dicuri, segera laporkan ke Tim IT Support & Security Operations Center (SOC).',
  },
]

// FAQ dari tabel faq (rich content) — fallback ke default statis bila DB kosong
const faqs = computed(() => {
  if (!dbFaqs.value.length) return DEFAULT_FAQS
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
  }))
})

const mainScope = ref(null)

// Muat konten dinamis Help Center: kategori (topic cards), FAQ, popular searches
async function fetchHelpCenterContent() {
  try {
    await fetchPublicCategories()
  } catch {
    /* fallback ke default statis */
  }

  try {
    const data = await api.getPublicFaqs()
    dbFaqs.value = Array.isArray(data) ? data : data?.data || []
  } catch {
    /* fallback ke default statis */
  }

  try {
    const popular = await api.getPopularKbSearches()
    popularSearches.value = Array.isArray(popular) ? popular.map((p) => p.query) : []
  } catch {
    /* popular searches opsional */
  }
}

onMounted(async () => {
  fetchCases()
  fetchHelpCenterContent()
  if (isReducedMotion()) return
  await nextTick()

  if (!mainScope.value) return

  gsap.context(() => {
    gsap.fromTo(
      '.gsap-hero-el',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', clearProps: 'all' },
    )

    gsap.fromTo(
      '.gsap-topic-card',
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
        delay: 0.15,
        clearProps: 'all',
      },
    )

    if (document.querySelector('.gsap-sop-item')) {
      gsap.fromTo(
        '.gsap-sop-item',
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: 'power2.out',
          delay: 0.25,
          clearProps: 'all',
        },
      )
    }

    gsap.fromTo(
      '.gsap-assistance',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.35, clearProps: 'all' },
    )
  }, mainScope.value)
})
</script>

<template>
  <div ref="mainScope" class="help-home page-home-unified-container">
    <main class="help-container">
      <section class="help-hero" aria-labelledby="help-title">
        <div class="hero-copy">
          <span class="eyebrow gsap-hero-el">{{ t('hero_tag') }}</span>
          <h1 id="help-title" class="gsap-hero-el">{{ t('hero_title') }}</h1>
          <p class="hero-description gsap-hero-el">{{ t('hero_subtitle') }}</p>

          <div
            class="search-area gsap-hero-el"
            @focusout="handleSearchFocusOut"
            @keydown.esc="isInputFocused = false"
          >
            <form class="help-search" role="search" @submit.prevent="handleSearchSubmit">
              <Search :size="21" aria-hidden="true" />
              <input
                v-model="localSearch"
                type="search"
                :aria-label="t('search_placeholder')"
                :placeholder="t('search_placeholder')"
                autocomplete="off"
                @focus="isInputFocused = true"
              />
              <button
                v-if="localSearch"
                type="button"
                class="clear-search"
                :aria-label="t('clear_search')"
                @click="localSearch = ''"
              >
                <X :size="18" />
              </button>
              <button type="submit" class="search-submit">
                {{ t('search_btn') }}<ArrowRight :size="16" aria-hidden="true" />
              </button>
            </form>
            <div v-if="liveSuggestions.length && isInputFocused" class="search-suggestions">
              <button
                v-for="suggestion in liveSuggestions"
                :key="suggestion.id"
                type="button"
                @click="handlePopularClick(suggestion.title)"
              >
                <Search :size="16" aria-hidden="true" />
                <span>{{ suggestion.title }}</span
                ><ArrowRight :size="16" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="popular-searches">
            <span><TrendingUp :size="14" aria-hidden="true" />{{ t('popular_searches') }}</span>
            <div>
              <button
                v-for="term in displayPopularSearches"
                :key="term"
                type="button"
                @click="handlePopularClick(term)"
              >
                {{ term }}
              </button>
            </div>
          </div>
        </div>
        <aside class="hero-help gsap-assistance">
          <div class="support-icon">
            <Ticket :size="25" :stroke-width="1.6" aria-hidden="true" />
          </div>
          <h2>{{ t('need_assistance_title') }}</h2>
          <p>{{ t('need_assistance_desc') }}</p>
          <button class="support-button" type="button" @click="handleSupportTicketAction">
            {{
              !isAuthenticated
                ? t('sign_in_to_submit')
                : isAdmin
                  ? t('go_to_dashboard')
                  : t('submit_ticket')
            }}
            <ArrowRight :size="17" aria-hidden="true" />
          </button>
          <div class="support-hours">
            <Clock :size="14" aria-hidden="true" /><span
              >{{ t('work_days') }} · {{ t('work_hours') }}</span
            >
          </div>
        </aside>
      </section>

      <section aria-labelledby="topics-title" class="topics-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">{{ t('help_center') }}</span>
            <h2 id="topics-title">{{ t('browse_topics') }}</h2>
          </div>
          <RouterLink to="/cases" class="text-link"
            >{{ t('view_all_articles') }}<ArrowRight :size="16" aria-hidden="true"
          /></RouterLink>
        </div>
        <div class="topic-grid">
          <button
            v-for="(card, index) in topicCards"
            :key="card.id"
            type="button"
            class="topic-card gsap-topic-card"
            :class="{ 'topic-featured': card.isFeatured }"
            @click="handleCategoryNavigate(card.id)"
          >
            <span class="topic-icon" :class="`topic-tone-${index % 3}`"
              ><component :is="card.icon" :size="23" :stroke-width="1.7" aria-hidden="true"
            /></span>
            <span class="topic-copy"
              ><span class="topic-title">{{ card.title }}</span
              ><span class="topic-description">{{ card.description }}</span></span
            >
            <ArrowRight :size="18" class="topic-arrow" aria-hidden="true" />
          </button>
        </div>
      </section>

      <div class="knowledge-grid">
        <section class="articles-section" aria-labelledby="articles-title">
          <div class="section-heading">
            <div>
              <span class="section-kicker">{{ t('knowledge_guides') }}</span>
              <h2 id="articles-title">{{ t('featured_articles') }}</h2>
            </div>
          </div>
          <div class="article-list">
            <RouterLink
              v-for="article in featuredSopList"
              :key="article.id"
              to="/cases"
              @click="setSearch(article.title)"
              class="article-row gsap-sop-item"
            >
              <span class="article-number">{{ article.num }}</span>
              <div class="article-copy">
                <span class="article-category">{{ article.category }}</span>
                <h3>{{ article.title }}</h3>
                <p v-if="article.summary">{{ article.summary }}</p>
              </div>
              <ArrowRight :size="18" class="article-arrow" aria-hidden="true" />
            </RouterLink>
            <div
              v-if="isLoading && !featuredSopList.length"
              class="article-empty"
              role="status"
              aria-busy="true"
            >
              <p>{{ t('articles_loading') }}</p>
            </div>
            <div v-else-if="!featuredSopList.length" class="article-empty">
              <HelpCircle :size="26" aria-hidden="true" />
              <p>{{ t('articles_empty') }}</p>
            </div>
          </div>
          <RouterLink class="all-articles" to="/cases"
            >{{ t('view_all_sops') }}<ArrowRight :size="16" aria-hidden="true"
          /></RouterLink>
        </section>

        <section class="faq-section" aria-labelledby="faq-title">
          <div class="section-heading">
            <div>
              <span class="section-kicker">{{ t('faq_tag') }}</span>
              <h2 id="faq-title">{{ t('faq_title') }}</h2>
            </div>
          </div>
          <div class="faq-list">
            <div
              v-for="faq in faqs"
              :key="faq.id"
              class="faq-item"
              :class="{ 'faq-open': openFaqId === faq.id }"
            >
              <h3>
                <button
                  type="button"
                  :id="`question-${faq.id}`"
                  :aria-expanded="openFaqId === faq.id"
                  :aria-controls="`answer-${faq.id}`"
                  @click="toggleFaq(faq.id)"
                >
                  <span>{{ faq.question }}</span
                  ><ChevronDown :size="18" aria-hidden="true" />
                </button>
              </h3>
              <div
                v-if="openFaqId === faq.id"
                :id="`answer-${faq.id}`"
                role="region"
                :aria-labelledby="`question-${faq.id}`"
                class="faq-answer"
              >
                <p v-if="faq.summary">{{ faq.summary }}</p>
                <ol v-if="faq.steps">
                  <li v-for="(step, index) in faq.steps" :key="index">{{ step }}</li>
                </ol>
                <pre v-if="faq.code"><code>{{ faq.code }}</code></pre>
                <div v-if="faq.isEmergency" class="faq-emergency">
                  <strong
                    ><AlertTriangle :size="16" aria-hidden="true" />{{ faq.emergencyTitle }}</strong
                  >
                  <p>{{ faq.emergencyText }}</p>
                  <p v-if="faq.details">{{ faq.details }}</p>
                </div>
                <a
                  v-if="faq.actionLink"
                  :href="faq.actionLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-link"
                  >{{ faq.actionText }}<ExternalLink :size="14" aria-hidden="true"
                /></a>
              </div>
            </div>
          </div>
        </section>
      </div>
      <footer class="help-footer">
        <span>ESB TrackIT <span aria-hidden="true">/</span> {{ t('help_center') }}</span
        ><span>{{ t('it_helpdesk') }}</span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.help-home {
  --ink: #172b4d;
  --muted: #64748b;
  --line: #e1e7ef;
  --surface: #fff;
  --canvas: #f5f7fb;
  --blue: #172F52;
  background: var(--canvas);
  color: var(--ink);
  padding: 28px 24px 0;
}
.help-container {
  max-width: 1200px;
  margin: 0 auto;
}
.help-home :is(button, a, input):focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 4px;
}
.help-home button {
  cursor: pointer;
}
.help-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 48px;
  padding: 40px;
  border-radius: 24px;
  background: #142d52;
  color: white;
}
.hero-copy {
  min-width: 0;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #b9cef2;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.eyebrow-line {
  width: 24px;
  height: 2px;
  background: #7faaff;
}
.help-hero h1 {
  max-width: 570px;
  font-size: clamp(30px, 3.5vw, 46px);
  line-height: 1.15;
  font-weight: 750;
  letter-spacing: -0.045em;
  margin: 16px 0 12px;
}
.hero-description {
  max-width: 470px;
  font-size: 14px;
  line-height: 1.75;
  color: #bdcce1;
}
.search-area {
  position: relative;
  margin-top: 24px;
  z-index: 10;
}
.help-search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 7px 7px 17px;
  border-radius: 12px;
  background: white;
  color: #64748b;
  box-shadow: 0 8px 24px #071b3726;
}
.help-search > svg {
  flex-shrink: 0;
}
.help-search input {
  min-width: 0;
  flex: 1;
  height: 42px;
  color: #172b4d;
  font-size: 14px;
  outline: none;
  background: transparent;
}
.help-search input::-webkit-search-cancel-button {
  display: none;
}
.help-search:focus-within {
  outline: 3px solid #8cb4ff;
  outline-offset: 3px;
}
.help-search input:focus-visible {
  outline: none;
}
.search-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  background: #172F52;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
}
.search-submit:hover {
  background: #1d4ed8;
}
.clear-search {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 40px;
}
.search-suggestions {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 18px 35px #071b3726;
}
.search-suggestions button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  text-align: left;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
}
.search-suggestions button:hover {
  background: var(--canvas);
}
.search-suggestions span {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.search-suggestions svg {
  flex-shrink: 0;
}
.popular-searches {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 11px;
  color: #bdcce1;
}
.popular-searches > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.popular-searches > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.popular-searches button {
  padding: 6px 10px;
  border: 1px solid #ffffff26;
  border-radius: 6px;
  color: #dfebff;
  text-align: left;
  overflow-wrap: anywhere;
}
.popular-searches button:hover {
  background: #ffffff12;
  border-color: #8cb4ff;
}
.hero-help {
  border-left: 1px solid #ffffff26;
  padding-left: 32px;
  align-self: center;
}
.support-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid #ffffff30;
  border-radius: 14px;
  color: #abc9ff;
  margin-bottom: 18px;
}
.hero-help h2 {
  font-size: 19px;
  line-height: 1.4;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.hero-help p {
  font-size: 12px;
  line-height: 1.8;
  color: #bdcce1;
  margin: 10px 0 18px;
}
.support-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #6b8bb8;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 650;
  text-align: left;
}
.support-button:hover {
  background: #ffffff10;
}
.support-button svg {
  flex-shrink: 0;
}
.support-hours {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
  color: #bdcce1;
  margin-top: 13px;
}
.topics-section {
  margin-top: 32px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}
.section-kicker {
  display: block;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.section-heading h2 {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.35;
}
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--blue);
  font-size: 12px;
  font-weight: 650;
  min-height: 44px;
}
.text-link svg {
  flex-shrink: 0;
}
.text-link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.topic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.topic-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-align: left;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 22px;
  border-radius: 14px;
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}
.topic-card:hover {
  border-color: #93b4f2;
  box-shadow: 0 5px 18px #172b4d09;
}
.topic-featured {
  border-top: 3px solid #7c9def;
  padding-top: 20px;
}
.topic-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}
.topic-tone-0 {
  background: #edf3ff;
  color: #172F52;
}
.topic-tone-1 {
  background: #f1edff;
  color: #7754c4;
}
.topic-tone-2 {
  background: #e9f6f2;
  color: #19836c;
}
.topic-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding-right: 4px;
}
.topic-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}
.topic-description {
  font-size: 12px;
  line-height: 1.8;
  color: var(--muted);
}
.topic-arrow {
  position: absolute;
  right: 14px;
  top: 16px;
  color: #8fa2ba;
  width: 14px;
}
.knowledge-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 36px;
  margin-top: 38px;
}
.article-list {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.article-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 21px;
  border-bottom: 1px solid var(--line);
}
.article-row:last-child {
  border-bottom: 0;
}
.article-row:hover {
  background: var(--canvas);
}
.article-number {
  font-size: 12px;
  font-weight: 550;
  color: #8c9bb0;
  font-variant-numeric: tabular-nums;
  padding-top: 3px;
}
.article-copy {
  min-width: 0;
  flex: 1;
}
.article-category {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--blue);
  font-weight: 600;
}
.article-copy h3 {
  font-size: 14px;
  line-height: 1.6;
  font-weight: 650;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.article-copy p {
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
  margin-top: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-arrow {
  margin-top: 18px;
  color: #8fa2ba;
  flex-shrink: 0;
}
.article-empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 36px 20px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.all-articles {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  color: var(--blue);
  font-size: 12px;
  font-weight: 650;
  margin-top: 8px;
  border-radius: 8px;
}
.all-articles:hover {
  background: var(--surface);
}
.faq-list {
  border-top: 1px solid var(--line);
}
.faq-item {
  border-bottom: 1px solid var(--line);
}
.faq-item h3 {
  margin: 0;
}
.faq-item h3 button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  padding: 22px 0;
  text-align: left;
  font-size: 13px;
  line-height: 1.7;
  font-weight: 600;
}
.faq-item h3 svg {
  flex-shrink: 0;
  color: #8092ab;
  transition: transform 0.2s;
}
.faq-open h3 button {
  color: var(--blue);
}
.faq-open h3 svg {
  transform: rotate(180deg);
}
.faq-answer {
  padding: 0 6px 22px 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.faq-answer > * + * {
  margin-top: 14px;
}
.faq-answer ol {
  list-style: decimal;
  padding-left: 20px;
}
.faq-answer li + li {
  margin-top: 9px;
}
.faq-answer pre {
  background: #142d52;
  color: #c5f2e1;
  padding: 13px;
  border-radius: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.faq-emergency {
  background: #fff1f2;
  color: #9f1239;
  border-radius: 10px;
  padding: 14px;
}
.faq-emergency strong {
  display: flex;
  align-items: center;
  gap: 7px;
}
.faq-emergency p {
  margin-top: 6px;
}
.help-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 0;
  margin-top: 36px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
}
.help-footer span span {
  margin: 0 9px;
  color: #a3b0c0;
}
:global(.dark) .help-home {
  --ink: #e2e8f0;
  --muted: #a3b1c6;
  --line: #2a3b53;
  --surface: #142136;
  --canvas: #0d1728;
  --blue: #93b4ff;
}
.help-home :is(section, aside) {
  min-width: 0;
}
@media (max-width: 1050px) {
  .help-hero {
    gap: 28px;
    padding: 30px;
    grid-template-columns: minmax(0, 1fr) 240px;
  }
  .hero-help {
    padding-left: 25px;
  }
  .topic-card {
    flex-direction: column;
    padding: 20px;
  }
  .topic-featured {
    padding-top: 18px;
  }
  .knowledge-grid {
    gap: 26px;
  }
}
@media (max-width: 767px) {
  .help-home {
    padding: 18px 16px 0;
  }
  .help-hero {
    grid-template-columns: 1fr;
    padding: 25px 22px;
    border-radius: 18px;
    gap: 26px;
  }
  .hero-help {
    border-left: 0;
    border-top: 1px solid #ffffff26;
    padding: 20px 0 0;
  }
  .support-icon,
  .hero-help p {
    display: none;
  }
  .hero-help h2 {
    font-size: 15px;
    margin-bottom: 12px;
  }
  .support-button {
    width: auto;
    min-width: 200px;
  }
  .help-hero h1 {
    font-size: 34px;
    max-width: 450px;
  }
  .hero-description {
    font-size: 13px;
  }
  .help-search {
    gap: 7px;
    padding-left: 11px;
  }
  .help-search input {
    font-size: 16px;
    width: 100%;
  }
  .search-submit {
    padding: 0 13px;
  }
  .search-submit svg {
    display: none;
  }
  .popular-searches {
    gap: 10px;
  }
  .popular-searches button {
    min-height: 36px;
  }
  .topic-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .topic-card {
    flex-direction: row;
    padding: 18px;
    gap: 14px;
  }
  .topic-featured {
    border-top: 1px solid var(--line);
    border-left: 3px solid #7c9def;
    padding-left: 16px;
  }
  .topic-description {
    font-size: 12px;
  }
  .topic-title {
    padding-right: 12px;
  }
  .topic-arrow {
    top: 22px;
  }
  .knowledge-grid {
    grid-template-columns: 1fr;
    gap: 30px;
    margin-top: 30px;
  }
  .section-heading {
    gap: 12px;
    margin-bottom: 14px;
  }
  .section-heading h2 {
    font-size: 19px;
  }
  .section-heading > .text-link {
    font-size: 11px;
    max-width: 135px;
    line-height: 1.5;
  }
  .section-kicker {
    font-size: 9px;
  }
  .topics-section {
    margin-top: 26px;
  }
  .article-row {
    padding: 18px;
    gap: 13px;
  }
  .help-footer {
    flex-wrap: wrap;
    margin-top: 26px;
    padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  }
}
@media (max-width: 380px) {
  .help-home {
    padding: 12px 12px 0;
  }
  .help-hero {
    padding: 22px 16px;
  }
  .help-hero h1 {
    font-size: 30px;
  }
  .help-search > svg {
    width: 17px;
  }
  .search-submit {
    padding: 0 10px;
  }
  .topic-icon {
    width: 38px;
    height: 38px;
  }
  .topic-card {
    gap: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .help-home *,
  .help-home *::before {
    transition: none !important;
  }
}
</style>
