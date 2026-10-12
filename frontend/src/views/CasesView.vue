<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useAuth } from '@/composables/useAuth'
import { useBookmarks } from '@/composables/useBookmarks'
import NotionTreeSidebar from '@/components/cases/NotionTreeSidebar.vue'
import CaseReader from '@/components/cases/CaseReader.vue'
import { PanelLeft, PanelLeftClose, Menu, X, SearchX, Printer } from 'lucide-vue-next'
import { useLanguage } from '@/composables/useLanguage.js'

const router = useRouter()
const route = useRoute()
const { t } = useLanguage()
const {
  cases,
  activeCaseId,
  activeCase,
  fetchCases,
  selectCase,
  searchQuery,
  hasNoSearchResult,
  clearSearch,
  isLoading,
} = useCases()
const { isAuthenticated } = useAuth()
const { syncBookmarks } = useBookmarks()

const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)
const isRouteReady = ref(false)

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function goToTicket() {
  if (isAuthenticated.value) {
    router.push('/tickets')
  } else {
    router.push('/login')
  }
}

function handleEditDoc(caseItem) {
  if (caseItem?.id) {
    router.push(`/admin/editor/${caseItem.id}`)
  }
}

function handlePrint() {
  window.print()
}

function selectCaseFromRoute(id) {
  const normalizedId = Number(id)
  if (Number.isSafeInteger(normalizedId) && cases.value.some((item) => item.id === normalizedId)) {
    selectCase(normalizedId)
    return true
  }
  return false
}

watch(
  () => route.params.id,
  (id) => {
    if (isRouteReady.value) selectCaseFromRoute(id)
  },
)

watch(activeCaseId, (id) => {
  if (!isRouteReady.value || !id || Number(route.params.id) === Number(id)) return
  router.replace({ name: 'case-detail', params: { id } })
})

onMounted(async () => {
  const requestedId = route.params.id
  await fetchCases()
  const matchedRequestedCase = selectCaseFromRoute(requestedId)
  isRouteReady.value = true
  if (!matchedRequestedCase && activeCaseId.value) {
    router.replace({ name: 'case-detail', params: { id: activeCaseId.value } })
  }
  syncBookmarks()
})
</script>

<template>
  <div
    class="cases-page w-full flex-1 flex flex-col items-center bg-[#F8FAFC] dark:bg-slate-950 text-[#333333] dark:text-slate-100 py-1 sm:py-2 transition-colors duration-200"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <div
      class="cases-workspace max-w-[1400px] mx-auto w-full h-[calc(100vh-6.5rem)] overflow-hidden flex relative rounded-[6px] border border-[#E5EAEF] dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs"
    >
      <!-- Desktop Left Collapsible Notion Tree Sidebar -->
      <div class="cases-desktop-tree hidden md:flex h-full transition-all duration-300">
        <NotionTreeSidebar :is-collapsed="isSidebarCollapsed" @toggle-collapse="toggleSidebar" />
      </div>

      <!-- Mobile Sidebar Drawer (Overlay) -->
      <div
        v-if="isMobileSidebarOpen"
        class="cases-mobile-tree md:hidden fixed inset-0 z-50 flex"
        role="dialog"
        aria-modal="true"
        :aria-label="t('cases_article_list')"
        @keydown.esc="isMobileSidebarOpen = false"
      >
        <!-- Backdrop -->
        <div
          @click="isMobileSidebarOpen = false"
          class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        ></div>

        <!-- Drawer Content -->
        <div
          class="cases-drawer relative w-80 max-w-[85vw] bg-white dark:bg-slate-950 h-full shadow-2xl z-10 flex flex-col"
        >
          <div
            class="p-3 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between"
          >
            <span class="text-xs font-bold text-[#1a1c1d] dark:text-slate-100">{{ t('kb_doc_list') }}</span>
            <button
              @click="isMobileSidebarOpen = false"
              :aria-label="t('kb_close_sidebar')"
              class="p-1.5 rounded-lg text-[#575d7a] hover:bg-[#f3f3f5] dark:hover:bg-slate-800"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div
            class="flex-1 overflow-hidden"
            @click="$event.target.closest('[data-case-link]') && (isMobileSidebarOpen = false)"
          >
            <NotionTreeSidebar :is-collapsed="false" />
          </div>
        </div>
      </div>

      <!-- Main Canvas Area -->
      <main
        class="cases-canvas flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950 transition-colors border-l border-[#E5EAEF] dark:border-slate-800"
      >
        <!-- Canvas Top Control Bar (Sidebar Toggle) -->
        <div
          class="cases-toolbar px-4 sm:px-8 py-2.5 border-b border-[#e2e2e4] dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-between gap-3 text-xs"
        >
          <div class="flex items-center gap-2">
            <!-- Desktop Toggle Sidebar -->
            <button
              @click="toggleSidebar"
              :aria-expanded="!isSidebarCollapsed"
              class="hidden md:flex items-center gap-1.5 py-1 px-2 rounded-lg text-[#575d7a] hover:text-[#0A51B0] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              :title="isSidebarCollapsed ? t('kb_show_tree') : t('kb_hide_tree')"
            >
              <PanelLeft v-if="isSidebarCollapsed" class="w-4 h-4 text-[#0A51B0]" />
              <PanelLeftClose v-else class="w-4 h-4" />
              <span class="font-medium text-[11px]">{{
                isSidebarCollapsed ? t('kb_show_tree') : t('kb_hide_tree')
              }}</span>
            </button>

            <!-- Mobile Open Sidebar -->
            <button
              @click="isMobileSidebarOpen = true"
              :aria-expanded="isMobileSidebarOpen"
              :aria-label="t('kb_open_sidebar')"
              class="md:hidden flex items-center gap-1.5 py-1 px-2 rounded-lg bg-[#f3f3f5] dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 font-medium"
            >
              <Menu class="w-4 h-4 text-[#0A51B0]" />
              <span>{{ t('kb_select_article') }}</span>
            </button>
          </div>

          <!-- Print Action Button -->
          <button
            @click="handlePrint"
            class="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-[#e2e2e4] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#575d7a] hover:text-[#0A51B0] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors cursor-pointer text-[11px] font-semibold"
            :title="t('kb_print')"
            :aria-label="t('kb_print')"
          >
            <Printer class="w-3.5 h-3.5 text-[#0A51B0]" />
            <span>{{ t('kb_print') }}</span>
          </button>
        </div>

        <!-- Main Dynamic Document Reader -->
        <div class="cases-scroll flex-1 overflow-y-auto">
          <!-- Loading skeleton state -->
          <div v-if="isLoading" class="p-6 sm:p-10 space-y-4 max-w-3xl animate-pulse">
            <div class="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div class="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div class="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded mt-4"></div>
            <div class="h-4 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            <div class="h-40 w-full bg-slate-100 dark:bg-slate-800/40 rounded-lg mt-6"></div>
            <div class="space-y-2.5 mt-6">
              <div class="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              <div class="h-4 w-4/5 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              <div class="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
          </div>

          <!-- No search result state -->
          <div
            v-else-if="hasNoSearchResult"
            class="cases-no-results h-full flex flex-col items-center justify-center p-8 text-center text-[#575d7a] dark:text-slate-500"
          >
            <div
              class="w-12 h-12 rounded-[6px] bg-[#edeef0] dark:bg-slate-900 flex items-center justify-center mb-3"
            >
              <SearchX class="w-6 h-6 text-[#5F7089] dark:text-slate-600" />
            </div>
            <h3 class="text-sm font-semibold text-[#1a1c1d] dark:text-slate-300">
              {{ t('cases_no_results_for') }} "{{ searchQuery }}"
            </h3>
            <p class="text-[11px] text-[#575d7a] dark:text-slate-500 mt-1 max-w-sm">
              {{ t('cases_no_results_desc') }}
            </p>
            <div class="cases-empty-actions flex items-center gap-2 mt-4">
              <button
                @click="clearSearch"
                class="px-3 py-1.5 rounded-[6px] text-xs font-medium border border-[#c4c5d9] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 hover:bg-[#f3f3f5] transition-all cursor-pointer"
              >
                {{ t('clear_search') }}
              </button>
              <button
                @click="goToTicket"
                class="px-3 py-1.5 rounded-[6px] text-xs font-medium bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-xs transition-all cursor-pointer"
              >
                {{ isAuthenticated ? t('btn_create_ticket') : t('sign_in_to_submit') }}
              </button>
            </div>
          </div>

          <CaseReader
            v-else
            :case-item="activeCase"
            @edit="handleEditDoc"
            @submit-ticket="goToTicket"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.cases-page {
  min-width: 0;
  font-family: inherit;
  padding-block: 16px 24px;
}
.cases-workspace {
  width: 100%;
  max-width: 1440px;
  height: auto;
  min-height: min(36rem, 70dvh);
  align-items: stretch;
  box-shadow: 0 12px 36px rgb(30 41 59 / 0.06);
}
.cases-canvas,
.cases-scroll {
  min-width: 0;
}
.cases-canvas {
  border-left: 0;
}
.cases-toolbar {
  padding: 10px 12px;
  min-height: 44px;
  flex-shrink: 0;
}
.cases-scroll {
  overscroll-behavior: contain;
}
/* Ukuran tombol kompak diikuti dari token global; 44px touch target
   hanya untuk layar sentuh (≤767px). */
.cases-toolbar button {
  padding: 5px 10px;
  gap: 6px;
  border-radius: 6px;
}
.cases-drawer {
  max-width: calc(100vw - 32px);
  width: 340px;
}
.cases-drawer > div:first-child button {
  display: grid;
  place-items: center;
}
.cases-drawer > div:first-child {
  padding: 12px;
}
.cases-drawer > div:first-child span {
  font-size: 14px;
}
.cases-no-results {
  min-height: min(400px, 60dvh);
  overflow-wrap: anywhere;
}
.cases-no-results h3 {
  max-width: 40ch;
  line-height: 1.5;
}
.cases-no-results p {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 10px;
}
.cases-empty-actions {
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.cases-empty-actions button {
  padding: 6px 12px;
}
.cases-page button:focus-visible {
  outline: 2px solid #0A51B0;
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .cases-workspace,
  .cases-canvas,
  .cases-scroll {
    overflow: visible;
  }
  .cases-page button {
    min-height: 44px;
    min-width: 44px;
  }
  .cases-empty-actions button {
    flex: 1 1 160px;
  }
}
@media (min-width: 768px) {
  .cases-page {
    padding-block: 24px 32px;
  }
  .cases-workspace {
    height: max(580px, calc(100dvh - 16rem));
  }
  .cases-desktop-tree {
    flex-shrink: 0;
  }
  .cases-toolbar {
    padding-inline: 24px;
  }
}
@media print {
  .cases-desktop-tree,
  .cases-mobile-tree,
  .cases-toolbar,
  nav,
  header {
    display: none !important;
  }
  .cases-page {
    padding: 0 !important;
    background: transparent !important;
  }
  .cases-workspace {
    height: auto !important;
    border: none !important;
    box-shadow: none !important;
  }
  .cases-canvas {
    border: none !important;
  }
  .cases-scroll {
    overflow: visible !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cases-page,
  .cases-page * {
    transition: none;
  }
}
</style>
