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

const { hasWritePermission } = useAuth()
const canEditKnowledgeBase = computed(() => hasWritePermission('knowledge_base'))
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
    class="case-reader-empty h-full flex flex-col items-center justify-center p-8 text-center text-[#575d7a] dark:text-slate-500"
  >
    <div
      class="w-16 h-16 rounded-2xl bg-[#edeef0] dark:bg-slate-900 flex items-center justify-center mb-4"
    >
      <HelpCircle class="w-8 h-8 text-[#5F7089] dark:text-slate-600" />
    </div>
    <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-300">Pilih Artikel</h3>
    <p class="text-xs text-[#575d7a] dark:text-slate-500 mt-1 max-w-sm">
      Pilih panduan dari daftar artikel untuk membaca dokumentasi lengkap.
    </p>
  </div>

  <!-- Notion Document Canvas -->
  <article
    v-else
    class="case-reader px-6 py-8 md:px-12 md:py-10 max-w-4xl mx-auto space-y-8 transition-colors"
  >
    <!-- Notion Breadcrumb Navigation -->
    <nav
      aria-label="Lokasi artikel"
      class="case-breadcrumb flex items-center gap-1.5 text-xs text-[#575d7a] dark:text-slate-400 font-medium"
    >
      <span>Help Center</span>
      <ChevronRight class="w-3.5 h-3.5 text-[#5F7089]" />
      <span class="capitalize">
        {{ caseItem.category }}
      </span>
      <ChevronRight class="w-3.5 h-3.5 text-[#5F7089]" />
      <span class="text-[#1a1c1d] dark:text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">
        {{ caseItem.title }}
      </span>
    </nav>

    <!-- Document Header Banner -->
    <div
      class="case-document-header border-b border-[#e2e2e4] dark:border-slate-800 pb-6 space-y-4"
    >
      <div class="case-document-controls flex items-center justify-between gap-3">
        <!-- Severity & Tag Badges -->
        <div class="case-badges flex items-center gap-2">
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
        <div class="case-actions flex items-center gap-2">
          <button
            @click="toggleBookmark(caseItem.id)"
            class="p-2 rounded-lg border border-[#c4c5d9] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-[#575d7a] dark:text-slate-400 hover:text-[#0A51B0] transition-colors cursor-pointer"
            :class="{
              'text-[#0A51B0] dark:text-blue-400 border-[#0A51B0]/40': isBookmarked(caseItem.id),
            }"
            :title="isBookmarked(caseItem.id) ? 'Hapus bookmark' : 'Simpan bookmark'"
            :aria-label="isBookmarked(caseItem.id) ? 'Hapus bookmark' : 'Simpan bookmark'"
            :aria-pressed="isBookmarked(caseItem.id)"
          >
            <Bookmark class="w-4 h-4" :fill="isBookmarked(caseItem.id) ? 'currentColor' : 'none'" />
          </button>

          <button
            v-if="canEditKnowledgeBase"
            @click="$emit('edit', caseItem)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c4c5d9] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#f3f3f5] dark:hover:bg-slate-700 font-semibold text-[#1a1c1d] dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
          >
            <Edit3 class="w-3.5 h-3.5 text-[#0A51B0] dark:text-blue-400" />
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
        class="case-summary p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 shadow-2xs flex items-start gap-3"
      >
        <div
          class="p-2 rounded-lg bg-[#eff6ff] dark:bg-blue-950/40 text-[#0A51B0] dark:text-blue-400 shrink-0"
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
      class="doc-body prose prose-slate dark:prose-invert max-w-none leading-relaxed"
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
      class="case-escalation p-6 rounded-2xl bg-gradient-to-r from-[#eff6ff] to-white dark:from-slate-900 dark:to-slate-950 border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
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
          class="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <MessageSquare class="w-3.5 h-3.5" />
          <span>Submit a Ticket</span>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Rich Document Content Typography & Elements (Model Dokumen Bebas) */
.doc-body :deep(h1) {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 800;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  color: #1a1c1d;
}

.doc-body :deep(h2) {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #1a1c1d;
}

.doc-body :deep(h3) {
  font-size: 1.2rem;
  line-height: 1.75rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: #1a1c1d;
}

.doc-body :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.75;
}

.doc-body :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.doc-body :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.doc-body :deep(li) {
  margin-bottom: 0.375rem;
  line-height: 1.6;
}

.doc-body :deep(blockquote) {
  border-left: 3px solid #0A51B0;
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-style: normal;
  color: #475569;
}

.doc-body :deep(pre) {
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

.doc-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background-color: #f1f5f9;
  color: #1a1c1d;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}

.doc-body :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

.doc-body :deep(a) {
  color: #0A51B0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.doc-body :deep(img) {
  max-width: 100%;
  border-radius: 0.75rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.doc-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.doc-body :deep(th),
.doc-body :deep(td) {
  border: 1px solid #e2e2e4;
  padding: 0.5rem 0.75rem;
}

.doc-body :deep(th) {
  background-color: #f8fafc;
  font-weight: 600;
}

.doc-body :deep(h1:where(.dark *)),
.doc-body :deep(h2:where(.dark *)),
.doc-body :deep(h3:where(.dark *)) {
  color: #f8fafc;
}

.doc-body :deep(blockquote:where(.dark *)) {
  background-color: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
}

.doc-body :deep(code:where(.dark *)) {
  background-color: #1e293b;
  color: #f8fafc;
}

.doc-body :deep(a:where(.dark *)) {
  color: #818cf8;
}

.doc-body :deep(th:where(.dark *)),
.doc-body :deep(td:where(.dark *)) {
  border-color: #334155;
}

.doc-body :deep(th:where(.dark *)) {
  background-color: #1e293b;
}
.case-reader {
  width: 100%;
  min-width: 0;
  padding: 24px 20px 40px;
  overflow-wrap: anywhere;
}
.case-reader > * {
  min-width: 0;
}
.case-reader-empty {
  min-height: 400px;
}
.case-reader-empty p {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 10px;
}
.case-breadcrumb {
  flex-wrap: wrap;
  gap: 8px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.case-breadcrumb > span {
  min-width: 0;
  max-width: 100%;
  cursor: default;
}
.case-breadcrumb > svg {
  flex-shrink: 0;
}
.case-document-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 12px;
}
.case-document-header > * {
  margin-block: 0;
}
.case-document-controls {
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}
.case-badges {
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}
.case-badges > span {
  max-width: 100%;
  font-size: 11px;
  line-height: 1.6;
  padding: 5px 10px;
  letter-spacing: 0.025em;
}
.case-badges svg {
  flex-shrink: 0;
}
.case-actions {
  flex-shrink: 0;
  gap: 8px;
}
/* Tombol kompak mengikuti skala global; 44px tetap untuk layar sentuh
   (media query di bawah). */
.case-reader button {
  min-height: 30px;
  min-width: 30px;
  padding: 4px 10px;
  border-radius: 6px;
  line-height: 18px;
  gap: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.case-reader button svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.case-reader button:focus-visible {
  outline: 2px solid #0A51B0;
  outline-offset: 3px;
}
.case-reader h1 {
  font-size: clamp(26px, 2.5vw, 36px);
  line-height: 1.3;
  letter-spacing: -0.035em;
}
.case-summary {
  padding: 10px 12px;
  gap: 10px;
  box-shadow: none;
}
.case-summary > div:last-child {
  min-width: 0;
  font-size: 12px;
  line-height: 1.6;
}
.doc-body {
  min-width: 0;
  font-size: 15px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.doc-body :deep(em) {
  font-style: italic;
}
.doc-body :deep(a) {
  overflow-wrap: anywhere;
}
.doc-body :deep(p) {
  max-width: 68ch;
  margin-block: 12px 20px;
}
.doc-body :deep(img) {
  height: auto;
}
.doc-body :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}
.doc-body :deep(pre) {
  max-width: 100%;
}
.case-escalation {
  padding: 10px 12px;
  gap: 12px;
  flex-direction: column;
  align-items: stretch;
}
.case-escalation > div:first-child {
  text-align: left;
}
.case-escalation p {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 6px;
}
.case-escalation button {
  width: 100%;
}
@media (max-width: 767px) {
  .case-reader button {
    min-height: 44px;
    min-width: 44px;
  }
}
@media (min-width: 1024px) {
  .case-reader {
    padding: 32px 40px 40px;
  }
}
@media (min-width: 1280px) {
  .case-escalation {
    flex-direction: row;
    align-items: center;
  }
  .case-escalation > div:last-child {
    flex-shrink: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .case-reader,
  .case-reader * {
    transition: none;
  }
}
</style>
