<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useAuth } from '@/composables/useAuth'
import { useBookmarks } from '@/composables/useBookmarks'
import NotionTreeSidebar from '@/components/cases/NotionTreeSidebar.vue'
import CaseReader from '@/components/cases/CaseReader.vue'
import { PanelLeft, PanelLeftClose, Menu, X, SearchX } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const {
  cases,
  activeCaseId,
  activeCase,
  fetchCases,
  selectCase,
  searchQuery,
  hasNoSearchResult,
  clearSearch,
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
    class="cases-page w-full flex-1 flex flex-col items-center bg-[#F8FAFC] dark:bg-slate-950 text-[#333333] dark:text-slate-100 py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-200"
  >
    <div
      class="cases-workspace max-w-[1200px] mx-auto w-full h-[calc(100vh-7rem)] overflow-hidden flex relative rounded-2xl border border-[#E5EAEF] dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs"
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
        aria-label="Daftar artikel"
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
            <span class="text-xs font-bold text-[#1a1c1d] dark:text-slate-100">Daftar Dokumen</span>
            <button
              @click="isMobileSidebarOpen = false"
              aria-label="Tutup daftar artikel"
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
              class="hidden md:flex items-center gap-1.5 py-1 px-2 rounded-lg text-[#575d7a] hover:text-[#0040e5] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              :title="isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
            >
              <PanelLeft v-if="isSidebarCollapsed" class="w-4 h-4 text-[#0040e5]" />
              <PanelLeftClose v-else class="w-4 h-4" />
              <span class="font-medium text-[11px]">{{
                isSidebarCollapsed ? 'Show Tree' : 'Hide Tree'
              }}</span>
            </button>

            <!-- Mobile Open Sidebar -->
            <button
              @click="isMobileSidebarOpen = true"
              :aria-expanded="isMobileSidebarOpen"
              aria-label="Buka daftar artikel"
              class="md:hidden flex items-center gap-1.5 py-1 px-2 rounded-lg bg-[#f3f3f5] dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 font-medium"
            >
              <Menu class="w-4 h-4 text-[#0040e5]" />
              <span>Pilih Artikel</span>
            </button>
          </div>
        </div>

        <!-- Main Dynamic Document Reader -->
        <div class="cases-scroll flex-1 overflow-y-auto">
          <!-- No search result state -->
          <div
            v-if="hasNoSearchResult"
            class="cases-no-results h-full flex flex-col items-center justify-center p-8 text-center text-[#575d7a] dark:text-slate-500"
          >
            <div
              class="w-16 h-16 rounded-2xl bg-[#edeef0] dark:bg-slate-900 flex items-center justify-center mb-4"
            >
              <SearchX class="w-8 h-8 text-[#5F7089] dark:text-slate-600" />
            </div>
            <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-300">
              Tidak ada hasil untuk "{{ searchQuery }}"
            </h3>
            <p class="text-xs text-[#575d7a] dark:text-slate-500 mt-1 max-w-sm">
              Artikel / panduan yang Anda cari belum tersedia. Ajukan tiket agar tim IT dapat
              membantu.
            </p>
            <div class="cases-empty-actions flex items-center gap-2 mt-5">
              <button
                @click="clearSearch"
                class="px-4 py-2 rounded-lg text-xs font-semibold border border-[#c4c5d9] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 hover:bg-[#f3f3f5] transition-all cursor-pointer"
              >
                Hapus Pencarian
              </button>
              <button
                @click="goToTicket"
                class="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0040e5] hover:bg-[#0034bf] text-white shadow-xs transition-all cursor-pointer"
              >
                {{ isAuthenticated ? 'Buat Tiket' : 'Masuk untuk Buat Tiket' }}
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
  font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
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
  padding: 10px 16px;
  min-height: 64px;
  flex-shrink: 0;
}
.cases-scroll {
  overscroll-behavior: contain;
}
.cases-page button {
  min-height: 44px;
  min-width: 44px;
}
.cases-toolbar button {
  padding: 10px 12px;
  gap: 8px;
  font-size: 13px;
  border-radius: 10px;
}
.cases-toolbar button span {
  font-size: 13px;
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
  padding: 16px;
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
  font-size: 14px;
  line-height: 1.75;
  margin-top: 12px;
}
.cases-empty-actions {
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
.cases-empty-actions button {
  font-size: 13px;
  padding: 12px 16px;
}
.cases-page button:focus-visible {
  outline: 2px solid #0040e5;
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .cases-workspace,
  .cases-canvas,
  .cases-scroll {
    overflow: visible;
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
@media (prefers-reduced-motion: reduce) {
  .cases-page,
  .cases-page * {
    transition: none;
  }
}
</style>
