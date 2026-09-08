<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true, default: 1 },
  totalItems: { type: Number, required: true, default: 0 },
  mobileCompact: { type: Boolean, default: false },
  itemsPerPage: { type: Number, default: 10 },
})

const emit = defineEmits(['update:currentPage', 'pageChange'])

const totalPages = computed(() => {
  if (props.totalItems <= 0) return 1
  return Math.ceil(props.totalItems / props.itemsPerPage)
})

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
    :class="{ 'mobile-compact': mobileCompact }"
    class="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-[#F1F5F9] text-[11.5px] text-[#475569] select-none"
  >
    <div class="flex items-center gap-1 font-medium">
      <span>Menampilkan</span>
      <span class="font-bold text-[#0F172A]">{{ startIndex }}</span>
      <span>–</span>
      <span class="font-bold text-[#0F172A]">{{ endIndex }}</span>
      <span>dari</span>
      <span class="font-bold text-[#0F172A]">{{ totalItems }}</span>
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
        :disabled="currentPage === 1"
        aria-label="Halaman Sebelumnya"
        title="Halaman Sebelumnya"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#334155] shadow-2xs hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>

      <select
        v-if="mobileCompact"
        :value="currentPage"
        aria-label="Pilih halaman"
        class="min-h-11 min-w-0 rounded-lg border border-[#CBD5E1] bg-white px-2 text-base text-[#334155] sm:hidden"
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
          class="flex h-8 min-w-[32px] px-2 items-center justify-center rounded-lg text-[12px] font-bold transition-all cursor-pointer"
          :class="[
            mobileCompact ? 'hidden sm:flex' : '',
            page === currentPage
              ? 'bg-[#1D4ED8] text-white shadow-2xs'
              : 'border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
          ]"
        >
          {{ page }}
        </button>
      </template>

      <button
        type="button"
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        aria-label="Halaman Selanjutnya"
        title="Halaman Selanjutnya"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#334155] shadow-2xs hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@media (width < 40rem) {
  .mobile-compact {
    padding-inline: 0.75rem;
  }
  .mobile-compact > div:first-child {
    flex-wrap: wrap;
    justify-content: center;
  }
  .mobile-compact button {
    min-width: 2.75rem;
    min-height: 2.75rem;
  }
}
</style>
