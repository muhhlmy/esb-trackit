// Template komunikasi untuk Website ESB Case Playbook & FAQ Hub
// (Data case bawaan telah dipindah ke seed.js dan disimpan di Supabase)

const COMMUNICATION_TEMPLATES = [
  {
    id: 'tpl-standup',
    title: 'Daily Standup Report',
    category: 'Standup & Reporting',
    content: `📌 **Daily Update - [Nama Kamu]** (Intern Software Engineer)
Tanggal: [DD/MM/YYYY]

✅ **Yesterday / Completed:**
- Selesai slicing UI halaman Dashboard Analytics (TASK-101)
- Integrasi API Get User Profile & test case status code 200

🎯 **Today / Planned:**
- Mengerjakan fitur Filter Date Range di Dashboard Analytics (TASK-102)
- Unit testing pada komponen chart

🚧 **Blockers / Impediments:**
- None`
  },
  {
    id: 'tpl-stuck',
    title: 'Bertanya Saat Stuck (15-Min Rule)',
    category: 'Question & Support',
    content: `Selamat pagi/siang Mas/Mbak [Nama Mentor], izin bertanya terkait task [Nama Task/Tiket]:
Saya sedang mencoba [tujuan fitur], namun saat ini mengalami kendala [ringkasan error/behavior yang salah].

Beberapa hal yang sudah saya coba perbaiki:
1. [Langkah 1 yang sudah dicoba]
2. [Langkah 2 yang sudah dicoba]

Berikut saya lampirkan screenshot log error-nya. Jika Mas/Mbak ada waktu luang nanti, boleh minta arahan sebentar? Terima kasih banyak!`
  },
  {
    id: 'tpl-pr',
    title: 'Pull Request (PR) Description',
    category: 'Code Review',
    content: `## 📝 Summary of Changes
- Implemented [Nama Fitur / Tiket ID]
- Added responsive layout for mobile viewport
- Integrated API endpoint POST /api/v1/resource

## 🧪 How Has This Been Tested?
- [x] Tested locally on Chrome & Firefox
- [x] Verified unit tests passing (\`npm run test\`)
- [x] Checked console for zero warnings/errors

## 📸 Screenshots / GIFs
(Attach screenshots here)

## 📌 Checklist
- [x] Followed team code style guidelines
- [x] Self-reviewed code before requesting review`
  },
  {
    id: 'tpl-bug-report',
    title: 'Laporan Bug ke Tim Backend / QA',
    category: 'Bug Report',
    content: `🚨 **Bug Report / Staging Issue**
- **Feature / Area:** [Nama Halaman / Module]
- **Environment:** Staging / Local Dev
- **Endpoint / Action:** [POST /api/v1/example]
- **Expected Behavior:** [Hasil yang seharusnya]
- **Actual Behavior:** [Hasil error / 500 status]
- **Payload & Response:** 
  \`\`\`json
  { "error": "Internal Server Error", "code": 500 }
  \`\`\`
- **Note:** Mohon konfirmasi apakah endpoint ini sedang ada perbaikan DB. Terima kasih!`
  }
];
