<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useToast } from '@/composables/useToast';
import { api } from '@/services/api';
import DocEditorInspector from '@/components/admin/DocEditorInspector.vue';
import CaseReader from '@/components/cases/CaseReader.vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { createDocument } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { CustomImage } from '@/components/admin/editor/imageExtension.js';
import { Callout } from '@/components/admin/editor/calloutExtension.js';
import { SummaryNode } from '@/components/admin/editor/summaryExtension.js';
import {
  Undo,
  Redo,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code,
  Info,
  AlertTriangle,
  Eye,
  Cloud,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  Save,
  CheckCircle,
  XCircle,
  CheckCircle2,
  X,
  PanelRight,
  Terminal,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Globe,
  FileText
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { cases, saveCase, fetchCases } = useCases();
const { showToast } = useToast();

const isInspectorOpen = ref(true);
const isPreviewModalOpen = ref(false);
const isImageModalOpen = ref(false);
const imageUrlInput = ref('');
const isSaving = ref(false);
const saveStatus = ref('Saved to cloud');
const fileInputRef = ref(null);

// Factory function for clean default document state
function createDefaultDoc() {
  return {
    id: '',
    title: '',
    category: 'hardware',
    tags: [],
    summary: '',
    problemContext: '',
    actionSteps: [],
    dosAndDonts: {
      dos: [],
      donts: []
    },
    snippets: [],
    isCustom: true,
    isFeaturedOnHome: false,
    isPublished: true,
    contentHtml: ''
  };
}

// Active Document Metadata Model
const doc = ref(createDefaultDoc());

// Real-time Case Item computed for 100% actual Employee Preview
const previewCaseItem = computed(() => {
  const rawHtml = editor.value ? editor.value.getHTML() : doc.value.contentHtml;
  return {
    ...doc.value,
    contentHtml: rawHtml
  };
});

// Helper to extract summary text from TipTap DOM
function extractSummaryFromEditor(tiptapEditor) {
  if (!tiptapEditor) return '';
  const dom = tiptapEditor.view.dom;
  const summaryEl = dom.querySelector('.summary-node-wrapper [data-node-view-content]');
  if (summaryEl) {
    return summaryEl.innerText.trim();
  }
  return '';
}

// TipTap Editor Instance (initialized cleanly with empty content)
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      },
      history: {
        depth: 300,
        newGroupDelay: 300
      }
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-[#0040e5] underline font-semibold'
      }
    }),
    Placeholder.configure({
      placeholder: 'Tulis panduan FAQ, langkah resolusi, atau catatan teknis di sini...'
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph', 'blockquote'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left'
    }),
    CustomImage.configure({
      inline: false,
      allowBase64: true
    }),
    Callout,
    SummaryNode
  ],
  onUpdate: ({ editor }) => {
    doc.value.contentHtml = editor.getHTML();
    const extracted = extractSummaryFromEditor(editor);
    if (extracted) {
      doc.value.summary = extracted;
    }
    saveStatus.value = 'Unsaved changes';
  }
});

const isSelectionMenuOpen = ref(false);
const selectionMenuPos = ref({ x: 0, y: 0 });

function handleEditorSelection() {
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    selectionMenuPos.value = {
      x: Math.max(10, rect.left + rect.width / 2),
      y: Math.max(10, rect.top - 8)
    };
    isSelectionMenuOpen.value = true;
  } else {
    isSelectionMenuOpen.value = false;
  }
}

function handleGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    if (editor.value && editor.value.can().undo()) {
      if (!['INPUT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        performUndo();
      }
    }
  } else if (
    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
  ) {
    if (editor.value && editor.value.can().redo()) {
      if (!['INPUT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        performRedo();
      }
    }
  }
}

// Helper to convert Markdown syntax to rich HTML elements
function formatMarkdownToHtml(str) {
  if (!str) return '';
  return str
    // bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // italic: *text*
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // markdown links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0040e5] underline font-semibold">$1</a>');
}

// Set editor content cleanly and reset ProseMirror history so undo stack starts at 0
function setEditorContentClean(htmlContent = '') {
  if (!editor.value) return;

  // If setting empty content and editor is already clean with no undo history, skip
  if (!htmlContent && editor.value.isEmpty && !editor.value.can().undo()) {
    return;
  }

  const { schema, plugins } = editor.value.state;
  const newDoc = createDocument(htmlContent || '', schema);
  const newState = EditorState.create({
    schema,
    doc: newDoc,
    plugins
  });
  editor.value.view.updateState(newState);
  editor.value.view.dispatch(editor.value.view.state.tr.setMeta('addToHistory', false));
}

async function loadDocumentData(caseId) {
  if (caseId) {
    let existing = cases.value.find((c) => c.id === caseId);
    if (!existing) {
      try {
        const res = await api.getCaseById(caseId);
        if (res?.data) {
          existing = res.data;
        }
      } catch (e) {
        console.warn('API getCaseById fallback:', e.message);
      }
    }

    if (existing) {
      doc.value = JSON.parse(JSON.stringify(existing));
      
      let htmlContent = '';
      if (existing.contentHtml && existing.contentHtml.trim()) {
        // If contentHtml exists, ensure raw markdown symbols are formatted
        let cleanHtml = existing.contentHtml;
        if (cleanHtml.includes('**') || cleanHtml.includes('](')) {
          cleanHtml = formatMarkdownToHtml(cleanHtml);
        }
        htmlContent = cleanHtml;
      } else {
        // Build rich HTML from structured fields with markdown parsing
        if (existing.summary) {
          htmlContent += `
            <div data-summary-block="" class="summary-block-card">
              <p>${formatMarkdownToHtml(existing.summary)}</p>
            </div>
          `;
        }
        if (existing.problemContext) {
          htmlContent += `
            <div data-callout="context" class="callout-card callout-context">
              <p><strong>Background &amp; Skenario Kendala:</strong><br/>${formatMarkdownToHtml(existing.problemContext)}</p>
            </div>
          `;
        }
        if (existing.actionSteps && existing.actionSteps.length) {
          htmlContent += '<h3>Langkah Penyelesaian (Action Steps)</h3><ol>';
          existing.actionSteps.forEach((s) => {
            htmlContent += `<li>${formatMarkdownToHtml(s)}</li>`;
          });
          htmlContent += '</ol>';
        }
        if (existing.dosAndDonts?.dos?.length) {
          htmlContent += '<div data-callout="dos" class="callout-card callout-dos"><p><strong>Best Practices (DOs):</strong></p><ul>';
          existing.dosAndDonts.dos.forEach((d) => {
            htmlContent += `<li>${formatMarkdownToHtml(d)}</li>`;
          });
          htmlContent += '</ul></div>';
        }
        if (existing.dosAndDonts?.donts?.length) {
          htmlContent += '<div data-callout="donts" class="callout-card callout-donts"><p><strong>Peringatan (DON\'Ts):</strong></p><ul>';
          existing.dosAndDonts.donts.forEach((d) => {
            htmlContent += `<li>${formatMarkdownToHtml(d)}</li>`;
          });
          htmlContent += '</ul></div>';
        }
        if (existing.snippets && existing.snippets.length) {
          existing.snippets.forEach((snip) => {
            htmlContent += `<pre><code>${snip.label || 'Commands & Code Blocks'}:\n${snip.code}</code></pre>`;
          });
        }
      }

      setEditorContentClean(htmlContent || '');
      saveStatus.value = 'Saved to cloud';
      return;
    }
  }

  // New Article Mode
  doc.value = createDefaultDoc();
  setEditorContentClean('');
  saveStatus.value = 'Saved to cloud';
}

watch(
  () => route.params.id,
  (newId) => {
    loadDocumentData(newId);
  }
);

onMounted(async () => {
  document.addEventListener('selectionchange', handleEditorSelection);
  window.addEventListener('keydown', handleGlobalKeydown);
  await fetchCases();
  await loadDocumentData(route.params.id);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', handleEditorSelection);
  window.removeEventListener('keydown', handleGlobalKeydown);
  editor.value?.destroy();
});

// Undo & Redo Commands
function performUndo() {
  editor.value?.commands.undo();
}

function performRedo() {
  editor.value?.commands.redo();
}

// Formatting Actions
function setHeading(level) {
  if (level === 0) {
    editor.value?.chain().focus().setParagraph().run();
  } else {
    editor.value?.chain().focus().toggleHeading({ level }).run();
  }
}

function setTextAlignment(align) {
  if (!editor.value) return;
  if (editor.value.isActive('image')) {
    editor.value.commands.updateAttributes('image', { alignment: align });
  }
  editor.value.chain().focus().setTextAlign(align).run();
}

function setLink() {
  const previousUrl = editor.value?.getAttributes('link').href;
  const url = window.prompt('URL Tautan:', previousUrl);

  if (url === null) return;
  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

// ---------------------------------------------
// IMAGE ATTACHMENT LOGIC
// ---------------------------------------------
function triggerImagePicker() {
  fileInputRef.value?.click();
}

function handleImageFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Hanya file gambar (PNG, JPG, WebP, GIF) yang didukung.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Url = e.target?.result;
    if (base64Url && editor.value) {
      editor.value.chain().focus().setImage({ src: base64Url, alt: file.name }).run();
      showToast('Gambar berhasil disisipkan ke artikel!', 'success');
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function insertImageUrl() {
  if (!imageUrlInput.value.trim()) return;
  editor.value?.chain().focus().setImage({ src: imageUrlInput.value.trim() }).run();
  imageUrlInput.value = '';
  isImageModalOpen.value = false;
  showToast('Gambar dari URL berhasil disisipkan!', 'success');
}

// ---------------------------------------------
// CALLOUT & SUMMARY INSERTERS
// ---------------------------------------------
function insertSummaryBlock() {
  editor.value?.commands.setSummaryBlock(doc.value.summary || 'Tulis ringkasan singkat FAQ / SOP ini...');
  showToast('Kotak Executive Summary disisipkan.', 'success');
}

function insertInfoCallout() {
  editor.value?.commands.insertCallout({ type: 'info' }, 'Catatan Penting: Tuliskan petunjuk atau informasi penting di sini...');
}

function insertWarningCallout() {
  editor.value?.commands.insertCallout({ type: 'warning' }, 'Peringatan Darurat: Tuliskan peringatan kritis atau perhatian operasional di sini...');
}

function insertDosCallout() {
  editor.value?.commands.insertCallout({ type: 'dos' }, 'Best Practices (DOs): Tuliskan hal-hal yang dianjurkan untuk dilakukan...');
  showToast('Kotak Best Practices (DOs) disisipkan.', 'success');
}

function insertDontsCallout() {
  editor.value?.commands.insertCallout({ type: 'donts' }, 'Peringatan (DON\'Ts): Tuliskan hal-hal yang dilarang atau harus dihindari...');
  showToast('Kotak Peringatan (DON\'Ts) disisipkan.', 'warning');
}

function insertStep() {
  editor.value?.chain().focus().insertContent(`
    <ol><li><strong>Step Baru:</strong> Lakukan langkah konfigurasi berikut...</li></ol>
  `).run();
}

// Save & Publish
async function handleSaveDraft() {
  isSaving.value = true;
  saveStatus.value = 'Saving...';
  try {
    if (editor.value) {
      doc.value.contentHtml = editor.value.getHTML();
    }
    const extracted = extractSummaryFromEditor(editor.value);
    if (extracted) doc.value.summary = extracted;
    
    const saved = await saveCase(doc.value);
    if (saved?.id && !doc.value.id) {
      doc.value.id = saved.id;
      router.replace(`/admin/editor/${saved.id}`);
    }
    saveStatus.value = 'Saved to cloud';
  } catch (err) {
    saveStatus.value = 'Unsaved changes';
  } finally {
    isSaving.value = false;
  }
}

async function handlePublish() {
  isSaving.value = true;
  saveStatus.value = 'Saving...';
  try {
    if (editor.value) {
      doc.value.contentHtml = editor.value.getHTML();
    }
    const extracted = extractSummaryFromEditor(editor.value);
    if (extracted) doc.value.summary = extracted;

    doc.value.isPublished = true;
    const saved = await saveCase(doc.value);
    if (saved?.id && !doc.value.id) {
      doc.value.id = saved.id;
      router.replace(`/admin/editor/${saved.id}`);
    }
    saveStatus.value = 'Saved to cloud';
  } catch (err) {
    saveStatus.value = 'Unsaved changes';
  } finally {
    isSaving.value = false;
  }
}

function goToPortal() {
  router.push('/cases');
}
</script>

<template>
  <div class="min-h-screen bg-[#F1F5F9] dark:bg-[#0B1120] text-[#1a1c1d] dark:text-slate-100 flex flex-col font-sans selection:bg-[#0040e5] selection:text-white">
    
    <!-- Hidden Image File Input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImageFileChange"
    />

    <!-- 1. TOP APP BAR (Compact High-Density Header) -->
    <header class="h-11 bg-white dark:bg-slate-900 border-b border-[#c4c5d9] dark:border-slate-800 px-3 sm:px-5 sticky top-0 z-50 flex items-center justify-between shadow-2xs">
      
      <!-- Left: Logo, Breadcrumbs, Status -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        <RouterLink
          to="/admin"
          class="flex items-center gap-2 group hover:opacity-90 transition-opacity select-none"
          title="Ke Dashboard CMS"
        >
          <div class="relative w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-[#f2f1ff] dark:bg-indigo-500/10 border border-[#c4c5d9] dark:border-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <img src="/ESB Case.svg" alt="ESB Case" class="w-4.5 h-4.5 object-contain" />
          </div>
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-[#1a1c1d] dark:text-slate-100 text-xs sm:text-sm tracking-tight">ESB Case</span>
            <span class="text-[10px] font-bold text-[#0040e5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.25 rounded border border-indigo-200 dark:border-indigo-800/60">
              DocEditor
            </span>
          </div>
        </RouterLink>

        <div class="h-4 w-px bg-[#e2e2e4] dark:bg-slate-800 hidden sm:block"></div>

        <nav class="hidden md:flex items-center gap-3 text-[11px] font-medium text-[#575d7a] dark:text-slate-400">
          <RouterLink to="/cases" class="hover:text-[#0040e5] dark:hover:text-white transition-colors">
            &larr; Back to Portal
          </RouterLink>
          <span>&bull;</span>
          <RouterLink to="/admin" class="hover:text-[#0040e5] dark:hover:text-white transition-colors">
            All Articles
          </RouterLink>
        </nav>

        <div class="h-4 w-px bg-[#e2e2e4] dark:bg-slate-800 hidden md:block"></div>

        <!-- Sync & Status Badges -->
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center px-1.5 py-0.25 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
            Draft
          </span>
          <span class="text-[10px] text-[#575d7a] dark:text-slate-400 flex items-center gap-1 hidden sm:inline-flex">
            <Cloud class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{{ saveStatus }}</span>
          </span>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        
        <!-- Preview as Employee -->
        <button
          @click="isPreviewModalOpen = true"
          class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[#c4c5d9] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 hover:bg-[#f3f3f5] transition-colors cursor-pointer shadow-2xs"
          title="Lihat tampilan aktual pembaca karyawan secara real-time"
        >
          <Eye class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400" />
          <span class="hidden sm:inline">Preview as Employee</span>
          <span class="sm:hidden">Preview</span>
        </button>

        <!-- Save Draft -->
        <button
          @click="handleSaveDraft"
          :disabled="isSaving"
          class="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[#c4c5d9] dark:border-slate-700 text-[#0040e5] dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-[#f2f1ff] dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          title="Simpan perubahan tanpa mempublikasikan artikel"
        >
          {{ isSaving ? 'Menyimpan...' : 'Save Draft' }}
        </button>

        <!-- Publish Article (Emerald Green #00BC84) -->
        <button
          @click="handlePublish"
          :disabled="isSaving"
          class="px-3 py-1 rounded-md text-[11px] font-semibold bg-[#00BC84] hover:bg-[#009e6f] text-white shadow-xs shadow-[#00BC84]/20 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ isSaving ? 'Publishing...' : 'Publish' }}</span>
        </button>

        <!-- Inspector Toggle Button -->
        <button
          @click="isInspectorOpen = !isInspectorOpen"
          class="p-1 rounded-md text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': isInspectorOpen }"
          title="Toggle Inspector Panel"
        >
          <PanelRight class="w-4 h-4" />
        </button>

      </div>
    </header>

    <!-- 2. STICKY FORMATTING RIBBON (TIPTAP CONNECTED - Compact Mode) -->
    <div
      v-if="editor"
      class="sticky top-11 z-40 bg-white dark:bg-slate-900 border-b border-[#c4c5d9] dark:border-slate-800 px-3 sm:px-5 py-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto shadow-xs text-xs"
    >
      <!-- Undo / Redo -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-1.5 mr-0.5">
        <button
          @click="performUndo"
          :disabled="!editor.can().undo()"
          class="p-1 text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo class="w-3.5 h-3.5" />
        </button>
        <button
          @click="performRedo"
          :disabled="!editor.can().redo()"
          class="p-1 text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Text Style Selector (Paragraph / H1 / H2 / H3) -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-1.5 mr-0.5">
        <select
          @change="setHeading(Number($event.target.value))"
          class="bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-md px-2 py-0.5 text-[11px] text-[#1a1c1d] dark:text-slate-100 focus:outline-none h-6"
        >
          <option value="0">Normal Text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <!-- Formatting Icons (Bold, Italic, Underline) -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-1.5 mr-0.5">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('bold') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Bold (Ctrl+B)"
        >
          <BoldIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleItalic().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('italic') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleUnderline().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('underline') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Text Alignment Group (Left, Center, Right, Justify) -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-1.5 mr-0.5">
        <button
          @click="setTextAlignment('left')"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive({ textAlign: 'left' }) ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Rata Kiri (Align Left)"
        >
          <AlignLeft class="w-3.5 h-3.5" />
        </button>

        <button
          @click="setTextAlignment('center')"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive({ textAlign: 'center' }) ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Rata Tengah (Align Center)"
        >
          <AlignCenter class="w-3.5 h-3.5" />
        </button>

        <button
          @click="setTextAlignment('right')"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive({ textAlign: 'right' }) ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Rata Kanan (Align Right)"
        >
          <AlignRight class="w-3.5 h-3.5" />
        </button>

        <button
          @click="setTextAlignment('justify')"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive({ textAlign: 'justify' }) ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Rata Kiri Kanan (Justify)"
        >
          <AlignJustify class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Lists & Quotes -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-1.5 mr-0.5">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('bulletList') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Bullet List"
        >
          <List class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('orderedList') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Numbered List"
        >
          <ListOrdered class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('blockquote') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Quote"
        >
          <Quote class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('codeBlock') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Code Block"
        >
          <Code class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Links & Image Attachment -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-1.5 mr-0.5">
        <button
          @click="setLink"
          class="p-1 rounded-md transition-colors cursor-pointer"
          :class="editor.isActive('link') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Insert Link"
        >
          <LinkIcon class="w-3.5 h-3.5" />
        </button>

        <!-- Attach Image Button -->
        <button
          @click="isImageModalOpen = true"
          class="p-1 rounded-md transition-colors text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer font-semibold text-[11px] hover:text-[#0040e5]"
          title="Sisipkan Gambar (Upload / URL)"
        >
          <ImageIcon class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span class="hidden sm:inline">Attach Gambar</span>
        </button>
      </div>

      <!-- Inserter Components with [X] support -->
      <div class="flex items-center gap-1">
        <button
          @click="insertSummaryBlock"
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-medium text-[10.5px] border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs hover:bg-indigo-100 transition-colors"
          title="Sisipkan kotak Ringkasan Panduan"
        >
          <FileText class="w-3 h-3 text-indigo-600" />
          <span>+ Summary Box</span>
        </button>

        <button
          @click="insertInfoCallout"
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-medium text-[10.5px] border border-blue-200 dark:border-blue-800 cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors"
        >
          <Info class="w-3 h-3 text-blue-600" />
          <span>Info Callout</span>
        </button>

        <button
          @click="insertWarningCallout"
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium text-[10.5px] border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle class="w-3 h-3 text-amber-600" />
          <span>Warning Banner</span>
        </button>

        <button
          @click="insertDosCallout"
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium text-[10.5px] border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs hover:bg-emerald-100 transition-colors"
          title="Sisipkan kotak Best Practices (DOs)"
        >
          <CheckCircle class="w-3 h-3 text-emerald-600" />
          <span>+ DOs</span>
        </button>

        <button
          @click="insertDontsCallout"
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-medium text-[10.5px] border border-rose-200 dark:border-rose-800 cursor-pointer shadow-2xs hover:bg-rose-100 transition-colors"
          title="Sisipkan kotak Peringatan / Larangan (DON'Ts)"
        >
          <XCircle class="w-3 h-3 text-rose-600" />
          <span>+ DON'Ts</span>
        </button>

        <button
          @click="insertStep"
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-medium text-[10.5px] border border-slate-300 dark:border-slate-700 cursor-pointer shadow-2xs hover:bg-slate-200 transition-colors"
        >
          <Plus class="w-3 h-3 text-indigo-600" />
          <span>+ Step</span>
        </button>
      </div>

    </div>

    <!-- 3. MAIN WORKSPACE (CENTRAL SHEET CANVAS + INSPECTOR) -->
    <div class="flex-1 flex relative pt-2">
      
      <!-- Central Canvas Scroll Area -->
      <main class="flex-1 flex justify-center pb-24 overflow-y-auto px-4 sm:px-6">
        
        <!-- Live Document Sheet (White Sheet Paper) -->
        <article class="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#c4c5d9] dark:border-slate-700 shadow-lg w-full max-w-[840px] min-h-[900px] mt-4 mb-12 p-8 sm:p-12 relative space-y-6 transition-all">
          
          <!-- Document Breadcrumbs & Category Bar -->
          <div class="flex items-center justify-between text-xs text-[#575d7a] dark:text-slate-400 pb-2 border-b border-[#e2e2e4] dark:border-slate-700">
            <div class="flex items-center gap-1.5 font-medium">
              <span>Knowledge Base</span>
              <span>/</span>
              <span class="capitalize font-semibold text-[#0040e5] dark:text-indigo-400">{{ doc.category }}</span>
            </div>
            
            <span class="text-[11px] text-slate-400 font-mono">
              ID: {{ doc.id || 'new-article' }}
            </span>
          </div>

          <!-- Document Title Field -->
          <input
            v-model="doc.title"
            type="text"
            class="w-full text-2xl sm:text-4xl font-extrabold text-[#1a1c1d] dark:text-slate-100 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-[#c4c5d9] tracking-tight"
            placeholder="Article Title..."
          />

          <!-- TIPTAP FLOATING BUBBLE MENU -->
          <div
            v-if="isSelectionMenuOpen && editor"
            :style="{ left: selectionMenuPos.x + 'px', top: selectionMenuPos.y + 'px' }"
            class="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-700 rounded-lg shadow-2xl transition-all select-none"
          >
            <button
              @click="editor.chain().focus().toggleBold().run()"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              :class="{ 'text-[#0040e5] font-extrabold bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('bold') }"
            >
              B
            </button>
            <button
              @click="editor.chain().focus().toggleItalic().run()"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs italic cursor-pointer"
              :class="{ 'text-[#0040e5] font-bold bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('italic') }"
            >
              I
            </button>
            <div class="w-px h-4 bg-[#e2e2e4] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
              class="px-1.5 py-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('heading', { level: 1 }) }"
            >
              H1
            </button>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
              class="px-1.5 py-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('heading', { level: 2 }) }"
            >
              H2
            </button>
            <div class="w-px h-4 bg-[#e2e2e4] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="setTextAlignment('left')"
              class="p-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs cursor-pointer"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive({ textAlign: 'left' }) }"
              title="Align Left"
            >
              <AlignLeft class="w-3.5 h-3.5" />
            </button>
            <button
              @click="setTextAlignment('center')"
              class="p-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs cursor-pointer"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive({ textAlign: 'center' }) }"
              title="Align Center"
            >
              <AlignCenter class="w-3.5 h-3.5" />
            </button>
            <button
              @click="setTextAlignment('right')"
              class="p-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs cursor-pointer"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive({ textAlign: 'right' }) }"
              title="Align Right"
            >
              <AlignRight class="w-3.5 h-3.5" />
            </button>
            <div class="w-px h-4 bg-[#e2e2e4] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="setLink"
              class="p-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs cursor-pointer"
              :class="{ 'text-[#0040e5]': editor.isActive('link') }"
            >
              <LinkIcon class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- TIPTAP LIVE EDITOR CONTENT CANVAS -->
          <div class="pt-2 border-t border-[#e2e2e4] dark:border-slate-800">
            <editor-content
              :editor="editor"
              class="prose prose-slate max-w-none text-[#1a1c1d] dark:text-slate-200"
            />
          </div>

          <!-- Bottom Micro-feedback Preview -->
          <div class="mt-16 pt-8 border-t border-[#e2e2e4] dark:border-slate-700 flex flex-col items-center gap-3 text-xs">
            <p class="font-medium text-[#575d7a] dark:text-slate-400">Preview: Was this article helpful?</p>
            <div class="flex gap-3">
              <button class="px-5 py-1.5 border border-[#c4c5d9] dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#575d7a]">
                <ThumbsUp class="w-3.5 h-3.5 text-emerald-600" /> Yes
              </button>
              <button class="px-5 py-1.5 border border-[#c4c5d9] dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#575d7a]">
                <ThumbsDown class="w-3.5 h-3.5 text-rose-600" /> No
              </button>
            </div>
          </div>

        </article>
      </main>

      <!-- Right Inspector Panel (Metadata & Settings) -->
      <div
        v-if="isInspectorOpen"
        class="hidden lg:block h-[calc(100vh-6.5rem)] sticky top-20 mr-2 rounded-xl overflow-hidden border border-[#c4c5d9] dark:border-slate-800 shadow-md"
      >
        <DocEditorInspector
          v-model="doc"
          @close="isInspectorOpen = false"
          @view-portal="goToPortal"
        />
      </div>

    </div>

    <!-- ======================================================== -->
    <!-- MODAL: ATTACH GAMBAR (UPLOAD FILE / INSERT URL)          -->
    <!-- ======================================================== -->
    <div
      v-if="isImageModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div class="p-4 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-bold text-[#1a1c1d] dark:text-slate-100">
            <ImageIcon class="w-4 h-4 text-[#0040e5] dark:text-indigo-400" />
            <span>Sisipkan Gambar ke Artikel</span>
          </div>
          <button @click="isImageModalOpen = false" class="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 space-y-4 text-xs">
          <!-- Option 1: Upload from Computer -->
          <div class="p-4 rounded-xl border border-dashed border-[#c4c5d9] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/60 text-center space-y-2">
            <Upload class="w-6 h-6 text-[#0040e5] mx-auto opacity-80" />
            <p class="font-semibold text-slate-800 dark:text-slate-200">Upload dari Komputer / Laptop</p>
            <p class="text-[11px] text-slate-500">Mendukung format PNG, JPG, WebP, GIF</p>
            <button
              @click="triggerImagePicker(); isImageModalOpen = false;"
              class="px-4 py-2 bg-[#0040e5] hover:bg-[#0034bf] text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Pilih File Gambar
            </button>
          </div>

          <div class="flex items-center gap-3">
            <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
            <span class="text-[10px] text-slate-400 uppercase font-bold">atau link web</span>
            <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
          </div>

          <!-- Option 2: Insert from URL -->
          <div class="space-y-2">
            <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Masukkan URL Gambar:
            </label>
            <div class="flex gap-2">
              <input
                v-model="imageUrlInput"
                type="text"
                placeholder="https://example.com/screenshot.png"
                class="flex-1 bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0040e5]"
                @keydown.enter="insertImageUrl"
              />
              <button
                @click="insertImageUrl"
                class="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-semibold text-xs hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Sisipkan
              </button>
            </div>
          </div>
        </div>

        <div class="p-3 border-t border-[#e2e2e4] dark:border-slate-800 flex justify-end bg-[#f8fafc] dark:bg-slate-950/40">
          <button
            @click="isImageModalOpen = false"
            class="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- 4. EMPLOYEE LIVE PREVIEW MODAL (100% REAL CASE READER VIEW) -->
    <div
      v-if="isPreviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm"
    >
      <div class="relative w-full max-w-5xl h-[92vh] bg-[#F1F5F9] dark:bg-[#0B1120] border border-[#c4c5d9] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div class="px-6 py-3.5 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div class="flex items-center gap-2 text-xs font-bold text-[#0040e5] dark:text-indigo-400">
            <Eye class="w-4 h-4" />
            <span>Employee Live View (Tampilan Aktual Pembaca SOP)</span>
          </div>
          <button
            @click="isPreviewModalOpen = false"
            class="p-1.5 rounded-lg text-[#575d7a] hover:bg-[#edeef0] dark:hover:bg-slate-800 cursor-pointer"
            title="Tutup Preview"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-8">
          <div class="w-full max-w-4xl mx-auto bg-white dark:bg-[#1E293B] rounded-2xl border border-[#c4c5d9] dark:border-slate-700 shadow-md">
            <CaseReader :case-item="previewCaseItem" :is-preview="true" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
