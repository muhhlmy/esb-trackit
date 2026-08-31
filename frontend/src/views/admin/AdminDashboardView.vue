<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
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
  AlertCircle
} from 'lucide-vue-next';

const router = useRouter();
const { cases, deleteCase, fetchCases } = useCases();
const { currentUser } = useAuth();

const searchQuery = ref('');
const selectedCategory = ref('all');

onMounted(() => {
  fetchCases();
});

const filteredCases = computed(() => {
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
          <h1 class="text-2xl sm:text-3xl font-extrabold text-[#1a1c1d] dark:text-slate-100 tracking-tight">
            Knowledge Base CMS
          </h1>
          <p class="text-xs sm:text-sm text-[#575d7a] dark:text-slate-400 mt-1">
            Kelola, edit, dan publikasikan panduan SOP engineering dan incident playbook internal kantor.
          </p>
        </div>

        <button
          @click="createNewDoc"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0040e5] hover:bg-[#0034bf] text-white shadow-md shadow-[#0040e5]/20 transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Create New SOP in DocEditor</span>
        </button>
      </div>

      <!-- Quick Metrics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Total SOP Documents</span>
          <p class="text-2xl font-bold text-[#1a1c1d] dark:text-slate-100 mt-1">{{ cases.length }}</p>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Published Articles</span>
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ cases.length }}</p>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Custom Articles</span>
          <p class="text-2xl font-bold text-[#0040e5] dark:text-indigo-400 mt-1">
            {{ cases.filter(c => c.isCustom).length }}
          </p>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
          <span class="text-xs text-[#575d7a] dark:text-slate-400 font-medium">Avg Helpful Ratio</span>
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">96%</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-[#c4c5d9] dark:border-slate-800 shadow-2xs">
        <div class="relative w-full sm:w-80">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#575d7a] dark:text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari judul SOP atau tag..."
            class="w-full bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-[#1a1c1d] dark:text-slate-100 focus:outline-none focus:border-[#0040e5]"
          />
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            v-model="selectedCategory"
            class="bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-[#1a1c1d] dark:text-slate-100 focus:outline-none focus:border-[#0040e5]"
          >
            <option value="all">Semua Kategori</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="git">Git</option>
            <option value="workplace">Workplace</option>
            <option value="environment">Environment</option>
            <option value="backend">Backend</option>
          </select>
        </div>
      </div>

      <!-- Articles Data Table -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-[#c4c5d9] dark:border-slate-800 overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#f8fafc] dark:bg-slate-950/60 border-b border-[#e2e2e4] dark:border-slate-800 text-[#575d7a] dark:text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th class="py-3.5 px-6">Judul Dokumentasi</th>
                <th class="py-3.5 px-4">Kategori</th>
                <th class="py-3.5 px-4">Severity</th>
                <th class="py-3.5 px-4">Tags</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e2e4] dark:divide-slate-800">
              <tr
                v-for="c in filteredCases"
                :key="c.id"
                class="hover:bg-[#f8fafc] dark:hover:bg-slate-800/50 transition-colors"
              >
                <!-- Title -->
                <td class="py-4 px-6">
                  <div class="font-bold text-[#1a1c1d] dark:text-slate-100 max-w-sm">
                    {{ c.title }}
                  </div>
                  <div class="text-[11px] text-[#575d7a] dark:text-slate-400 line-clamp-1 mt-0.5">
                    {{ c.summary }}
                  </div>
                </td>

                <!-- Category -->
                <td class="py-4 px-4">
                  <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f2f1ff] dark:bg-indigo-950/40 text-[#0040e5] dark:text-indigo-400 border border-[#c4c5d9] dark:border-indigo-500/20 capitalize">
                    {{ c.category }}
                  </span>
                </td>

                <!-- Severity -->
                <td class="py-4 px-4">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] uppercase font-bold border"
                    :class="{
                      'bg-rose-50 text-rose-700 border-rose-200': c.severity === 'high',
                      'bg-amber-50 text-amber-700 border-amber-200': c.severity === 'medium',
                      'bg-emerald-50 text-emerald-700 border-emerald-200': c.severity === 'low'
                    }"
                  >
                    {{ c.severity }}
                  </span>
                </td>

                <!-- Tags -->
                <td class="py-4 px-4">
                  <div class="flex flex-wrap gap-1 max-w-xs">
                    <span
                      v-for="t in (c.tags || []).slice(0, 2)"
                      :key="t"
                      class="px-1.5 py-0.5 rounded text-[10px] bg-[#f3f3f5] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400"
                    >
                      #{{ t }}
                    </span>
                  </div>
                </td>

                <!-- Status -->
                <td class="py-4 px-4">
                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle class="w-3.5 h-3.5" />
                    <span>Published</span>
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-4 px-6 text-right space-x-2">
                  <button
                    @click="editDoc(c.id)"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0040e5] text-white hover:bg-[#0034bf] transition-colors cursor-pointer shadow-2xs"
                    title="Edit in DocEditor"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    @click="deleteCase(c.id)"
                    class="p-1.5 rounded-lg text-[#575d7a] hover:text-rose-600 hover:bg-[#f3f3f5] transition-colors cursor-pointer"
                    title="Delete Article"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>
