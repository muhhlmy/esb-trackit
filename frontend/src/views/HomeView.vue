<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useKbCategories } from '@/composables/useKbCategories'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { api } from '@/services/api'
import { animateIn, isReducedMotion } from '@/composables/useGsap'
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
} from 'lucide-vue-next'

const router = useRouter()
const {
  cases,
  isLoading,
  setSearch,
  setCategory,
  hasNoSearchResult,
  fetchCases,
  selectCase,
  clearSearch,
} = useCases()
const { publishedCategories, fetchPublicCategories } = useKbCategories()
const { isAuthenticated, isAdmin } = useAuth()
const { t } = useLanguage()

const localSearch = ref('')
const isInputFocused = ref(false)
const openFaqId = ref(null)
const dbFaqs = ref([])

function handleSearchFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) isInputFocused.value = false
}

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

// Featured articles come only from real published cases. No hardcoded fallback:
// an empty knowledge base shows the section's empty state instead of fabricated
// articles with invented ids.
const featuredSopList = computed(() => {
  return cases.value.slice(0, 4).map((c, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    id: c.id,
    title: c.title,
    summary: c.summary || '',
    category: c.category || 'general',
  }))
})

function handleArticleClick(id) {
  clearSearch()
  if (id) {
    selectCase(id)
  }
}

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
  const source = publishedCategories.value
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

// FAQs come only from the faq table. There is no hardcoded fallback: if the
// table is empty the section is hidden rather than showing fabricated answers.
const faqs = computed(() => {
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

// FAQ dengan urutan baca: emergency → pertanyaan lain (prioritas konten kritis)
const orderedFaqs = computed(() => {
  const list = faqs.value
  return [...list].sort((a, b) => Number(b.isEmergency) - Number(a.isEmergency))
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

}

onMounted(async () => {
  fetchCases()
  fetchHelpCenterContent()
  if (isReducedMotion()) return
  await nextTick()

  if (!mainScope.value) return

  animateIn(mainScope, (gsap) => {
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
  })
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

      <section v-if="topicCards.length" aria-labelledby="topics-title" class="topics-section">
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
              :to="`/cases/${article.id}`"
              @click="handleArticleClick(article.id)"
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

        <section v-if="orderedFaqs.length" class="faq-section" aria-labelledby="faq-title">
          <div class="section-heading">
            <div>
              <span class="section-kicker">{{ t('faq_tag') }}</span>
              <h2 id="faq-title">{{ t('faq_title') }}</h2>
            </div>
          </div>
          <div class="faq-list">
            <div
              v-for="faq in orderedFaqs"
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
  --ink: #1b2537;
  --muted: #5f7089;
  --line: #e6ebf3;
  --surface: #fff;
  --canvas: #f5f7fb;
  --blue: #0a51b0;
  background: var(--canvas);
  color: var(--ink);
  padding: 28px 24px 0;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.help-container {
  max-width: 1200px;
  margin: 0 auto;
}
.help-home :is(button, a, input):focus-visible {
  outline: 3px solid #0892f5;
  outline-offset: 4px;
}
.help-home button {
  cursor: pointer;
}
.help-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 48px;
  padding: 44px 40px 40px;
  border-radius: 24px;
  background: linear-gradient(150deg, #0c58c4 0%, #0a4a9e 45%, #062f66 100%);
  position: relative;
  overflow: hidden;
  color: white;
}
.help-hero::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -60px;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(8, 146, 245, 0.3) 0%, transparent 70%);
  pointer-events: none;
}
.help-hero::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: 20%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 79, 27, 0.12) 0%, transparent 70%);
  pointer-events: none;
}
.hero-copy {
  min-width: 0;
  position: relative;
  z-index: 1;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #cfe2f8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.help-hero h1 {
  max-width: 570px;
  font-size: clamp(32px, 3.5vw, 48px);
  line-height: 1.08;
  font-weight: 700;
  letter-spacing: -0.035em;
  margin: 18px 0 14px;
}
.hero-description {
  max-width: 470px;
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: -0.005em;
  color: #dce8f9;
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
  padding: 7px 7px 7px 18px;
  border-radius: 14px;
  background: white;
  color: #5f7089;
  box-shadow: 0 12px 30px #071b3733;
}
.help-search > svg {
  flex-shrink: 0;
  color: #5f7089;
}
.help-search input {
  min-width: 0;
  flex: 1;
  height: 44px;
  color: var(--ink);
  font-size: 15px;
  letter-spacing: -0.005em;
  outline: none;
  background: transparent;
}
.help-search input::placeholder {
  color: #9aa9bd;
}
.help-search input::-webkit-search-cancel-button {
  display: none;
}
.help-search:focus-within {
  outline: 3px solid #0892f5;
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
  padding: 0 20px;
  background: #0a51b0;
  color: white;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px rgba(10, 81, 176, 0.25);
  transition: all 0.2s ease;
}
.search-submit:hover {
  background: #09428f;
  box-shadow: 0 6px 16px rgba(10, 81, 176, 0.35);
  transform: translateY(-1px);
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
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #cfe2f8;
}
.popular-searches > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.popular-searches > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.popular-searches button {
  padding: 6px 11px;
  border: 1px solid #ffffff26;
  border-radius: 999px;
  color: #e3eefd;
  font-weight: 600;
  text-align: left;
  overflow-wrap: anywhere;
  transition: all 0.18s ease;
}
.popular-searches button:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: #0892f5;
}
.hero-help {
  border-left: 1px solid #ffffff26;
  padding-left: 34px;
  align-self: center;
  position: relative;
  z-index: 1;
}
.support-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(8, 146, 245, 0.4);
  background: rgba(8, 146, 245, 0.15);
  border-radius: 14px;
  color: #4da3ff;
  margin-bottom: 20px;
}
.hero-help h2 {
  font-size: 18px;
  line-height: 1.4;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.hero-help p {
  font-size: 13px;
  line-height: 1.7;
  color: #cfe2f8;
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
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  font-size: 13px;
  font-weight: 650;
  text-align: left;
  transition: all 0.2s ease;
}
.support-button:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: #4da3ff;
}
.support-button svg {
  flex-shrink: 0;
}
.support-hours {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #cfe2f8;
  margin-top: 14px;
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
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 7px;
}
.section-heading h2 {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.3;
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
  border-radius: 16px;
  transition:
    border-color 0.18s,
    box-shadow 0.18s,
    transform 0.18s;
}
.topic-card:hover {
  border-color: #c4d3ec;
  box-shadow: 0 8px 24px rgba(10, 81, 176, 0.08);
  transform: translateY(-2px);
}
.topic-featured {
  border-top: 3px solid #0a51b0;
  padding-top: 20px;
}
.topic-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  flex-shrink: 0;
}
.topic-tone-0 {
  background: #edf5ff;
  color: #0a51b0;
}
.topic-tone-1 {
  background: #fff2e7;
  color: #b83a10;
}
.topic-tone-2 {
  background: #e8f7ff;
  color: #0892f5;
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
  letter-spacing: -0.01em;
  line-height: 1.45;
}
.topic-description {
  font-size: 13px;
  line-height: 1.65;
  color: var(--muted);
}
.topic-arrow {
  position: absolute;
  right: 14px;
  top: 16px;
  color: #5f7089;
  width: 14px;
  transition: transform 0.18s ease;
}
.topic-card:hover .topic-arrow {
  color: var(--blue);
  transform: translateX(2px);
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
  border-radius: 16px;
  overflow: hidden;
}
.article-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px;
  border-bottom: 1px solid var(--line);
  transition: background 0.18s ease;
}
.article-row:last-child {
  border-bottom: 0;
}
.article-row:hover {
  background: #fafcff;
}
.article-number {
  font-size: 12px;
  font-weight: 600;
  color: #5f7089;
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
  letter-spacing: 0.1em;
  color: var(--blue);
  font-weight: 700;
}
.article-copy h3 {
  font-size: 14px;
  line-height: 1.55;
  font-weight: 650;
  letter-spacing: -0.005em;
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.article-copy p {
  font-size: 12px;
  line-height: 1.65;
  color: var(--muted);
  margin-top: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-arrow {
  margin-top: 18px;
  color: #5f7089;
  flex-shrink: 0;
  transition: transform 0.18s ease;
}
.article-row:hover .article-arrow {
  color: var(--blue);
  transform: translateX(2px);
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
  margin-top: 14px;
  padding: 0 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--blue);
  background: var(--surface);
  font-size: 13px;
  font-weight: 650;
  transition: all 0.18s ease;
}
.all-articles:hover {
  border-color: #c4d3ec;
  background: #fafcff;
  box-shadow: 0 4px 14px rgba(10, 81, 176, 0.07);
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
  font-size: 14px;
  line-height: 1.6;
  font-weight: 600;
  letter-spacing: -0.005em;
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
  line-height: 1.75;
  overflow-wrap: anywhere;
}
.faq-answer p {
  white-space: pre-line;
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
  background: #072652;
  border: 1px solid #0a4391;
  color: #c5f2e1;
  padding: 13px;
  border-radius: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.faq-emergency {
  background: #fff1f2;
  color: #9f1239;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  padding: 14px 16px;
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
  font-size: 12px;
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
    font-size: clamp(28px, 8vw, 34px);
    max-width: 450px;
  }
  .hero-description {
    font-size: 13.5px;
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
    font-size: 10px;
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
