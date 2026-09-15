<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useBookmarks } from '@/composables/useBookmarks'
import { sanitizeRichTextHtml } from '@/utils/htmlSanitizer'
import {
  Bookmark,
  Edit3,
  HelpCircle,
  MessageSquare,
  User,
  Lightbulb,
  ShieldAlert,
  ChevronRight,
} from 'lucide-vue-next'

const props = defineProps({
  caseItem: {
    type: Object,
    default: null,
  },
})

defineEmits(['edit', 'submitTicket'])

const { isCrudUnlocked } = useAuth()
const { isBookmarked, toggleBookmark } = useBookmarks()

// Sanitasi HTML rich-text sebelum v-html (pertahanan terhadap XSS dari konten
// yang tersimpan di DB / output editor).
const safeContentHtml = computed(() => sanitizeRichTextHtml(props.caseItem?.contentHtml || ''))

const severityClass = computed(() => {
  switch (props.caseItem?.severity?.toLowerCase()) {
    case 'high':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
  }
})
</script>

<template>
  <!-- Empty State -->
  <div
    v-if="!caseItem"
    class="h-full flex flex-col items-center justify-center p-8 text-center text-[#575d7a] dark:text-slate-500"
  >
    <div
      class="w-16 h-16 rounded-2xl bg-[#edeef0] dark:bg-slate-900 flex items-center justify-center mb-4"
    >
      <HelpCircle class="w-8 h-8 text-[#5F7089] dark:text-slate-600" />
    </div>
    <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-300">Pilih Artikel</h3>
    <p class="text-xs text-[#575d7a] dark:text-slate-500 mt-1 max-w-sm">
      Pilih salah satu panduan di panel navigasi pohon sebelah kiri untuk membaca playbook
      dokumentasi lengkap.
    </p>
  </div>

  <!-- Notion Document Canvas -->
  <article
    v-else
    class="h-full overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-4xl mx-auto space-y-8 transition-colors"
  >
    <!-- Notion Breadcrumb Navigation -->
    <nav class="flex items-center gap-1.5 text-xs text-[#575d7a] dark:text-slate-400 font-medium">
      <span class="hover:text-[#0040e5] dark:hover:text-indigo-400 cursor-pointer"
        >Help Center</span
      >
      <ChevronRight class="w-3.5 h-3.5 text-[#5F7089]" />
      <span class="capitalize hover:text-[#0040e5] dark:hover:text-indigo-400 cursor-pointer">
        {{ caseItem.category }}
      </span>
      <ChevronRight class="w-3.5 h-3.5 text-[#5F7089]" />
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
          <span
            class="px-2.5 py-0.5 rounded-full text-xs bg-[#f3f3f5] dark:bg-slate-800 text-[#575d7a] dark:text-slate-300 font-medium capitalize border border-[#e2e2e4] dark:border-slate-700"
          >
            {{ caseItem.category }}
          </span>
        </div>

        <!-- Action Controls (Bookmark & Edit) -->
        <div class="flex items-center gap-2">
          <button
            @click="toggleBookmark(caseItem.id)"
            class="p-2 rounded-lg border border-[#c4c5d9] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-[#575d7a] dark:text-slate-400 hover:text-[#0040e5] transition-colors cursor-pointer"
            :class="{
              'text-[#0040e5] dark:text-indigo-400 border-[#0040e5]/40': isBookmarked(caseItem.id),
            }"
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
      <h1
        class="text-3xl sm:text-4xl font-extrabold text-[#1a1c1d] dark:text-slate-100 tracking-tight leading-tight"
      >
        {{ caseItem.title }}
      </h1>

      <!-- Meta Info Line -->
      <div class="flex items-center gap-4 text-xs text-[#575d7a] dark:text-slate-400 pt-1">
        <div class="flex items-center gap-1.5">
          <User class="w-3.5 h-3.5 text-[#5F7089]" />
          <span>Tim IT</span>
        </div>
      </div>

      <!-- Notion Summary Callout Box -->
      <div
        v-if="caseItem.summary"
        class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs flex items-start gap-3"
      >
        <div
          class="p-2 rounded-lg bg-[#f2f1ff] dark:bg-indigo-500/10 text-[#0040e5] dark:text-indigo-400 shrink-0"
        >
          <Lightbulb class="w-4 h-4" />
        </div>
        <div class="text-xs sm:text-sm text-[#434656] dark:text-slate-300 leading-relaxed pt-0.5">
          <strong class="text-[#1a1c1d] dark:text-slate-200 font-semibold block mb-1"
            >Ringkasan Prosedur:</strong
          >
          {{ caseItem.summary }}
        </div>
      </div>
    </div>

    <!-- TipTap Rich HTML Content Section (Model Dokumen Bebas) -->
    <section
      v-if="safeContentHtml"
      class="doc-body prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
      v-html="safeContentHtml"
    ></section>
    <div
      v-else
      class="p-8 rounded-xl bg-[#f9f9fb] dark:bg-slate-900 border border-[#e2e2e4] dark:border-slate-800 text-center text-xs text-[#575d7a] dark:text-slate-400"
    >
      Dokumen ini belum memiliki isi konten.
    </div>

    <!-- Bottom Escalation Banner (CTA) -->
    <div
      class="p-6 rounded-2xl bg-gradient-to-r from-[#f2f1ff] to-white dark:from-slate-900 dark:to-slate-950 border border-[#c4c5d9] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <div class="space-y-1 text-center sm:text-left">
        <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-100">
          Still need help with this issue?
        </h3>
        <p class="text-xs text-[#575d7a] dark:text-slate-400">
          Tim Helpdesk IT &amp; PBX siap membantu penanganan insiden darurat.
        </p>
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

<style>
/* Rich Document Content Typography & Elements (Model Dokumen Bebas) */
.doc-body h1 {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 800;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  color: #1a1c1d;
}

.doc-body h2 {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #1a1c1d;
}

.doc-body h3 {
  font-size: 1.2rem;
  line-height: 1.75rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1a1c1d;
}

.doc-body p {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.75;
}

.doc-body ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.doc-body ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.doc-body li {
  margin-bottom: 0.375rem;
  line-height: 1.6;
}

.doc-body blockquote {
  border-left: 3px solid #0040e5;
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-style: normal;
  color: #475569;
}

.doc-body pre {
  background-color: #0f172a;
  color: #38bdf8;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  line-height: 1.65;
}

.doc-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background-color: #f1f5f9;
  color: #1a1c1d;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}

.doc-body pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

.doc-body a {
  color: #0040e5;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.doc-body img {
  max-width: 100%;
  border-radius: 0.75rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.doc-body table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.doc-body th,
.doc-body td {
  border: 1px solid #e2e2e4;
  padding: 0.5rem 0.75rem;
}

.doc-body th {
  background-color: #f8fafc;
  font-weight: 600;
}

.dark .doc-body h1,
.dark .doc-body h2,
.dark .doc-body h3 {
  color: #f8fafc;
}

.dark .doc-body blockquote {
  background-color: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
}

.dark .doc-body code {
  background-color: #1e293b;
  color: #f8fafc;
}

.dark .doc-body a {
  color: #818cf8;
}

.dark .doc-body th,
.dark .doc-body td {
  border-color: #334155;
}

.dark .doc-body th {
  background-color: #1e293b;
}
</style>
