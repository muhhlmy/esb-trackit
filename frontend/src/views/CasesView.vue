<script setup>
import { ref, onMounted } from 'vue';
import { useCases } from '@/composables/useCases';
import NotionTreeSidebar from '@/components/cases/NotionTreeSidebar.vue';
import CaseReader from '@/components/cases/CaseReader.vue';
import CaseDrawer from '@/components/cases/CaseDrawer.vue';
import { PanelLeft, PanelLeftClose, Menu, X, ArrowLeft } from 'lucide-vue-next';

const {
  activeCase,
  openEditDrawer,
  openCreateDrawer,
  fetchCases
} = useCases();

const isSidebarCollapsed = ref(false);
const isMobileSidebarOpen = ref(false);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

onMounted(() => {
  fetchCases();
});
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#f9f9fb] dark:bg-slate-950 transition-colors relative">
    
    <!-- Desktop Left Collapsible Notion Tree Sidebar -->
    <div class="hidden md:flex h-full transition-all duration-300">
      <NotionTreeSidebar
        :is-collapsed="isSidebarCollapsed"
        @toggle-collapse="toggleSidebar"
      />
    </div>

    <!-- Mobile Sidebar Drawer (Overlay) -->
    <div
      v-if="isMobileSidebarOpen"
      class="md:hidden fixed inset-0 z-50 flex"
    >
      <!-- Backdrop -->
      <div
        @click="isMobileSidebarOpen = false"
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
      ></div>

      <!-- Drawer Content -->
      <div class="relative w-80 max-w-[85vw] bg-white dark:bg-slate-950 h-full shadow-2xl z-10 flex flex-col">
        <div class="p-3 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between">
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
    <main class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950 transition-colors">
      
      <!-- Canvas Top Control Bar (Sidebar Toggle & Quick Action) -->
      <div class="px-4 sm:px-8 py-2.5 border-b border-[#e2e2e4] dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2">
          <!-- Desktop Toggle Sidebar -->
          <button
            @click="toggleSidebar"
            class="hidden md:flex items-center gap-1.5 py-1 px-2 rounded-lg text-[#575d7a] hover:text-[#0040e5] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            :title="isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
          >
            <PanelLeft v-if="isSidebarCollapsed" class="w-4 h-4 text-[#0040e5]" />
            <PanelLeftClose v-else class="w-4 h-4" />
            <span class="font-medium text-[11px]">{{ isSidebarCollapsed ? 'Show Tree' : 'Hide Tree' }}</span>
          </button>

          <!-- Mobile Open Sidebar -->
          <button
            @click="isMobileSidebarOpen = true"
            class="md:hidden flex items-center gap-1.5 py-1 px-2 rounded-lg bg-[#f3f3f5] dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 font-medium"
          >
            <Menu class="w-4 h-4 text-[#0040e5]" />
            <span>Pilih SOP</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="openCreateDrawer"
            class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#f2f1ff] dark:bg-indigo-950/40 text-[#0040e5] dark:text-indigo-300 font-semibold border border-[#c4c5d9] dark:border-indigo-500/30 hover:bg-[#edeef0] transition-colors cursor-pointer"
          >
            <span>+ New Doc</span>
          </button>
        </div>
      </div>

      <!-- Main Dynamic Document Reader -->
      <div class="flex-1 overflow-y-auto">
        <CaseReader
          :case-item="activeCase"
          @edit="openEditDrawer"
          @submit-ticket="openCreateDrawer"
        />
      </div>

    </main>

    <!-- Side Drawer for Create/Edit -->
    <CaseDrawer />
  </div>
</template>
