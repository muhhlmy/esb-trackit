<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useAuth } from '@/composables/useAuth'
import { useBookmarks } from '@/composables/useBookmarks'
import NotionTreeSidebar from '@/components/cases/NotionTreeSidebar.vue'
import CaseReader from '@/components/cases/CaseReader.vue'
import { PanelLeft, PanelLeftClose, Menu, X, SearchX } from 'lucide-vue-next'

const router = useRouter()
const { activeCase, fetchCases, searchQuery, hasNoSearchResult, clearSearch } = useCases()
const { isAuthenticated } = useAuth()
const { syncBookmarks } = useBookmarks()

const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)

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

onMounted(() => {
  fetchCases()
  syncBookmarks()
})
</script>

<template>
  <div
    class="w-full flex-1 flex flex-col items-center bg-[#F8FAFC] dark:bg-slate-950 text-[#333333] dark:text-slate-100 py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-200"
  >
    <div
      class="max-w-[1200px] mx-auto w-full h-[calc(100vh-7rem)] overflow-hidden flex relative rounded-2xl border border-[#E5EAEF] dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs"
    >
      <!-- Desktop Left Collapsible Notion Tree Sidebar -->
      <div class="hidden md:flex h-full transition-all duration-300">
        <NotionTreeSidebar :is-collapsed="isSidebarCollapsed" @toggle-collapse="toggleSidebar" />
      </div>

      <!-- Mobile Sidebar Drawer (Overlay) -->
      <div v-if="isMobileSidebarOpen" class="md:hidden fixed inset-0 z-50 flex">
        <!-- Backdrop -->
        <div
          @click="isMobileSidebarOpen = false"
          class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        ></div>

        <!-- Drawer Content -->
        <div
          class="relative w-80 max-w-[85vw] bg-white dark:bg-slate-950 h-full shadow-2xl z-10 flex flex-col"
        >
          <div
            class="p-3 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between"
          >
            <span class="text-xs font-bold text-[#1a1c1d] dark:text-slate-100">Daftar Dokumen</span>
            <button
              @click="isMobileSidebarOpen = false"
              class="p-1.5 rounded-lg text-[#575d7a] hover:bg-[#f3f3f5] dark:hover:bg-slate-800"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-hidden" @click="isMobileSidebarOpen = false">
            <NotionTreeSidebar :is-collapsed="false" />
          </div>
        </div>
      </div>

      <!-- Main Canvas Area -->
      <main
        class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950 transition-colors border-l border-[#E5EAEF] dark:border-slate-800"
      >
        <!-- Canvas Top Control Bar (Sidebar Toggle) -->
        <div
          class="px-4 sm:px-8 py-2.5 border-b border-[#e2e2e4] dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-between gap-3 text-xs"
        >
          <div class="flex items-center gap-2">
            <!-- Desktop Toggle Sidebar -->
            <button
              @click="toggleSidebar"
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
              class="md:hidden flex items-center gap-1.5 py-1 px-2 rounded-lg bg-[#f3f3f5] dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 font-medium"
            >
              <Menu class="w-4 h-4 text-[#0040e5]" />
              <span>Pilih Artikel</span>
            </button>
          </div>
        </div>

        <!-- Main Dynamic Document Reader -->
        <div class="flex-1 overflow-y-auto">
          <!-- No search result state -->
          <div
            v-if="hasNoSearchResult"
            class="h-full flex flex-col items-center justify-center p-8 text-center text-[#575d7a] dark:text-slate-500"
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
            <div class="flex items-center gap-2 mt-5">
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
