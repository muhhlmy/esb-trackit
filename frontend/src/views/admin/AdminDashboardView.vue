<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
  Tag,
  Clock,
  Layers,
  ArrowLeft,
  Flame,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Star,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  GripVertical,
  Filter,
  MinusCircle,
  PlusCircle,
  Sparkles
} from 'lucide-vue-next';

const router = useRouter();
const { cases, deleteCase, fetchCases } = useCases();
const { currentUser } = useAuth();
const { showToast } = useToast();

// Tab state: 'all-articles' | 'homepage-faq'
const activeTab = ref('all-articles');

// Filter & Search states for Tab 1
const searchQuery = ref('');
const selectedCategory = ref('all');

// Modal state for adding article to homepage
const isAddModalOpen = ref(false);
const selectedCaseToAdd = ref('');
const modalSearchQuery = ref('');
const isReordering = ref(false);

function openAddModal() {
  modalSearchQuery.value = '';
  selectedCaseToAdd.value = '';
  isAddModalOpen.value = true;
}

onMounted(async () => {
  await fetchCases({ all: true });
});

const categories = [
  { value: 'all', label: 'Semua Kategori' },
  { value: 'hardware', label: 'Hardware & Equipment' },
  { value: 'software', label: 'Software & Apps' },
  { value: 'security', label: 'Access & Security' },
  { value: 'network', label: 'Network & Connectivity' },
  { value: 'operations', label: 'Operations & Policies' }
];

// Featured cases sorted by homeOrder for Tab 2
const featuredCases = computed(() => {
  return cases.value
    .filter((c) => c.isFeaturedOnHome)
    .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0));
});

// Non-featured cases for Add to Homepage picker with search filter
const filteredUnfeaturedCases = computed(() => {
  const q = modalSearchQuery.value.toLowerCase().trim();
  const list = cases.value.filter((c) => !c.isFeaturedOnHome);
  if (!q) return list;
  return list.filter((c) =>
    (c.title || '').toLowerCase().includes(q) ||
    (c.summary || '').toLowerCase().includes(q) ||
    (c.category || '').toLowerCase().includes(q)
  );
});

// Filtered cases for Tab 1
const filteredAllCases = computed(() => {
  return cases.value.filter((c) => {
    const matchCat = selectedCategory.value === 'all' || c.category === selectedCategory.value;
    if (!matchCat) return false;

    if (!searchQuery.value.trim()) return true;
    const q = searchQuery.value.toLowerCase().trim();
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.summary || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  });
});

// ---------------------------------------------
// FEATURED & REORDER LOGIC
// ---------------------------------------------
async function addCaseToHomepage(caseItem) {
  try {
    const maxOrder = Math.max(0, ...featuredCases.value.map((c) => c.homeOrder ?? 0));
    const nextOrder = featuredCases.value.length > 0 ? maxOrder + 1 : 0;

    await api.updateCase(caseItem.id, {
      isFeaturedOnHome: true,
      homeOrder: nextOrder
    });

    caseItem.isFeaturedOnHome = true;
    caseItem.homeOrder = nextOrder;

    showToast(`"${caseItem.title.slice(0, 35)}..." berhasil ditambahkan ke Homepage FAQ!`, 'success');
    isAddModalOpen.value = false;
    selectedCaseToAdd.value = '';
  } catch (err) {
    showToast('Gagal menambahkan ke Homepage FAQ: ' + err.message, 'error');
  }
}

async function removeCaseFromHomepage(caseItem) {
  try {
    await api.updateCase(caseItem.id, {
      isFeaturedOnHome: false
    });

    caseItem.isFeaturedOnHome = false;
    showToast(`"${caseItem.title.slice(0, 35)}..." dikeluarkan dari Homepage FAQ.`, 'info');
  } catch (err) {
    showToast('Gagal menghapus dari Homepage FAQ: ' + err.message, 'error');
  }
}

async function moveFeaturedCase(index, direction) {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const list = [...featuredCases.value];

  if (targetIndex < 0 || targetIndex >= list.length) return;

  // Swap
  const temp = list[index];
  list[index] = list[targetIndex];
  list[targetIndex] = temp;

  // Re-assign sequential order
  const orders = list.map((c, idx) => {
    c.homeOrder = idx;
    return { id: c.id, homeOrder: idx, isFeaturedOnHome: true };
  });

  isReordering.value = true;
  try {
    await api.reorderHomeCases(orders);
    showToast('Urutan FAQ di Homepage berhasil diperbarui!', 'success');
  } catch (err) {
    showToast('Gagal menyimpan urutan: ' + err.message, 'error');
    await fetchCases();
  } finally {
    isReordering.value = false;
  }
}

// ---------------------------------------------
// DRAG & DROP REORDERING LOGIC
// ---------------------------------------------
const draggedItemIndex = ref(null);
const dragOverIndex = ref(null);

function handleDragStart(index, event) {
  draggedItemIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));
}

function handleDragOver(index, event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  if (dragOverIndex.value !== index) {
    dragOverIndex.value = index;
  }
}

function handleDragLeave(index) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
}

async function handleDrop(targetIndex, event) {
  event.preventDefault();
  const sourceIndex = draggedItemIndex.value;
  draggedItemIndex.value = null;
  dragOverIndex.value = null;

  if (sourceIndex === null || sourceIndex === undefined || sourceIndex === targetIndex) {
    return;
  }

  const list = [...featuredCases.value];
  const [movedItem] = list.splice(sourceIndex, 1);
  list.splice(targetIndex, 0, movedItem);

  // Re-assign sequential order
  const orders = list.map((c, idx) => {
    c.homeOrder = idx;
    return { id: c.id, homeOrder: idx, isFeaturedOnHome: true };
  });

  isReordering.value = true;
  try {
    await api.reorderHomeCases(orders);
    showToast('Urutan FAQ di Homepage berhasil diperbarui via Drag & Drop!', 'success');
  } catch (err) {
    showToast('Gagal menyimpan urutan: ' + err.message, 'error');
    await fetchCases();
  } finally {
    isReordering.value = false;
  }
}

function handleDragEnd() {
  draggedItemIndex.value = null;
  dragOverIndex.value = null;
}

function editDoc(id) {
  router.push(`/admin/editor/${id}`);
}

function createNewDoc() {
  router.push('/admin/editor');
}
</script>

<template>
  <div class="min-h-screen bg-[#F1F5F9] dark:bg-[#0B1120] text-[#1a1c1d] dark:text-slate-100 p-6 md:p-10 font-sans">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Top Navigation & Header -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#c4c5d9] dark:border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-[#0040e5] dark:text-indigo-400 mb-1">
            <RouterLink to="/cases" class="hover:underline flex items-center gap-1">
              <ArrowLeft class="w-3.5 h-3.5" />
              <span>Back to Knowledge Portal</span>
            </RouterLink>
          </div>
          <div class="flex items-center gap-3 mt-1">
            <div class="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#f2f1ff] dark:bg-indigo-500/10 border border-[#c4c5d9] dark:border-indigo-500/20 shrink-0">
              <img src="/ESB Case.svg" alt="ESB Case" class="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-[#1a1c1d] dark:text-slate-100 tracking-tight">
                FAQ Knowledge Base CMS
              </h1>
            </div>
          </div>
          <p class="text-xs sm:text-sm text-[#575d7a] dark:text-slate-400 mt-2">
            Kelola seluruh artikel FAQ, sunting panduan teknis di DocEditor, dan tentukan pertanyaan yang tampil di homepage.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="createNewDoc"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0040e5] hover:bg-[#0034bf] text-white shadow-md shadow-[#0040e5]/20 transition-all cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>Tulis FAQ Baru di DocEditor</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Total Artikel FAQ</span>
          <p class="text-2xl font-bold text-[#1a1c1d] dark:text-slate-100 mt-1">{{ cases.length }}</p>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Tampil di Homepage</span>
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
            <span>{{ featuredCases.length }}</span>
            <span class="text-xs font-normal text-[#575d7a] dark:text-slate-400">Pertanyaan</span>
          </p>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Avg Helpful Ratio</span>
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">98%</p>
        </div>
      </div>

      <!-- 2-TAB SWITCHER NAVIGATION -->
      <div class="flex items-center gap-2 border-b border-[#c4c5d9] dark:border-slate-800">
        <!-- Tab 1: List Semua Artikel -->
        <button
          @click="activeTab = 'all-articles'"
          class="flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer"
          :class="activeTab === 'all-articles'
            ? 'border-[#0040e5] text-[#0040e5] dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
            : 'border-transparent text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200'"
        >
          <FileText class="w-4 h-4" />
          <span>Daftar Seluruh Artikel FAQ</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#f2f1ff] dark:bg-slate-800 text-[#0040e5] dark:text-indigo-300 font-mono">
            {{ cases.length }}
          </span>
        </button>

        <!-- Tab 2: Atur Artikel Homepage -->
        <button
          @click="activeTab = 'homepage-faq'"
          class="flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer"
          :class="activeTab === 'homepage-faq'
            ? 'border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
            : 'border-transparent text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200'"
        >
          <Star class="w-4 h-4" :fill="activeTab === 'homepage-faq' ? 'currentColor' : 'none'" />
          <span>Atur FAQ Homepage</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono">
            {{ featuredCases.length }}
          </span>
        </button>
      </div>

      <!-- ======================================================== -->
      <!-- TAB 1: LIST SELURUH ARTIKEL FAQ                         -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'all-articles'" class="space-y-6">
        <!-- Search & Filter Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <div class="relative w-full sm:w-80">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#575d7a] dark:text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari judul FAQ, solusi, atau tag..."
              class="w-full bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-[#1a1c1d] dark:text-slate-100 focus:outline-none focus:border-[#0040e5]"
            />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              v-model="selectedCategory"
              class="bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-[#1a1c1d] dark:text-slate-100 focus:outline-none focus:border-[#0040e5]"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- All Articles Table -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-[#c4c5d9] dark:border-slate-800 overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs align-middle">
              <thead class="bg-[#f8fafc] dark:bg-slate-950/60 border-b border-[#e2e2e4] dark:border-slate-800 text-[#575d7a] dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th class="py-3.5 px-6">Judul Artikel FAQ</th>
                  <th class="py-3.5 px-4 w-32">Kategori</th>
                  <th class="py-3.5 px-4 w-36">Tags</th>
                  <th class="py-3.5 px-4 w-32">Status Publikasi</th>
                  <th class="py-3.5 px-4 w-36">Status Homepage</th>
                  <th class="py-3.5 px-4 text-center w-52">Interaksi 30 Hari</th>
                  <th class="py-3.5 px-6 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e2e2e4] dark:divide-slate-800">
                <tr
                  v-for="c in filteredAllCases"
                  :key="c.id"
                  class="hover:bg-[#f8fafc] dark:hover:bg-slate-800/50 transition-colors align-middle"
                >
                  <!-- Title & Summary -->
                  <td class="py-4 px-6 align-middle">
                    <div class="font-bold text-[#1a1c1d] dark:text-slate-100 max-w-sm">
                      {{ c.title }}
                    </div>
                    <div class="text-[11px] text-[#575d7a] dark:text-slate-400 line-clamp-1 mt-0.5">
                      {{ c.summary }}
                    </div>
                  </td>

                  <!-- Category -->
                  <td class="py-4 px-4 align-middle">
                    <span class="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f2f1ff] dark:bg-indigo-950/40 text-[#0040e5] dark:text-indigo-400 border border-[#c4c5d9] dark:border-indigo-500/20 capitalize">
                      {{ c.category }}
                    </span>
                  </td>

                  <!-- Tags -->
                  <td class="py-4 px-4 align-middle">
                    <div class="flex flex-wrap gap-1 max-w-xs">
                      <span
                        v-for="t in (c.tags || []).slice(0, 3)"
                        :key="t"
                        class="px-1.5 py-0.5 rounded text-[10px] bg-[#f3f3f5] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 border border-[#e2e2e4] dark:border-slate-700/50"
                      >
                        #{{ t }}
                      </span>
                    </div>
                  </td>

                  <!-- Status Publikasi Badge -->
                  <td class="py-4 px-4 align-middle">
                    <span
                      v-if="c.isPublished !== false"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Published</span>
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>Draft</span>
                    </span>
                  </td>

                  <!-- Status Homepage Badge -->
                  <td class="py-4 px-4 align-middle">
                    <span
                      v-if="c.isFeaturedOnHome"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    >
                      <Star class="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>Featured (#{{ (c.homeOrder ?? 0) + 1 }})</span>
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 text-[11px] text-slate-400"
                    >
                      <span>-</span>
                    </span>
                  </td>

                  <!-- Interactions (Views, Helpful Likes, Dislikes) -->
                  <td class="py-4 px-4 text-center align-middle">
                    <div class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-800 font-mono text-[11px]">
                      <span class="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400" title="Total Views">
                        <Eye class="w-3.5 h-3.5 text-slate-400" />
                        {{ c.stats?.views || 0 }}
                      </span>
                      <span class="text-slate-300 dark:text-slate-700">|</span>
                      <span class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold" title="Membantu (Likes)">
                        <ThumbsUp class="w-3.5 h-3.5 text-emerald-600" />
                        {{ c.stats?.helpful || 0 }}
                      </span>
                      <span class="text-slate-300 dark:text-slate-700">|</span>
                      <span class="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold" title="Kurang Membantu (Dislikes)">
                        <ThumbsDown class="w-3.5 h-3.5 text-rose-500" />
                        {{ c.stats?.unhelpful || 0 }}
                      </span>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6 text-right align-middle">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="editDoc(c.id)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0040e5] text-white hover:bg-[#0034bf] transition-all cursor-pointer shadow-2xs"
                        title="Edit di DocEditor"
                      >
                        <Edit3 class="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        @click="deleteCase(c.id)"
                        class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                        title="Hapus FAQ"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- TAB 2: ATUR ARTIKEL YANG DIMUNCULKAN DI HOMEPAGE         -->
      <!-- ======================================================== -->
      <div v-else class="space-y-6">
        <!-- Tab 2 Header Banner & Action -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[#c4c5d9] dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-bold text-[#1a1c1d] dark:text-slate-100 flex items-center gap-2">
              <Star class="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Pengaturan Urutan FAQ di Homepage Beranda</span>
            </h2>
            <p class="text-xs text-[#575d7a] dark:text-slate-400 mt-1">
              Hanya artikel di bawah ini yang akan muncul pada accordion FAQ di landing page utama. Gunakan tombol Naik (▲) / Turun (▼) untuk mengatur posisi tampil.
            </p>
          </div>

          <button
            @click="openAddModal"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus class="w-4 h-4" />
            <span>Tambah Artikel ke Homepage</span>
          </button>
        </div>

        <!-- Featured List Table with Custom Reordering -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-[#c4c5d9] dark:border-slate-800 overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs align-middle">
              <thead class="bg-[#f8fafc] dark:bg-slate-950/60 border-b border-[#e2e2e4] dark:border-slate-800 text-[#575d7a] dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th class="py-3.5 px-4 text-center w-28">Urutan Tampil</th>
                  <th class="py-3.5 px-6">Judul Artikel FAQ</th>
                  <th class="py-3.5 px-4 w-32">Kategori</th>
                  <th class="py-3.5 px-4 text-center w-52">Interaksi 30 Hari</th>
                  <th class="py-3.5 px-6 text-right w-44">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e2e2e4] dark:divide-slate-800">
                <tr
                  v-for="(c, idx) in featuredCases"
                  :key="c.id"
                  draggable="true"
                  @dragstart="handleDragStart(idx, $event)"
                  @dragover="handleDragOver(idx, $event)"
                  @dragleave="handleDragLeave(idx)"
                  @drop="handleDrop(idx, $event)"
                  @dragend="handleDragEnd"
                  class="transition-all align-middle group cursor-grab active:cursor-grabbing select-none"
                  :class="[
                    draggedItemIndex === idx ? 'opacity-30 bg-amber-100/40 dark:bg-amber-950/20 border-dashed border-2 border-amber-400' : '',
                    dragOverIndex === idx && draggedItemIndex !== idx ? 'bg-amber-50 dark:bg-amber-950/40 border-y-2 border-amber-500' : 'hover:bg-[#f8fafc] dark:hover:bg-slate-800/50'
                  ]"
                >
                  <!-- Position & Drag Grip Icon -->
                  <td class="py-4 px-4 text-center align-middle">
                    <div class="flex items-center justify-center gap-2">
                      <div
                        class="p-1 rounded text-slate-400 group-hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing"
                        title="Tahan dan geser untuk ubah urutan"
                      >
                        <GripVertical class="w-4 h-4" />
                      </div>
                      <span class="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                        #{{ idx + 1 }}
                      </span>
                      <div class="flex flex-col gap-0.5">
                        <button
                          :disabled="idx === 0 || isReordering"
                          @click.stop="moveFeaturedCase(idx, 'up')"
                          class="p-0.5 rounded hover:bg-[#e2e2e4] dark:hover:bg-slate-700 text-[#575d7a] dark:text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Naikkan urutan"
                        >
                          <ArrowUp class="w-3 h-3" />
                        </button>
                        <button
                          :disabled="idx === featuredCases.length - 1 || isReordering"
                          @click.stop="moveFeaturedCase(idx, 'down')"
                          class="p-0.5 rounded hover:bg-[#e2e2e4] dark:hover:bg-slate-700 text-[#575d7a] dark:text-slate-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Turunkan urutan"
                        >
                          <ArrowDown class="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  <!-- Title & Summary -->
                  <td class="py-4 px-6 align-middle">
                    <div class="font-bold text-[#1a1c1d] dark:text-slate-100 max-w-md">
                      {{ c.title }}
                    </div>
                    <div class="text-[11px] text-[#575d7a] dark:text-slate-400 line-clamp-1 mt-0.5">
                      {{ c.summary }}
                    </div>
                  </td>

                  <!-- Category -->
                  <td class="py-4 px-4 align-middle">
                    <span class="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f2f1ff] dark:bg-indigo-950/40 text-[#0040e5] dark:text-indigo-400 border border-[#c4c5d9] dark:border-indigo-500/20 capitalize">
                      {{ c.category }}
                    </span>
                  </td>

                  <!-- Interactions (Views, Likes, Dislikes) -->
                  <td class="py-4 px-4 text-center align-middle">
                    <div class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-800 font-mono text-[11px]">
                      <span class="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400" title="Total Views">
                        <Eye class="w-3.5 h-3.5 text-slate-400" />
                        {{ c.stats?.views || 0 }}
                      </span>
                      <span class="text-slate-300 dark:text-slate-700">|</span>
                      <span class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold" title="Membantu (Likes)">
                        <ThumbsUp class="w-3.5 h-3.5 text-emerald-600" />
                        {{ c.stats?.helpful || 0 }}
                      </span>
                      <span class="text-slate-300 dark:text-slate-700">|</span>
                      <span class="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold" title="Kurang Membantu (Dislikes)">
                        <ThumbsDown class="w-3.5 h-3.5 text-rose-500" />
                        {{ c.stats?.unhelpful || 0 }}
                      </span>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6 text-right align-middle">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="editDoc(c.id)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0040e5] text-white hover:bg-[#0034bf] transition-all cursor-pointer shadow-2xs"
                        title="Edit di DocEditor"
                      >
                        <Edit3 class="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        @click="removeCaseFromHomepage(c)"
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                        title="Keluarkan dari Homepage FAQ"
                      >
                        <MinusCircle class="w-3.5 h-3.5" />
                        <span>Keluarkan</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="featuredCases.length === 0" class="text-center py-12 p-6">
            <Star class="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-50" />
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Belum ada artikel yang dipilih untuk Homepage FAQ. Klik tombol "+ Tambah Artikel ke Homepage" di atas.
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- ======================================================== -->
    <!-- MODAL: PILIH ARTIKEL UNTUK DITAMBAHKAN KE HOMEPAGE       -->
    <!-- ======================================================== -->
    <div
      v-if="isAddModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
        
        <!-- Modal Header -->
        <div class="p-5 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Star class="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-100">
              Tambah Artikel ke Homepage FAQ
            </h3>
          </div>
          <button
            @click="isAddModalOpen = false"
            class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4 text-xs">
          <p class="text-slate-600 dark:text-slate-400">
            Pilih salah satu artikel FAQ yang belum tampil di homepage untuk dijadikan pertanyaan featured:
          </p>

          <!-- Modal Search Bar -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#575d7a] dark:text-slate-400 pointer-events-none" />
            <input
              v-model="modalSearchQuery"
              type="text"
              placeholder="Cari judul FAQ, kategori, atau topik..."
              class="w-full bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#1a1c1d] dark:text-slate-100 placeholder-[#64748b] dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
            />
            <button
              v-if="modalSearchQuery"
              @click="modalSearchQuery = ''"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <div
              v-for="unf in filteredUnfeaturedCases"
              :key="unf.id"
              @click="selectedCaseToAdd = unf.id"
              class="p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3"
              :class="selectedCaseToAdd === unf.id
                ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                : 'bg-[#f8fafc] dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400'"
            >
              <div>
                <p class="font-bold text-slate-800 dark:text-slate-100">{{ unf.title }}</p>
                <span class="text-[10px] text-slate-500 capitalize">{{ unf.category }} &bull; {{ unf.summary?.slice(0, 50) }}...</span>
              </div>
              <Check v-if="selectedCaseToAdd === unf.id" class="w-4 h-4 text-amber-600 shrink-0" />
            </div>

            <div v-if="filteredUnfeaturedCases.length === 0" class="text-center py-6 text-slate-400">
              <span v-if="modalSearchQuery">Tidak ada artikel yang cocok dengan kata kunci "{{ modalSearchQuery }}".</span>
              <span v-else>Seluruh artikel FAQ sudah ditampilkan di Homepage.</span>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-[#e2e2e4] dark:border-slate-800 flex items-center justify-end gap-3 bg-[#f8fafc] dark:bg-slate-950/40">
          <button
            @click="isAddModalOpen = false"
            class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            :disabled="!selectedCaseToAdd"
            @click="addCaseToHomepage(cases.find(c => c.id === selectedCaseToAdd))"
            class="px-5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Tambahkan ke Homepage</span>
          </button>
        </div>

      </div>
    </div>

  </div>
</template>
