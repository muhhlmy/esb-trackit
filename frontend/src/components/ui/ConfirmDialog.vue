<script setup>
/**
 * ConfirmDialog.vue — konfirmasi aksi berisiko berbasis AppModal.
 *
 * Menggantikan window.confirm() (non-brandable, blocking, tidak accessible
 * di mobile) dengan pola yang konsisten: panel modal, fokus di tombol
 * aksi, Escape untuk batal, tombol cancel otomatis menerima fokus awal
 * agar Enter tidak langsung mengeksekusi aksi destruktif.
 *
 * Props:
 *   open         – v-model:boolean
 *   title        – Judul dialog
 *   message      – Body pesan
 *   confirmLabel – Label tombol aksi
 *   cancelLabel  – Label tombol batal
 *   destructive  – Jika true, tombol aksi merah
 *   loading      – State submitting tombol aksi
 * Emits:
 *   update:open, confirm, cancel
 */
import { nextTick, ref, watch } from 'vue'
import AppModal from './AppModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Konfirmasi' },
  cancelLabel: { type: String, default: 'Batal' },
  destructive: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const cancelRef = ref(null)

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      cancelRef.value?.focus()
    }
  },
)

function close(action = 'cancel') {
  emit('update:open', false)
  emit(action)
}
</script>

<template>
  <AppModal
    :is-open="open"
    :title="title"
    icon="help"
    size="sm"
    @close="close('cancel')"
  >
    <p class="text-[13px] leading-relaxed text-[#475569]">{{ message }}</p>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          ref="cancelRef"
          type="button"
          class="inline-flex h-9 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-xs font-bold text-[#475569] transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer"
          @click="close('cancel')"
        >
          {{ cancelLabel }}
        </button>

        <button
          type="button"
          :disabled="loading"
          class="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-white shadow-2xs transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait cursor-pointer"
          :class="
            destructive
              ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
              : 'bg-[#0A51B0] hover:bg-[#0A4391]'
          "
          @click="emit('confirm')"
        >
          <span
            v-if="loading"
            aria-hidden="true"
            class="material-symbols-outlined animate-spin text-[15px]"
          >
            progress_activity
          </span>
          {{ confirmLabel }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
