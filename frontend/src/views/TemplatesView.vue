<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@/services/api';
import TemplateCard from '@/components/templates/TemplateCard.vue';
import { MessageSquare, Search } from 'lucide-vue-next';

const FALLBACK_TEMPLATES = [
  {
    id: 'tpl-standup',
    title: 'Daily Standup Report',
    category: 'Standup & Reporting',
    content: `📌 **Daily Update - [Nama Kamu]** (Intern Software Engineer)\nTanggal: [DD/MM/YYYY]\n\n✅ **Yesterday / Completed:**\n- Selesai slicing UI halaman Dashboard Analytics (TASK-101)\n- Integrasi API Get User Profile & test case status code 200\n\n🎯 **Today / Planned:**\n- Mengerjakan fitur Filter Date Range di Dashboard Analytics (TASK-102)\n- Unit testing pada komponen chart\n\n🚧 **Blockers / Impediments:**\n- None`
  },
  {
    id: 'tpl-stuck',
    title: 'Bertanya Saat Stuck (15-Min Rule)',
    category: 'Question & Support',
    content: `Selamat pagi/siang Mas/Mbak [Nama Mentor], izin bertanya terkait task [Nama Task/Tiket]:\nSaya sedang mencoba [tujuan fitur], namun saat ini mengalami kendala [ringkasan error/behavior yang salah].\n\nBeberapa hal yang sudah saya coba perbaiki:\n1. [Langkah 1 yang sudah dicoba]\n2. [Langkah 2 yang sudah dicoba]\n\nBerikut saya lampirkan screenshot log error-nya. Jika Mas/Mbak ada waktu luang nanti, boleh minta arahan sebentar? Terima kasih banyak!`
  },
  {
    id: 'tpl-pr',
    title: 'Pull Request (PR) Description',
    category: 'Code Review',
    content: `## 📝 Summary of Changes\n- Implemented [Nama Fitur / Tiket ID]\n- Added responsive layout for mobile viewport\n- Integrated API endpoint POST /api/v1/resource\n\n## 🧪 How Has This Been Tested?\n- [x] Tested locally on Chrome & Firefox\n- [x] Verified unit tests passing (\`npm run test\`)\n- [x] Checked console for zero warnings/errors\n\n## 📸 Screenshots / GIFs\n(Attach screenshots here)\n\n## 📌 Checklist\n- [x] Followed team code style guidelines\n- [x] Self-reviewed code before requesting review`
  },
  {
    id: 'tpl-bug-report',
    title: 'Laporan Bug ke Tim Backend / QA',
    category: 'Bug Report',
    content: `🚨 **Bug Report / Staging Issue**\n- **Feature / Area:** [Nama Halaman / Module]\n- **Environment:** Staging / Local Dev\n- **Endpoint / Action:** [POST /api/v1/example]\n- **Expected Behavior:** [Hasil yang seharusnya]\n- **Actual Behavior:** [Hasil error / 500 status]\n- **Payload & Response:** \n  \`\`\`json\n  { "error": "Internal Server Error", "code": 500 }\n  \`\`\`\n- **Note:** Mohon konfirmasi apakah endpoint ini sedang ada perbaikan DB. Terima kasih!`
  }
];

const templates = ref([...FALLBACK_TEMPLATES]);
const templateSearch = ref('');

const filteredTemplates = computed(() => {
  if (!templateSearch.value.trim()) return templates.value;
  const q = templateSearch.value.toLowerCase().trim();
  return templates.value.filter(
    (t) => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
  );
});

onMounted(async () => {
  try {
    const res = await api.getTemplates();
    if (res?.data && res.data.length > 0) {
      templates.value = res.data;
    }
  } catch {
    // using fallback
  }
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div class="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <MessageSquare class="w-4 h-4" />
          <span>Communication Hub</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Template Komunikasi Tim
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">
          Format pesan standar profesional untuk Slack, Microsoft Teams, Discord, dan WhatsApp grup.
        </p>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-72">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          v-model="templateSearch"
          type="text"
          class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          placeholder="Filter template pesan..."
        />
      </div>
    </div>

    <!-- Templates Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TemplateCard
        v-for="tpl in filteredTemplates"
        :key="tpl.id"
        :template="tpl"
      />
    </div>

  </div>
</template>
