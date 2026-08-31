<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useToast } from '@/composables/useToast';
import DocEditorInspector from '@/components/admin/DocEditorInspector.vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Undo,
  Redo,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
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
  Sparkles
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { cases, saveCase, fetchCases } = useCases();
const { showToast } = useToast();

const isInspectorOpen = ref(true);
const isPreviewModalOpen = ref(false);
const isSaving = ref(false);
const saveStatus = ref('Saved to cloud'); // 'Saved to cloud' | 'Unsaved changes' | 'Saving...'

// Active Document Metadata Model
const doc = ref({
  id: '',
  title: 'How do I reset my domain password via Okta?',
  category: 'workplace',
  severity: 'medium',
  tags: ['okta', 'password-reset', 'active-directory'],
  summary: 'Short guide for employees to reset their Windows/Domain credentials using Okta self-service.',
  problemContext: 'If you find yourself locked out of your workstation or need to proactively update your credentials, follow these steps to securely reset your password through our SSO provider.',
  actionSteps: [
    'Step 1: Open web browser and navigate to the company Okta portal (okta.corelogic.internal).',
    'Step 2: Click on "Need help signing in?" at the bottom of the login widget, then select "Forgot password?".',
    'Step 3: Enter your username or employee ID, then verify via Okta Verify app or SMS code.',
    'Step 4: Create a new password meeting the 16-character minimum requirement and confirm.'
  ],
  dosAndDonts: {
    dos: [
      'Always ensure you are connected to the corporate VPN before resetting credentials remotely.',
      'Use a strong passphrase combining words, symbols, and numbers.'
    ],
    donts: [
      'Do not share temporary OTP verification codes with anyone over chat or phone.',
      'Do not reuse previous passwords across non-work accounts.'
    ]
  },
  snippets: [
    {
      label: 'Direct Okta SSO Portal Link',
      code: 'https://okta.corelogic.internal/signin/forgot-password'
    }
  ],
  isCustom: true,
  isTrending: false,
  isSsoRequired: true,
  contentHtml: ''
});

// Initial editor default HTML
const initialEditorContent = `
<p>If you find yourself locked out of your workstation or need to proactively update your credentials, follow these steps to securely reset your password through our SSO provider.</p>

<blockquote>[!] Always ensure you are on the corporate VPN if working remotely before attempting a credential sync.</blockquote>

<h3>Step-by-Step Instructions</h3>
<ol>
  <li><strong>Step 1: Navigate to the Portal</strong><br/>Open your preferred web browser (Chrome or Edge recommended) and go to the Okta authentication gateway.</li>
  <li><strong>Step 2: Initiate Reset</strong><br/>Click on the <em>"Need help signing in?"</em> link at the bottom of the widget, then select <em>"Forgot password?"</em>.</li>
  <li><strong>Step 3: Verify Identity</strong><br/>Authenticate using push notification on the Okta Verify app or SMS token.</li>
  <li><strong>Step 4: Set New Password</strong><br/>Enter a new password meeting the 16-character company security policy.</li>
</ol>

<pre><code>Portal Gateway: https://okta.corelogic.internal/
Password Rule: Min 16 chars, 1 uppercase, 1 symbol, 1 digit</code></pre>
`;

// TipTap Editor Instance
const editor = useEditor({
  content: initialEditorContent,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
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
      placeholder: 'Tulis panduan SOP, langkah resolusi, atau catatan teknis di sini...'
    })
  ],
  onUpdate: ({ editor }) => {
    doc.value.contentHtml = editor.getHTML();
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

onMounted(async () => {
  document.addEventListener('selectionchange', handleEditorSelection);
  await fetchCases();
  const caseId = route.params.id;

  if (caseId) {
    const existing = cases.value.find((c) => c.id === caseId);
    if (existing) {
      doc.value = JSON.parse(JSON.stringify(existing));
      
      // Build HTML content from existing case structure if needed
      let htmlContent = '';
      if (existing.problemContext) {
        htmlContent += `<p>${existing.problemContext}</p>`;
      }
      if (existing.summary) {
        htmlContent += `<blockquote>${existing.summary}</blockquote>`;
      }
      if (existing.actionSteps && existing.actionSteps.length) {
        htmlContent += '<h3>Step-by-Step Instructions</h3><ol>';
        existing.actionSteps.forEach((s) => {
          htmlContent += `<li>${s}</li>`;
        });
        htmlContent += '</ol>';
      }
      if (existing.snippets && existing.snippets.length) {
        existing.snippets.forEach((snip) => {
          htmlContent += `<pre><code>${snip.label}:\n${snip.code}</code></pre>`;
        });
      }

      if (editor.value) {
        editor.value.commands.setContent(htmlContent || initialEditorContent);
      }
    }
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// Formatting Actions
function setHeading(level) {
  if (level === 0) {
    editor.value?.chain().focus().setParagraph().run();
  } else {
    editor.value?.chain().focus().toggleHeading({ level }).run();
  }
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

function insertInfoCallout() {
  editor.value?.chain().focus().insertContent(`
    <blockquote>ℹ️ <strong>Catatan Penting:</strong> Pastikan Anda terhubung ke jaringan VPN kantor sebelum melakukan sinkronisasi.</blockquote>
  `).run();
}

function insertWarningCallout() {
  editor.value?.chain().focus().insertContent(`
    <blockquote>⚠️ <strong>Peringatan Darurat:</strong> Jika perangkat hilang atau dicuri, segera hubungi Security Operations Center (SOC) di ext. 5555.</blockquote>
  `).run();
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
    // Sync action steps from text if available
    await saveCase(doc.value);
    saveStatus.value = 'Saved to cloud';
    showToast('Draft artikel berhasil disimpan ke cloud!', 'info');
  } catch (err) {
    saveStatus.value = 'Unsaved changes';
    showToast('Gagal menyimpan draft.', 'error');
  } finally {
    isSaving.value = false;
  }
}

async function handlePublish() {
  isSaving.value = true;
  saveStatus.value = 'Saving...';
  try {
    await saveCase(doc.value);
    saveStatus.value = 'Saved to cloud';
    showToast('🎉 Artikel SOP berhasil dipublikasikan!', 'success');
  } catch (err) {
    showToast('Gagal mempublikasikan artikel.', 'error');
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
    
    <!-- 1. TOP APP BAR -->
    <header class="h-16 bg-white dark:bg-slate-900 border-b border-[#c4c5d9] dark:border-slate-800 px-4 sm:px-6 fixed top-0 left-0 right-0 z-50 flex items-center justify-between shadow-2xs">
      
      <!-- Left: Logo, Breadcrumbs, Status -->
      <div class="flex items-center gap-3 sm:gap-4">
        <RouterLink
          to="/admin"
          class="text-lg font-bold text-[#002eac] dark:text-indigo-400 tracking-tight hover:opacity-90 flex items-center gap-1.5"
        >
          <span>DocEditor</span>
        </RouterLink>

        <div class="h-5 w-px bg-[#e2e2e4] dark:bg-slate-800 hidden sm:block"></div>

        <nav class="hidden md:flex items-center gap-4 text-xs font-medium text-[#575d7a] dark:text-slate-400">
          <RouterLink to="/cases" class="hover:text-[#0040e5] dark:hover:text-white transition-colors">
            &larr; Back to Portal
          </RouterLink>
          <span>&bull;</span>
          <RouterLink to="/admin" class="hover:text-[#0040e5] dark:hover:text-white transition-colors">
            All Articles
          </RouterLink>
        </nav>

        <div class="h-5 w-px bg-[#e2e2e4] dark:bg-slate-800 hidden md:block"></div>

        <!-- Sync & Status Badges -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
            Draft
          </span>
          <span class="text-[11px] text-[#575d7a] dark:text-slate-400 flex items-center gap-1 hidden sm:inline-flex">
            <Cloud class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{{ saveStatus }}</span>
          </span>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-2 sm:gap-3">
        
        <!-- Preview as Employee -->
        <button
          @click="isPreviewModalOpen = true"
          class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#c4c5d9] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1a1c1d] dark:text-slate-200 hover:bg-[#f3f3f5] transition-colors cursor-pointer shadow-2xs"
        >
          <Eye class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400" />
          <span>Preview as Employee</span>
        </button>

        <!-- Save Draft -->
        <button
          @click="handleSaveDraft"
          :disabled="isSaving"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-[#c4c5d9] dark:border-slate-700 text-[#0040e5] dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-[#f2f1ff] transition-colors cursor-pointer shadow-2xs"
        >
          Save Draft
        </button>

        <!-- Publish Article (Emerald Green #00BC84) -->
        <button
          @click="handlePublish"
          :disabled="isSaving"
          class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#00BC84] hover:bg-[#009e6f] text-white shadow-sm shadow-[#00BC84]/20 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ isSaving ? 'Publishing...' : 'Publish Article' }}</span>
        </button>

        <!-- Inspector Toggle Button -->
        <button
          @click="isInspectorOpen = !isInspectorOpen"
          class="p-2 rounded-lg text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': isInspectorOpen }"
          title="Toggle Inspector Panel"
        >
          <PanelRight class="w-4 h-4" />
        </button>

      </div>
    </header>

    <!-- 2. STICKY FORMATTING RIBBON (TIPTAP CONNECTED) -->
    <div
      v-if="editor"
      class="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-[#c4c5d9] dark:border-slate-800 px-4 sm:px-6 py-2 flex items-center gap-1 sm:gap-2 overflow-x-auto shadow-xs text-xs"
    >
      <!-- Undo / Redo -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="p-1.5 text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 rounded disabled:opacity-30"
          title="Undo"
        >
          <Undo class="w-4 h-4" />
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="p-1.5 text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800 rounded disabled:opacity-30"
          title="Redo"
        >
          <Redo class="w-4 h-4" />
        </button>
      </div>

      <!-- Text Style Selector (Paragraph / H1 / H2 / H3) -->
      <div class="flex items-center gap-1 border-r border-[#e2e2e4] dark:border-slate-800 pr-2 mr-1">
        <select
          @change="setHeading(Number($event.target.value))"
          class="bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-md py-1 px-2 text-xs text-[#1a1c1d] dark:text-slate-100 focus:outline-none cursor-pointer"
        >
          <option value="0">Normal Text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <!-- Formatting (B, I, U) -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          class="w-7 h-7 flex items-center justify-center rounded transition-colors"
          :class="editor.isActive('bold') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Bold (Ctrl+B)"
        >
          <BoldIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleItalic().run()"
          class="w-7 h-7 flex items-center justify-center rounded transition-colors italic"
          :class="editor.isActive('italic') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleUnderline().run()"
          class="w-7 h-7 flex items-center justify-center rounded transition-colors underline"
          :class="editor.isActive('underline') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5] dark:hover:bg-slate-800'"
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Lists & Code Blocks -->
      <div class="flex items-center gap-0.5 border-r border-[#e2e2e4] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          class="p-1.5 rounded transition-colors"
          :class="editor.isActive('bulletList') ? 'bg-[#f2f1ff] text-[#0040e5] font-bold' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Bullet List"
        >
          <List class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          class="p-1.5 rounded transition-colors"
          :class="editor.isActive('orderedList') ? 'bg-[#f2f1ff] text-[#0040e5] font-bold' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Numbered List"
        >
          <ListOrdered class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          class="p-1.5 rounded transition-colors"
          :class="editor.isActive('blockquote') ? 'bg-[#f2f1ff] text-[#0040e5]' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Blockquote"
        >
          <Quote class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          class="p-1.5 rounded transition-colors"
          :class="editor.isActive('codeBlock') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Code Block"
        >
          <Code class="w-4 h-4" />
        </button>

        <button
          @click="setLink"
          class="p-1.5 rounded transition-colors"
          :class="editor.isActive('link') ? 'bg-[#0040e5] text-white' : 'text-[#575d7a] dark:text-slate-400 hover:bg-[#f3f3f5]'"
          title="Insert Link"
        >
          <LinkIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Inserter Components -->
      <div class="flex items-center gap-1.5">
        <button
          @click="insertInfoCallout"
          class="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 cursor-pointer"
        >
          <Info class="w-3.5 h-3.5 text-blue-600" />
          <span>Info Callout</span>
        </button>

        <button
          @click="insertWarningCallout"
          class="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800 cursor-pointer"
        >
          <AlertTriangle class="w-3.5 h-3.5 text-amber-600" />
          <span>Warning Banner</span>
        </button>

        <button
          @click="insertStep"
          class="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800 cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 text-emerald-600" />
          <span>+ Step Item</span>
        </button>
      </div>

    </div>

    <!-- 3. MAIN WORKSPACE (CENTRAL SHEET CANVAS + INSPECTOR) -->
    <div class="flex-1 flex relative pt-2">
      
      <!-- Central Canvas Scroll Area -->
      <main class="flex-1 flex justify-center pb-24 overflow-y-auto px-4 sm:px-6">
        
        <!-- Live Document Sheet (White Sheet Paper) -->
        <article class="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#c4c5d9] dark:border-slate-700 shadow-lg w-full max-w-[840px] min-h-[900px] mt-6 mb-12 p-8 sm:p-12 relative space-y-6 transition-all">
          
          <!-- Document Breadcrumbs & Category Bar -->
          <div class="flex items-center justify-between text-xs text-[#575d7a] dark:text-slate-400 pb-2 border-b border-[#e2e2e4] dark:border-slate-700">
            <div class="flex items-center gap-1.5 font-medium">
              <span>Knowledge Base</span>
              <span>/</span>
              <span class="capitalize font-semibold text-[#0040e5] dark:text-indigo-400">{{ doc.category }}</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#edeef0] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400">
              {{ doc.severity }} Priority
            </span>
          </div>

          <!-- Document Title Field -->
          <input
            v-model="doc.title"
            type="text"
            class="w-full text-2xl sm:text-4xl font-extrabold text-[#1a1c1d] dark:text-slate-100 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-[#c4c5d9] tracking-tight"
            placeholder="Article Title..."
          />

          <!-- Summary Box (Italic with left border) -->
          <div class="bg-[#f8fafc] dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-700 rounded-xl p-4 shadow-2xs">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400 mb-1">
              Ringkasan Panduan (Executive Summary):
            </label>
            <textarea
              v-model="doc.summary"
              rows="2"
              class="w-full bg-transparent border-l-4 border-[#0040e5] dark:border-indigo-500 pl-3 text-sm italic text-[#434656] dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
              placeholder="Tulis ringkasan singkat SOP ini..."
            ></textarea>
          </div>

          <!-- TIPTAP FLOATING BUBBLE MENU -->
          <div
            v-if="isSelectionMenuOpen && editor"
            :style="{ left: selectionMenuPos.x + 'px', top: selectionMenuPos.y + 'px' }"
            class="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-700 rounded-lg shadow-2xl transition-all select-none"
          >
            <button
              @click="editor.chain().focus().toggleBold().run()"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs font-bold"
              :class="{ 'text-[#0040e5] font-extrabold bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('bold') }"
            >
              B
            </button>
            <button
              @click="editor.chain().focus().toggleItalic().run()"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs italic"
              :class="{ 'text-[#0040e5] font-bold bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('italic') }"
            >
              I
            </button>
            <div class="w-px h-4 bg-[#e2e2e4] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
              class="px-1.5 py-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs font-bold"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('heading', { level: 1 }) }"
            >
              H1
            </button>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
              class="px-1.5 py-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs font-bold"
              :class="{ 'text-[#0040e5] bg-[#f2f1ff] dark:bg-slate-800': editor.isActive('heading', { level: 2 }) }"
            >
              H2
            </button>
            <div class="w-px h-4 bg-[#e2e2e4] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="setLink"
              class="p-1 rounded hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-xs"
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
                <ThumbsUp class="w-3.5 h-3.5" /> Yes
              </button>
              <button class="px-5 py-1.5 border border-[#c4c5d9] dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#575d7a]">
                <ThumbsDown class="w-3.5 h-3.5" /> No
              </button>
            </div>
          </div>

        </article>
      </main>

      <!-- Right Inspector Panel (Metadata & Settings) -->
      <div
        v-if="isInspectorOpen"
        class="hidden lg:block h-[calc(100vh-8rem)] sticky top-28 mr-2 rounded-xl overflow-hidden border border-[#c4c5d9] dark:border-slate-800 shadow-md"
      >
        <DocEditorInspector
          v-model="doc"
          @close="isInspectorOpen = false"
          @view-portal="goToPortal"
        />
      </div>

    </div>

    <!-- 4. EMPLOYEE LIVE PREVIEW MODAL -->
    <div
      v-if="isPreviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-[#e2e2e4] dark:border-slate-800 flex items-center justify-between bg-[#f8fafc] dark:bg-slate-950">
          <div class="flex items-center gap-2 text-xs font-bold text-[#0040e5] dark:text-indigo-400">
            <Eye class="w-4 h-4" />
            <span>Employee View Preview</span>
          </div>
          <button @click="isPreviewModalOpen = false" class="p-1 rounded-lg text-[#575d7a] hover:bg-[#edeef0] dark:hover:bg-slate-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-6">
          <h1 class="text-3xl font-extrabold text-[#1a1c1d] dark:text-slate-100">{{ doc.title }}</h1>
          <p class="text-sm text-[#434656] dark:text-slate-300 p-4 rounded-xl bg-[#f2f1ff] dark:bg-indigo-950/30 border border-[#c4c5d9] dark:border-indigo-500/20 italic">{{ doc.summary }}</p>
          
          <div class="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm" v-html="editor?.getHTML()"></div>
        </div>
      </div>
    </div>

  </div>
</template>
