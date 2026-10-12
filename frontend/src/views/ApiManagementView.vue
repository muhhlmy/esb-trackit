<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { useLanguage } from '@/composables/useLanguage'
import PageHeader from '@/components/ui/PageHeader.vue'

const api = useApi()
const { showToast } = useToast()
const { t } = useLanguage()

const activeTab = ref('clients') // 'clients' | 'webhooks' | 'catalog'
const isLoading = ref(true)

// API Clients State
const clients = ref([])
const showCreateClientModal = ref(false)
const isSubmittingClient = ref(false)
const newClientForm = ref({
  name: '',
  organization: '',
  scopes: ['assets:read', 'reports:read'],
  rateLimit: 120,
})

// Fresh Key Reveal Modal State
const createdClientResult = ref(null)

// Webhooks State
const subscriptions = ref([])
const deliveries = ref([])
const showCreateWebhookModal = ref(false)
const isSubmittingWebhook = ref(false)
const newWebhookForm = ref({
  targetUrl: '',
  events: ['ticket.created', 'asset.assigned'],
})

// Available Scopes and Events (computed agar label mengikuti bahasa aktif)
const availableScopes = computed(() => [
  { key: 'assets:read', label: t('api_portal_scope_assets_read') },
  { key: 'assets:write', label: t('api_portal_scope_assets_write') },
  { key: 'tickets:read', label: t('api_portal_scope_tickets_read') },
  { key: 'tickets:write', label: t('api_portal_scope_tickets_write') },
  { key: 'reports:read', label: t('api_portal_scope_reports_read') },
  { key: 'api_clients:manage', label: t('api_portal_scope_clients_manage') },
  { key: 'webhooks:manage', label: t('api_portal_scope_webhooks_manage') },
])

const availableEvents = computed(() => [
  { key: 'ticket.created', label: t('webhook_event_ticket_created') },
  { key: 'ticket.status_changed', label: t('webhook_event_ticket_status') },
  { key: 'asset.created', label: t('webhook_event_asset_created') },
  { key: 'asset.assigned', label: t('webhook_event_asset_assigned') },
  { key: 'submission.created', label: t('webhook_event_submission_created') },
  { key: 'shipment.status_changed', label: t('webhook_event_shipment_status') },
])

// System Status
const systemStatus = ref(null)

async function fetchClients() {
  try {
    const res = await api.get('/api/v1/api-clients')
    clients.value = res.data?.data || []
  } catch (error) {
    showToast(error.message || t('api_portal_err_load_clients'), 'error')
  }
}

async function fetchWebhooks() {
  try {
    const [subRes, delRes] = await Promise.all([
      api.get('/api/v1/webhook-subscriptions'),
      api.get('/api/v1/webhook-deliveries?limit=20'),
    ])
    subscriptions.value = subRes.data?.data || []
    deliveries.value = delRes.data?.data || []
  } catch (error) {
    showToast(error.message || t('api_portal_err_load_webhooks'), 'error')
  }
}

async function fetchSystemStatus() {
  try {
    const res = await api.get('/api/v1/system/status')
    systemStatus.value = res.data
  } catch {
    // optional
  }
}

async function loadAllData() {
  isLoading.value = true
  await Promise.all([fetchClients(), fetchWebhooks(), fetchSystemStatus()])
  isLoading.value = false
}

onMounted(() => {
  loadAllData()
})

async function handleCreateClient() {
  if (!newClientForm.value.name.trim()) {
    showToast(t('api_portal_err_name_required'), 'error')
    return
  }
  isSubmittingClient.value = true
  try {
    const res = await api.post('/api/v1/api-clients', newClientForm.value)
    createdClientResult.value = res.data?.data
    showCreateClientModal.value = false
    newClientForm.value = {
      name: '',
      organization: '',
      scopes: ['assets:read', 'reports:read'],
      rateLimit: 120,
    }
    await fetchClients()
    showToast(t('api_portal_client_created'), 'success')
  } catch (error) {
    showToast(error.message || t('api_portal_err_create_client'), 'error')
  } finally {
    isSubmittingClient.value = false
  }
}

async function handleRotateSecret(client) {
  if (!confirm(`${t('api_portal_confirm_rotate_p1')}${client.client_name}${t('api_portal_confirm_rotate_p2')}`)) return
  try {
    const res = await api.post(`/api/v1/api-clients/${client.id}/rotate-secret`)
    createdClientResult.value = res.data?.data
    await fetchClients()
    showToast(t('api_portal_secret_rotated'), 'success')
  } catch (error) {
    showToast(error.message || t('api_portal_err_rotate'), 'error')
  }
}

async function handleRevokeClient(client) {
  if (!confirm(`${t('api_portal_confirm_revoke_p1')}${client.client_name}${t('api_portal_confirm_revoke_p2')}`)) return
  try {
    await api.post(`/api/v1/api-clients/${client.id}/revoke`)
    await fetchClients()
    showToast(t('api_portal_client_revoked'), 'success')
  } catch (error) {
    showToast(error.message || t('api_portal_err_revoke'), 'error')
  }
}

async function handleCreateWebhook() {
  if (!newWebhookForm.value.targetUrl.trim()) {
    showToast(t('webhook_err_target_required'), 'error')
    return
  }
  isSubmittingWebhook.value = true
  try {
    await api.post('/api/v1/webhook-subscriptions', newWebhookForm.value)
    showCreateWebhookModal.value = false
    newWebhookForm.value = {
      targetUrl: '',
      events: ['ticket.created', 'asset.assigned'],
    }
    await fetchWebhooks()
    showToast(t('webhook_registered'), 'success')
  } catch (error) {
    showToast(error.message || t('webhook_err_register'), 'error')
  } finally {
    isSubmittingWebhook.value = false
  }
}

async function handleDeleteWebhook(id) {
  if (!confirm(t('webhook_confirm_delete'))) return
  try {
    await api.delete(`/api/v1/webhook-subscriptions/${id}`)
    await fetchWebhooks()
    showToast(t('webhook_deleted'), 'success')
  } catch (error) {
    showToast(error.message || t('webhook_err_delete'), 'error')
  }
}

async function handleTestWebhookPing() {
  try {
    const res = await api.post('/api/v1/webhook-test', {
      event: 'system.ping',
      payload: { message: t('webhook_test_payload_message') },
    })
    showToast(res.data?.message || t('webhook_ping_sent'), 'success')
    await fetchWebhooks()
  } catch (error) {
    showToast(error.message || t('webhook_err_ping'), 'error')
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  showToast(t('copied_clipboard'), 'success')
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6" data-testid="page-ready">
    <PageHeader
      :title="t('api_portal_title', 'API & Integrasi Enterprise')"
      :subtitle="t('api_portal_sub', 'Kelola API Clients, Webhook Subscriptions, dan Integrasi BI / Automasi')"
    >
      <template #actions>
        <div class="flex items-center gap-3">
          <a
            href="/openapi.json"
            target="_blank"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <span class="material-symbols-outlined text-base">description</span>
            OpenAPI Spec
          </a>
          <a
            href="/metrics"
            target="_blank"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <span class="material-symbols-outlined text-base">monitoring</span>
            Prometheus Metrics
          </a>
        </div>
      </template>
    </PageHeader>

    <!-- Tab Navigation -->
    <div class="flex border-b border-slate-200 dark:border-slate-700 gap-6">
      <button
        @click="activeTab = 'clients'"
        :class="[
          'pb-3 font-semibold text-sm transition relative',
          activeTab === 'clients'
            ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
        ]"
      >
        API Clients (M2M Keys)
        <span class="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {{ clients.length }}
        </span>
      </button>

      <button
        @click="activeTab = 'webhooks'"
        :class="[
          'pb-3 font-semibold text-sm transition relative',
          activeTab === 'webhooks'
            ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
        ]"
      >
        Webhook Subscriptions
        <span class="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {{ subscriptions.length }}
        </span>
      </button>

      <button
        @click="activeTab = 'catalog'"
        :class="[
          'pb-3 font-semibold text-sm transition relative',
          activeTab === 'catalog'
            ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
        ]"
      >
        Katalog Endpoint & Panduan
      </button>
    </div>

    <!-- TAB 1: API Clients -->
    <div v-if="activeTab === 'clients'" class="space-y-6">
      <div class="flex justify-between items-center">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Kredensial Machine-to-Machine (M2M) untuk integrasi dengan Power BI, Grafana, n8n, dan aplikasi internal lainnya.
        </p>
        <button
          @click="showCreateClientModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition"
        >
          <span class="material-symbols-outlined text-base">key</span>
          Buat API Client Baru
        </button>
      </div>

      <!-- Clients Table -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <tr>
              <th class="py-3 px-4">Nama Client</th>
              <th class="py-3 px-4">Client ID</th>
              <th class="py-3 px-4">Organisasi</th>
              <th class="py-3 px-4">Scopes</th>
              <th class="py-3 px-4">Rate Limit</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr v-if="clients.length === 0">
              <td colspan="7" class="py-8 text-center text-slate-500">
                Belum ada API Client terdaftar. Klik tombol di atas untuk membuat.
              </td>
            </tr>
            <tr v-for="client in clients" :key="client.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                {{ client.client_name }}
              </td>
              <td class="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                {{ client.client_id }}
              </td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                {{ client.organization || '-' }}
              </td>
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="s in client.scopes"
                    :key="s"
                    class="px-2 py-0.5 text-xs rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                  >
                    {{ s }}
                  </span>
                </div>
              </td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                {{ client.rate_limit }} req/m
              </td>
              <td class="py-3.5 px-4">
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    client.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                  ]"
                >
                  {{ client.is_active ? 'Aktif' : 'Dicabut' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right space-x-2">
                <button
                  v-if="client.is_active"
                  @click="handleRotateSecret(client)"
                  class="text-xs text-sky-600 hover:text-sky-700 font-medium px-2 py-1 rounded hover:bg-sky-50 dark:hover:bg-sky-950"
                  title="Rotasi secret dan terbitkan API key baru"
                >
                  Rotasi Key
                </button>
                <button
                  v-if="client.is_active"
                  @click="handleRevokeClient(client)"
                  class="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950"
                  title="Cabut akses client"
                >
                  Cabut
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: Webhooks -->
    <div v-if="activeTab === 'webhooks'" class="space-y-6">
      <div class="flex justify-between items-center">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Daftarkan endpoint HTTP POST eksternal yang akan menerima event perubahan data di TrackIT dengan tanda tangan HMAC-SHA256.
        </p>
        <div class="flex gap-2">
          <button
            @click="handleTestWebhookPing"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            <span class="material-symbols-outlined text-base">send</span>
            Uji Ping
          </button>
          <button
            @click="showCreateWebhookModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition"
          >
            <span class="material-symbols-outlined text-base">add_link</span>
            Tambah Subscription
          </button>
        </div>
      </div>

      <!-- Subscriptions Table -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <tr>
              <th class="py-3 px-4">Target URL</th>
              <th class="py-3 px-4">Event Subscriptions</th>
              <th class="py-3 px-4">Signing Secret</th>
              <th class="py-3 px-4">Gagal</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr v-if="subscriptions.length === 0">
              <td colspan="6" class="py-8 text-center text-slate-500">
                Belum ada webhook subscription aktif.
              </td>
            </tr>
            <tr v-for="sub in subscriptions" :key="sub.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="py-3.5 px-4 font-mono text-xs text-sky-600 dark:text-sky-400 max-w-xs truncate">
                {{ sub.target_url }}
              </td>
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="evt in sub.events"
                    :key="evt"
                    class="px-2 py-0.5 text-xs rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    {{ evt }}
                  </span>
                </div>
              </td>
              <td class="py-3.5 px-4 font-mono text-xs text-slate-500">
                whsec_••••••••••••
              </td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                {{ sub.failure_count }}
              </td>
              <td class="py-3.5 px-4">
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    sub.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                  ]"
                >
                  {{ sub.is_active ? 'Aktif' : 'Ditangguhkan' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right">
                <button
                  @click="handleDeleteWebhook(sub.id)"
                  class="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950"
                >
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Recent Deliveries Section -->
      <div class="space-y-3 pt-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">
          Riwayat Pengiriman Webhook Terakhir
        </h3>
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th class="py-3 px-4">Waktu</th>
                <th class="py-3 px-4">Event</th>
                <th class="py-3 px-4">HTTP Status</th>
                <th class="py-3 px-4">Target URL</th>
                <th class="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr v-if="deliveries.length === 0">
                <td colspan="5" class="py-6 text-center text-slate-500">
                  Belum ada log pengiriman webhook tercatat.
                </td>
              </tr>
              <tr v-for="d in deliveries" :key="d.id">
                <td class="py-2.5 px-4 text-xs text-slate-500">
                  {{ new Date(d.created_at).toLocaleString('id-ID') }}
                </td>
                <td class="py-2.5 px-4 font-mono text-xs text-purple-600 dark:text-purple-400">
                  {{ d.event }}
                </td>
                <td class="py-2.5 px-4">
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-xs font-mono font-semibold',
                      d.status_code >= 200 && d.status_code < 300
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                    ]"
                  >
                    {{ d.status_code || 'ERR' }}
                  </span>
                </td>
                <td class="py-2.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs">
                  {{ d.target_url }}
                </td>
                <td class="py-2.5 px-4 text-xs text-slate-500 truncate max-w-xs">
                  {{ d.error_message || 'OK' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: API Catalog & Quickstart -->
    <div v-if="activeTab === 'catalog'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-sky-600">
            <span class="material-symbols-outlined">hub</span>
            <span class="font-semibold text-sm">Status Platform</span>
          </div>
          <div class="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {{ systemStatus?.status || 'Operational' }}
          </div>
          <p class="text-xs text-slate-500">Versi: {{ systemStatus?.version || '1.0.0' }}</p>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-emerald-600">
            <span class="material-symbols-outlined">verified_user</span>
            <span class="font-semibold text-sm">Autentikasi M2M</span>
          </div>
          <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
            X-API-Key / Bearer
          </div>
          <p class="text-xs text-slate-500">Mendukung format key trkit_cli_... dengan hash SHA-256 aman.</p>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-purple-600">
            <span class="material-symbols-outlined">webhook</span>
            <span class="font-semibold text-sm">Event Dispatcher</span>
          </div>
          <div class="text-base font-semibold text-slate-800 dark:text-slate-100">
            HMAC-SHA256 Signatures
          </div>
          <p class="text-xs text-slate-500">Tanda tangan payload pada header X-TrackIT-Signature.</p>
        </div>
      </div>

      <!-- cURL Examples -->
      <div class="bg-slate-900 text-slate-200 p-6 rounded-xl border border-slate-800 space-y-4">
        <h4 class="font-semibold text-sm text-slate-100 flex items-center justify-between">
          <span>Contoh Pemanggilan REST API (cURL)</span>
          <button
            @click="copyToClipboard('curl -H &quot;X-API-Key: YOUR_API_KEY&quot; http://localhost:3000/api/v1/system/status')"
            class="text-xs text-sky-400 hover:text-sky-300"
          >
            Salin cURL
          </button>
        </h4>
        <pre class="bg-slate-950 p-4 rounded-lg text-xs font-mono overflow-x-auto text-sky-300">
curl -X GET "http://localhost:3000/api/v1/system/status" \
  -H "X-API-Key: trkit_trcli_a1b2c3d4_trsec_9f8e7d6c..." \
  -H "Accept: application/json"</pre>
      </div>

      <!-- Power BI & Grafana Guidelines -->
      <div class="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 class="font-semibold text-base text-slate-800 dark:text-slate-100">
          Panduan Integrasi BI & Otomasi
        </h4>
        <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
          <li><strong>Power BI:</strong> Gunakan konektor <em>Web</em> di Power Query. Tambahkan header HTTP <code>X-API-Key</code> dengan nilai API Key Anda.</li>
          <li><strong>Grafana:</strong> Gunakan <em>Infinity Datasource</em> untuk REST API atau datasource <em>Prometheus</em> diarahkan ke endpoint <code>/metrics</code>.</li>
          <li><strong>n8n / Zapier:</strong> Pasang webhook trigger yang mengarah ke URL n8n Anda untuk menerima event realtime tanpa perlu polling.</li>
        </ul>
      </div>
    </div>

    <!-- MODAL: Buat API Client Baru -->
    <div
      v-if="showCreateClientModal"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5">
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
          Registrasi API Client Baru
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Aplikasi / Integrasi *
            </label>
            <input
              v-model="newClientForm.name"
              type="text"
              placeholder="Contoh: Power BI Executive Dashboard"
              class="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Organisasi / Departemen
            </label>
            <input
              v-model="newClientForm.organization"
              type="text"
              placeholder="Contoh: IT Ops / Finance"
              class="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Izin / Scopes yang Diizinkan
            </label>
            <div class="space-y-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-lg">
              <label
                v-for="scope in availableScopes"
                :key="scope.key"
                class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="scope.key"
                  v-model="newClientForm.scopes"
                  class="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>{{ scope.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rate Limit (Request per Menit)
            </label>
            <input
              v-model.number="newClientForm.rateLimit"
              type="number"
              class="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="showCreateClientModal = false"
            class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Batal
          </button>
          <button
            @click="handleCreateClient"
            :disabled="isSubmittingClient"
            class="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg disabled:opacity-50"
          >
            {{ isSubmittingClient ? 'Membuat...' : 'Buat Client' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Kredensial Baru Dihasilkan (Reveal Modal) -->
    <div
      v-if="createdClientResult"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-emerald-500/50 p-6 shadow-2xl space-y-4">
        <div class="flex items-center gap-2 text-emerald-600">
          <span class="material-symbols-outlined text-2xl">check_circle</span>
          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
            Kredensial API Berhasil Diterbitkan!
          </h3>
        </div>

        <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
          <strong>PENTING:</strong> Simpan API Key ini sekarang. Demi keamanan, nilai ini tidak akan pernah ditampilkan lagi.
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            API Key (Gunakan pada Header X-API-Key)
          </label>
          <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <input
              type="text"
              readonly
              :value="createdClientResult.apiKey"
              class="w-full bg-transparent font-mono text-xs text-slate-800 dark:text-slate-200 select-all outline-none"
            />
            <button
              @click="copyToClipboard(createdClientResult.apiKey)"
              class="px-2.5 py-1 text-xs font-semibold bg-sky-600 text-white rounded hover:bg-sky-500 transition shrink-0"
            >
              Salin
            </button>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            @click="createdClientResult = null"
            class="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            Saya Sudah Menyimpannya
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Tambah Webhook Subscription -->
    <div
      v-if="showCreateWebhookModal"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5">
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
          Tambah Webhook Subscription
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target URL (HTTP/HTTPS Endpoint) *
            </label>
            <input
              v-model="newWebhookForm.targetUrl"
              type="url"
              placeholder="https://automation.company.internal/webhook/trackit"
              class="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Events yang Di-subscribe
            </label>
            <div class="space-y-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-lg">
              <label
                v-for="evt in availableEvents"
                :key="evt.key"
                class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="evt.key"
                  v-model="newWebhookForm.events"
                  class="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>{{ evt.label }} ({{ evt.key }})</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="showCreateWebhookModal = false"
            class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Batal
          </button>
          <button
            @click="handleCreateWebhook"
            :disabled="isSubmittingWebhook"
            class="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg disabled:opacity-50"
          >
            {{ isSubmittingWebhook ? 'Mendaftarkan...' : 'Daftarkan Webhook' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
