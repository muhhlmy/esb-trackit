<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

// Keep destination permission guards and create-query contracts in sync.
const router = useRouter()
const { hasPermission, hasWritePermission } = useAuth()

const allQuickActions = [
  {
    id: 'add-asset',
    label: 'Tambah Aset',
    icon: 'devices',
    tooltip: 'Daftarkan perangkat baru',
    available: computed(() => hasWritePermission('assets')),
    action: () => router.push({ path: '/assets', query: { action: 'add' } }),
  },
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
</script>

<template>
  <section v-if="quickActions.length" class="quick-access" aria-labelledby="quick-access-title">
    <div class="quick-access-heading">
      <h2 id="quick-access-title">Quick Access</h2>
      <p>Mulai pekerjaan harian Anda.</p>
    </div>
    <div class="quick-actions">
      <button
        v-for="action in quickActions"
        :key="action.id"
        type="button"
        class="quick-action-card"
        :aria-label="action.label"
        @click="action.action()"
      >
        <span aria-hidden="true" class="material-symbols-outlined quick-action-icon">{{
          action.icon
        }}</span>
        <span class="quick-action-copy">
          <span class="quick-action-label">{{ action.label }}</span>
          <span class="quick-action-description">{{ action.tooltip }}</span>
        </span>
        <span aria-hidden="true" class="material-symbols-outlined quick-action-arrow"
          >arrow_forward</span
        >
      </button>
    </div>
  </section>
</template>

<style scoped>
.quick-access {
  min-width: 0;
}
.quick-access-heading {
  margin-bottom: 12px;
}
.quick-access-heading h2 {
  font-size: 14px;
  font-weight: 650;
  color: var(--color-text-primary);
}
.quick-access-heading p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.quick-action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 88px;
  padding: 16px;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.quick-action-card:hover {
  border-color: var(--color-primary);
  background: var(--color-background-surface-muted);
}
.quick-action-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.quick-action-card:active {
  background: var(--color-background-surface-muted);
}
.quick-action-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 22px;
  background: var(--color-background-surface-muted);
  color: var(--color-primary);
}
.quick-action-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.quick-action-label {
  font-size: 13px;
  font-weight: 600;
}
.quick-action-description {
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}
.quick-action-arrow {
  font-size: 16px;
  color: var(--color-text-secondary);
}
@media (max-width: 639px) {
  .quick-access-heading p,
  .quick-action-description,
  .quick-action-arrow {
    display: none;
  }
  .quick-actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .quick-action-card {
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
    min-height: 96px;
    padding: 8px 2px;
    text-align: center;
    border: 0;
    background: transparent;
  }
  .quick-action-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    font-size: 24px;
  }
  .quick-action-copy {
    flex: none;
    width: 100%;
  }
  .quick-action-label {
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}
@media (prefers-reduced-motion: reduce) {
  .quick-action-card {
    transition: none;
  }
}
</style>
