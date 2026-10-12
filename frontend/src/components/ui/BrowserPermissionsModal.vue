<script setup>
import { ref } from 'vue'
import AppModal from './AppModal.vue'
import AppBadge from './AppBadge.vue'
import {
  notificationPermission,
  cameraPermission,
  requestNotificationPermission,
  showNativeNotification,
  requestCameraAccess,
  requestClipboardAccess,
} from '@/composables/useBrowserPermissions.js'
import { useNotificationSound } from '@/composables/useNotificationSound.js'

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const {
  isSoundEnabled,
  toggleSound,
  testSound,
  soundStatusMap,
  soundPresets,
  setStatusSound,
  playSoundById,
} = useNotificationSound()

const showSoundCustomizer = ref(true)

const NOTIFICATION_STATUS_ITEMS = [
  { key: 'CREATED', label: 'Tiket & Pengajuan Baru', desc: 'Saat tiket kendala atau pengajuan BAST baru dibuat', icon: 'confirmation_number' },
  { key: 'UPDATED', label: 'Perubahan Status', desc: 'Saat status tiket atau data aset diperbarui', icon: 'sync' },
  { key: 'COMMENT', label: 'Komentar Baru', desc: 'Saat diskusi atau catatan baru ditambahkan', icon: 'chat' },
  { key: 'ALERT', label: 'Peringatan & Isu Kritis', desc: 'Notifikasi kendala kritis atau peringatan sistem', icon: 'warning' },
  { key: 'SUCCESS', label: 'Berhasil & Selesai', desc: 'Saat aksi selesai atau tiket berhasil ditutup', icon: 'check_circle' },
]

const actionFeedback = ref('')
const feedbackType = ref('info')

function showFeedback(msg, type = 'info') {
  actionFeedback.value = msg
  feedbackType.value = type
  setTimeout(() => {
    actionFeedback.value = ''
  }, 4000)
}

async function handleEnableNotification() {
  const result = await requestNotificationPermission()
  if (result === 'granted') {
    showFeedback('Notifikasi browser berhasil diaktifkan.', 'success')
  } else if (result === 'denied') {
    showFeedback('Izin notifikasi diblokir di setelan browser Anda. Mohon buka pengaturan situs untuk mengizinkannya.', 'error')
  } else {
    showFeedback('Permintaan notifikasi ditutup.', 'info')
  }
}

function handleTestNotification() {
  if (notificationPermission.value === 'granted') {
    testSound()
    showNativeNotification({
      title: 'Uji Notifikasi TrackIT',
      body: 'Notifikasi desktop dan suara Tone.js berfungsi dengan sangat baik.',
      icon: '/logo.svg',
    })
    showFeedback('Notifikasi desktop & suara uji coba berhasil dikirim.', 'success')
  } else {
    handleEnableNotification()
  }
}

async function handleRequestCamera() {
  const res = await requestCameraAccess()
  showFeedback(res.message, res.ok ? 'success' : 'error')
}

async function handleRequestClipboard() {
  const res = await requestClipboardAccess()
  showFeedback(res.message, res.ok ? 'success' : 'error')
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    title="Izin & Akses Perangkat Browser"
    @close="emit('close')"
  >
    <div class="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
      <p class="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
        Kelola izin akses notifikasi desktop, audio Tone.js, kamera foto aset, dan berkas lampiran untuk pengalaman kerja optimal di TrackIT.
      </p>

      <!-- Feedback Banner -->
      <div
        v-if="actionFeedback"
        class="rounded-[5px] p-2 text-[9.5px] sm:text-[10px] font-medium flex items-center gap-1.5"
        :class="{
          'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800': feedbackType === 'success',
          'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800': feedbackType === 'error',
          'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800': feedbackType === 'info',
        }"
      >
        <span class="material-symbols-outlined text-[14px] shrink-0">
          {{ feedbackType === 'success' ? 'check_circle' : feedbackType === 'error' ? 'error' : 'info' }}
        </span>
        <span class="flex-1">{{ actionFeedback }}</span>
      </div>

      <!-- Permission Items Grid -->
      <div class="space-y-1.5">
        <!-- 1. Notifikasi Browser -->
        <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-start gap-2 min-w-0">
            <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-blue-100 dark:bg-blue-900/40 text-[#0A51B0] dark:text-blue-300">
              <span class="material-symbols-outlined text-[14px]">notifications</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-[10px] sm:text-[10.5px] text-slate-800 dark:text-white">Notifikasi Desktop</span>
                <AppBadge
                  :type="notificationPermission === 'granted' ? 'success' : notificationPermission === 'denied' ? 'danger' : 'warning'"
                  :text="notificationPermission === 'granted' ? 'Diizinkan' : notificationPermission === 'denied' ? 'Diblokir' : 'Belum Aktif'"
                />
              </div>
              <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Peringatan sistem di layar saat tiket baru masuk atau status tiket diubah.
              </p>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
            <button
              v-if="notificationPermission !== 'granted'"
              type="button"
              @click="handleEnableNotification"
              class="h-6 px-2 rounded-[4px] bg-[#0A51B0] hover:bg-[#0A4391] text-white text-[9px] sm:text-[9.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              Aktifkan
            </button>
            <button
              v-else
              type="button"
              @click="handleTestNotification"
              class="h-6 px-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer"
            >
              Uji Notifikasi
            </button>
          </div>
        </div>

        <!-- 2. Suara Notifikasi Tone.js -->
        <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-start gap-2 min-w-0">
            <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
              <span class="material-symbols-outlined text-[14px]">volume_up</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-[10px] sm:text-[10.5px] text-slate-800 dark:text-white">Suara Tone.js</span>
                <AppBadge
                  :type="isSoundEnabled ? 'success' : 'neutral'"
                  :text="isSoundEnabled ? 'Suara Aktif' : 'Senyap'"
                />
              </div>
              <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Nada harmonik sintetis Tone.js saat ada aktivitas tiket & pesan baru.
              </p>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1 self-end sm:self-center">
            <button
              type="button"
              @click="testSound()"
              class="h-6 px-1.5 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Putar nada uji coba"
            >
              <span class="material-symbols-outlined text-[12px]">music_note</span>
              <span>Tes Suara</span>
            </button>
            <button
              type="button"
              @click="toggleSound"
              class="h-6 px-1.5 rounded-[4px] text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1"
              :class="isSoundEnabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
              :title="isSoundEnabled ? 'Matikan suara' : 'Aktifkan suara'"
            >
              <span class="material-symbols-outlined text-[12px]">
                {{ isSoundEnabled ? 'volume_up' : 'volume_off' }}
              </span>
              <span>{{ isSoundEnabled ? 'On' : 'Mute' }}</span>
            </button>
          </div>
        </div>

        <!-- Panel Kustomisasi 15 Suara Notifikasi per Status -->
        <div v-if="isSoundEnabled" class="p-2 sm:p-2.5 rounded-[5px] border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
          <button
            type="button"
            @click="showSoundCustomizer = !showSoundCustomizer"
            class="w-full flex items-center justify-between text-left cursor-pointer select-none"
          >
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px] text-indigo-600 dark:text-indigo-400">tune</span>
              <span class="font-bold text-[10px] sm:text-[10.5px] text-slate-800 dark:text-white">Pilih 15 Custom Suara Tone.js per Status</span>
            </div>
            <span class="material-symbols-outlined text-[14px] text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': showSoundCustomizer }">expand_more</span>
          </button>

          <div v-if="showSoundCustomizer" class="space-y-1.5 pt-1.5 border-t border-indigo-100 dark:border-indigo-900/40">
            <div
              v-for="st in NOTIFICATION_STATUS_ITEMS"
              :key="st.key"
              class="p-1.5 sm:p-2 rounded-[4px] bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
            >
              <div class="min-w-0 flex items-start gap-1.5">
                <span class="material-symbols-outlined text-[13px] text-indigo-500 shrink-0 mt-0.5">{{ st.icon }}</span>
                <div>
                  <div class="font-bold text-[9.5px] sm:text-[10px] text-slate-800 dark:text-slate-100 leading-tight">{{ st.label }}</div>
                  <div class="text-[8.5px] sm:text-[9px] text-slate-500 dark:text-slate-400 leading-tight">{{ st.desc }}</div>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0 self-end sm:self-center">
                <select
                  :value="soundStatusMap[st.key] || 'chime_ascend'"
                  @change="setStatusSound(st.key, $event.target.value)"
                  class="h-5.5 text-[9px] sm:text-[9.5px] px-1 rounded-[3px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                >
                  <option
                    v-for="preset in soundPresets"
                    :key="preset.id"
                    :value="preset.id"
                  >
                    {{ preset.name }} ({{ preset.category }})
                  </option>
                </select>
                <button
                  type="button"
                  @click="playSoundById(soundStatusMap[st.key] || 'chime_ascend')"
                  class="h-5.5 w-5.5 flex items-center justify-center rounded-[3px] bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300 transition-colors cursor-pointer"
                  title="Dengarkan suara terpilih"
                >
                  <span class="material-symbols-outlined text-[12px]">play_arrow</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Akses Kamera & Foto Aset -->
        <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-start gap-2 min-w-0">
            <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
              <span class="material-symbols-outlined text-[14px]">photo_camera</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-[10px] sm:text-[10.5px] text-slate-800 dark:text-white">Kamera & Foto Aset</span>
                <AppBadge
                  :type="cameraPermission === 'granted' ? 'success' : cameraPermission === 'denied' ? 'danger' : 'neutral'"
                  :text="cameraPermission === 'granted' ? 'Diizinkan' : cameraPermission === 'denied' ? 'Ditolak' : 'Tersedia'"
                />
              </div>
              <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Ambil foto langsung kondisi perangkat atau bukti fisik kendala ke lampiran.
              </p>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              @click="handleRequestCamera"
              class="h-6 px-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer"
            >
              Uji Kamera
            </button>
          </div>
        </div>

        <!-- 4. Akses File & Clipboard Lampiran -->
        <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-start gap-2 min-w-0">
            <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300">
              <span class="material-symbols-outlined text-[14px]">attachment</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-[10px] sm:text-[10.5px] text-slate-800 dark:text-white">Akses File & Clipboard</span>
                <AppBadge
                  type="success"
                  text="Mendukung File & Paste"
                />
              </div>
              <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Unggah berkas (PNG, JPG, PDF, XLSX, DOCX) dan paste tangkapan layar langsung (Ctrl+V).
              </p>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              @click="handleRequestClipboard"
              class="h-6 px-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer"
            >
              Uji Clipboard
            </button>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          @click="emit('close')"
          class="h-6.5 sm:h-7 px-3 rounded-[5px] bg-[#0A51B0] hover:bg-[#0A4391] text-white font-semibold text-[10px] sm:text-[10.5px] transition-colors cursor-pointer shadow-2xs"
        >
          Selesai
        </button>
      </div>
    </div>
  </AppModal>
</template>
