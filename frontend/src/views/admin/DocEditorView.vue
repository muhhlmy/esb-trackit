<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  FileText
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { cases, saveCase, fetchAllCases } = useCases();
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
  status: 'DRAFT',
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
        class: 'text-[#5D87FF] underline font-semibold'
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
  await fetchAllCases();
  const caseId = route.params.id;

  if (caseId) {
    const existing = cases.value.find((c) => String(c.id) === String(caseId));
    if (existing) {
      doc.value = JSON.parse(JSON.stringify(existing));
      
      let htmlContent = existing.contentHtml || existing.content_html || '';
      if (!htmlContent) {
        if (existing.problemContext) {
          htmlContent += `<p>${existing.problemContext}</p>`;
        }
        if (existing.summary && existing.summary !== doc.value.problemContext) {
          htmlContent += `<blockquote>${existing.summary}</blockquote>`;
        }
        if (existing.actionSteps && existing.actionSteps.length) {
          htmlContent += '<h3>Prosedur / Langkah-langkah:</h3><ol>';
          existing.actionSteps.forEach((s) => {
            htmlContent += `<li>${s}</li>`;
          });
          htmlContent += '</ol>';
        }
        if (existing.dosAndDonts) {
          if (existing.dosAndDonts.dos && existing.dosAndDonts.dos.length) {
            htmlContent += '<h3>Do\'s (Yang Wajib Dilakukan):</h3><ul>';
            existing.dosAndDonts.dos.forEach((d) => {
              htmlContent += `<li>✅ ${d}</li>`;
            });
            htmlContent += '</ul>';
          }
          if (existing.dosAndDonts.donts && existing.dosAndDonts.donts.length) {
            htmlContent += '<h3>Don\'ts (Yang Dilarang):</h3><ul>';
            existing.dosAndDonts.donts.forEach((d) => {
              htmlContent += `<li>❌ ${d}</li>`;
            });
            htmlContent += '</ul>';
          }
        }
        if (existing.snippets && existing.snippets.length) {
          existing.snippets.forEach((snip) => {
            htmlContent += `<pre><code>${snip.label || 'Snippet'}:\n${snip.code || ''}</code></pre>`;
          });
        }
      }

      if (editor.value) {
        editor.value.commands.setContent(htmlContent || '<p></p>');
      }
    }
  } else {
    // Mode Dokumen Baru
    doc.value = {
      id: '',
      title: '',
      category: 'hardware',
      severity: 'medium',
      tags: [],
      summary: '',
      problemContext: '',
      actionSteps: [],
      dosAndDonts: { dos: [], donts: [] },
      snippets: [],
      isCustom: true,
      isTrending: false,
      isSsoRequired: false,
      status: 'DRAFT',
      contentHtml: ''
    };
    if (editor.value) {
      editor.value.commands.setContent('<p></p>');
    }
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

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
    <blockquote>⚠️ <strong>Peringatan Darurat:</strong> Jika perangkat hilang atau dicuri, segera hubungi Security Operations Center (SOC).</blockquote>
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
    await saveCase({ ...doc.value, status: 'DRAFT' });
    saveStatus.value = 'Saved to cloud';
    showToast('Draft artikel berhasil disimpan!', 'info');
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
    await saveCase({ ...doc.value, status: 'PUBLISHED' });
    saveStatus.value = 'Saved to cloud';
    showToast('🎉 Artikel SOP berhasil dipublikasikan!', 'success');
  } catch (err) {
    showToast('Gagal mempublikasikan artikel.', 'error');
  } finally {
    isSaving.value = false;
  }
}

function goToAdminCases() {
  router.push('/admin/cases');
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 flex flex-col font-sans selection:bg-[#5D87FF] selection:text-white select-none transition-colors duration-200">
    
    <!-- 1. TOP APP BAR HEADER -->
    <header class="h-16 bg-white dark:bg-slate-900 border-b border-[#E5EAEF] dark:border-slate-800 px-4 sm:px-6 fixed top-0 left-0 right-0 z-50 flex items-center justify-between shadow-2xs">
      
      <!-- Left: Title, Breadcrumbs, Cloud Status -->
      <div class="flex items-center gap-3 sm:gap-4">
        
        <!-- Back to Admin CMS -->
        <RouterLink
          to="/admin/cases"
          class="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-bold"
          title="Back to Admin CMS"
        >
          <ArrowLeft class="w-4 h-4" />
          <span class="hidden sm:inline">Admin CMS</span>
        </RouterLink>

        <div class="h-4 w-px bg-[#E5EAEF] dark:bg-slate-800"></div>

        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center border border-[#5D87FF]/20">
            <FileText class="w-4 h-4" />
          </div>
          <span class="font-extrabold text-[#0F172A] dark:text-white text-xs sm:text-sm tracking-tight">
            SOP Article Editor
          </span>
        </div>

        <!-- Sync & Status Badges -->
        <div class="hidden md:flex items-center gap-2 pl-2 border-l border-[#E5EAEF] dark:border-slate-800">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider"
            :class="doc.status === 'PUBLISHED'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'"
          >
            {{ doc.status || 'DRAFT' }}
          </span>

          <span class="text-[11px] text-[#64748B] dark:text-slate-400 font-medium flex items-center gap-1">
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
          class="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-[#E5EAEF] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
        >
          <Eye class="w-3.5 h-3.5 text-[#5D87FF]" />
          <span>Preview as Employee</span>
        </button>

        <!-- Save Draft -->
        <button
          @click="handleSaveDraft"
          :disabled="isSaving"
          class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold border border-[#5D87FF]/30 text-[#5D87FF] dark:text-indigo-300 bg-[#ECF2FF] dark:bg-indigo-950/60 hover:bg-[#5D87FF] hover:text-white transition-all cursor-pointer shadow-2xs disabled:opacity-50"
        >
          Save Draft
        </button>

        <!-- Publish Article -->
        <button
          @click="handlePublish"
          :disabled="isSaving"
          class="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-[#5D87FF] hover:bg-[#4570EA] text-white shadow-md shadow-[#5D87FF]/25 hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ isSaving ? 'Publishing...' : 'Publish Article' }}</span>
        </button>

        <!-- Inspector Toggle Button -->
        <button
          @click="isInspectorOpen = !isInspectorOpen"
          class="p-2 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer border border-[#E5EAEF] dark:border-slate-800"
          :class="{ 'text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800 border-[#5D87FF]/30': isInspectorOpen }"
          title="Toggle Inspector Panel"
        >
          <PanelRight class="w-4 h-4" />
        </button>

      </div>
    </header>

    <!-- 2. STICKY FORMATTING RIBBON (TIPTAP CONNECTED) -->
    <div
      v-if="editor"
      class="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-[#E5EAEF] dark:border-slate-800 px-4 sm:px-6 py-2 flex items-center gap-1 sm:gap-2 overflow-x-auto shadow-2xs text-xs select-none"
    >
      <!-- Undo / Redo -->
      <div class="flex items-center gap-0.5 border-r border-[#E5EAEF] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="p-1.5 text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
          title="Undo"
        >
          <Undo class="w-4 h-4" />
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="p-1.5 text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
          title="Redo"
        >
          <Redo class="w-4 h-4" />
        </button>
      </div>

      <!-- Text Style Selector (Paragraph / H1 / H2 / H3) -->
      <div class="flex items-center gap-1 border-r border-[#E5EAEF] dark:border-slate-800 pr-2 mr-1">
        <select
          :value="currentHeadingLevel"
          @change="setHeading(Number($event.target.value))"
          class="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 rounded-lg py-1 px-2 text-xs font-semibold text-[#0F172A] dark:text-slate-100 focus:outline-none cursor-pointer"
        >
          <option value="0">Normal Text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <!-- Formatting (B, I, U) -->
      <div class="flex items-center gap-0.5 border-r border-[#E5EAEF] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('bold') ? 'bg-[#5D87FF] text-white font-bold' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'"
          title="Bold (Ctrl+B)"
        >
          <BoldIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleItalic().run()"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors italic cursor-pointer"
          :class="editor.isActive('italic') ? 'bg-[#5D87FF] text-white font-bold' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'"
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleUnderline().run()"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors underline cursor-pointer"
          :class="editor.isActive('underline') ? 'bg-[#5D87FF] text-white font-bold' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'"
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Lists & Code Blocks -->
      <div class="flex items-center gap-0.5 border-r border-[#E5EAEF] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('bulletList') ? 'bg-[#ECF2FF] text-[#5D87FF] font-bold' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC]'"
          title="Bullet List"
        >
          <List class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('orderedList') ? 'bg-[#ECF2FF] text-[#5D87FF] font-bold' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC]'"
          title="Numbered List"
        >
          <ListOrdered class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('blockquote') ? 'bg-[#ECF2FF] text-[#5D87FF]' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC]'"
          title="Blockquote"
        >
          <Quote class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('codeBlock') ? 'bg-[#5D87FF] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC]'"
          title="Code Block"
        >
          <Code class="w-4 h-4" />
        </button>

        <button
          @click="setLink"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('link') ? 'bg-[#5D87FF] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC]'"
          title="Insert Link"
        >
          <LinkIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Inserter Components -->
      <div class="flex items-center gap-1.5">
        <button
          @click="insertInfoCallout"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 transition-colors text-[11px]"
        >
          <Info class="w-3.5 h-3.5 text-blue-600" />
          <span>Info Callout</span>
        </button>

        <button
          @click="insertWarningCallout"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 transition-colors text-[11px]"
        >
          <AlertTriangle class="w-3.5 h-3.5 text-amber-600" />
          <span>Warning Banner</span>
        </button>

        <button
          @click="insertStep"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100 transition-colors text-[11px]"
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
        <article class="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5EAEF] dark:border-slate-800 shadow-sm w-full max-w-[840px] min-h-[900px] mt-4 mb-12 p-8 sm:p-12 relative space-y-6 transition-all">
          
          <!-- Document Breadcrumbs & Category Bar -->
          <div class="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 pb-3 border-b border-[#E5EAEF] dark:border-slate-800">
            <div class="flex items-center gap-1.5 font-bold">
              <span>Knowledge Base</span>
              <span>/</span>
              <span class="capitalize text-[#5D87FF] dark:text-indigo-400">{{ doc.category }}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 tracking-wider">
              {{ doc.severity }} Priority
            </span>
          </div>

          <!-- Document Title Field -->
          <input
            v-model="doc.title"
            type="text"
            class="w-full text-2xl sm:text-4xl font-extrabold text-[#0F172A] dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-[#CBD5E1] tracking-tight"
            placeholder="SOP Document Title..."
          />

          <!-- Summary Box (Italic with left border) -->
          <div class="bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5EAEF] dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs">
            <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1.5">
              Executive Summary:
            </label>
            <textarea
              v-model="doc.summary"
              rows="2"
              class="w-full bg-transparent border-l-4 border-[#5D87FF] pl-3 text-xs sm:text-sm italic text-[#334155] dark:text-slate-300 focus:outline-none resize-none leading-relaxed font-medium"
              placeholder="Write a concise executive summary for this SOP guide..."
            ></textarea>
          </div>

          <!-- TIPTAP FLOATING BUBBLE MENU -->
          <div
            v-if="isSelectionMenuOpen && editor"
            :style="{ left: selectionMenuPos.x + 'px', top: selectionMenuPos.y + 'px' }"
            class="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-700 rounded-xl shadow-xl transition-all select-none"
          >
            <button
              @click="editor.chain().focus().toggleBold().run()"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-xs font-bold"
              :class="{ 'text-[#5D87FF] font-extrabold bg-[#ECF2FF] dark:bg-slate-800': editor.isActive('bold') }"
            >
              B
            </button>
            <button
              @click="editor.chain().focus().toggleItalic().run()"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-xs italic"
              :class="{ 'text-[#5D87FF] font-bold bg-[#ECF2FF] dark:bg-slate-800': editor.isActive('italic') }"
            >
              I
            </button>
            <div class="w-px h-4 bg-[#E5EAEF] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
              class="px-1.5 py-1 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-xs font-bold"
              :class="{ 'text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800': editor.isActive('heading', { level: 1 }) }"
            >
              H1
            </button>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
              class="px-1.5 py-1 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-xs font-bold"
              :class="{ 'text-[#5D87FF] bg-[#ECF2FF] dark:bg-slate-800': editor.isActive('heading', { level: 2 }) }"
            >
              H2
            </button>
            <div class="w-px h-4 bg-[#E5EAEF] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="setLink"
              class="p-1 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-xs"
              :class="{ 'text-[#5D87FF]': editor.isActive('link') }"
            >
              <LinkIcon class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- TIPTAP LIVE EDITOR CONTENT CANVAS -->
          <div class="pt-2 border-t border-[#E5EAEF] dark:border-slate-800">
            <editor-content
              :editor="editor"
              class="prose prose-slate max-w-none text-[#0F172A] dark:text-slate-200"
            />
          </div>

          <!-- Bottom Micro-feedback Preview -->
          <div class="mt-16 pt-8 border-t border-[#E5EAEF] dark:border-slate-800 flex flex-col items-center gap-3 text-xs">
            <p class="font-bold text-[#64748B] dark:text-slate-400">Preview: Was this article helpful?</p>
            <div class="flex gap-3">
              <button class="px-5 py-1.5 border border-[#E5EAEF] dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] transition-colors">
                <ThumbsUp class="w-3.5 h-3.5 text-[#5D87FF]" /> Yes
              </button>
              <button class="px-5 py-1.5 border border-[#E5EAEF] dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] transition-colors">
                <ThumbsDown class="w-3.5 h-3.5 text-rose-500" /> No
              </button>
            </div>
          </div>

        </article>
      </main>

      <!-- Right Inspector Panel (Metadata & Settings) -->
      <div
        v-if="isInspectorOpen"
        class="hidden lg:block h-[calc(100vh-8rem)] sticky top-28 mr-2 rounded-2xl overflow-hidden border border-[#E5EAEF] dark:border-slate-800 shadow-sm"
      >
        <DocEditorInspector
          v-model="doc"
          @close="isInspectorOpen = false"
          @view-portal="goToAdminCases"
        />
      </div>

    </div>

    <!-- 4. EMPLOYEE LIVE PREVIEW MODAL -->
    <div
      v-if="isPreviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-[#E5EAEF] dark:border-slate-800 flex items-center justify-between bg-[#F8FAFC] dark:bg-slate-950">
          <div class="flex items-center gap-2 text-xs font-bold text-[#5D87FF] dark:text-indigo-400">
            <Eye class="w-4 h-4" />
            <span>Employee View Preview</span>
          </div>
          <button @click="isPreviewModalOpen = false" class="p-1 rounded-lg text-[#64748B] hover:bg-[#E5EAEF] dark:hover:bg-slate-800 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-6">
          <h1 class="text-3xl font-extrabold text-[#0F172A] dark:text-slate-100 tracking-tight">{{ doc.title }}</h1>
          <p class="text-xs sm:text-sm text-[#334155] dark:text-slate-300 p-4 rounded-2xl bg-[#ECF2FF] dark:bg-indigo-950/30 border border-[#5D87FF]/20 italic font-medium leading-relaxed">{{ doc.summary }}</p>
          
          <div class="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm" v-html="editor?.getHTML()"></div>
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
  color: #0f172a !important;
  letter-spacing: -0.025em;
}

.ProseMirror h2 {
  font-size: 1.5rem !important; /* 24px */
  line-height: 2rem !important;
  font-weight: 700 !important;
  margin-top: 1.25rem !important;
  margin-bottom: 0.5rem !important;
  color: #0f172a !important;
  letter-spacing: -0.02em;
}

.ProseMirror h3 {
  font-size: 1.25rem !important; /* 20px */
  line-height: 1.75rem !important;
  font-weight: 700 !important;
  margin-top: 1rem !important;
  margin-bottom: 0.5rem !important;
  color: #0f172a !important;
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

.ProseMirror blockquote {
  border-left: 4px solid #5d87ff !important;
  background-color: #f8fafc !important;
  padding: 0.75rem 1rem !important;
  border-radius: 0.5rem !important;
  margin-top: 1rem !important;
  margin-bottom: 1rem !important;
  font-style: italic !important;
  color: #334155 !important;
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
  color: #0f172a !important;
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
  color: #94a3b8;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
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
</style>
