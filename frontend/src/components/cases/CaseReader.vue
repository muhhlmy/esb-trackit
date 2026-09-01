<script setup>
import { ref, computed } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useBookmarks } from '@/composables/useBookmarks';
import { useToast } from '@/composables/useToast';
import {
  Bookmark,
  Edit3,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  HelpCircle,
  Terminal,
  MessageSquare,
  User,
  Lightbulb,
  ShieldAlert,
  ChevronRight
} from 'lucide-vue-next';

const props = defineProps({
  caseItem: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['edit', 'submitTicket']);

const { isCrudUnlocked } = useAuth();
const { isBookmarked, toggleBookmark } = useBookmarks();
const { showToast } = useToast();

const copiedSnippetIndex = ref(null);
const checkedSteps = ref({});

function copySnippet(code, index) {
  navigator.clipboard.writeText(code);
  copiedSnippetIndex.value = index;
  showToast('Snippet / Perintah disalin ke clipboard!', 'success');
  setTimeout(() => {
    copiedSnippetIndex.value = null;
  }, 2000);
}

function toggleStepCheck(idx) {
  checkedSteps.value[idx] = !checkedSteps.value[idx];
}

const severityClass = computed(() => {
  switch (props.caseItem?.severity?.toLowerCase()) {
    case 'high':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    default:
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  }
});
</script>

<template>
  <!-- Empty State -->
  <div v-if="!caseItem" class="h-full flex flex-col items-center justify-center p-8 text-center text-[#575d7a] dark:text-slate-500">
    <div class="w-16 h-16 rounded-2xl bg-[#edeef0] dark:bg-slate-900 flex items-center justify-center mb-4">
      <HelpCircle class="w-8 h-8 text-[#64748b] dark:text-slate-600" />
    </div>
    <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-300">Pilih Dokumen SOP</h3>
    <p class="text-xs text-[#575d7a] dark:text-slate-500 mt-1 max-w-sm">
      Pilih salah satu panduan di panel navigasi pohon sebelah kiri untuk membaca playbook dokumentasi lengkap.
    </p>
  </div>

  <!-- Notion Document Canvas -->
  <article v-else class="h-full overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-4xl mx-auto space-y-8 transition-colors">
    
    <!-- Notion Breadcrumb Navigation -->
    <nav class="flex items-center gap-1.5 text-xs text-[#575d7a] dark:text-slate-400 font-medium">
      <span class="hover:text-[#0040e5] dark:hover:text-indigo-400 cursor-pointer">Help Center</span>
      <ChevronRight class="w-3.5 h-3.5 text-[#64748b]" />
      <span class="capitalize hover:text-[#0040e5] dark:hover:text-indigo-400 cursor-pointer">
        {{ caseItem.category }}
      </span>
      <ChevronRight class="w-3.5 h-3.5 text-[#64748b]" />
      <span class="text-[#1a1c1d] dark:text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">
        {{ caseItem.title }}
      </span>
    </nav>

    <!-- Document Header Banner -->
    <div class="border-b border-[#e2e2e4] dark:border-slate-800 pb-6 space-y-4">
      
      <div class="flex items-center justify-between gap-3">
        <!-- Severity & Tag Badges -->
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border flex items-center gap-1.5"
            :class="severityClass"
          >
            <ShieldAlert class="w-3 h-3" />
            {{ caseItem.severity }} Priority
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-xs bg-[#f3f3f5] dark:bg-slate-800 text-[#575d7a] dark:text-slate-300 font-medium capitalize border border-[#e2e2e4] dark:border-slate-700">
            {{ caseItem.category }}
          </span>
        </div>

        <!-- Action Controls (Bookmark & Edit) -->
        <div class="flex items-center gap-2">
          <button
            @click="toggleBookmark(caseItem.id)"
            class="p-2 rounded-lg border border-[#c4c5d9] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-[#575d7a] dark:text-slate-400 hover:text-[#0040e5] transition-colors cursor-pointer"
            :class="{ 'text-[#0040e5] dark:text-indigo-400 border-[#0040e5]/40': isBookmarked(caseItem.id) }"
            title="Bookmark this doc"
          >
            <Bookmark class="w-4 h-4" :fill="isBookmarked(caseItem.id) ? 'currentColor' : 'none'" />
          </button>

          <button
            v-if="isCrudUnlocked"
            @click="$emit('edit', caseItem)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c4c5d9] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#f3f3f5] dark:hover:bg-slate-700 text-xs font-semibold text-[#1a1c1d] dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
          >
            <Edit3 class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400" />
            <span>Edit Document</span>
          </button>
        </div>
      </div>

      <!-- Main Title -->
      <h1 class="text-3xl sm:text-4xl font-extrabold text-[#1a1c1d] dark:text-slate-100 tracking-tight leading-tight">
        {{ caseItem.title }}
      </h1>

      <!-- Meta Info Line -->
      <div class="flex items-center gap-4 text-xs text-[#575d7a] dark:text-slate-400 pt-1">
        <div class="flex items-center gap-1.5">
          <User class="w-3.5 h-3.5 text-[#64748b]" />
          <span>Tim IT</span>
        </div>
      </div>

      <!-- Notion Summary Callout Box -->
      <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs flex items-start gap-3">
        <div class="p-2 rounded-lg bg-[#f2f1ff] dark:bg-indigo-500/10 text-[#0040e5] dark:text-indigo-400 shrink-0">
          <Lightbulb class="w-4 h-4" />
        </div>
        <div class="text-xs sm:text-sm text-[#434656] dark:text-slate-300 leading-relaxed pt-0.5">
          <strong class="text-[#1a1c1d] dark:text-slate-200 font-semibold block mb-1">Ringkasan Prosedur:</strong>
          {{ caseItem.summary }}
        </div>
      </div>
    </div>

    <!-- TipTap Rich HTML Content Section (if available) -->
    <section v-if="caseItem.contentHtml" class="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed" v-html="caseItem.contentHtml">
    </section>

    <!-- Problem Context Section -->
    <section v-else-if="caseItem.problemContext" class="space-y-2">
      <h2 class="text-sm font-bold text-[#1a1c1d] dark:text-slate-200 uppercase tracking-wider">
        Background &amp; Skenario Kendala
      </h2>
      <div class="p-4 rounded-xl bg-[#f9f9fb] dark:bg-slate-900/60 border border-[#e2e2e4] dark:border-slate-800 text-xs sm:text-sm text-[#434656] dark:text-slate-300 leading-relaxed">
        {{ caseItem.problemContext }}
      </div>
    </section>

    <!-- Standard Operating Procedure Steps -->
    <section v-if="caseItem.actionSteps && caseItem.actionSteps.length" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-[#1a1c1d] dark:text-slate-200">
          Langkah Penyelesaian (Action Steps)
        </h2>
        <span class="text-xs text-[#575d7a] dark:text-slate-400 font-mono">
          {{ Object.values(checkedSteps).filter(Boolean).length }} / {{ caseItem.actionSteps.length }} Selesai
        </span>
      </div>

      <div class="space-y-2.5">
        <div
          v-for="(step, idx) in caseItem.actionSteps"
          :key="idx"
          @click="toggleStepCheck(idx)"
          class="flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer group"
          :class="checkedSteps[idx]
            ? 'bg-[#f2f1ff] dark:bg-indigo-950/20 border-[#0040e5]/40 opacity-75'
            : 'bg-white dark:bg-slate-900/80 border-[#c4c5d9] dark:border-slate-800 hover:border-[#0040e5] dark:hover:border-slate-700 shadow-2xs'"
        >
          <!-- Checkbox / Number -->
          <button
            type="button"
            class="shrink-0 mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors text-xs font-bold"
            :class="checkedSteps[idx]
              ? 'bg-[#0040e5] border-[#0040e5] text-white'
              : 'border-[#c4c5d9] dark:border-slate-700 bg-[#f9f9fb] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 group-hover:border-[#0040e5]'"
          >
            <Check v-if="checkedSteps[idx]" class="w-3 h-3" />
            <span v-else>{{ idx + 1 }}</span>
          </button>

          <!-- Step Content -->
          <div
            class="text-xs sm:text-sm leading-relaxed"
            :class="checkedSteps[idx] ? 'line-through text-[#64748b]' : 'text-[#1a1c1d] dark:text-slate-300'"
          >
            {{ step }}
          </div>
        </div>
      </div>
    </section>

    <!-- DOs & DON'Ts Comparison -->
    <section
      v-if="(caseItem.dosAndDonts?.dos?.length) || (caseItem.dosAndDonts?.donts?.length)"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <!-- DOs -->
      <div v-if="caseItem.dosAndDonts?.dos?.length" class="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/25 space-y-3">
        <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <CheckCircle class="w-4 h-4" />
          <span>Best Practices (DOs)</span>
        </div>
        <ul class="space-y-2 text-xs text-emerald-950 dark:text-emerald-200">
          <li v-for="(doItem, idx) in caseItem.dosAndDonts.dos" :key="idx" class="flex items-start gap-2">
            <span class="text-emerald-600 font-bold">•</span>
            <span>{{ doItem }}</span>
          </li>
        </ul>
      </div>

      <!-- DON'Ts -->
      <div v-if="caseItem.dosAndDonts?.donts?.length" class="p-4 rounded-xl bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/25 space-y-3">
        <div class="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
          <XCircle class="w-4 h-4" />
          <span>Peringatan (DON'Ts)</span>
        </div>
        <ul class="space-y-2 text-xs text-rose-950 dark:text-rose-200">
          <li v-for="(dontItem, idx) in caseItem.dosAndDonts.donts" :key="idx" class="flex items-start gap-2">
            <span class="text-rose-600 font-bold">•</span>
            <span>{{ dontItem }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Code / Command Snippets -->
    <section v-if="caseItem.snippets && caseItem.snippets.length" class="space-y-3">
      <div class="flex items-center gap-2 text-[#1a1c1d] dark:text-slate-200 font-bold text-sm">
        <Terminal class="w-4 h-4 text-[#0040e5] dark:text-indigo-400" />
        <h2>Commands &amp; Code Blocks</h2>
      </div>

      <div
        v-for="(snip, idx) in caseItem.snippets"
        :key="idx"
        class="rounded-xl border border-[#c4c5d9] dark:border-slate-800 bg-[#edeef0] dark:bg-slate-950 overflow-hidden shadow-2xs"
      >
        <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-[#e2e2e4] dark:border-slate-800 text-xs text-[#575d7a] dark:text-slate-400">
          <span class="font-mono font-semibold text-[#1a1c1d] dark:text-slate-300">{{ snip.label || 'Code Snippet' }}</span>
          <button
            @click="copySnippet(snip.code, idx)"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f3f3f5] hover:bg-[#e2e2e4] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1a1c1d] dark:text-slate-200 transition-colors cursor-pointer text-xs"
          >
            <Check v-if="copiedSnippetIndex === idx" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ copiedSnippetIndex === idx ? 'Tersalin' : 'Copy' }}</span>
          </button>
        </div>
        <pre class="p-4 text-xs font-mono text-[#1a1c1d] dark:text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ snip.code }}</pre>
      </div>
    </section>

    <!-- Bottom Escalation Banner (CTA) -->
    <div class="p-6 rounded-2xl bg-gradient-to-r from-[#f2f1ff] to-white dark:from-slate-900 dark:to-slate-950 border border-[#c4c5d9] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="space-y-1 text-center sm:text-left">
        <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-100">Still need help with this issue?</h3>
        <p class="text-xs text-[#575d7a] dark:text-slate-400">Tim Helpdesk IT &amp; PBX siap membantu penanganan insiden darurat.</p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="$emit('submitTicket')"
          class="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#0040e5] hover:bg-[#0034bf] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <MessageSquare class="w-3.5 h-3.5" />
          <span>Submit a Ticket</span>
        </button>
      </div>
    </div>

  </article>
</template>
