<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true, default: 1 },
  totalItems: { type: Number, required: true, default: 0 },
  mobileCompact: { type: Boolean, default: false },
  assetStyle: { type: Boolean, default: false },
  itemsPerPage: { type: Number, default: 10 },
})

const emit = defineEmits(['update:currentPage', 'pageChange'])

const totalPages = computed(() => {
  if (props.totalItems <= 0) return 1
  return Math.ceil(props.totalItems / props.itemsPerPage)
})

watch(
  totalPages,
  (pages) => {
    const clampedPage = Math.min(Math.max(props.currentPage, 1), pages)
    if (clampedPage !== props.currentPage) {
      emit('update:currentPage', clampedPage)
      emit('pageChange', clampedPage)
    }
  },
  { immediate: true },
)

const startIndex = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endIndex = computed(() => {
  return Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
})

const visiblePageNumbers = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = props.currentPage

  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)

  if (end - start < 4) {
    start = Math.max(1, end - 4)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('update:currentPage', page)
  emit('pageChange', page)
}
</script>

<template>
  <div
    :class="{ 'mobile-compact': mobileCompact, 'asset-pagination': assetStyle }"
    class="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-t border-[#F1F5F9] text-[9.5px] sm:text-[10.5px] text-[#475569] select-none"
  >
    <div class="flex items-center gap-1 font-medium">
      <span>Menampilkan</span>
      <span class="font-bold text-[#333333]">{{ startIndex }}</span>
      <span>-</span>
      <span class="font-bold text-[#333333]">{{ endIndex }}</span>
      <span>dari</span>
      <span class="font-bold text-[#333333]">{{ totalItems }}</span>
      <span>data</span>
    </div>

    <div
      v-if="totalPages > 1"
      class="flex items-center gap-1"
      role="navigation"
      aria-label="Navigasi Halaman"
    >
      <button
        type="button"
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage <= 1"
        aria-label="Halaman Sebelumnya"
        title="Halaman Sebelumnya"
        class="ui-pagination-button flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-[5px] border border-[#CBD5E1] bg-white text-[#334155] shadow-2xs hover:bg-[#F8FAFC] hover:text-[#333333] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[14px]">chevron_left</span>
      </button>

      <select
        v-if="mobileCompact"
        :value="currentPage"
        aria-label="Pilih halaman"
        class="min-h-7 min-w-0 rounded-[5px] border border-[#CBD5E1] bg-white px-1.5 text-xs text-[#334155] sm:hidden"
        @change="goToPage(Number($event.target.value))"
      >
        <option v-for="page in totalPages" :key="page" :value="page">
          {{ page }} / {{ totalPages }}
        </option>
      </select>
      <template v-for="page in visiblePageNumbers" :key="page">
        <button
          type="button"
          @click="goToPage(page)"
          :aria-label="`Halaman ${page}`"
          :aria-current="page === currentPage ? 'page' : undefined"
          class="ui-pagination-button flex h-6.5 min-w-[26px] sm:h-7 sm:min-w-[28px] px-1.5 items-center justify-center rounded-[5px] text-[9.5px] sm:text-[10px] font-bold transition-all cursor-pointer"
          :class="[
            mobileCompact ? 'hidden sm:flex' : '',
            page === currentPage
              ? 'bg-[#0A4391] text-white shadow-2xs'
              : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:text-[#333333]',
          ]"
        >
          {{ page }}
        </button>
      </template>

      <button
        type="button"
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage >= totalPages"
        aria-label="Halaman Selanjutnya"
        title="Halaman Selanjutnya"
        class="ui-pagination-button flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-[5px] border border-[#CBD5E1] bg-white text-[#334155] shadow-2xs hover:bg-[#F8FAFC] hover:text-[#333333] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[14px]">chevron_right</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.asset-pagination {
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  gap: 8px;
  color: #637288;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.asset-pagination > div:first-child {
  flex-wrap: wrap;
  gap: 4px;
}
.asset-pagination [role='navigation'] {
  gap: 4px;
}
.asset-pagination button {
  min-width: 26px;
  height: 26px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  box-shadow: none;
  font-weight: 600;
}
.asset-pagination button[aria-current='page'] {
  background: #0a51b0;
  border-color: #0a51b0;
  color: white;
}
.asset-pagination button:focus-visible,
.asset-pagination select:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}
@media (width < 40rem) {
  .asset-pagination {
    padding: 6px 8px;
    gap: 8px;
  }
  .asset-pagination [role='navigation'] {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .asset-pagination select {
    flex: 1;
    max-width: 150px;
    min-height: 28px;
    border-color: #e2e8f0;
    text-align: center;
    font-size: 11px;
    border-radius: 5px;
  }
}
@media (width < 40rem) {
  .mobile-compact {
    padding-inline: 0.5rem;
  }
  .mobile-compact > div:first-child {
    flex-wrap: wrap;
    justify-content: center;
  }
  .mobile-compact button {
    min-width: 1.75rem;
    min-height: 1.75rem;
  }
}
</style>
