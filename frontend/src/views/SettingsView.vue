<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { useLanguage } from '@/composables/useLanguage'
import PageHeader from '@/components/ui/PageHeader.vue'

const api = useApi()
const { showToast } = useToast()
const { t } = useLanguage()

const activeTab = ref('smtp') // 'smtp' | 'templates'
const isLoading = ref(true)
const isSavingSettings = ref(false)
const isSendingTest = ref(false)
const isSavingTemplate = ref(false)
const isResettingTemplate = ref(false)

// SMTP Settings State
const smtpSettings = ref({
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_pass: '',
  has_password: false,
  email_from_name: 'TrackIT Helpdesk',
  email_from_address: 'no-reply@trackit.local',
  email_enabled: true,
  notify_ticket_create: true,
  notify_ticket_status: true,
  notify_ticket_assign: true,
  notify_ticket_comment: true,
  notify_asset_assign: true,
  notify_shipment: true,
  notify_user_create: true,
  updated_at: null,
  updated_by: null,
})

const testEmailTarget = ref('')
const showPassword = ref(false)

// Templates State
const templates = ref([])
const selectedTemplateKey = ref('ticket_created')
const activeTemplate = ref({
  template_key: 'ticket_created',
  name: '',
  description: '',
  subject: '',
  body_html: '',
  body_text: '',
  is_active: true,
})

// Preview Device Mode ('desktop' | 'mobile')
const previewDevice = ref('desktop')

// Sample Mockup Data for Realistic Live Preview (All 8 Events)
// Computed agar data contoh mengikuti bahasa aktif (tidak menampilkan teks Indonesia saat EN aktif).
const previewMockData = computed(() => ({
  '{{recipient_name}}': 'Budi Santoso',
  '{{nomor_tiket}}': '#TIC26-0142',
  '{{judul_tiket}}': t('settings_mock_ticket_title'),
  '{{status_tiket}}': 'In Progress',
  '{{prioritas_tiket}}': t('settings_mock_priority'),
  '{{unit_support}}': t('settings_mock_support_unit'),
  '{{pelapor_nama}}': 'Ahmad Fauzi',
  '{{status_sebelumnya}}': 'Open',
  '{{status_baru}}': 'In Progress',
  '{{catatan_update}}': t('settings_mock_update_note'),
  '{{comment_author}}': 'Hendra Wijaya (IT Support)',
  '{{comment_pesan}}': t('settings_mock_comment'),
  '{{nama_teknisi}}': 'Hendra Wijaya',
  '{{ticket_url}}': 'https://trackit.company.id/tickets/TIC26-0142',
  '{{nomor_bast}}': 'BAST-2026-IT-0089',
  '{{tanggal_bast}}': t('settings_mock_bast_date'),
  '{{nama_aset}}': 'MacBook Pro 14" M3 Pro (Space Grey)',
  '{{serial_number}}': 'C02G41ABMD6M',
  '{{bast_url}}': 'https://trackit.company.id/submissions/BAST-2026-IT-0089',
  '{{tracking_number}}': 'TRK-2026-X8921',
  '{{ekspedisi}}': 'JNE Express (YES)',
  '{{status_pengiriman}}': t('settings_mock_shipment_status'),
  '{{tujuan_pengiriman}}': t('settings_mock_destination'),
  '{{shipment_url}}': 'https://trackit.company.id/shipments/TRK-2026-X8921',
  '{{user_name}}': 'Budi Santoso',
  '{{user_email}}': 'budi.santoso@perusahaan.co.id',
  '{{user_role}}': t('settings_mock_user_role'),
  '{{app_url}}': 'https://trackit.company.id/login',
  '{{otp_code}}': '749102',
  '{{expiry_minutes}}': '15',
}))

const renderedPreviewSubject = computed(() => {
  let subj = activeTemplate.value.subject || ''
  for (const [placeholder, val] of Object.entries(previewMockData.value)) {
    subj = subj.replaceAll(placeholder, val)
  }
  return subj
})

const renderedPreviewHtml = computed(() => {
  let html = activeTemplate.value.body_html || ''
  for (const [placeholder, val] of Object.entries(previewMockData.value)) {
    html = html.replaceAll(placeholder, val)
  }
  return html
})

// Computed agar deskripsi variabel mengikuti bahasa aktif.
const dynamicVariables = computed(() => [
  { key: '{{recipient_name}}', desc: t('settings_var_recipient_name') },
  { key: '{{nomor_tiket}}', desc: t('settings_var_nomor_tiket') },
  { key: '{{judul_tiket}}', desc: t('settings_var_judul_tiket') },
  { key: '{{status_tiket}}', desc: t('settings_var_status_tiket') },
  { key: '{{prioritas_tiket}}', desc: t('settings_var_prioritas_tiket') },
  { key: '{{unit_support}}', desc: t('settings_var_unit_support') },
  { key: '{{pelapor_nama}}', desc: t('settings_var_pelapor_nama') },
  { key: '{{status_sebelumnya}}', desc: t('settings_var_status_sebelumnya') },
  { key: '{{status_baru}}', desc: t('settings_var_status_baru') },
  { key: '{{catatan_update}}', desc: t('settings_var_catatan_update') },
  { key: '{{comment_author}}', desc: t('settings_var_comment_author') },
  { key: '{{comment_pesan}}', desc: t('settings_var_comment_pesan') },
  { key: '{{nama_teknisi}}', desc: t('settings_var_nama_teknisi') },
  { key: '{{ticket_url}}', desc: t('settings_var_ticket_url') },
  { key: '{{nomor_bast}}', desc: t('settings_var_nomor_bast') },
  { key: '{{tanggal_bast}}', desc: t('settings_var_tanggal_bast') },
  { key: '{{nama_aset}}', desc: t('settings_var_nama_aset') },
  { key: '{{serial_number}}', desc: t('settings_var_serial_number') },
  { key: '{{bast_url}}', desc: t('settings_var_bast_url') },
  { key: '{{tracking_number}}', desc: t('settings_var_tracking_number') },
  { key: '{{ekspedisi}}', desc: t('settings_var_ekspedisi') },
  { key: '{{status_pengiriman}}', desc: t('settings_var_status_pengiriman') },
  { key: '{{tujuan_pengiriman}}', desc: t('settings_var_tujuan_pengiriman') },
  { key: '{{shipment_url}}', desc: t('settings_var_shipment_url') },
  { key: '{{user_name}}', desc: t('settings_var_user_name') },
  { key: '{{user_email}}', desc: t('settings_var_user_email') },
  { key: '{{user_role}}', desc: t('settings_var_user_role') },
  { key: '{{app_url}}', desc: t('settings_var_app_url') },
  { key: '{{otp_code}}', desc: t('settings_var_otp_code') },
  { key: '{{expiry_minutes}}', desc: t('settings_var_expiry_minutes') },
])

function copyVariable(varKey) {
  navigator.clipboard?.writeText(varKey)
  showToast(`${varKey} ${t('settings_var_copied_suffix')}`, 'info')
}

async function loadData() {
  isLoading.value = true
  try {
    const [settingsRes, templatesRes] = await Promise.all([
      api.get('/api/settings/email'),
      api.get('/api/settings/email/templates'),
    ])

    if (settingsRes?.success && settingsRes.data) {
      smtpSettings.value = {
        ...settingsRes.data,
        smtp_pass: settingsRes.data.has_password ? '••••••••' : '',
      }
    }

    if (templatesRes?.success && Array.isArray(templatesRes.data)) {
      templates.value = templatesRes.data
      if (templates.value.length > 0) {
        selectTemplate(templates.value[0].template_key)
      }
    }
  } catch (err) {
    showToast(err.message || t('settings_err_load'), 'error')
  } finally {
    isLoading.value = false
  }
}

function selectTemplate(key) {
  selectedTemplateKey.value = key
  const tpl = templates.value.find((t) => t.template_key === key)
  if (tpl) {
    activeTemplate.value = { ...tpl }
  }
}

async function handleSaveSettings() {
  isSavingSettings.value = true
  try {
    const res = await api.put('/api/settings/email', smtpSettings.value)
    if (res?.success) {
      showToast(t('settings_saved', 'Pengaturan email berhasil disimpan.'), 'success')
      if (smtpSettings.value.smtp_pass && smtpSettings.value.smtp_pass !== '••••••••') {
        smtpSettings.value.has_password = true
        smtpSettings.value.smtp_pass = '••••••••'
      }
    } else {
      throw new Error(res?.message || t('settings_err_save'))
    }
  } catch (err) {
    showToast(err.message || t('settings_err_save'), 'error')
  } finally {
    isSavingSettings.value = false
  }
}

async function handleSendTestEmail() {
  if (!testEmailTarget.value && !smtpSettings.value.email_from_address) {
    showToast(t('settings_err_test_target'), 'error')
    return
  }

  isSendingTest.value = true
  try {
    const res = await api.post('/api/settings/email/test', {
      target_email: testEmailTarget.value || smtpSettings.value.email_from_address,
    })
    if (res?.success) {
      showToast(t('test_email_success', 'Email pengujian berhasil dikirim!'), 'success')
    } else {
      throw new Error(res?.message || t('settings_err_test_send'))
    }
  } catch (err) {
    showToast(err.message || t('test_email_failed', 'Gagal mengirim email pengujian.'), 'error')
  } finally {
    isSendingTest.value = false
  }
}

async function handleSaveTemplate() {
  isSavingTemplate.value = true
  try {
    const res = await api.put(
      `/api/settings/email/templates/${selectedTemplateKey.value}`,
      activeTemplate.value,
    )
    if (res?.success) {
      showToast(t('template_saved', 'Template email berhasil diperbarui.'), 'success')
      const idx = templates.value.findIndex((t) => t.template_key === selectedTemplateKey.value)
      if (idx !== -1) {
        templates.value[idx] = { ...res.data }
      }
    } else {
      throw new Error(res?.message || t('settings_err_save_template'))
    }
  } catch (err) {
    showToast(err.message || t('settings_err_save_template'), 'error')
  } finally {
    isSavingTemplate.value = false
  }
}

async function handleResetTemplate() {
  isResettingTemplate.value = true
  try {
    const res = await api.post(`/api/settings/email/templates/${selectedTemplateKey.value}/reset`)
    if (res?.success) {
      showToast(t('settings_template_reset_success'), 'success')
      activeTemplate.value = { ...res.data }
      const idx = templates.value.findIndex((t) => t.template_key === selectedTemplateKey.value)
      if (idx !== -1) {
        templates.value[idx] = { ...res.data }
      }
    } else {
      throw new Error(res?.message || t('settings_err_reset_template'))
    }
  } catch (err) {
    showToast(err.message || t('settings_err_reset_template'), 'error')
  } finally {
    isResettingTemplate.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div
    class="settings-view w-full space-y-3 font-sans"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- Page Header -->
    <PageHeader
      :title="t('settings_title', 'Pengaturan Sistem')"
      :subtitle="t('settings_subtitle', 'Konfigurasi SMTP email, notifikasi otomatis, dan template pesan sistem')"
      icon="settings"
    >
      <div class="flex items-center gap-2">
        <button
          v-if="activeTab === 'smtp'"
          type="button"
          id="save-settings-btn"
          :disabled="isSavingSettings"
          @click="handleSaveSettings"
          class="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#0A51B0] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 transition-all cursor-pointer"
        >
          <span
            v-if="isSavingSettings"
            class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
          ></span>
          <span aria-hidden="true" v-else class="material-symbols-outlined text-[16px]">save</span>
          <span>{{ t('save_settings', 'Simpan Pengaturan') }}</span>
        </button>

        <button
          v-else
          type="button"
          id="save-template-btn"
          :disabled="isSavingTemplate"
          @click="handleSaveTemplate"
          class="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#0A51B0] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 transition-all cursor-pointer"
        >
          <span
            v-if="isSavingTemplate"
            class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
          ></span>
          <span aria-hidden="true" v-else class="material-symbols-outlined text-[16px]">save</span>
          <span>{{ t('save_template', 'Simpan Template') }}</span>
        </button>
      </div>
    </PageHeader>

    <!-- Tab Navigation Bar -->
    <div
      role="tablist"
      :aria-label="t('settings_tablist_aria')"
      class="flex gap-1 rounded-[6px] bg-[#F1F5F9] dark:bg-slate-800 p-1 w-full sm:w-fit border border-[#E2E8F0] dark:border-slate-700"
    >
      <button
        role="tab"
        id="tab-smtp"
        aria-controls="panel-smtp"
        :aria-selected="activeTab === 'smtp'"
        type="button"
        @click="activeTab = 'smtp'"
        class="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
        :class="
          activeTab === 'smtp'
            ? 'bg-white dark:bg-slate-900 text-[#0A51B0] dark:text-blue-400 font-semibold shadow-xs'
            : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333]'
        "
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[16px]">mail</span>
        <span>{{ t('tab_smtp', 'Koneksi SMTP & Notifikasi') }}</span>
      </button>

      <button
        role="tab"
        id="tab-templates"
        aria-controls="panel-templates"
        :aria-selected="activeTab === 'templates'"
        type="button"
        @click="activeTab = 'templates'"
        class="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
        :class="
          activeTab === 'templates'
            ? 'bg-white dark:bg-slate-900 text-[#0A51B0] dark:text-blue-400 font-semibold shadow-xs'
            : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333]'
        "
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[16px]">description</span>
        <span>{{ t('tab_templates', 'Template Email') }}</span>
      </button>
    </div>

    <!-- TAB 1: SMTP & Notification Settings -->
    <div
      v-if="activeTab === 'smtp'"
      id="panel-smtp"
      role="tabpanel"
      aria-labelledby="tab-smtp"
      class="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <!-- Left Column: SMTP Configuration Form -->
      <div class="lg:col-span-2 space-y-4">
        <div class="rounded-[8px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-4">
          <div class="flex items-center justify-between border-b border-[#F1F5F9] dark:border-slate-800 pb-3">
            <div>
              <h2 class="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-slate-100">
                {{ t('settings_smtp_config_title') }}
              </h2>
              <p class="text-[11px] text-[#5F7089] dark:text-slate-400 mt-0.5">
                {{ t('settings_smtp_card_desc') }}
              </p>
            </div>

            <!-- Master Toggle -->
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <span class="text-[11px] font-semibold text-[#334155] dark:text-slate-300">{{ t('settings_email_service_label') }}</span>
              <input
                type="checkbox"
                v-model="smtpSettings.email_enabled"
                class="sr-only peer"
              />
              <div
                class="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0A51B0] relative"
              ></div>
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- SMTP Host -->
            <div>
              <label for="smtp-host" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                {{ t('smtp_host', 'Host SMTP') }} *
              </label>
              <input
                id="smtp-host"
                v-model="smtpSettings.smtp_host"
                type="text"
                placeholder="smtp.gmail.com / mail.internal.corp"
                class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
              />
            </div>

            <!-- SMTP Port & Encryption -->
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="smtp-port" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                  {{ t('smtp_port', 'Port SMTP') }} *
                </label>
                <input
                  id="smtp-port"
                  v-model.number="smtpSettings.smtp_port"
                  type="number"
                  placeholder="587"
                  class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                  {{ t('smtp_secure', 'Enkripsi SSL/TLS') }}
                </label>
                <div class="flex items-center h-8">
                  <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[#475569] dark:text-slate-300">
                    <input
                      type="checkbox"
                      v-model="smtpSettings.smtp_secure"
                      class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]"
                    />
                    <span>SSL (Port 465)</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- SMTP User -->
            <div>
              <label for="smtp-user" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                {{ t('smtp_user', 'Username SMTP') }} *
              </label>
              <input
                id="smtp-user"
                v-model="smtpSettings.smtp_user"
                type="text"
                placeholder="admin@trackit.local"
                class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
              />
            </div>

            <!-- SMTP Password -->
            <div>
              <label for="smtp-pass" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                {{ t('smtp_pass', 'Password SMTP') }}
              </label>
              <div class="relative">
                <input
                  id="smtp-pass"
                  v-model="smtpSettings.smtp_pass"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="t('settings_pass_placeholder')"
                  class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 pl-2.5 pr-8 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
                />
                <button
                  type="button"
                  :aria-label="t('settings_toggle_pass_aria')"
                  @click="showPassword = !showPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#333333] cursor-pointer"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[16px]">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- From Name -->
            <div>
              <label for="from-name" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                {{ t('from_name', 'Nama Pengirim') }}
              </label>
              <input
                id="from-name"
                v-model="smtpSettings.email_from_name"
                type="text"
                placeholder="TrackIT Helpdesk"
                class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
              />
            </div>

            <!-- From Email -->
            <div>
              <label for="from-email" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
                {{ t('from_email', 'Email Pengirim (No-Reply)') }}
              </label>
              <input
                id="from-email"
                v-model="smtpSettings.email_from_address"
                type="email"
                placeholder="no-reply@trackit.local"
                class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Notification Event Triggers -->
        <div class="rounded-[8px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
          <div class="border-b border-[#F1F5F9] dark:border-slate-800 pb-2">
            <h2 class="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-slate-100">
              {{ t('notification_events', 'Pemicu Notifikasi Email') }}
            </h2>
            <p class="text-[11px] text-[#5F7089] dark:text-slate-400 mt-0.5">
              {{ t('settings_notify_desc') }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_ticket_create', 'Kirim saat tiket baru dibuat') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_ticket_create" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_ticket_status', 'Kirim saat status tiket diperbarui') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_ticket_status" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_ticket_assign', 'Kirim saat teknisi/PIC ditugaskan') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_ticket_assign" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_ticket_comment', 'Kirim saat ada komentar baru pada tiket') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_ticket_comment" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_asset_assign', 'Kirim saat ada serah terima aset (BAST)') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_asset_assign" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_shipment', 'Kirim saat status pengiriman aset diperbarui') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_shipment" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 cursor-pointer">
              <span class="text-xs font-medium text-[#334155] dark:text-slate-200">
                {{ t('notify_user_create', 'Kirim email sambutan saat akun pengguna baru dibuat') }}
              </span>
              <input type="checkbox" v-model="smtpSettings.notify_user_create" class="rounded border-slate-300 text-[#0A51B0] focus:ring-[#0A51B0]" />
            </label>
          </div>
        </div>
      </div>

      <!-- Right Column: Test Email & Status Helper -->
      <div class="space-y-4">
        <div class="rounded-[8px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
          <div class="border-b border-[#F1F5F9] dark:border-slate-800 pb-2">
            <h2 class="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-slate-100">
              {{ t('settings_smtp_test_title') }}
            </h2>
            <p class="text-[11px] text-[#5F7089] dark:text-slate-400 mt-0.5">
              {{ t('settings_test_card_desc') }}
            </p>
          </div>

          <div class="space-y-2">
            <label for="test-email-input" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300">
              {{ t('test_email_target', 'Alamat Email Tujuan') }}
            </label>
            <input
              id="test-email-input"
              v-model="testEmailTarget"
              type="email"
              :placeholder="t('settings_test_email_placeholder')"
              class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
            />
            <button
              type="button"
              id="test-email-btn"
              :disabled="isSendingTest || !smtpSettings.smtp_host"
              @click="handleSendTestEmail"
              class="w-full inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-[#0A51B0] text-[#0A51B0] bg-[#EDF5FF] hover:bg-[#DFEDFE] text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
            >
              <span
                v-if="isSendingTest"
                class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0A51B0] border-t-transparent"
              ></span>
              <span aria-hidden="true" v-else class="material-symbols-outlined text-[15px]">send</span>
              <span>{{ isSendingTest ? t('settings_sending_test') : t('test_email_btn', 'Kirim Email Uji Coba') }}</span>
            </button>
          </div>
        </div>

        <!-- Info / Security Advice Card -->
        <div class="rounded-[8px] border border-[#BFDBFE] bg-[#EFF6FF] dark:bg-slate-800/80 p-3.5 text-xs text-[#1E3A8A] dark:text-blue-300 space-y-1.5">
          <div class="flex items-center gap-1.5 font-bold">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#0A51B0]">verified_user</span>
            <span>{{ t('settings_security_title') }}</span>
          </div>
          <p class="text-[11px] leading-relaxed text-[#2B4365] dark:text-slate-300">
            {{ t('settings_security_desc') }}
          </p>
        </div>
      </div>
    </div>

    <!-- TAB 2: Email Template Customizer -->
    <div
      v-else
      id="panel-templates"
      role="tabpanel"
      aria-labelledby="tab-templates"
      class="grid grid-cols-1 lg:grid-cols-12 gap-4"
    >
      <!-- Left: Template Selector Sidebar -->
      <div class="lg:col-span-3 space-y-2">
        <div class="rounded-[8px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xs space-y-1">
          <div class="px-2 py-1.5 border-b border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#637288]">
              {{ t('template_select', 'Pilih Template') }}
            </span>
            <span class="text-[10px] font-mono text-slate-400">
              {{ templates.length }} Events
            </span>
          </div>

          <button
            v-for="tpl in templates"
            :key="tpl.template_key"
            type="button"
            @click="selectTemplate(tpl.template_key)"
            class="w-full text-left p-2 rounded-md text-xs transition-all flex flex-col gap-0.5 cursor-pointer"
            :class="
              selectedTemplateKey === tpl.template_key
                ? 'bg-[#EAF1FC] text-[#0A51B0] dark:text-blue-400 font-bold border-l-3 border-[#0A51B0]'
                : 'text-[#334155] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
            "
          >
            <div class="flex items-center justify-between w-full">
              <span>{{ tpl.name }}</span>
              <span v-if="selectedTemplateKey === tpl.template_key" class="w-1.5 h-1.5 rounded-full bg-[#0A51B0]"></span>
            </div>
            <span class="text-[10px] text-[#64748B] dark:text-slate-400 font-normal truncate">
              {{ tpl.description }}
            </span>
          </button>
        </div>

        <!-- Dynamic Variables Helper List -->
        <div class="rounded-[8px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-2">
          <div class="border-b border-[#F1F5F9] dark:border-slate-800 pb-1.5">
            <h3 class="text-xs font-bold text-[#1E293B] dark:text-slate-100">
              {{ t('available_vars', 'Variabel Dinamis') }}
            </h3>
            <p class="text-[10px] text-[#64748B] dark:text-slate-400">
              {{ t('settings_vars_click_hint') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-1 max-h-56 overflow-y-auto pr-1">
            <button
              v-for="item in dynamicVariables"
              :key="item.key"
              type="button"
              @click="copyVariable(item.key)"
              :title="item.desc"
              class="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-mono bg-[#F1F5F9] dark:bg-slate-800 text-[#0A51B0] dark:text-blue-400 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#E2E8F0] transition-colors cursor-pointer"
            >
              {{ item.key }}
            </button>
          </div>
        </div>
      </div>

      <!-- Center: Template Editor -->
      <div class="lg:col-span-4 space-y-3">
        <div class="rounded-[8px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
          <div class="flex items-center justify-between border-b border-[#F1F5F9] dark:border-slate-800 pb-2">
            <div>
              <h2 class="text-xs sm:text-sm font-bold text-[#1E293B] dark:text-slate-100">
                {{ activeTemplate.name || 'Edit Template' }}
              </h2>
              <p class="text-[11px] text-[#5F7089] dark:text-slate-400">
                {{ activeTemplate.description }}
              </p>
            </div>

            <button
              type="button"
              id="reset-template-btn"
              :disabled="isResettingTemplate"
              @click="handleResetTemplate"
              class="text-[11px] font-semibold text-[#B91C1C] hover:text-[#991B1B] hover:underline cursor-pointer"
            >
              {{ t('reset_default', 'Kembalikan ke Default') }}
            </button>
          </div>

          <!-- Subject Input -->
          <div>
            <label for="template-subject" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
              {{ t('template_subject', 'Subjek Email') }} *
            </label>
            <input
              id="template-subject"
              v-model="activeTemplate.subject"
              type="text"
              class="h-8 w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-[#1E293B] dark:text-slate-100 focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none font-medium"
            />
          </div>

          <!-- Body HTML Editor -->
          <div>
            <label for="template-body-html" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
              {{ t('template_body', 'Isi Email (HTML)') }} *
            </label>
            <textarea
              id="template-body-html"
              v-model="activeTemplate.body_html"
              rows="12"
              class="w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-[#1E293B] dark:text-slate-100 font-mono focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none leading-relaxed"
            ></textarea>
          </div>

          <!-- Plain Text Fallback -->
          <div>
            <label for="template-body-text" class="block text-[11px] font-semibold text-[#334155] dark:text-slate-300 mb-1">
              {{ t('settings_template_body_text') }}
            </label>
            <textarea
              id="template-body-text"
              v-model="activeTemplate.body_text"
              rows="3"
              class="w-full rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-[#1E293B] dark:text-slate-100 font-mono focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] outline-none"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Right: Live Responsive Preview (Apple Design Standard & Real Preview) -->
      <div class="lg:col-span-5 space-y-3">
        <div class="rounded-[10px] border border-[#CBD5E1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden sticky top-4">
          <!-- Apple Mail Simulated Window Titlebar -->
          <div class="bg-[#F8FAFC] dark:bg-slate-800/90 border-b border-[#E2E8F0] dark:border-slate-700/80 px-3.5 py-2 flex items-center justify-between">
            <!-- Traffic Lights -->
            <div class="flex items-center gap-1.5" aria-hidden="true">
              <span class="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/40 inline-block"></span>
              <span class="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40 inline-block"></span>
              <span class="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/40 inline-block"></span>
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-2 tracking-tight">Apple Mail (Live Preview)</span>
            </div>

            <!-- Device Switcher Pills -->
            <div class="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-700/80 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                @click="previewDevice = 'desktop'"
                class="px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
                :class="previewDevice === 'desktop' ? 'bg-white dark:bg-slate-900 text-[#0A51B0] dark:text-blue-400 font-bold shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
              >
                <span class="material-symbols-outlined text-[14px]">desktop_windows</span>
                <span>Desktop (580px)</span>
              </button>
              <button
                type="button"
                @click="previewDevice = 'mobile'"
                class="px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
                :class="previewDevice === 'mobile' ? 'bg-white dark:bg-slate-900 text-[#0A51B0] dark:text-blue-400 font-bold shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
              >
                <span class="material-symbols-outlined text-[14px]">smartphone</span>
                <span>iPhone (375px)</span>
              </button>
            </div>
          </div>

          <!-- Realistic Mail Client Header Envelope Info -->
          <div class="bg-white dark:bg-slate-900 px-3.5 py-2.5 border-b border-[#F1F5F9] dark:border-slate-800 space-y-1 text-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-[#0A51B0] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                  TI
                </div>
                <div>
                  <div class="font-semibold text-slate-800 dark:text-slate-200 text-[11.5px] leading-tight">
                    {{ smtpSettings.email_from_name || 'TrackIT Helpdesk' }}
                    <span class="text-[10px] text-slate-400 font-normal">&lt;{{ smtpSettings.email_from_address || 'no-reply@trackit.local' }}&gt;</span>
                  </div>
                  <div class="text-[10.5px] text-slate-500 dark:text-slate-400">
                    {{ t('settings_preview_to') }} <span class="font-medium text-slate-700 dark:text-slate-300">Budi Santoso &lt;budi.santoso@perusahaan.co.id&gt;</span>
                  </div>
                </div>
              </div>
              <span class="text-[10px] text-slate-400 shrink-0">{{ t('settings_preview_today') }}</span>
            </div>

            <div class="pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-200">
              <span class="text-slate-400 font-normal">{{ t('settings_preview_subject_label') }} </span>
              <strong class="font-semibold text-slate-900 dark:text-white">{{ renderedPreviewSubject }}</strong>
            </div>
          </div>

          <!-- Email Simulator Viewport Area -->
          <div class="bg-[#F8FAFC] dark:bg-slate-950 p-3 sm:p-4 min-h-[380px] max-h-[640px] overflow-y-auto flex justify-center">
            <div
              class="transition-all duration-300 w-full"
              :class="previewDevice === 'mobile' ? 'max-w-[375px] shadow-md rounded-[16px] overflow-hidden border border-slate-300 dark:border-slate-800' : 'max-w-[580px]'"
            >
              <div
                class="mail-render-card bg-white dark:bg-slate-900 rounded-[12px] border border-[#E2E8F0] dark:border-slate-800 overflow-hidden"
                v-html="renderedPreviewHtml"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  font-family: inherit;
}
.mail-render-card :deep(table) {
  max-width: 100% !important;
}
.mail-render-card :deep(img) {
  max-width: 100% !important;
  height: auto !important;
}
</style>
