<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

/**
 * QuickActions.vue — dashboard action bar.
 *
 * ACTIONS ONLY. Navigation (Semua Aset / Lihat Tiket / Aset Saya / Ekspor Data)
 * belongs to the sidebar and mobile bottom nav, not here — mixing the two is
 * what made this row read as a second, duplicate menu.
 *
 * Every entry maps to a real create/submit capability and is gated by the same
 * permission as the destination view's own toolbar button.
 */
const props = defineProps({
  compact: { type: Boolean, default: false },
})

const router = useRouter()
const { hasPermission, hasWritePermission } = useAuth()

const allQuickActions = [
  {
    id: 'create-ticket',
    label: 'Buat Tiket',
    icon: 'add_circle',
    tooltip: 'Ajukan tiket baru',
    // Self-service for every authenticated role (matches TicketsView, where the
    // create button is shown to admins and reporters alike).
    available: computed(() => hasPermission('tickets')),
    action: () => router.push({ path: '/tickets', query: { action: 'new' } }),
  },
  {
    id: 'add-asset',
    label: 'Tambah Aset',
    icon: 'devices',
    tooltip: 'Daftarkan perangkat baru',
    available: computed(() => hasWritePermission('assets')),
    action: () => router.push({ path: '/assets', query: { action: 'add' } }),
  },
  {
    id: 'add-employee',
    label: 'Tambah Karyawan',
    icon: 'person_add',
    tooltip: 'Daftarkan karyawan baru',
    available: computed(() => hasWritePermission('karyawan')),
    action: () => router.push({ path: '/karyawan', query: { action: 'add' } }),
  },
  {
    id: 'new-submission',
    label: 'Pengajuan BAST',
    icon: 'assignment',
    tooltip: 'Buat berita acara serah terima',
    available: computed(() => hasPermission('submissions')),
    action: () => router.push('/submissions'),
  },
]

const quickActions = computed(() => allQuickActions.filter((action) => action.available.value))

// Keep the bar short: primary 3, remainder behind "Lainnya".
const visibleActions = computed(() => quickActions.value.slice(0, 3))
const overflowActions = computed(() => quickActions.value.slice(3))
const showMore = ref(false)

function runAction(action) {
  action.action()
  if (props.compact) showMore.value = false
}
</script>

<template>
  <div class="quick-actions flex flex-wrap items-center gap-2">
    <button
      v-for="action in visibleActions"
      :key="action.id"
      type="button"
      :title="action.tooltip"
      :aria-label="action.label"
      @click="runAction(action)"
      :class="[
        'quick-action-btn inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors min-h-[36px]',
        // First entry is the primary CTA (filled); the rest stay surface buttons
        visibleActions.indexOf(action) === 0
          ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] shadow-[0_2px_8px_rgba(10,81,176,0.18)]'
          : 'border-[var(--color-border)] bg-[var(--color-background-surface-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)]',
      ]"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[14px]">{{
        action.icon
      }}</span>
      <span>{{ action.label }}</span>
    </button>

    <button
      v-if="overflowActions.length > 0"
      type="button"
      @click="showMore = !showMore"
      :aria-expanded="showMore"
      :aria-label="showMore ? 'Tutup aksi lain' : 'Lihat aksi lainnya'"
      class="quick-action-more inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-surface-muted)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)] transition-colors min-h-[36px]"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[13px]">{{
        showMore ? 'expand_less' : 'expand_more'
      }}</span>
      <span>{{ showMore ? 'Lebih sedikit' : 'Lainnya' }}</span>
    </button>

    <transition name="qa-slide">
      <div
        v-if="showMore"
        class="quick-action-overflow flex flex-wrap items-center gap-2 mt-2 w-full"
      >
        <button
          v-for="action in overflowActions"
          :key="action.id"
          type="button"
          :title="action.tooltip"
          :aria-label="action.label"
          @click="runAction(action)"
          class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-surface-muted)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)] transition-colors min-h-[36px]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">{{
            action.icon
          }}</span>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.quick-action-btn:active,
.quick-action-more:active {
  transform: scale(0.97);
}
.qa-slide-enter-active,
.qa-slide-leave-active {
  transition: all 0.15s ease-in-out;
}
.qa-slide-enter-from,
.qa-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
