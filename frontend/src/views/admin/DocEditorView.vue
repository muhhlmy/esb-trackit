<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useKbCategories } from '@/composables/useKbCategories'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/composables/useAuth'
import DocEditorInspector from '@/components/admin/DocEditorInspector.vue'
import { sanitizeRichTextHtml } from '@/utils/htmlSanitizer'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExtension from '@tiptap/extension-image'
import {
  Undo,
  Redo,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload,
  Code,
  Info,
  AlertTriangle,
  Eye,
  Plus,
  CheckCircle2,
  X,
  PanelRight,
  List,
  ListOrdered,
  Quote,
  ArrowLeft,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const { cases, saveCase, fetchAllCases } = useCases()
// Kategori diambil dari sumber yang sama dengan halaman KB Categories dan
// DocEditorInspector (GET /api/kb-categories), agar pilihan kategori selalu sinkron.
const { categories: kbCategoryList, fetchAllCategories } = useKbCategories()
const { showToast } = useToast()
const { hasWritePermission } = useAuth()
const canWrite = computed(() => hasWritePermission('knowledge_base'))

const isMobileInspectorOpen = ref(false)
const isDesktopInspectorOpen = ref(true)
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)

function updateWindowWidth() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 1024
    if (!isMobile.value && isMobileInspectorOpen.value) {
      isMobileInspectorOpen.value = false
    }
  }
}

onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
  updateWindowWidth()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

function toggleInspector() {
  if (isMobile.value) {
    isMobileInspectorOpen.value = !isMobileInspectorOpen.value
  } else {
    isDesktopInspectorOpen.value = !isDesktopInspectorOpen.value
  }
}

const isInspectorActive = computed(() => {
  return isMobile.value ? isMobileInspectorOpen.value : isDesktopInspectorOpen.value
})

const isPreviewModalOpen = ref(false)
const isSaving = ref(false)
const saveStatus = ref('Tersimpan') // 'Tersimpan' | 'Belum disimpan' | 'Menyimpan...'

// Sanitasi output editor sebelum dirender via v-html (preview) — pertahanan
// terhadap XSS bila konten DB/editor mengandung payload berbahaya.
const safePreviewHtml = computed(() => sanitizeRichTextHtml(editor?.value?.getHTML() || ''))

// Dialog input URL tautan (pengganti window.prompt yang tidak aksesibel).
const showLinkDialog = ref(false)
const linkDialogInput = ref(null)
const linkDialogUrl = ref('')
const linkDialogMode = ref('set') // 'set' | 'clear'
const linkDialogError = ref('')

// Fokus ke input saat dialog terbuka (aksesibilitas keyboard).
watch(showLinkDialog, (open) => {
  if (open) nextTick(() => linkDialogInput.value?.focus())
})

function createEmptyDoc() {
  return {
    id: '',
    title: '',
    // Default: kategori pertama dari DB (sort_order ASC). Jika data belum
    // dimuat, inspector tetap menampilkan opsi statis pengganti.
    category: kbCategoryList.value[0]?.key || 'hardware',
    severity: 'medium',
    tags: [],
    summary: '',
    isCustom: true,
    status: 'DRAFT',
    contentHtml: '',
  }
}

// Active Document Metadata Model
const doc = ref(createEmptyDoc())

// Input refs for focus management
const titleInputRef = ref(null)
const summaryInputRef = ref(null)

// Dedicated Field History Manager for text inputs (Title & Summary)
function createFieldHistory(initialValue = '') {
  const undoStack = ref([])
  const redoStack = ref([])
  const lastCommitted = ref(initialValue)
  let debounceTimer = null

  function pushState(newValue, onCommit) {
    if (newValue === lastCommitted.value) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (newValue !== lastCommitted.value) {
        undoStack.value.push(lastCommitted.value)
        redoStack.value = []
        lastCommitted.value = newValue
        if (undoStack.value.length > 50) {
          undoStack.value.shift()
        }
        if (onCommit) onCommit()
      }
    }, 400)
  }

  function hasUncommitted(currentValue) {
    return (currentValue || '') !== lastCommitted.value
  }

  function undo(currentValue) {
    clearTimeout(debounceTimer)
    if (hasUncommitted(currentValue)) {
      redoStack.value.push(currentValue)
      const prev = lastCommitted.value
      return prev
    }
    if (undoStack.value.length === 0) return currentValue

    const prev = undoStack.value.pop()
    redoStack.value.push(currentValue)
    lastCommitted.value = prev
    return prev
  }

  function redo(currentValue) {
    clearTimeout(debounceTimer)
    if (redoStack.value.length === 0) return currentValue

    const next = redoStack.value.pop()
    undoStack.value.push(currentValue)
    lastCommitted.value = next
    return next
  }

  function reset(val = '') {
    clearTimeout(debounceTimer)
    undoStack.value = []
    redoStack.value = []
    lastCommitted.value = val
  }

  function canUndo(currentValue) {
    return hasUncommitted(currentValue) || undoStack.value.length > 0
  }

  function canRedo() {
    return redoStack.value.length > 0
  }

  return {
    undoStack,
    redoStack,
    lastCommitted,
    pushState,
    hasUncommitted,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  }
}

const titleHistory = createFieldHistory('')
const summaryHistory = createFieldHistory('')
const lastActiveTarget = ref('editor') // 'title' | 'summary' | 'editor'
const actionHistoryStack = ref([]) // array of 'title' | 'summary' | 'editor'
const actionRedoStack = ref([])
const isUndoingOrRedoing = ref(false)

watch(
  () => doc.value.title,
  (newVal) => {
    if (isUndoingOrRedoing.value) return
    lastActiveTarget.value = 'title'
    titleHistory.pushState(newVal, () => {
      if (actionHistoryStack.value[actionHistoryStack.value.length - 1] !== 'title') {
        actionHistoryStack.value.push('title')
        actionRedoStack.value = []
      }
    })
    saveStatus.value = 'Belum disimpan'
  },
)

watch(
  () => doc.value.summary,
  (newVal) => {
    if (isUndoingOrRedoing.value) return
    lastActiveTarget.value = 'summary'
    summaryHistory.pushState(newVal, () => {
      if (actionHistoryStack.value[actionHistoryStack.value.length - 1] !== 'summary') {
        actionHistoryStack.value.push('summary')
        actionRedoStack.value = []
      }
    })
    saveStatus.value = 'Belum disimpan'
  },
)

// TipTap Editor Instance
const editor = useEditor({
  editable: canWrite.value,
  content: '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#333333] underline font-medium',
        },
      },
    }),
    Placeholder.configure({
      placeholder: 'Tulis panduan, langkah resolusi, atau catatan teknis di sini...',
    }),
    ImageExtension.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class:
          'rounded-xl max-w-full my-4 border border-slate-200 dark:border-slate-800 shadow-sm mx-auto block object-contain max-h-[500px]',
      },
    }),
  ],
  onFocus: () => {
    lastActiveTarget.value = 'editor'
  },
  onUpdate: ({ editor }) => {
    if (isUndoingOrRedoing.value) return
    lastActiveTarget.value = 'editor'
    doc.value.contentHtml = editor.getHTML()
    if (actionHistoryStack.value[actionHistoryStack.value.length - 1] !== 'editor') {
      actionHistoryStack.value.push('editor')
      actionRedoStack.value = []
    }
    saveStatus.value = 'Belum disimpan'
  },
})

watch(canWrite, (val) => {
  editor.value?.setEditable(val)
})

const canUndo = computed(() => {
  return (
    titleHistory.canUndo(doc.value.title) ||
    summaryHistory.canUndo(doc.value.summary) ||
    (editor.value?.can().undo() ?? false)
  )
})

const canRedo = computed(() => {
  return titleHistory.canRedo() || summaryHistory.canRedo() || (editor.value?.can().redo() ?? false)
})

function handleUndo() {
  isUndoingOrRedoing.value = true
  try {
    // 1. If currently focused on or just edited Title and Title can undo
    if (lastActiveTarget.value === 'title' && titleHistory.canUndo(doc.value.title)) {
      doc.value.title = titleHistory.undo(doc.value.title)
      actionRedoStack.value.push('title')
      nextTick(() => titleInputRef.value?.focus())
      return
    }

    // 2. If currently focused on or just edited Summary and Summary can undo
    if (lastActiveTarget.value === 'summary' && summaryHistory.canUndo(doc.value.summary)) {
      doc.value.summary = summaryHistory.undo(doc.value.summary)
      actionRedoStack.value.push('summary')
      nextTick(() => summaryInputRef.value?.focus())
      return
    }

    // 3. If currently in Editor and Editor can undo
    if (lastActiveTarget.value === 'editor' && (editor.value?.can().undo() ?? false)) {
      editor.value?.chain().focus().undo().run()
      actionRedoStack.value.push('editor')
      return
    }

    // 4. Chronological fallback from actionHistoryStack
    while (actionHistoryStack.value.length > 0) {
      const target = actionHistoryStack.value.pop()
      if (target === 'title' && titleHistory.canUndo(doc.value.title)) {
        doc.value.title = titleHistory.undo(doc.value.title)
        actionRedoStack.value.push('title')
        lastActiveTarget.value = 'title'
        nextTick(() => titleInputRef.value?.focus())
        return
      }
      if (target === 'summary' && summaryHistory.canUndo(doc.value.summary)) {
        doc.value.summary = summaryHistory.undo(doc.value.summary)
        actionRedoStack.value.push('summary')
        lastActiveTarget.value = 'summary'
        nextTick(() => summaryInputRef.value?.focus())
        return
      }
      if (target === 'editor' && (editor.value?.can().undo() ?? false)) {
        editor.value?.chain().focus().undo().run()
        actionRedoStack.value.push('editor')
        lastActiveTarget.value = 'editor'
        return
      }
    }

    // 5. Ultimate fallback if stack was empty but a component still has undo
    if (editor.value?.can().undo()) {
      editor.value?.chain().focus().undo().run()
      lastActiveTarget.value = 'editor'
    } else if (summaryHistory.canUndo(doc.value.summary)) {
      doc.value.summary = summaryHistory.undo(doc.value.summary)
      lastActiveTarget.value = 'summary'
      nextTick(() => summaryInputRef.value?.focus())
    } else if (titleHistory.canUndo(doc.value.title)) {
      doc.value.title = titleHistory.undo(doc.value.title)
      lastActiveTarget.value = 'title'
      nextTick(() => titleInputRef.value?.focus())
    }
  } finally {
    nextTick(() => {
      isUndoingOrRedoing.value = false
    })
  }
}

function handleRedo() {
  isUndoingOrRedoing.value = true
  try {
    // 1. If currently focused on or just edited Title and Title can redo
    if (lastActiveTarget.value === 'title' && titleHistory.canRedo()) {
      doc.value.title = titleHistory.redo(doc.value.title)
      actionHistoryStack.value.push('title')
      nextTick(() => titleInputRef.value?.focus())
      return
    }

    // 2. If currently focused on or just edited Summary and Summary can redo
    if (lastActiveTarget.value === 'summary' && summaryHistory.canRedo()) {
      doc.value.summary = summaryHistory.redo(doc.value.summary)
      actionHistoryStack.value.push('summary')
      nextTick(() => summaryInputRef.value?.focus())
      return
    }

    // 3. If currently in Editor and Editor can redo
    if (lastActiveTarget.value === 'editor' && (editor.value?.can().redo() ?? false)) {
      editor.value?.chain().focus().redo().run()
      actionHistoryStack.value.push('editor')
      return
    }

    // 4. Chronological pop from actionRedoStack
    while (actionRedoStack.value.length > 0) {
      const target = actionRedoStack.value.pop()
      if (target === 'title' && titleHistory.canRedo()) {
        doc.value.title = titleHistory.redo(doc.value.title)
        actionHistoryStack.value.push('title')
        lastActiveTarget.value = 'title'
        nextTick(() => titleInputRef.value?.focus())
        return
      }
      if (target === 'summary' && summaryHistory.canRedo()) {
        doc.value.summary = summaryHistory.redo(doc.value.summary)
        actionHistoryStack.value.push('summary')
        lastActiveTarget.value = 'summary'
        nextTick(() => summaryInputRef.value?.focus())
        return
      }
      if (target === 'editor' && (editor.value?.can().redo() ?? false)) {
        editor.value?.chain().focus().redo().run()
        actionHistoryStack.value.push('editor')
        lastActiveTarget.value = 'editor'
        return
      }
    }

    // 5. Ultimate fallback:
    if (editor.value?.can().redo()) {
      editor.value?.chain().focus().redo().run()
      lastActiveTarget.value = 'editor'
    } else if (summaryHistory.canRedo()) {
      doc.value.summary = summaryHistory.redo(doc.value.summary)
      lastActiveTarget.value = 'summary'
      nextTick(() => summaryInputRef.value?.focus())
    } else if (titleHistory.canRedo()) {
      doc.value.title = titleHistory.redo(doc.value.title)
      lastActiveTarget.value = 'title'
      nextTick(() => titleInputRef.value?.focus())
    }
  } finally {
    nextTick(() => {
      isUndoingOrRedoing.value = false
    })
  }
}

function resetAllHistory() {
  titleHistory.reset(doc.value.title || '')
  summaryHistory.reset(doc.value.summary || '')
  actionHistoryStack.value = []
  actionRedoStack.value = []
  lastActiveTarget.value = 'editor'
}

// Image Insertion Modal State & Methods
const isImageModalOpen = ref(false)
const imageInputTab = ref('upload') // 'upload' | 'url'
const imageUrlInput = ref('')
const imageCaptionInput = ref('')
const selectedFilePreview = ref('')
const imageFileInputRef = ref(null)

function openImageModal() {
  imageInputTab.value = 'upload'
  imageUrlInput.value = ''
  imageCaptionInput.value = ''
  selectedFilePreview.value = ''
  isImageModalOpen.value = true
}

function handleImageFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 5MB.', 'error')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    selectedFilePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

function handleDropImage(event) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap upload file berupa gambar (JPG, PNG, WebP, GIF, SVG).', 'error')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 5MB.', 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    selectedFilePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

function confirmInsertImage() {
  let src
  if (imageInputTab.value === 'upload') {
    src = selectedFilePreview.value
  } else {
    src = imageUrlInput.value.trim()
  }

  if (!src) {
    showToast('Harap pilih file gambar atau masukkan URL gambar valid.', 'error')
    return
  }

  editor.value
    ?.chain()
    .focus()
    .setImage({
      src,
      alt: imageCaptionInput.value.trim() || 'Gambar Dokumen',
      title: imageCaptionInput.value.trim() || '',
    })
    .run()

  isImageModalOpen.value = false
  showToast('Gambar berhasil disisipkan!', 'success')
}

const isSelectionMenuOpen = ref(false)
const selectionMenuPos = ref({ x: 0, y: 0 })

function handleEditorSelection() {
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    selectionMenuPos.value = {
      x: Math.max(10, rect.left + rect.width / 2),
      y: Math.max(10, rect.top - 8),
    }
    isSelectionMenuOpen.value = true
  } else {
    isSelectionMenuOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('selectionchange', handleEditorSelection)
  await Promise.all([fetchAllCases(), fetchAllCategories()])
  const caseId = route.params.id

  if (caseId) {
    const existing = cases.value.find((c) => String(c.id) === String(caseId))
    if (existing) {
      doc.value = JSON.parse(JSON.stringify(existing))

      const htmlContent = existing.contentHtml || existing.content_html || '<p></p>'

      if (editor.value) {
        editor.value
          .chain()
          .setContent(htmlContent, { emitUpdate: false })
          .command(({ tr }) => {
            tr.setMeta('addToHistory', false)
            return true
          })
          .run()
      }
    }
  } else {
    // Mode Dokumen Baru
    doc.value = createEmptyDoc()
    if (editor.value && editor.value.getText().trim() !== '') {
      editor.value
        .chain()
        .setContent('<p></p>', { emitUpdate: false })
        .command(({ tr }) => {
          tr.setMeta('addToHistory', false)
          return true
        })
        .run()
    }
  }
  resetAllHistory()
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const currentHeadingLevel = computed(() => {
  if (!editor.value) return '0'
  if (editor.value.isActive('heading', { level: 1 })) return '1'
  if (editor.value.isActive('heading', { level: 2 })) return '2'
  if (editor.value.isActive('heading', { level: 3 })) return '3'
  return '0'
})

// Formatting Actions
function setHeading(level) {
  if (level === 0) {
    editor.value?.chain().focus().setParagraph().run()
  } else {
    editor.value?.chain().focus().toggleHeading({ level }).run()
  }
}

function setLink() {
  const previousUrl = editor.value?.getAttributes('link').href
  // Dialog aksesibel menggantikan window.prompt (screen reader friendly).
  linkDialogUrl.value = previousUrl || ''
  linkDialogMode.value = 'set'
  linkDialogError.value = ''
  showLinkDialog.value = true
}

function confirmLinkDialog() {
  const url = linkDialogUrl.value.trim()
  if (!url) {
    // URL kosong = hapus tautan dari seleksi.
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    showLinkDialog.value = false
    return
  }

  let parsed
  try {
    parsed = new URL(url, window.location.origin)
  } catch {
    linkDialogError.value = 'URL tidak valid. Contoh: https://portal.esb.co.id'
    return
  }

  // Blokir skema berbahaya (javascript:, data:, vbscript:).
  if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
    linkDialogError.value = 'Hanya URL http(s) atau mailto yang diizinkan.'
    return
  }

  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  showLinkDialog.value = false
}

function cancelLinkDialog() {
  showLinkDialog.value = false
}

function insertInfoCallout() {
  editor.value
    ?.chain()
    .focus()
    .insertContent(
      `
    <blockquote>ℹ️ <strong>Catatan Penting:</strong> Pastikan Anda terhubung ke jaringan VPN kantor sebelum melakukan sinkronisasi.</blockquote>
  `,
    )
    .run()
}

function insertWarningCallout() {
  editor.value
    ?.chain()
    .focus()
    .insertContent(
      `
    <blockquote>⚠️ <strong>Peringatan Darurat:</strong> Jika perangkat hilang atau dicuri, segera hubungi Security Operations Center (SOC).</blockquote>
  `,
    )
    .run()
}

function insertStep() {
  editor.value
    ?.chain()
    .focus()
    .insertContent(
      `
    <ol><li><strong>Step Baru:</strong> Lakukan langkah konfigurasi berikut...</li></ol>
  `,
    )
    .run()
}

// Save & Publish
async function handleSaveDraft() {
  if (!canWrite.value) return
  if (editor.value) {
    doc.value.contentHtml = editor.value.getHTML()
  }
  if (!doc.value.title?.trim()) {
    showToast('Judul artikel wajib diisi.', 'error')
    return
  }

  isSaving.value = true
  saveStatus.value = 'Menyimpan...'
  try {
    const saved = await saveCase({ ...doc.value, status: 'DRAFT' }, { showNotification: false })
    if (saved) {
      if (saved.id && !doc.value.id) {
        doc.value.id = saved.id
        router.replace(`/admin/editor/${saved.id}`)
      }
      doc.value.status = 'DRAFT'
      saveStatus.value = 'Tersimpan'
      showToast('Draft artikel berhasil disimpan!', 'info')
    } else {
      saveStatus.value = 'Belum disimpan'
    }
  } catch {
    saveStatus.value = 'Belum disimpan'
  } finally {
    isSaving.value = false
  }
}

async function handlePublish() {
  if (!canWrite.value) return
  if (editor.value) {
    doc.value.contentHtml = editor.value.getHTML()
  }
  if (!doc.value.title?.trim()) {
    showToast('Judul artikel wajib diisi.', 'error')
    return
  }

  isSaving.value = true
  saveStatus.value = 'Menyimpan...'
  try {
    const saved = await saveCase({ ...doc.value, status: 'PUBLISHED' }, { showNotification: false })
    if (saved) {
      doc.value.status = 'PUBLISHED'
      saveStatus.value = 'Tersimpan'
      showToast('Artikel berhasil dipublikasikan!', 'success')
      // Kembali ke daftar artikel Admin CMS setelah publish sukses.
      router.push('/admin/cases')
    } else {
      saveStatus.value = 'Belum disimpan'
    }
  } catch {
    saveStatus.value = 'Belum disimpan'
  } finally {
    isSaving.value = false
  }
}

function goToAdminCases() {
  router.push('/admin/cases')
}
</script>

<template>
  <div
    class="cms-editor min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#333333] dark:text-slate-100 flex flex-col font-sans selection:bg-[#0A51B0] selection:text-white transition-colors duration-200"
  >
    <!-- 1. TOP APP BAR HEADER -->
    <header
      class="h-14 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-3 sm:px-6 sticky top-0 z-50 flex items-center justify-between"
    >
      <!-- Left: Back Button, Title, Status -->
      <div class="flex items-center gap-2 sm:gap-4 min-w-0">
        <!-- Back to Admin CMS -->
        <RouterLink
          to="/admin/cases"
          class="p-1.5 rounded-lg text-[#5F7089] hover:text-[#333333] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold shrink-0 active:scale-95 touch-manipulation"
          title="Kembali ke Admin CMS"
        >
          <ArrowLeft class="w-4 h-4" />
          <span class="hidden sm:inline">Admin CMS</span>
        </RouterLink>

        <div class="h-4 w-px bg-[#E2E8F0] dark:bg-slate-800 shrink-0"></div>

        <div class="flex items-center gap-1.5 min-w-0">
          <span
            class="font-bold text-[#333333] dark:text-white text-xs sm:text-sm tracking-tight truncate max-w-[100px] sm:max-w-none"
          >
            Article Editor
          </span>
        </div>

        <!-- Status Badges (Desktop) -->
        <div
          class="hidden md:flex items-center gap-2 pl-2 border-l border-[#E2E8F0] dark:border-slate-800"
        >
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
            :class="
              doc.status === 'PUBLISHED'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200/50'
            "
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="doc.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'"
            ></span>
            {{ doc.status || 'DRAFT' }}
          </span>

          <span class="text-[11px] text-[#5F7089] dark:text-slate-400 font-medium">
            {{ saveStatus }}
          </span>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <!-- Preview as Employee (Available on mobile as icon button, with text on sm+) -->
        <button
          @click="isPreviewModalOpen = true"
          class="flex items-center gap-1.5 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#333333] dark:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 touch-manipulation"
          title="Preview Tampilan Employee"
        >
          <Eye class="w-3.5 h-3.5 text-[#5F7089] dark:text-slate-400" />
          <span class="hidden sm:inline">Preview</span>
        </button>

        <!-- Save Draft -->
        <button
          v-if="canWrite"
          @click="handleSaveDraft"
          :disabled="isSaving"
          class="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 text-[#333333] dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 active:scale-95 touch-manipulation"
        >
          Draft
        </button>

        <!-- Publish Article -->
        <button
          v-if="canWrite"
          @click="handlePublish"
          :disabled="isSaving"
          class="px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 active:scale-95 touch-manipulation"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ isSaving ? '...' : 'Publish' }}</span>
        </button>

        <!-- Inspector Toggle Button -->
        <button
          type="button"
          @click="toggleInspector"
          class="p-1.5 sm:p-2 rounded-lg text-[#5F7089] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="{ 'text-[#333333] bg-blue-50 dark:bg-blue-950/40': isInspectorActive }"
          title="Pengaturan Artikel (Metadata Inspector)"
        >
          <PanelRight class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Read-Only Mode Banner -->
    <div
      v-if="!canWrite"
      class="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 shrink-0"
    >
      <Info class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <span
        ><strong>Mode Baca Saja:</strong> Anda memiliki hak akses Read Only untuk Knowledge Base.
        Anda dapat membaca artikel tetapi tidak dapat menyimpan perubahan atau menerbitkannya.</span
      >
    </div>

    <!-- 2. STICKY FORMATTING RIBBON (TIPTAP CONNECTED) -->
    <div
      v-if="editor && canWrite"
      class="cms-editor-ribbon sticky top-14 z-40 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-3 sm:px-6 py-1.5 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar text-xs select-none touch-manipulation shadow-2xs"
    >
      <!-- Undo / Redo -->
      <div
        class="flex items-center gap-0.5 border-r border-[#E2E8F0] dark:border-slate-800 pr-1.5 sm:pr-2 mr-0.5 sm:mr-1 shrink-0"
      >
        <button
          @mousedown.prevent
          @click="handleUndo"
          :disabled="!canUndo"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer active:scale-95 touch-manipulation"
          title="Undo (Ctrl+Z)"
        >
          <Undo class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          @mousedown.prevent
          @click="handleRedo"
          :disabled="!canRedo"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer active:scale-95 touch-manipulation"
          title="Redo (Ctrl+Y)"
        >
          <Redo class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <!-- Text Style Selector (Paragraph / H1 / H2 / H3) -->
      <div
        class="flex items-center gap-1 border-r border-[#E2E8F0] dark:border-slate-800 pr-1.5 sm:pr-2 mr-0.5 sm:mr-1 shrink-0"
      >
        <select
          :value="currentHeadingLevel"
          @change="setHeading(Number($event.target.value))"
          class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-1 px-2 text-[11px] sm:text-xs font-semibold text-[#333333] dark:text-slate-100 focus:outline-none focus:border-[#0A51B0] cursor-pointer"
        >
          <option value="0">Normal Text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <!-- Formatting (B, I, U) -->
      <div
        class="flex items-center gap-0.5 border-r border-[#E2E8F0] dark:border-slate-800 pr-1.5 sm:pr-2 mr-0.5 sm:mr-1 shrink-0"
      >
        <button
          @click="editor.chain().focus().toggleBold().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('bold')
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Bold (Ctrl+B)"
        >
          <BoldIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleItalic().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors italic cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('italic')
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleUnderline().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors underline cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('underline')
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <!-- Lists & Code Blocks -->
      <div
        class="flex items-center gap-0.5 border-r border-[#E2E8F0] dark:border-slate-800 pr-1.5 sm:pr-2 mr-0.5 sm:mr-1 shrink-0"
      >
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('bulletList')
              ? 'bg-blue-50 dark:bg-blue-950/40 text-[#333333] dark:text-blue-400'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Bullet List"
        >
          <List class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('orderedList')
              ? 'bg-blue-50 dark:bg-blue-950/40 text-[#333333] dark:text-blue-400'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Numbered List"
        >
          <ListOrdered class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('blockquote')
              ? 'bg-blue-50 dark:bg-blue-950/40 text-[#333333] dark:text-blue-400'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Blockquote"
        >
          <Quote class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('codeBlock')
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Code Block"
        >
          <Code class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          @click="setLink"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 touch-manipulation"
          :class="
            editor.isActive('link')
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-[#5F7089] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
          "
          title="Insert Link"
        >
          <LinkIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <!-- Inserter Components -->
      <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          @click="openImageModal"
          class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#333333] dark:text-indigo-300 font-bold cursor-pointer hover:bg-[#0A51B0] hover:text-white transition-colors text-[11px] sm:text-[11px] shadow-2xs active:scale-95 touch-manipulation shrink-0"
        >
          <ImageIcon class="w-3.5 h-3.5" />
          <span>+ Gambar</span>
        </button>

        <button
          @click="insertInfoCallout"
          class="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[11px] sm:text-[11px] active:scale-95 touch-manipulation shrink-0"
        >
          <Info class="w-3.5 h-3.5" />
          <span>Info Callout</span>
        </button>

        <button
          @click="insertWarningCallout"
          class="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[11px] sm:text-[11px] active:scale-95 touch-manipulation shrink-0"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
          <span>Warning Banner</span>
        </button>

        <button
          @click="insertStep"
          class="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[11px] sm:text-[11px] active:scale-95 touch-manipulation shrink-0"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Step</span>
        </button>
      </div>
    </div>

    <!-- 3. MAIN WORKSPACE (CENTRAL SHEET CANVAS + INSPECTOR) -->
    <div class="flex-1 flex relative pt-2">
      <!-- Central Canvas Scroll Area -->
      <main class="cms-editor-canvas flex-1 flex justify-center pb-24 overflow-y-auto px-2 sm:px-6">
        <!-- Live Document Sheet (White Sheet Paper) -->
        <article
          class="cms-editor-sheet bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-xs w-full max-w-[840px] min-h-[600px] sm:min-h-[900px] mt-3 sm:mt-6 mb-8 sm:mb-12 p-3.5 sm:p-10 relative space-y-4 sm:space-y-6 transition-all"
        >
          <!-- Document Breadcrumbs & Category Bar -->
          <div
            class="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5F7089] dark:text-slate-400 pb-2.5 sm:pb-3 border-b border-[#F1F5F9] dark:border-slate-800"
          >
            <div class="flex items-center gap-1.5 font-semibold text-[11px] sm:text-xs">
              <span>Knowledge Base</span>
              <span class="text-slate-300 dark:text-slate-600">/</span>
              <span class="capitalize text-[#333333] dark:text-blue-400">{{ doc.category }}</span>
            </div>
            <span
              class="px-2 py-0.5 rounded-md text-[9.5px] sm:text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tracking-wider"
            >
              {{ doc.severity }} priority
            </span>
          </div>

          <!-- Document Title Field -->
          <input
            ref="titleInputRef"
            v-model="doc.title"
            :readonly="!canWrite"
            @focus="lastActiveTarget = 'title'"
            @keydown.ctrl.z.exact.stop.prevent="handleUndo"
            @keydown.meta.z.exact.stop.prevent="handleUndo"
            @keydown.ctrl.y.stop.prevent="handleRedo"
            @keydown.meta.y.stop.prevent="handleRedo"
            @keydown.ctrl.shift.z.stop.prevent="handleRedo"
            @keydown.meta.shift.z.stop.prevent="handleRedo"
            aria-label="Judul artikel"
            type="text"
            class="w-full text-xl sm:text-3xl font-extrabold text-[#333333] dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-[#5F7089] tracking-tight"
            placeholder="Judul artikel..."
          />

          <!-- Summary Box -->
          <div
            class="bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700/60 rounded-xl p-3 sm:p-4"
          >
            <label
              class="block text-[11px] sm:text-[11px] font-bold uppercase tracking-wide text-[#5F7089] dark:text-slate-400 mb-1"
            >
              Ringkasan
            </label>
            <textarea
              ref="summaryInputRef"
              v-model="doc.summary"
              :readonly="!canWrite"
              @focus="lastActiveTarget = 'summary'"
              @keydown.ctrl.z.exact.stop.prevent="handleUndo"
              @keydown.meta.z.exact.stop.prevent="handleUndo"
              @keydown.ctrl.y.stop.prevent="handleRedo"
              @keydown.meta.y.stop.prevent="handleRedo"
              @keydown.ctrl.shift.z.stop.prevent="handleRedo"
              @keydown.meta.shift.z.stop.prevent="handleRedo"
              aria-label="Ringkasan artikel"
              rows="2"
              class="w-full bg-transparent text-xs sm:text-sm text-[#334155] dark:text-slate-300 focus:outline-none resize-none leading-relaxed font-normal"
              placeholder="Ringkasan singkat artikel ini..."
            ></textarea>
          </div>

          <!-- TIPTAP FLOATING BUBBLE MENU -->
          <div
            v-if="isSelectionMenuOpen && editor && canWrite"
            :style="{ left: selectionMenuPos.x + 'px', top: selectionMenuPos.y + 'px' }"
            class="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-0.5 p-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-lg shadow-lg transition-all select-none"
          >
            <button
              @click="editor.chain().focus().toggleBold().run()"
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold"
              :class="{ 'text-[#333333] bg-blue-50 dark:bg-blue-950/40': editor.isActive('bold') }"
            >
              B
            </button>
            <button
              @click="editor.chain().focus().toggleItalic().run()"
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs italic"
              :class="{
                'text-[#333333] bg-blue-50 dark:bg-blue-950/40': editor.isActive('italic'),
              }"
            >
              I
            </button>
            <div class="w-px h-4 bg-[#E2E8F0] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
              class="px-1.5 py-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold"
              :class="{
                'text-[#333333] bg-blue-50 dark:bg-blue-950/40': editor.isActive('heading', {
                  level: 1,
                }),
              }"
            >
              H1
            </button>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
              class="px-1.5 py-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold"
              :class="{
                'text-[#333333] bg-blue-50 dark:bg-blue-950/40': editor.isActive('heading', {
                  level: 2,
                }),
              }"
            >
              H2
            </button>
            <div class="w-px h-4 bg-[#E2E8F0] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="setLink"
              class="p-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs"
              :class="{ 'text-[#333333]': editor.isActive('link') }"
              title="Insert Link"
            >
              <LinkIcon class="w-3.5 h-3.5" />
            </button>
            <button
              @click="openImageModal"
              class="p-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs"
              title="Insert Gambar"
            >
              <ImageIcon class="w-3.5 h-3.5 text-[#333333]" />
            </button>
          </div>

          <!-- TIPTAP LIVE EDITOR CONTENT CANVAS -->
          <div class="pt-2 border-t border-[#F1F5F9] dark:border-slate-800">
            <editor-content
              :editor="editor"
              class="prose prose-slate max-w-none text-[#333333] dark:text-slate-200"
            />
          </div>
        </article>
      </main>

      <!-- Right Inspector Panel (Desktop: Docked on the right >= lg) -->
      <div
        v-if="isDesktopInspectorOpen"
        class="hidden lg:block h-[calc(100vh-7rem)] sticky top-24 mr-2 rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 shadow-xs"
      >
        <DocEditorInspector
          v-model="doc"
          :can-write="canWrite"
          @close="isDesktopInspectorOpen = false"
          @view-portal="goToAdminCases"
        />
      </div>

      <!-- Mobile Slide-Over Inspector Drawer (< lg) -->
      <Teleport to="body">
        <div
          v-if="isMobileInspectorOpen"
          class="lg:hidden fixed inset-0 z-[60] flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity"
          @click.self="isMobileInspectorOpen = false"
        >
          <div
            class="relative w-full max-w-sm sm:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
          >
            <!-- Mobile Drawer Header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#FAFBFC] dark:bg-slate-900/80 shrink-0"
            >
              <div class="flex items-center gap-2">
                <PanelRight class="w-4 h-4 text-[#333333]" />
                <span
                  class="text-xs font-bold text-[#333333] dark:text-white uppercase tracking-wider"
                >
                  Pengaturan Artikel
                </span>
              </div>
              <button
                type="button"
                @click="isMobileInspectorOpen = false"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                title="Tutup Panel"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Inspector Body -->
            <div class="flex-1 overflow-y-auto">
              <DocEditorInspector
                v-model="doc"
                :can-write="canWrite"
                @close="isMobileInspectorOpen = false"
                @view-portal="goToAdminCases"
              />
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- 4. EMPLOYEE LIVE PREVIEW MODAL -->
    <div
      v-if="isPreviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
    >
      <div
        class="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col"
      >
        <div
          class="px-6 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between"
        >
          <div
            class="flex items-center gap-2 text-xs font-semibold text-[#333333] dark:text-blue-400"
          >
            <Eye class="w-4 h-4" />
            <span>Preview Tampilan Employee</span>
          </div>
          <button
            @click="isPreviewModalOpen = false"
            class="p-1 rounded-lg text-[#5F7089] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-6">
          <h1 class="text-2xl font-bold text-[#333333] dark:text-slate-100 tracking-tight">
            {{ doc.title }}
          </h1>
          <p
            class="text-xs sm:text-sm text-[#334155] dark:text-slate-300 p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700/60 leading-relaxed"
          >
            {{ doc.summary }}
          </p>

          <div
            class="doc-preview prose prose-slate dark:prose-invert max-w-none text-[#333333] dark:text-slate-200"
            v-html="safePreviewHtml"
          ></div>
        </div>
      </div>
    </div>

    <!-- 4b. LINK URL DIALOG (pengganti window.prompt; aksesibel) -->
    <div
      v-if="showLinkDialog"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-dialog-title"
      @keydown.esc="cancelLinkDialog"
    >
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl shadow-2xl p-5"
      >
        <h2
          id="link-dialog-title"
          class="text-sm font-bold text-[#333333] dark:text-slate-100 mb-3"
        >
          Tautan URL
        </h2>
        <label
          for="link-dialog-url"
          class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
        >
          Alamat tautan (kosongkan untuk menghapus tautan)
        </label>
        <input
          id="link-dialog-url"
          ref="linkDialogInput"
          v-model="linkDialogUrl"
          type="url"
          inputmode="url"
          placeholder="https://portal.esb.co.id"
          class="w-full rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-[#333333] dark:text-slate-100 focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/20"
        />
        <p
          v-if="linkDialogError"
          class="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400"
          role="alert"
        >
          {{ linkDialogError }}
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            @click="cancelLinkDialog"
            class="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            @click="confirmLinkDialog"
            class="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A51B0] hover:bg-[#0A4391] transition-colors"
          >
            Simpan Tautan
          </button>
        </div>
      </div>
    </div>

    <!-- 5. INSERT IMAGE MODAL -->
    <div
      v-if="isImageModalOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Sisipkan Gambar"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <!-- Modal Header -->
        <div
          class="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between"
        >
          <div
            class="flex items-center gap-2 text-xs font-extrabold text-[#333333] dark:text-white"
          >
            <ImageIcon class="w-4 h-4 text-[#333333]" />
            <span>Sisipkan Gambar</span>
          </div>
          <button
            @click="isImageModalOpen = false"
            class="p-1 rounded-lg text-[#5F7089] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body & Tab Switcher -->
        <div class="p-5 space-y-4">
          <!-- Tabs: Upload File vs URL -->
          <div
            class="flex items-center p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded-xl text-xs font-bold"
          >
            <button
              @click="imageInputTab = 'upload'"
              class="flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center"
              :class="
                imageInputTab === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-[#333333] shadow-2xs'
                  : 'text-[#5F7089] dark:text-slate-400'
              "
            >
              Upload Local File
            </button>
            <button
              @click="imageInputTab = 'url'"
              class="flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center"
              :class="
                imageInputTab === 'url'
                  ? 'bg-white dark:bg-slate-900 text-[#333333] shadow-2xs'
                  : 'text-[#5F7089] dark:text-slate-400'
              "
            >
              URL Gambar Web
            </button>
          </div>

          <!-- Tab 1: Upload File Area -->
          <div v-if="imageInputTab === 'upload'" class="space-y-3">
            <div
              @click="imageFileInputRef?.click()"
              @dragover.prevent
              @drop.prevent="handleDropImage"
              class="border-2 border-dashed border-[#CBD5E1] dark:border-slate-700 hover:border-[#0A51B0] dark:hover:border-[#0A51B0] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#F8FAFC] dark:bg-slate-800/40 group flex flex-col items-center justify-center gap-2"
            >
              <input
                ref="imageFileInputRef"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                class="hidden"
                @change="handleImageFileSelect"
              />

              <template v-if="selectedFilePreview">
                <img
                  :src="selectedFilePreview"
                  alt="Preview Upload"
                  class="max-h-36 rounded-lg object-contain shadow-sm border border-slate-200 dark:border-slate-700"
                />
                <span class="text-[11px] font-bold text-[#333333] group-hover:underline"
                  >Klik untuk mengganti gambar</span
                >
              </template>
              <template v-else>
                <div
                  class="w-10 h-10 rounded-full bg-[#ECF2FF] dark:bg-slate-800 text-[#333333] flex items-center justify-center group-hover:scale-110 transition-transform"
                >
                  <Upload class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-xs font-extrabold text-[#333333] dark:text-white">
                    Klik atau Tarik File Gambar ke Sini
                  </p>
                  <p class="text-[10px] text-[#5F7089] dark:text-slate-400 font-medium">
                    PNG, JPG, WebP, GIF, SVG (Maksimal 5MB)
                  </p>
                </div>
              </template>
            </div>
          </div>

          <!-- Tab 2: URL Input Area -->
          <div v-else class="space-y-2">
            <label
              class="block text-[11px] font-extrabold uppercase text-[#5F7089] dark:text-slate-400"
              >URL Gambar (HTTPS):</label
            >
            <div class="relative flex items-center">
              <LinkIcon class="absolute left-3 w-4 h-4 text-[#66728d]" />
              <input
                v-model="imageUrlInput"
                type="url"
                placeholder="https://example.com/image.png"
                class="w-full h-10 pl-9 pr-3 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs font-medium focus:border-[#0A51B0] focus:outline-none"
              />
            </div>
            <div v-if="imageUrlInput" class="pt-2 text-center">
              <img
                :src="imageUrlInput"
                alt="Preview URL"
                class="max-h-32 rounded-lg mx-auto object-contain border border-slate-200 dark:border-slate-700 shadow-sm"
                @error="showToast('URL Gambar tidak valid atau tidak dapat dimuat.', 'error')"
              />
            </div>
          </div>

          <!-- Caption Input -->
          <div class="space-y-1">
            <label
              class="block text-[11px] font-extrabold uppercase text-[#5F7089] dark:text-slate-400"
              >Keterangan Gambar / Caption (Opsional):</label
            >
            <input
              v-model="imageCaptionInput"
              type="text"
              placeholder="Contoh: Tangkapan layar menu SSO Portal..."
              class="w-full h-9 px-3 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs font-medium focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="px-5 py-3.5 bg-[#F8FAFC] dark:bg-slate-800/60 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2"
        >
          <button
            @click="isImageModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-extrabold text-[#5F7089] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="confirmInsertImage"
            class="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            <span>Sisipkan Gambar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.ProseMirror {
  outline: none !important;
  min-height: 450px;
}

.ProseMirror p {
  margin-bottom: 0.75rem;
  line-height: 1.625;
}

.ProseMirror h1 {
  font-size: 1.875rem !important; /* 30px */
  line-height: 2.25rem !important;
  font-weight: 800 !important;
  margin-top: 1.5rem !important;
  margin-bottom: 0.75rem !important;
  color: #333333 !important;
  letter-spacing: -0.025em;
}

.ProseMirror h2 {
  font-size: 1.5rem !important; /* 24px */
  line-height: 2rem !important;
  font-weight: 700 !important;
  margin-top: 1.25rem !important;
  margin-bottom: 0.5rem !important;
  color: #333333 !important;
  letter-spacing: -0.02em;
}

.ProseMirror h3 {
  font-size: 1.25rem !important; /* 20px */
  line-height: 1.75rem !important;
  font-weight: 700 !important;
  margin-top: 1rem !important;
  margin-bottom: 0.5rem !important;
  color: #333333 !important;
}

.ProseMirror ul {
  list-style-type: disc !important;
  padding-left: 1.5rem !important;
  margin-bottom: 0.75rem !important;
}

.ProseMirror ol {
  list-style-type: decimal !important;
  padding-left: 1.5rem !important;
  margin-bottom: 0.75rem !important;
}

.ProseMirror li {
  margin-bottom: 0.25rem !important;
}

.ProseMirror em {
  font-style: italic !important;
}

.ProseMirror blockquote {
  border-left: 3px solid #0a51b0 !important;
  background-color: #f8fafc !important;
  padding: 0.75rem 1rem !important;
  border-radius: 0.5rem !important;
  margin-top: 1rem !important;
  margin-bottom: 1rem !important;
  font-style: normal !important;
  color: #475569 !important;
}

.ProseMirror pre {
  background-color: #0f172a !important;
  color: #38bdf8 !important;
  padding: 1rem !important;
  border-radius: 0.75rem !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 0.8125rem !important;
  margin-top: 1rem !important;
  margin-bottom: 1rem !important;
  overflow-x: auto !important;
}

.ProseMirror code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  background-color: #f1f5f9 !important;
  color: #333333 !important;
  padding: 0.125rem 0.375rem !important;
  border-radius: 0.25rem !important;
  font-size: 0.85em !important;
}

.ProseMirror pre code {
  background-color: transparent !important;
  color: inherit !important;
  padding: 0 !important;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: #687281;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.ProseMirror img,
.doc-preview img {
  max-width: 100% !important;
  height: auto !important;
  border-radius: 0.75rem !important;
  margin: 1.5rem auto !important;
  display: block !important;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #e2e8f0 !important;
}

.dark .ProseMirror img,
.dark .doc-preview img {
  border-color: #334155 !important;
}

/* Dark mode styling */
.dark .ProseMirror h1,
.dark .ProseMirror h2,
.dark .ProseMirror h3 {
  color: #f8fafc !important;
}

.dark .ProseMirror blockquote {
  background-color: rgba(30, 41, 59, 0.6) !important;
  color: #cbd5e1 !important;
}

.dark .ProseMirror code {
  background-color: #1e293b !important;
  color: #f8fafc !important;
}

/* Preview modal: mirror the editor's ProseMirror typography exactly */
.doc-preview p {
  margin-bottom: 0.75rem;
  line-height: 1.625;
}

.doc-preview h1 {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 800;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  letter-spacing: -0.025em;
}

.doc-preview h2 {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.doc-preview h3 {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.doc-preview ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.doc-preview ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.doc-preview li {
  margin-bottom: 0.25rem;
}

.doc-preview em {
  font-style: italic;
}

.doc-preview blockquote {
  border-left: 3px solid #0a51b0;
  background-color: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-style: normal;
  color: #475569;
}

.doc-preview pre {
  background-color: #0f172a;
  color: #38bdf8;
  padding: 1rem;
  border-radius: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.doc-preview code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background-color: #f1f5f9;
  color: #333333;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}

.doc-preview pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

.dark .doc-preview h1,
.dark .doc-preview h2,
.dark .doc-preview h3 {
  color: #f8fafc;
}

.dark .doc-preview blockquote {
  background-color: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
}

.dark .doc-preview code {
  background-color: #1e293b;
  color: #f8fafc;
}
</style>

<style scoped>
.cms-editor > header {
  height: auto;
  min-height: 64px;
  gap: 16px;
  padding-block: 10px;
}
.cms-editor > header button {
  min-height: 40px;
  border-radius: 8px;
  box-shadow: none;
}
.cms-editor-ribbon {
  gap: 8px;
  padding-block: 10px;
}
.cms-editor-ribbon button {
  min-width: 34px;
  min-height: 36px;
  border-radius: 7px;
}
.cms-editor-sheet {
  border-radius: 14px;
  box-shadow: 0 3px 18px #0a51b006;
}
.cms-editor-sheet > input {
  font-weight: 650;
  line-height: 1.4;
}
.cms-editor-sheet textarea {
  line-height: 1.8;
}
.cms-editor :deep(.ProseMirror) {
  font-size: 15px;
  line-height: 1.85;
}
.cms-editor button:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 2px;
}
.cms-editor > div.fixed > div {
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}
@media (max-width: 639px) {
  .cms-editor > header {
    flex-wrap: wrap;
    gap: 10px;
    position: relative;
  }
  .cms-editor > header > div {
    min-width: 0;
    flex-wrap: wrap;
  }
  .cms-editor > header > div:last-child {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }
  .cms-editor > header button {
    min-height: 44px;
  }
  .cms-editor-ribbon {
    position: sticky;
    top: 0;
    flex-wrap: wrap;
    height: auto;
    gap: 6px;
  }
  .cms-editor-ribbon button {
    min-width: 40px;
    min-height: 40px;
  }
  .cms-editor-canvas {
    padding: 12px;
  }
  .cms-editor-sheet {
    padding: 20px 16px;
    border-radius: 10px;
  }
  .cms-editor-sheet > input {
    font-size: 24px;
  }
  .cms-editor-sheet textarea,
  .cms-editor input[type='url'],
  .cms-editor input[type='text']:not(.cms-editor-sheet > input) {
    font-size: 16px;
  }
  .cms-editor .fixed button {
    min-height: 44px;
  }
}
</style>
