<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'

// Keep destination permission guards and create-query contracts in sync.
const router = useRouter()
const { hasPermission, hasWritePermission } = useAuth()
const { t } = useLanguage()

const allQuickActions = computed(() => [
  {
    id: 'add-asset',
    label: t('action_add_asset', 'Tambah Aset'),
    icon: 'devices',
    tooltip: t('action_add_asset_tip', 'Daftarkan perangkat baru'),
    available: hasWritePermission('assets'),
    action: () => router.push({ path: '/assets', query: { action: 'add' } }),
  },
  {
    id: 'create-ticket',
    label: t('action_create_ticket', 'Buat Tiket'),
    icon: 'add_circle',
    tooltip: t('action_create_ticket_tip', 'Ajukan tiket baru'),
    // Self-service for every authenticated role (matches TicketsView, where the
    // create button is shown to admins and reporters alike).
    available: hasPermission('tickets'),
    action: () => router.push({ path: '/tickets', query: { action: 'new' } }),
  },
  {
    id: 'add-employee',
    label: t('action_add_employee', 'Tambah Karyawan'),
    icon: 'person_add',
    tooltip: t('action_add_employee_tip', 'Daftarkan karyawan baru'),
    available: hasWritePermission('karyawan'),
    action: () => router.push({ path: '/karyawan', query: { action: 'add' } }),
  },
  {
    id: 'new-submission',
    label: t('action_new_submission', 'Pengajuan BAST'),
    icon: 'assignment',
    tooltip: t('action_new_submission_tip', 'Buat berita acara serah terima'),
    available: hasPermission('submissions'),
    action: () => router.push('/submissions'),
  },
])

const quickActions = computed(() => allQuickActions.value.filter((action) => action.available))
</script>

<template>
  <section v-if="quickActions.length" class="quick-access" aria-labelledby="quick-access-title">
    <div class="quick-access-heading">
      <h2 id="quick-access-title">{{ t('quick_access', 'Quick Access') }}</h2>
      <p>{{ t('quick_access_subtitle', 'Mulai pekerjaan harian Anda.') }}</p>
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
  margin-bottom: 10px;
}
.quick-access-heading h2 {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.quick-access-heading p {
  margin-top: 2px;
  font-size: 9.5px;
  color: var(--color-text-secondary);
}
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
.quick-action-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 40px;
  padding: 6px 8px;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: 6px;
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
  width: 26px;
  height: 26px;
  border-radius: 5px;
  font-size: 15px;
  background: var(--color-background-surface-muted);
  color: var(--color-primary);
}
.quick-action-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.quick-action-label {
  font-size: 11px;
  font-weight: 600;
}
.quick-action-description {
  font-size: 9.5px;
  line-height: 1.35;
  color: var(--color-text-secondary);
}
.quick-action-arrow {
  font-size: 13px;
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
    gap: 4px;
  }
  .quick-action-card {
    flex-direction: column;
    justify-content: flex-start;
    gap: 3px;
    min-height: 46px;
    padding: 4px 2px;
    text-align: center;
    border: 0;
    background: transparent;
  }
  .quick-action-icon {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    font-size: 14px;
  }
  .quick-action-copy {
    flex: none;
    width: 100%;
  }
  .quick-action-label {
    font-size: 9.5px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
}
@media (prefers-reduced-motion: reduce) {
  .quick-action-card {
    transition: none;
  }
}
</style>
