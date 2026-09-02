<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useToast } from '@/composables/useToast';
import DocEditorInspector from '@/components/admin/DocEditorInspector.vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
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
const saveStatus = ref('Tersimpan'); // 'Tersimpan' | 'Belum disimpan' | 'Menyimpan...'

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
      },
      link: {
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#2563EB] underline font-medium'
        }
      }
    }),
    Placeholder.configure({
      placeholder: 'Tulis panduan, langkah resolusi, atau catatan teknis di sini...'
    }),
    ImageExtension.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'rounded-xl max-w-full my-4 border border-slate-200 dark:border-slate-800 shadow-sm mx-auto block object-contain max-h-[500px]'
      }
    })
  ],
  onUpdate: ({ editor }) => {
    doc.value.contentHtml = editor.getHTML();
    saveStatus.value = 'Belum disimpan';
  }
});

// Image Insertion Modal State & Methods
const isImageModalOpen = ref(false);
const imageInputTab = ref('upload'); // 'upload' | 'url'
const imageUrlInput = ref('');
const imageCaptionInput = ref('');
const selectedFilePreview = ref('');
const imageFileInputRef = ref(null);

function openImageModal() {
  imageInputTab.value = 'upload';
  imageUrlInput.value = '';
  imageCaptionInput.value = '';
  selectedFilePreview.value = '';
  isImageModalOpen.value = true;
}

function handleImageFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 5MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedFilePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleDropImage(event) {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Harap upload file berupa gambar (JPG, PNG, WebP, GIF, SVG).', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 5MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedFilePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function confirmInsertImage() {
  let src = '';
  if (imageInputTab.value === 'upload') {
    src = selectedFilePreview.value;
  } else {
    src = imageUrlInput.value.trim();
  }

  if (!src) {
    showToast('Harap pilih file gambar atau masukkan URL gambar valid.', 'error');
    return;
  }

  editor.value?.chain().focus().setImage({
    src,
    alt: imageCaptionInput.value.trim() || 'Gambar Dokumen',
    title: imageCaptionInput.value.trim() || ''
  }).run();

  isImageModalOpen.value = false;
  showToast('Gambar berhasil disisipkan!', 'success');
}

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
  saveStatus.value = 'Menyimpan...';
  try {
    await saveCase({ ...doc.value, status: 'DRAFT' });
    saveStatus.value = 'Tersimpan';
    showToast('Draft artikel berhasil disimpan!', 'info');
  } catch (err) {
    saveStatus.value = 'Belum disimpan';
    showToast('Gagal menyimpan draft.', 'error');
  } finally {
    isSaving.value = false;
  }
}

async function handlePublish() {
  isSaving.value = true;
  saveStatus.value = 'Menyimpan...';
  try {
    await saveCase({ ...doc.value, status: 'PUBLISHED' });
    saveStatus.value = 'Tersimpan';
    showToast('Artikel berhasil dipublikasikan!', 'success');
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
  <div class="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-100 flex flex-col font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200">

    <!-- 1. TOP APP BAR HEADER -->
    <header class="h-14 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-4 sm:px-6 fixed top-0 left-0 right-0 z-50 flex items-center justify-between">

      <!-- Left: Title, Breadcrumbs, Status -->
      <div class="flex items-center gap-3 sm:gap-4">

        <!-- Back to Admin CMS -->
        <RouterLink
          to="/admin/cases"
          class="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
          title="Kembali ke Admin CMS"
        >
          <ArrowLeft class="w-4 h-4" />
          <span class="hidden sm:inline">Admin CMS</span>
        </RouterLink>

        <div class="h-4 w-px bg-[#E2E8F0] dark:bg-slate-800"></div>

        <div class="flex items-center gap-2">
          <span class="font-semibold text-[#1E293B] dark:text-white text-xs sm:text-sm tracking-tight">
            Knowledge Base Editor
          </span>
        </div>

        <!-- Status Badges -->
        <div class="hidden md:flex items-center gap-2 pl-2 border-l border-[#E2E8F0] dark:border-slate-800">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
            :class="doc.status === 'PUBLISHED'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="doc.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
            {{ doc.status || 'DRAFT' }}
          </span>

          <span class="text-[11px] text-[#64748B] dark:text-slate-400 font-normal">
            {{ saveStatus }}
          </span>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-2">

        <!-- Preview as Employee -->
        <button
          @click="isPreviewModalOpen = true"
          class="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Eye class="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
          <span>Preview</span>
        </button>

        <!-- Save Draft -->
        <button
          @click="handleSaveDraft"
          :disabled="isSaving"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 text-[#1E293B] dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          Save Draft
        </button>

        <!-- Publish Article -->
        <button
          @click="handlePublish"
          :disabled="isSaving"
          class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ isSaving ? 'Memublikasikan...' : 'Publish' }}</span>
        </button>

        <!-- Inspector Toggle Button -->
        <button
          @click="isInspectorOpen = !isInspectorOpen"
          class="p-2 rounded-lg text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          :class="{ 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/40': isInspectorOpen }"
          title="Toggle Inspector Panel"
        >
          <PanelRight class="w-4 h-4" />
        </button>

      </div>
    </header>

    <!-- 2. STICKY FORMATTING RIBBON (TIPTAP CONNECTED) -->
    <div
      v-if="editor"
      class="sticky top-14 z-40 bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 px-4 sm:px-6 py-1.5 flex items-center gap-1 sm:gap-1.5 overflow-x-auto text-xs select-none"
    >
      <!-- Undo / Redo -->
      <div class="flex items-center gap-0.5 border-r border-[#E2E8F0] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="p-1.5 text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
          title="Undo"
        >
          <Undo class="w-4 h-4" />
        </button>
        <button
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="p-1.5 text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
          title="Redo"
        >
          <Redo class="w-4 h-4" />
        </button>
      </div>

      <!-- Text Style Selector (Paragraph / H1 / H2 / H3) -->
      <div class="flex items-center gap-1 border-r border-[#E2E8F0] dark:border-slate-800 pr-2 mr-1">
        <select
          :value="currentHeadingLevel"
          @change="setHeading(Number($event.target.value))"
          class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-1 px-2 text-xs font-medium text-[#1E293B] dark:text-slate-100 focus:outline-none focus:border-[#2563EB] cursor-pointer"
        >
          <option value="0">Normal Text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <!-- Formatting (B, I, U) -->
      <div class="flex items-center gap-0.5 border-r border-[#E2E8F0] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().toggleBold().run()"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('bold') ? 'bg-[#2563EB] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Bold (Ctrl+B)"
        >
          <BoldIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleItalic().run()"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors italic cursor-pointer"
          :class="editor.isActive('italic') ? 'bg-[#2563EB] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="editor.chain().focus().toggleUnderline().run()"
          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors underline cursor-pointer"
          :class="editor.isActive('underline') ? 'bg-[#2563EB] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Lists & Code Blocks -->
      <div class="flex items-center gap-0.5 border-r border-[#E2E8F0] dark:border-slate-800 pr-2 mr-1">
        <button
          @click="editor.chain().focus().toggleBulletList().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('bulletList') ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Bullet List"
        >
          <List class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleOrderedList().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('orderedList') ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Numbered List"
        >
          <ListOrdered class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleBlockquote().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('blockquote') ? 'bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Blockquote"
        >
          <Quote class="w-4 h-4" />
        </button>

        <button
          @click="editor.chain().focus().toggleCodeBlock().run()"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('codeBlock') ? 'bg-[#2563EB] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Code Block"
        >
          <Code class="w-4 h-4" />
        </button>

        <button
          @click="setLink"
          class="p-1.5 rounded-lg transition-colors cursor-pointer"
          :class="editor.isActive('link') ? 'bg-[#2563EB] text-white' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'"
          title="Insert Link"
        >
          <LinkIcon class="w-4 h-4" />
        </button>

        <button
          @click="openImageModal"
          class="p-1.5 rounded-lg transition-colors cursor-pointer text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800"
          title="Insert Gambar"
        >
          <ImageIcon class="w-4 h-4 text-[#5D87FF]" />
        </button>
      </div>

      <!-- Inserter Components -->
      <div class="flex items-center gap-1.5">
        <button
          @click="openImageModal"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-300 font-extrabold cursor-pointer hover:bg-[#5D87FF] hover:text-white transition-colors text-[11px] shadow-2xs"
        >
          <ImageIcon class="w-3.5 h-3.5" />
          <span>+ Gambar</span>
        </button>

        <button
          @click="insertInfoCallout"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[11px]"
        >
          <Info class="w-3.5 h-3.5" />
          <span>Info Callout</span>
        </button>

        <button
          @click="insertWarningCallout"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[11px]"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
          <span>Warning Banner</span>
        </button>

        <button
          @click="insertStep"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[11px]"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>+ Step</span>
        </button>
      </div>

    </div>

    <!-- 3. MAIN WORKSPACE (CENTRAL SHEET CANVAS + INSPECTOR) -->
    <div class="flex-1 flex relative pt-2">

      <!-- Central Canvas Scroll Area -->
      <main class="flex-1 flex justify-center pb-24 overflow-y-auto px-4 sm:px-6">

        <!-- Live Document Sheet (White Sheet Paper) -->
        <article class="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 shadow-xs w-full max-w-[840px] min-h-[900px] mt-6 mb-12 p-8 sm:p-12 relative space-y-6 transition-all">

          <!-- Document Breadcrumbs & Category Bar -->
          <div class="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 pb-3 border-b border-[#F1F5F9] dark:border-slate-800">
            <div class="flex items-center gap-1.5 font-medium">
              <span>Knowledge Base</span>
              <span class="text-slate-300 dark:text-slate-600">/</span>
              <span class="capitalize text-[#2563EB] dark:text-blue-400">{{ doc.category }}</span>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[10px] uppercase font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tracking-wider">
              {{ doc.severity }} priority
            </span>
          </div>

          <!-- Document Title Field -->
          <input
            v-model="doc.title"
            type="text"
            class="w-full text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-[#CBD5E1] tracking-tight"
            placeholder="Judul dokumen..."
          />

          <!-- Summary Box -->
          <div class="bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700/60 rounded-lg p-4">
            <label class="block text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-slate-400 mb-1.5">
              Ringkasan
            </label>
            <textarea
              v-model="doc.summary"
              rows="2"
              class="w-full bg-transparent text-xs sm:text-sm text-[#334155] dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
              placeholder="Ringkasan singkat dokumen ini..."
            ></textarea>
          </div>

          <!-- TIPTAP FLOATING BUBBLE MENU -->
          <div
            v-if="isSelectionMenuOpen && editor"
            :style="{ left: selectionMenuPos.x + 'px', top: selectionMenuPos.y + 'px' }"
            class="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-0.5 p-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-lg shadow-lg transition-all select-none"
          >
            <button
              @click="editor.chain().focus().toggleBold().run()"
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold"
              :class="{ 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/40': editor.isActive('bold') }"
            >
              B
            </button>
            <button
              @click="editor.chain().focus().toggleItalic().run()"
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs italic"
              :class="{ 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/40': editor.isActive('italic') }"
            >
              I
            </button>
            <div class="w-px h-4 bg-[#E2E8F0] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
              class="px-1.5 py-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold"
              :class="{ 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/40': editor.isActive('heading', { level: 1 }) }"
            >
              H1
            </button>
            <button
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
              class="px-1.5 py-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold"
              :class="{ 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/40': editor.isActive('heading', { level: 2 }) }"
            >
              H2
            </button>
            <div class="w-px h-4 bg-[#E2E8F0] dark:bg-slate-700 mx-0.5"></div>
            <button
              @click="setLink"
              class="p-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs"
              :class="{ 'text-[#2563EB]': editor.isActive('link') }"
              title="Insert Link"
            >
              <LinkIcon class="w-3.5 h-3.5" />
            </button>
            <button
              @click="openImageModal"
              class="p-1 rounded-md hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs"
              title="Insert Gambar"
            >
              <ImageIcon class="w-3.5 h-3.5 text-[#5D87FF]" />
            </button>
          </div>

          <!-- TIPTAP LIVE EDITOR CONTENT CANVAS -->
          <div class="pt-2 border-t border-[#F1F5F9] dark:border-slate-800">
            <editor-content
              :editor="editor"
              class="prose prose-slate max-w-none text-[#1E293B] dark:text-slate-200"
            />
          </div>

        </article>
      </main>

      <!-- Right Inspector Panel (Metadata & Settings) -->
      <div
        v-if="isInspectorOpen"
        class="hidden lg:block h-[calc(100vh-7rem)] sticky top-24 mr-2 rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 shadow-xs"
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
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#2563EB] dark:text-blue-400">
            <Eye class="w-4 h-4" />
            <span>Preview Tampilan Employee</span>
          </div>
          <button @click="isPreviewModalOpen = false" class="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-6">
          <h1 class="text-2xl font-bold text-[#1E293B] dark:text-slate-100 tracking-tight">{{ doc.title }}</h1>
          <p class="text-xs sm:text-sm text-[#334155] dark:text-slate-300 p-4 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700/60 leading-relaxed">{{ doc.summary }}</p>

          <div class="doc-preview prose prose-slate dark:prose-invert max-w-none text-[#1E293B] dark:text-slate-200" v-html="editor?.getHTML()"></div>
        </div>
      </div>
    </div>

    <!-- 5. INSERT IMAGE MODAL -->
    <div
      v-if="isImageModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div class="relative w-full max-w-md bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-extrabold text-[#0F172A] dark:text-white">
            <ImageIcon class="w-4 h-4 text-[#5D87FF]" />
            <span>Sisipkan Gambar</span>
          </div>
          <button
            @click="isImageModalOpen = false"
            class="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body & Tab Switcher -->
        <div class="p-5 space-y-4">
          <!-- Tabs: Upload File vs URL -->
          <div class="flex items-center p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              @click="imageInputTab = 'upload'"
              class="flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center"
              :class="imageInputTab === 'upload' ? 'bg-white dark:bg-slate-900 text-[#5D87FF] shadow-2xs' : 'text-[#64748B] dark:text-slate-400'"
            >
              Upload Local File
            </button>
            <button
              @click="imageInputTab = 'url'"
              class="flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center"
              :class="imageInputTab === 'url' ? 'bg-white dark:bg-slate-900 text-[#5D87FF] shadow-2xs' : 'text-[#64748B] dark:text-slate-400'"
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
              class="border-2 border-dashed border-[#CBD5E1] dark:border-slate-700 hover:border-[#5D87FF] dark:hover:border-[#5D87FF] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#F8FAFC] dark:bg-slate-800/40 group flex flex-col items-center justify-center gap-2"
            >
              <input
                ref="imageFileInputRef"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                class="hidden"
                @change="handleImageFileSelect"
              />

              <template v-if="selectedFilePreview">
                <img :src="selectedFilePreview" alt="Preview Upload" class="max-h-36 rounded-lg object-contain shadow-sm border border-slate-200 dark:border-slate-700" />
                <span class="text-[11px] font-bold text-[#5D87FF] group-hover:underline">Klik untuk mengganti gambar</span>
              </template>
              <template v-else>
                <div class="w-10 h-10 rounded-full bg-[#ECF2FF] dark:bg-slate-800 text-[#5D87FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-xs font-extrabold text-[#0F172A] dark:text-white">Klik atau Tarik File Gambar ke Sini</p>
                  <p class="text-[10px] text-[#64748B] dark:text-slate-400 font-medium">PNG, JPG, WebP, GIF, SVG (Maksimal 5MB)</p>
                </div>
              </template>
            </div>
          </div>

          <!-- Tab 2: URL Input Area -->
          <div v-else class="space-y-2">
            <label class="block text-[11px] font-extrabold uppercase text-[#64748B] dark:text-slate-400">URL Gambar (HTTPS):</label>
            <div class="relative flex items-center">
              <LinkIcon class="absolute left-3 w-4 h-4 text-[#7C8BAC]" />
              <input
                v-model="imageUrlInput"
                type="url"
                placeholder="https://example.com/image.png"
                class="w-full h-10 pl-9 pr-3 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs font-medium focus:border-[#5D87FF] focus:outline-none"
              />
            </div>
            <div v-if="imageUrlInput" class="pt-2 text-center">
              <img :src="imageUrlInput" alt="Preview URL" class="max-h-32 rounded-lg mx-auto object-contain border border-slate-200 dark:border-slate-700 shadow-sm" @error="showToast('URL Gambar tidak valid atau tidak dapat dimuat.', 'error')" />
            </div>
          </div>

          <!-- Caption Input -->
          <div class="space-y-1">
            <label class="block text-[11px] font-extrabold uppercase text-[#64748B] dark:text-slate-400">Keterangan Gambar / Caption (Opsional):</label>
            <input
              v-model="imageCaptionInput"
              type="text"
              placeholder="Contoh: Tangkapan layar menu Okta Portal..."
              class="w-full h-9 px-3 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs font-medium focus:border-[#5D87FF] focus:outline-none"
            />
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-3.5 bg-[#F8FAFC] dark:bg-slate-800/60 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            @click="isImageModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-extrabold text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="confirmInsertImage"
            class="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#5D87FF] hover:bg-[#4570EA] text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
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
  border-left: 3px solid #2563eb !important;
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

.ProseMirror img,
.doc-preview img {
  max-width: 100% !important;
  height: auto !important;
  border-radius: 0.75rem !important;
  margin: 1.5rem auto !important;
  display: block !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1) !important;
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

.doc-preview blockquote {
  border-left: 3px solid #2563eb;
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
  color: #0f172a;
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
