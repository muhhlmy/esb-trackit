<script setup>
import { ref, watch } from 'vue';
import { useCases } from '@/composables/useCases';
import { X, Trash2, Save, Plus, Minus } from 'lucide-vue-next';

const { isDrawerOpen, drawerMode, editingCase, closeDrawer, saveCase, deleteCase } = useCases();

const form = ref({
  id: '',
  title: '',
  category: 'hardware',
  severity: 'medium',
  tagsString: '',
  summary: '',
  problemContext: '',
  stepsString: '',
  dosString: '',
  dontsString: '',
  snippetLabel: '',
  snippetCode: ''
});

watch(editingCase, (val) => {
  if (val) {
    form.value = {
      id: val.id || '',
      title: val.title || '',
      category: val.category || 'hardware',
      severity: val.severity || 'medium',
      tagsString: Array.isArray(val.tags) ? val.tags.join(', ') : '',
      summary: val.summary || '',
      problemContext: val.problemContext || '',
      stepsString: Array.isArray(val.actionSteps) ? val.actionSteps.join('\n') : '',
      dosString: Array.isArray(val.dosAndDonts?.dos) ? val.dosAndDonts.dos.join('\n') : '',
      dontsString: Array.isArray(val.dosAndDonts?.donts) ? val.dosAndDonts.donts.join('\n') : '',
      snippetLabel: val.snippets?.[0]?.label || '',
      snippetCode: val.snippets?.[0]?.code || ''
    };
  }
}, { immediate: true });

async function onSubmit() {
  const tags = form.value.tagsString
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const actionSteps = form.value.stepsString
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const dos = form.value.dosString
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const donts = form.value.dontsString
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const snippets = form.value.snippetCode.trim()
    ? [{ label: form.value.snippetLabel.trim() || 'Command / Script', code: form.value.snippetCode.trim() }]
    : [];

  const payload = {
    id: form.value.id,
    title: form.value.title,
    category: form.value.category,
    severity: form.value.severity,
    tags,
    summary: form.value.summary,
    problemContext: form.value.problemContext,
    actionSteps,
    dosAndDonts: { dos, donts },
    snippets
  };

  await saveCase(payload);
}
</script>

<template>
  <div v-if="isDrawerOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div
      @click="closeDrawer"
      class="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
    ></div>

    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div class="w-screen max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-100">
              {{ drawerMode === 'create' ? 'Create New Artikel' : 'Edit Artikel' }}
            </h2>
            <p class="text-xs text-slate-400">Isi detail panduan playbook & resolusi insiden</p>
          </div>
          <button
            @click="closeDrawer"
            class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="onSubmit" id="case-drawer-form" class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          <div>
            <label class="block font-semibold text-slate-300 mb-1">Judul Artikel / Case <span class="text-rose-400">*</span></label>
            <input
              v-model="form.title"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Contoh: Panduan Setup Laptop Baru"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-300 mb-1">Kategori <span class="text-rose-400">*</span></label>
              <select
                v-model="form.category"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="hardware">Hardware</option>
                <option value="git">Git</option>
                <option value="backend">Backend</option>
                <option value="environment">Environment</option>
                <option value="workplace">Workplace</option>
                <option value="devops">DevOps</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1">Severity <span class="text-rose-400">*</span></label>
              <select
                v-model="form.severity"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">Ringkasan (Summary) <span class="text-rose-400">*</span></label>
            <textarea
              v-model="form.summary"
              rows="2"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Ringkasan singkat artikel..."
              required
            ></textarea>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">Problem Context / Latar Belakang</label>
            <textarea
              v-model="form.problemContext"
              rows="2"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Jelaskan kondisi atau skenario terjadinya insiden/kebutuhan..."
            ></textarea>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">
              Langkah Resolusi <span class="text-rose-400">*</span>
              <span class="text-slate-500 font-normal ml-1">(1 baris per langkah)</span>
            </label>
            <textarea
              v-model="form.stepsString"
              rows="4"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
              placeholder="1. Lakukan verifikasi...&#10;2. Buka terminal lalu...&#10;3. Jalankan script..."
              required
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-emerald-400 mb-1">DOs (1 per baris)</label>
              <textarea
                v-model="form.dosString"
                rows="3"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                placeholder="Pastikan selalu..."
              ></textarea>
            </div>
            <div>
              <label class="block font-semibold text-rose-400 mb-1">DON'Ts (1 per baris)</label>
              <textarea
                v-model="form.dontsString"
                rows="3"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                placeholder="Jangan pernah..."
              ></textarea>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">Code / Command Snippet</label>
            <input
              v-model="form.snippetLabel"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 mb-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Label Snippet (misal: PowerShell Script)"
            />
            <textarea
              v-model="form.snippetCode"
              rows="3"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              placeholder="Paste kode atau perintah di sini..."
            ></textarea>
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">
              Tags <span class="text-slate-500 font-normal">(pisahkan dengan koma)</span>
            </label>
            <input
              v-model="form.tagsString"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="hardware, setup, windows"
            />
          </div>

        </form>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <button
              v-if="drawerMode === 'edit'"
              type="button"
              @click="deleteCase(form.id)"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950 border border-rose-800/50 transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="closeDrawer"
              class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              form="case-drawer-form"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Save class="w-3.5 h-3.5" />
              <span>Simpan Case</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
